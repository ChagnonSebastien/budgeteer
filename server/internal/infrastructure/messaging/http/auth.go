package http

import (
	"cmp"
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"slices"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"chagnon.dev/budget-server/internal/domain/model"

	"github.com/coreos/go-oidc"
	"github.com/google/uuid"
	"golang.org/x/oauth2"

	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"chagnon.dev/budget-server/internal/logging"
	"chagnon.dev/budget-server/internal/ratelimit"
)

type AuthMethods struct {
	OIDC     bool `json:"oidc"`
	UserPass bool `json:"userPass"`
	Guest    bool `json:"guest"`
}

type Claims struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Sub           string `json:"sub"`
	Username      string `json:"preferred_username"`
	Name          string `json:"name"`
	AuthorizedBy  string `json:"azp"`
}

type userRepository interface {
	UserParams(ctx context.Context, userId uuid.UUID) (*model.UserParams, error)
	ResolveOidcUser(ctx context.Context, identity model.OidcIdentity) (uuid.UUID, string, error)
	CreateSession(ctx context.Context, sessionID string, userID uuid.UUID, expiresAt time.Time) error
	SessionIsActive(ctx context.Context, sessionID string, userID uuid.UUID) (bool, error)
	TouchLastSeen(ctx context.Context, userID uuid.UUID) error
	DeleteSession(ctx context.Context, sessionID string) error
	EnsureGuestUser(ctx context.Context, email string) (uuid.UUID, string, error)
	SetDisplayName(ctx context.Context, userId uuid.UUID, displayName string) error
	MergePreferences(ctx context.Context, userId uuid.UUID, patch json.RawMessage, maxSize int) (bool, error)
}

type guestLoginService interface {
	SendLoginCode(ctx context.Context, email, name string) error
	VerifyLoginCode(ctx context.Context, email, code string) (bool, error)
}

type Auth struct {
	UserService       userRepository
	GuestLoginService guestLoginService
	OidcConfig        *oauth2.Config
	verifier          *oidc.IDTokenVerifier
	FrontendPublicUrl string
	OidcIssuer        string
	AuthMethods       AuthMethods

	oidcRevocationEndpoint string

	clientIP          clientIPSource
	guestJWTSecret    []byte
	sendCodeLimiter   *ratelimit.Limiter
	verifyCodeLimiter *ratelimit.Limiter
}

func NewAuth(
	userService userRepository,
	guestLoginService guestLoginService,
	oidcEnabled,
	userPassEnabled,
	guestLoginEnabled bool,
	oidcConfig *oauth2.Config,
	verifier *oidc.IDTokenVerifier,
	serverPublicUrl,
	oidcIssuer,
	oidcRevocationEndpoint,
	clientIPHeader string,
) *Auth {
	frontendUrl := os.Getenv("OVERRIDE_FRONT_END_URL")
	if frontendUrl == "" {
		frontendUrl = serverPublicUrl
	}

	// Generate a secure secret for guest JWT tokens if not provided
	jwtSecret := []byte(os.Getenv("GUEST_JWT_SECRET"))
	if len(jwtSecret) == 0 {
		jwtSecret = make([]byte, 32)
		if _, err := rand.Read(jwtSecret); err != nil {
			panic(fmt.Sprintf("failed to generate JWT secret: %v", err))
		}
	}

	auth := &Auth{
		UserService:            userService,
		GuestLoginService:      guestLoginService,
		OidcConfig:             oidcConfig,
		verifier:               verifier,
		OidcIssuer:             oidcIssuer,
		oidcRevocationEndpoint: oidcRevocationEndpoint,
		FrontendPublicUrl:      frontendUrl,
		AuthMethods: AuthMethods{
			OIDC:     oidcEnabled,
			UserPass: userPassEnabled,
			Guest:    guestLoginEnabled,
		},
		clientIP:          newClientIPSource(clientIPHeader),
		guestJWTSecret:    jwtSecret,
		sendCodeLimiter:   ratelimit.New(5, 15*time.Minute),
		verifyCodeLimiter: ratelimit.New(20, 15*time.Minute),
	}
	return auth
}

func generateStateToken() string {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		panic(err)
	}
	return base64.URLEncoding.EncodeToString(b)
}

func (auth *Auth) ServeMux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/info", auth.infoHandler)
	mux.HandleFunc("/login", auth.loginHandler)
	mux.HandleFunc("/callback", auth.callbackHandler)
	mux.HandleFunc("/userinfo", auth.userInfoHandler)
	mux.HandleFunc("POST /logout", auth.logoutHandler)
	mux.HandleFunc("/guest/send-code", auth.guestSendCodeHandler)
	mux.HandleFunc("/guest/verify-code", auth.guestVerifyCodeHandler)
	mux.HandleFunc("/display-name", auth.displayNameHandler)
	mux.HandleFunc("/preferences", auth.preferencesHandler)
	return mux
}

func (auth *Auth) infoHandler(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(auth.AuthMethods); err != nil {
		logging.FromContext(req.Context()).Error("encoding response", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
}

func (auth *Auth) loginHandler(w http.ResponseWriter, r *http.Request) {
	state := generateStateToken()

	// Bind the state to this login attempt via a short-lived cookie so the
	// callback can verify it. SameSite=Lax (not Strict) so the cookie still
	// accompanies the top-level redirect back from the identity provider.
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth-state",
		Value:    state,
		Path:     "/",
		MaxAge:   int((10 * time.Minute).Seconds()),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	authCodeURL := auth.OidcConfig.AuthCodeURL(
		state,
		oauth2.AccessTypeOnline,
		oauth2.SetAuthURLParam("audience", "budgeteer"),
	)
	http.Redirect(w, r, authCodeURL, http.StatusTemporaryRedirect)
}

func (auth *Auth) callbackHandler(w http.ResponseWriter, r *http.Request) {
	logger := logging.FromContext(r.Context())

	stateCookie, err := r.Cookie("oauth-state")
	if err != nil || stateCookie.Value == "" {
		logger.Error("missing oauth state cookie")
		http.Error(w, "invalid state parameter", http.StatusBadRequest)
		return
	}

	// The state cookie is single-use; clear it regardless of the outcome.
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth-state",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	queryState := r.URL.Query().Get("state")
	if queryState == "" || subtle.ConstantTimeCompare([]byte(queryState), []byte(stateCookie.Value)) != 1 {
		logger.Error("invalid state parameter")
		http.Error(w, "invalid state parameter", http.StatusBadRequest)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		logger.Error("code not found")
		http.Error(w, "code not found", http.StatusBadRequest)
		return
	}

	rawToken, err := auth.OidcConfig.Exchange(r.Context(), code)
	if err != nil {
		logger.Error("token exchange failed", "error", err)
		http.Error(w, "token exchange failed", http.StatusInternalServerError)
		return
	}

	user, err := auth.resolveOidcUser(r.Context(), rawToken.AccessToken)
	if err != nil {
		logger.Error("resolving oidc user", "error", err)
		http.Error(w, "login rejected", oidcFailureStatus(err))
		return
	}

	setOidcTokenCookies(w, rawToken)

	if err := auth.issueSession(r.Context(), w, user); err != nil {
		logger.Error("issuing session", "error", err, "user", user.Email)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, auth.FrontendPublicUrl, http.StatusTemporaryRedirect)
}

func (auth *Auth) logoutHandler(w http.ResponseWriter, r *http.Request) {
	logger := logging.FromContext(r.Context())

	session, sessionErr := auth.readSessionClaims(r.Cookie)
	if sessionErr == nil {
		if err := auth.UserService.DeleteSession(r.Context(), session.sessionID); err != nil {
			logger.Error("deleting session", "error", err)
		}
	}
	auth.revokeRefreshToken(r) // offline_access tokens outlive the IdP end-session redirect

	http.SetCookie(
		w, &http.Cookie{
			Name:     "auth-token",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   true,
		},
	)

	http.SetCookie(
		w, &http.Cookie{
			Name:     "refresh-token",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   true,
		},
	)

	http.SetCookie(
		w, &http.Cookie{
			Name:     "session-token",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   true,
		},
	)

	redirect := auth.FrontendPublicUrl
	if (sessionErr != nil || !session.user.IsGuestUser()) && auth.OidcConfig != nil {
		redirect = fmt.Sprintf(
			"%s/protocol/openid-connect/logout?client_id=%s&post_logout_redirect_uri=%s",
			auth.OidcIssuer,
			auth.OidcConfig.ClientID,
			url.QueryEscape(auth.FrontendPublicUrl),
		)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(logoutResponse{Redirect: redirect}); err != nil {
		logger.Error("encoding response", "error", err)
	}
}

type logoutResponse struct {
	Redirect string `json:"redirect"`
}

type userInfoResponse struct {
	Email                  string            `json:"email"`
	Name                   string            `json:"name"`
	DisplayName            *string           `json:"display_name"`
	DefaultCurrency        *int              `json:"default_currency"`
	HiddenDefaultAccount   *int              `json:"hidden_default_account"`
	AuthentificationMethod shared.AuthMethod `json:"authentification_method"`
	Preferences            json.RawMessage   `json:"preferences"`
	IsAdmin                bool              `json:"is_admin"`
}

func (auth *Auth) userInfoHandler(resp http.ResponseWriter, req *http.Request) {
	logger := logging.FromContext(req.Context())

	user, status, err := auth.authenticate(resp, req)
	if err != nil {
		http.Error(resp, http.StatusText(status), status)
		return
	}

	logger = logger.With("user", user.Email)

	// Get user parameters from database
	params, err := auth.UserService.UserParams(req.Context(), user.ID)
	if err != nil {
		logger.Error("getting user from db", "error", err)
		http.Error(resp, "getting user from db", http.StatusInternalServerError)
		return
	}

	var defaultCurrency *int
	if params.DefaultCurrency != nil {
		id := int(*params.DefaultCurrency)
		defaultCurrency = &id
	}
	hiddenDefaultAccount := int(params.HiddenDefaultAccount)

	response := userInfoResponse{
		Email:                  user.Email,
		Name:                   params.Name,
		DisplayName:            params.DisplayName,
		DefaultCurrency:        defaultCurrency,
		HiddenDefaultAccount:   &hiddenDefaultAccount,
		AuthentificationMethod: user.AuthMethod,
		Preferences:            params.Preferences,
		IsAdmin:                user.HasAdminRights(params.IsAdmin),
	}

	resp.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(resp).Encode(&response); err != nil {
		logger.Error("encoding response", "error", err)
		http.Error(resp, "encoding response", http.StatusInternalServerError)
		return
	}
}

func (auth *Auth) TokenSourceFromCookies(
	ctx context.Context,
	getCookie func(name string) (*http.Cookie, error),
) (oauth2.TokenSource, *http.Cookie, error) {
	var authToken string
	authTokenCookie, err := getCookie("auth-token")
	if errors.Is(err, http.ErrNoCookie) {
		authToken = ""
	} else if err != nil {
		return nil, nil, fmt.Errorf("failed to get auth token: %v", err)
	} else {
		authToken = authTokenCookie.Value
	}

	var refreshToken string
	refreshTokenCookie, err := getCookie("refresh-token")
	if errors.Is(err, http.ErrNoCookie) {
		refreshToken = ""
	} else if err != nil {
		return nil, nil, fmt.Errorf("failed to get refresh token: %v", err)
	} else {
		refreshToken = refreshTokenCookie.Value
	}

	return auth.OidcConfig.TokenSource(
		ctx, &oauth2.Token{
			AccessToken:  authToken,
			RefreshToken: refreshToken,
		},
	), authTokenCookie, nil
}

var errTokenRejected = errors.New("access token rejected")

func (auth *Auth) resolveOidcUser(ctx context.Context, accessToken string) (*shared.User, error) {
	token, err := auth.verifier.Verify(ctx, accessToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", errTokenRejected, err)
	}

	var claims Claims
	if err := token.Claims(&claims); err != nil {
		return nil, fmt.Errorf("%w: parsing claims: %v", errTokenRejected, err)
	}

	clientID := auth.OidcConfig.ClientID // the verifier skips this check since access tokens may not list us in aud
	if claims.AuthorizedBy != clientID && !slices.Contains(token.Audience, clientID) {
		return nil, fmt.Errorf("%w: issued to client %q", errTokenRejected, claims.AuthorizedBy)
	}

	userID, email, err := auth.UserService.ResolveOidcUser(ctx, model.OidcIdentity{
		Sub:           claims.Sub,
		Email:         claims.Email,
		EmailVerified: claims.EmailVerified,
		Username:      claims.Username,
		DisplayName:   cmp.Or(claims.Name, claims.Username),
	})
	if err != nil {
		return nil, fmt.Errorf("resolving user for sub %s: %w", claims.Sub, err)
	}

	return &shared.User{ID: userID, Email: email, AuthMethod: shared.AuthMethodOidc}, nil
}

func oidcFailureStatus(err error) int {
	switch {
	case errors.Is(err, errTokenRejected):
		return http.StatusUnauthorized
	case errors.Is(err, model.ErrOidcEmailUnverified), errors.Is(err, model.ErrOidcEmailTaken):
		return http.StatusForbidden
	default:
		return http.StatusInternalServerError
	}
}

func setOidcTokenCookies(w http.ResponseWriter, token *oauth2.Token) {
	http.SetCookie(w, &http.Cookie{
		Name:     "auth-token",
		Value:    token.AccessToken,
		Path:     "/",
		Expires:  token.Expiry,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh-token",
		Value:    token.RefreshToken,
		Path:     "/",
		Expires:  time.Now().Add(sessionTokenTTL),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})
}

func (auth *Auth) authenticate(w http.ResponseWriter, req *http.Request) (*shared.User, int, error) {
	user, status, err := auth.authenticateRequest(w, req)
	if err != nil {
		level := slog.LevelDebug
		if status >= http.StatusInternalServerError {
			level = slog.LevelError
		}
		logging.FromContext(req.Context()).Log(req.Context(), level, "authenticating request", "error", err)
	}
	return user, status, err
}

func (auth *Auth) authenticateRequest(w http.ResponseWriter, req *http.Request) (*shared.User, int, error) {
	user, sessionErr := auth.parseSessionToken(req.Context(), req.Cookie)
	if sessionErr == nil {
		return user, http.StatusOK, nil
	}
	if auth.OidcConfig == nil {
		return nil, http.StatusUnauthorized, sessionErr
	}

	tokenSource, prevTokenCookie, err := auth.TokenSourceFromCookies(req.Context(), req.Cookie)
	if err != nil {
		return nil, http.StatusInternalServerError, fmt.Errorf("reading tokens from request: %w", err)
	}

	rawToken, err := tokenSource.Token()
	if err != nil {
		return nil, http.StatusUnauthorized, fmt.Errorf("session: %v, getting valid access token: %w", sessionErr, err)
	}

	user, err = auth.resolveOidcUser(req.Context(), rawToken.AccessToken)
	if err != nil {
		return nil, oidcFailureStatus(err), err
	}

	if prevTokenCookie == nil || prevTokenCookie.Value != rawToken.AccessToken {
		setOidcTokenCookies(w, rawToken)
	}

	if err := auth.issueSession(req.Context(), w, user); err != nil {
		return nil, http.StatusInternalServerError, fmt.Errorf("issuing session: %w", err)
	}
	return user, http.StatusOK, nil
}

func (auth *Auth) revokeRefreshToken(r *http.Request) {
	if auth.OidcConfig == nil || auth.oidcRevocationEndpoint == "" {
		return
	}
	refreshCookie, err := r.Cookie("refresh-token")
	if err != nil || refreshCookie.Value == "" {
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	form := url.Values{
		"token":           {refreshCookie.Value},
		"token_type_hint": {"refresh_token"},
		"client_id":       {auth.OidcConfig.ClientID},
		"client_secret":   {auth.OidcConfig.ClientSecret},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, auth.oidcRevocationEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	logger := logging.FromContext(r.Context())
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Error("revoking refresh token", "error", err)
		return
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		logger.Error("revoking refresh token", "status", resp.StatusCode)
	}
}

type guestSendCodeRequest struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type guestVerifyCodeRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type guestVerifyCodeResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

func (auth *Auth) guestSendCodeHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.AuthMethods.Guest {
		http.NotFound(w, r)
		return
	}

	logger := logging.FromContext(r.Context())

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	clientIP := auth.clientIP.of(r)
	if !auth.sendCodeLimiter.Allow(clientIP) {
		logger.Warn("guest send-code rate limited", "ip", clientIP)
		http.Error(w, "Too many requests, please try again later", http.StatusTooManyRequests)
		return
	}

	var req guestSendCodeRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		logger.Error("decoding request", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	email, ok := canonicalEmail(req.Email)
	if !ok {
		http.Error(w, "Invalid email", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(req.Name)
	if !validGuestName(name) {
		http.Error(w, "Invalid name", http.StatusBadRequest)
		return
	}

	if err := auth.GuestLoginService.SendLoginCode(r.Context(), email, name); err != nil {
		logger.Error("sending login code", "error", err, "email", email)
		http.Error(w, "Failed to send code", http.StatusInternalServerError)
		return
	}

	logger.Info("sent guest login code", "email", email)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Code sent successfully"})
}

func (auth *Auth) guestVerifyCodeHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.AuthMethods.Guest {
		http.NotFound(w, r)
		return
	}

	logger := logging.FromContext(r.Context())

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	clientIP := auth.clientIP.of(r)
	if !auth.verifyCodeLimiter.Allow(clientIP) {
		logger.Warn("guest verify-code rate limited", "ip", clientIP)
		writeGuestVerifyFailure(w, http.StatusTooManyRequests, "Too many attempts, please try again later")
		return
	}

	var req guestVerifyCodeRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		logger.Error("decoding request", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	email, ok := canonicalEmail(req.Email)
	if !ok {
		writeGuestVerifyFailure(w, http.StatusBadRequest, "Invalid email")
		return
	}

	valid, err := auth.GuestLoginService.VerifyLoginCode(r.Context(), email, req.Code)
	if err != nil {
		logger.Error("verifying login code", "error", err, "email", email)
		writeGuestVerifyFailure(w, http.StatusUnauthorized, "Invalid or expired code")
		return
	}

	if !valid {
		logger.Warn("invalid guest login code", "email", email)
		writeGuestVerifyFailure(w, http.StatusUnauthorized, "Invalid code")
		return
	}

	logger.Info("guest login code verified successfully", "email", email)

	// The DB-assigned id, so the session token and persisted rows name the same user.
	userID, storedEmail, err := auth.UserService.EnsureGuestUser(r.Context(), email)
	if err != nil {
		logger.Error("upserting guest user", "error", err, "email", email)
		writeGuestVerifyFailure(w, http.StatusInternalServerError, "Failed to create user session")
		return
	}

	guest := &shared.User{ID: userID, Email: storedEmail, AuthMethod: shared.AuthMethodGuest}
	if err := auth.issueSession(r.Context(), w, guest); err != nil {
		logger.Error("issuing guest session", "error", err, "email", email)
		writeGuestVerifyFailure(w, http.StatusInternalServerError, "Failed to generate authentication tokens")
		return
	}

	logger.Info("guest user authenticated successfully", "email", email, "userID", userID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(guestVerifyCodeResponse{
		Success: true,
		Message: "Authentication successful",
	})
}

func writeGuestVerifyFailure(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(guestVerifyCodeResponse{Success: false, Message: message})
}

func canonicalEmail(raw string) (string, bool) {
	trimmed := strings.TrimSpace(raw)
	// ParseAddress also accepts "Name <addr>", which would dodge the per-email cooldown.
	addr, err := mail.ParseAddress(trimmed)
	if err != nil || addr.Address != trimmed {
		return "", false
	}
	return strings.ToLower(addr.Address), true
}

func validGuestName(name string) bool {
	if utf8.RuneCountInString(name) > maxDisplayNameLength {
		return false
	}
	return !strings.ContainsFunc(name, unicode.IsControl)
}

const maxDisplayNameLength = 64

type displayNameRequest struct {
	Name string `json:"name"`
}

func (auth *Auth) displayNameHandler(w http.ResponseWriter, r *http.Request) {
	logger := logging.FromContext(r.Context())

	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := auth.parseSessionToken(r.Context(), r.Cookie)
	if err != nil {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	var req displayNameRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" || utf8.RuneCountInString(name) > maxDisplayNameLength {
		http.Error(w, "invalid name", http.StatusBadRequest)
		return
	}

	if err := auth.UserService.SetDisplayName(r.Context(), user.ID, name); err != nil {
		logger.Error("setting display name", "error", err, "user", user.Email)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

const maxPreferencesSize = 16 * 1024

func validPreferencesPatch(patch map[string]json.RawMessage) bool {
	raw, ok := patch["sharedExpensesOnly"]
	if !ok {
		return true
	}
	var sharedExpensesOnly *bool
	return json.Unmarshal(raw, &sharedExpensesOnly) == nil
}

func (auth *Auth) preferencesHandler(w http.ResponseWriter, r *http.Request) {
	logger := logging.FromContext(r.Context())

	if r.Method != http.MethodPatch {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := auth.parseSessionToken(r.Context(), r.Cookie)
	if err != nil {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	var patch map[string]json.RawMessage
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&patch); err != nil || patch == nil || !validPreferencesPatch(patch) {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	encoded, err := json.Marshal(patch)
	if err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	merged, err := auth.UserService.MergePreferences(r.Context(), user.ID, encoded, maxPreferencesSize)
	if err != nil {
		logger.Error("merging preferences", "error", err, "user", user.Email)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if !merged {
		http.Error(w, "preferences too large", http.StatusRequestEntityTooLarge)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
