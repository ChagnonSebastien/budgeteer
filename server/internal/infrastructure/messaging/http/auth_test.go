package http

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
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
	auth := NewAuth(users, nil, true, false, true, &oauth2.Config{ClientID: testClientID}, verifier, "https://app.example.com", testIssuer, "")
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
		Sub: "sub-1", Email: "a@example.com", EmailVerified: true, Username: "a",
	}).Return(uuid.New(), "a@example.com", nil).Once()
	users.EXPECT().ResolveOidcUser(mock.Anything, model.OidcIdentity{
		Sub: "sub-1", Email: "b@example.com", Username: "b",
	}).Return(uuid.Nil, "", model.ErrOidcEmailUnverified).Once()

	_, err := auth.resolveOidcUser(context.Background(), idp.token(t, map[string]any{
		"azp": testClientID, "email": "a@example.com", "email_verified": true, "preferred_username": "a",
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

	logoutReq := httptest.NewRequest(http.MethodGet, "/logout", nil)
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
