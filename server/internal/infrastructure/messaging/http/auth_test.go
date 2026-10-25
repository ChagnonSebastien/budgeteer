package http

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coreos/go-oidc"
	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"golang.org/x/oauth2"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

const testIssuer = "https://idp.example.com/realms/test"
const testClientID = "budgeteer-web"
const testKeyID = "test-key"

type testIdP struct {
	key *rsa.PrivateKey
}

func (idp testIdP) token(t *testing.T, claims map[string]any) string {
	t.Helper()
	signer, err := jose.NewSigner(
		jose.SigningKey{Algorithm: jose.RS256, Key: jose.JSONWebKey{Key: idp.key, KeyID: testKeyID}},
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	base := map[string]any{
		"iss": testIssuer,
		"exp": time.Now().Add(time.Hour).Unix(),
		"sub": "sub-1",
	}
	for k, v := range claims {
		base[k] = v
	}
	raw, err := jwt.Signed(signer).Claims(base).Serialize()
	if err != nil {
		t.Fatal(err)
	}
	return raw
}

func newTestAuth(t *testing.T) (*Auth, *mockuserRepository, testIdP) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}

	jwks := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(jose.JSONWebKeySet{Keys: []jose.JSONWebKey{
			{Key: &key.PublicKey, KeyID: testKeyID, Algorithm: string(jose.RS256), Use: "sig"},
		}})
	}))
	t.Cleanup(jwks.Close)

	users := newMockuserRepository(t)
	keySet := oidc.NewRemoteKeySet(context.Background(), jwks.URL)
	verifier := oidc.NewVerifier(testIssuer, keySet, &oidc.Config{SkipClientIDCheck: true})
	auth := NewAuth(users, nil, true, false, true, &oauth2.Config{ClientID: testClientID}, verifier, "https://app.example.com", testIssuer, "", "X-Forwarded-For")
	return auth, users, testIdP{key}
}

func TestResolveOidcUserChecksTheClient(t *testing.T) {
	auth, users, idp := newTestAuth(t)
	users.EXPECT().ResolveOidcUser(mock.Anything, mock.Anything).Return(uuid.New(), "a@example.com", nil).Times(2)

	cases := []struct {
		name   string
		claims map[string]any
		ok     bool
	}{
		{"azp is this client", map[string]any{"azp": testClientID, "aud": "account"}, true},
		{"aud is this client", map[string]any{"azp": "other", "aud": []string{"account", testClientID}}, true},
		{"issued to another client", map[string]any{"azp": "other-app", "aud": "account"}, false},
		{"no client binding", map[string]any{"aud": "account"}, false},
	}
	for _, c := range cases {
		_, err := auth.resolveOidcUser(context.Background(), idp.token(t, c.claims))
		if c.ok && err != nil {
			t.Errorf("%s: unexpected error %v", c.name, err)
		}
		if !c.ok && (!errors.Is(err, errTokenRejected) || oidcFailureStatus(err) != http.StatusUnauthorized) {
			t.Errorf("%s: expected rejected token, got %v", c.name, err)
		}
	}
}

func TestResolveOidcUserPassesEmailVerification(t *testing.T) {
	auth, users, idp := newTestAuth(t)
	users.EXPECT().ResolveOidcUser(mock.Anything, model.OidcIdentity{
		Sub: "sub-1", Email: "a@example.com", EmailVerified: true, Username: "a", DisplayName: "Alice A",
	}).Return(uuid.New(), "a@example.com", nil).Once()
	users.EXPECT().ResolveOidcUser(mock.Anything, model.OidcIdentity{
		Sub: "sub-1", Email: "b@example.com", Username: "b", DisplayName: "b",
	}).Return(uuid.Nil, "", model.ErrOidcEmailUnverified).Once()

	_, err := auth.resolveOidcUser(context.Background(), idp.token(t, map[string]any{
		"azp": testClientID, "email": "a@example.com", "email_verified": true, "preferred_username": "a", "name": "Alice A",
	}))
	if err != nil {
		t.Fatal(err)
	}

	_, err = auth.resolveOidcUser(context.Background(), idp.token(t, map[string]any{
		"azp": testClientID, "email": "b@example.com", "preferred_username": "b",
	}))
	if oidcFailureStatus(err) != http.StatusForbidden {
		t.Fatalf("expected forbidden for unverified email, got %v", err)
	}
}

func cookiesFrom(rec *httptest.ResponseRecorder) func(string) (*http.Cookie, error) {
	return func(name string) (*http.Cookie, error) {
		for _, c := range rec.Result().Cookies() {
			if c.Name == name {
				return c, nil
			}
		}
		return nil, http.ErrNoCookie
	}
}

func TestSessionIsRevokedOnLogout(t *testing.T) {
	auth, users, _ := newTestAuth(t)
	user := &shared.User{ID: uuid.New(), Email: "g@example.com", AuthMethod: shared.AuthMethodGuest}

	var sessionID string
	users.EXPECT().CreateSession(mock.Anything, mock.Anything, user.ID, mock.Anything).
		Run(func(_ context.Context, id string, _ uuid.UUID, _ time.Time) { sessionID = id }).
		Return(nil).Once()
	isIssued := mock.MatchedBy(func(id string) bool { return id == sessionID })
	users.EXPECT().SessionIsActive(mock.Anything, isIssued, user.ID).Return(true, nil).Once()
	users.EXPECT().TouchLastSeen(mock.Anything, user.ID).Return(nil).Once()
	users.EXPECT().DeleteSession(mock.Anything, isIssued).Return(nil).Once()
	users.EXPECT().SessionIsActive(mock.Anything, isIssued, user.ID).Return(false, nil).Once()

	issued := httptest.NewRecorder()
	if err := auth.issueSession(context.Background(), issued, user); err != nil {
		t.Fatal(err)
	}
	sessionCookie, _ := cookiesFrom(issued)("session-token")

	got, err := auth.parseSessionToken(context.Background(), cookiesFrom(issued))
	if err != nil || got.ID != user.ID {
		t.Fatalf("expected a valid session, got %v %v", got, err)
	}

	logoutReq := httptest.NewRequest(http.MethodPost, "/logout", nil)
	logoutReq.AddCookie(sessionCookie)
	auth.logoutHandler(httptest.NewRecorder(), logoutReq)

	if _, err := auth.parseSessionToken(context.Background(), cookiesFrom(issued)); !errors.Is(err, errSessionRevoked) {
		t.Fatalf("a stolen copy of the cookie must stop working after logout, got %v", err)
	}
}

func TestSessionWithoutJtiIsRejected(t *testing.T) {
	auth, _, _ := newTestAuth(t)
	signer, _ := jose.NewSigner(jose.SigningKey{Algorithm: jose.HS256, Key: auth.guestJWTSecret}, nil)
	legacy, _ := jwt.Signed(signer).Claims(map[string]any{
		"id":                      uuid.New(),
		"email":                   "g@example.com",
		"authentification_method": "guest",
		"exp":                     time.Now().Add(time.Hour).Unix(),
	}).Serialize()

	_, err := auth.parseSessionToken(context.Background(), func(string) (*http.Cookie, error) {
		return &http.Cookie{Name: "session-token", Value: legacy}, nil
	})
	if err == nil {
		t.Fatal("pre-revocation tokens have no server-side record and must be rejected")
	}
}

func TestAuthenticateWithoutOidcRejectsMissingSession(t *testing.T) {
	auth, _, _ := newTestAuth(t)
	auth.OidcConfig = nil

	_, status, err := auth.authenticate(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
	if err == nil || status != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d %v", status, err)
	}
}

func TestPreferencesRejectsANonBooleanSharedExpensesOnly(t *testing.T) {
	auth, users, _ := newTestAuth(t)
	user := &shared.User{ID: uuid.New(), Email: "g@example.com", AuthMethod: shared.AuthMethodGuest}
	users.EXPECT().CreateSession(mock.Anything, mock.Anything, user.ID, mock.Anything).Return(nil).Once()
	users.EXPECT().SessionIsActive(mock.Anything, mock.Anything, user.ID).Return(true, nil)
	users.EXPECT().TouchLastSeen(mock.Anything, user.ID).Return(nil)
	users.EXPECT().MergePreferences(mock.Anything, user.ID, mock.Anything, maxPreferencesSize).Return(true, nil).Once()

	issued := httptest.NewRecorder()
	if err := auth.issueSession(context.Background(), issued, user); err != nil {
		t.Fatal(err)
	}
	sessionCookie, _ := cookiesFrom(issued)("session-token")

	for body, want := range map[string]int{
		`{"sharedExpensesOnly":"x"}`:  http.StatusBadRequest,
		`{"sharedExpensesOnly":true}`: http.StatusNoContent,
	} {
		req := httptest.NewRequest(http.MethodPatch, "/preferences", strings.NewReader(body))
		req.AddCookie(sessionCookie)
		rec := httptest.NewRecorder()
		auth.preferencesHandler(rec, req)
		if rec.Code != want {
			t.Errorf("%s: expected %d, got %d", body, want, rec.Code)
		}
	}
}

func TestCanonicalEmail(t *testing.T) {
	for raw, want := range map[string]string{
		" Victim@Example.com ":      "victim@example.com",
		"a1 <victim@example.com>":   "",
		"<victim@example.com>":      "",
		"victim@example.com, x@y.z": "",
		"not-an-email":              "",
	} {
		got, ok := canonicalEmail(raw)
		if got != want || ok != (want != "") {
			t.Errorf("%q: expected %q, got %q %v", raw, want, got, ok)
		}
	}
}

func TestGuestSendCodeRejectsUnsafeInput(t *testing.T) {
	auth, _, _ := newTestAuth(t)
	for _, body := range []string{
		`{"email":"a1 <victim@example.com>"}`,
		`{"email":"victim@example.com","name":"x\nVisit evil.example"}`,
		`{"email":"victim@example.com","name":"` + strings.Repeat("x", maxDisplayNameLength+1) + `"}`,
		`{"email":"victim@example.com","name":"` + strings.Repeat("x", 5000) + `"}`,
	} {
		rec := httptest.NewRecorder()
		auth.guestSendCodeHandler(rec, httptest.NewRequest(http.MethodPost, "/guest/send-code", strings.NewReader(body)))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%.60s: expected 400, got %d", body, rec.Code)
		}
	}
}

func TestClientIP(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.1:1234"
	req.Header.Set("X-Forwarded-For", "6.6.6.6, 1.2.3.4")
	req.Header.Set("CF-Connecting-IP", "5.6.7.8")

	for header, want := range map[string]string{
		"X-Forwarded-For":  "1.2.3.4",
		"CF-Connecting-IP": "5.6.7.8",
		"X-Real-IP":        "10.0.0.1",
		"none":             "10.0.0.1",
	} {
		if ip := newClientIPSource(header).of(req); ip != want {
			t.Errorf("%s: expected %q, got %q", header, want, ip)
		}
	}
}
