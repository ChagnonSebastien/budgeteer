package http

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"

	"github.com/coreos/go-oidc"
	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
	"github.com/google/uuid"
	"golang.org/x/oauth2"

	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"chagnon.dev/budget-server/internal/logging"
)

type AuthMethods struct {
	OIDC     bool `json:"oidc"`
	UserPass bool `json:"userPass"`
	Guest    bool `json:"guest"`
}

type Claims struct {
	Email    string `json:"email"`
	Sub      string `json:"sub"`
	Username string `json:"preferred_username"`
	Name     string `json:"name"`
}

type userRepository interface {
	UpsertUser(ctx context.Context, username, email string, oidcSub model.Optional[string]) error
	UserParams(ctx context.Context, userId uuid.UUID) (*model.UserParams, error)
	UpsertOidcUser(ctx context.Context, oidcSub, email, username string) (uuid.UUID, error)
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

	stateToken     string
	guestJWTSecret []byte
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
	oidcIssuer string,
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
		UserService:       userService,
		GuestLoginService: guestLoginService,
		OidcConfig:        oidcConfig,
		verifier:          verifier,
		OidcIssuer:        oidcIssuer,
		FrontendPublicUrl: frontendUrl,
		AuthMethods: AuthMethods{
			OIDC:     oidcEnabled,
			UserPass: userPassEnabled,
			Guest:    guestLoginEnabled,
		},
		guestJWTSecret: jwtSecret,
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
	auth.stateToken = generateStateToken()
	mux := http.NewServeMux()
	mux.HandleFunc("/info", auth.infoHandler)
	mux.HandleFunc("/login", auth.loginHandler)
	mux.HandleFunc("/callback", auth.callbackHandler)
	mux.HandleFunc("/userinfo", auth.userInfoHandler)
	mux.HandleFunc("/logout", auth.logoutHandler)
	mux.HandleFunc("/guest/send-code", auth.guestSendCodeHandler)
	mux.HandleFunc("/guest/verify-code", auth.guestVerifyCodeHandler)
	return mux
}

func (auth *Auth) infoHandler(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(auth.AuthMethods); err != nil {
		logging.FromContext(req.Context()).Error("encoding response")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (auth *Auth) loginHandler(w http.ResponseWriter, r *http.Request) {
	authCodeURL := auth.OidcConfig.AuthCodeURL(
		auth.stateToken,
		oauth2.AccessTypeOnline,
		oauth2.SetAuthURLParam("audience", "budgeteer"),
	)
	http.Redirect(w, r, authCodeURL, http.StatusTemporaryRedirect)
}

func (auth *Auth) callbackHandler(w http.ResponseWriter, r *http.Request) {
	logger := logging.FromContext(r.Context())

	if r.URL.Query().Get("state") != auth.stateToken {
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

	token, err := auth.verifier.Verify(r.Context(), rawToken.AccessToken)
	if err != nil {
		logger.Error("verifying access token", "error", err)
		http.Error(w, "verifying access token", http.StatusUnauthorized)
		return
	}

	var tokenClaims Claims
	if err := token.Claims(&tokenClaims); err != nil {
		logger.Error("parsing claims", "error", err)
		http.Error(w, "parsing claims", http.StatusInternalServerError)
	}

	logger = logger.With("user", tokenClaims.Email)

	if err := auth.UserService.UpsertUser(
		r.Context(),
		tokenClaims.Username,
		tokenClaims.Email,
		model.Some(tokenClaims.Sub),
	); err != nil {
		logger.Error("syncing user with database", "error", err)
		http.Error(w, "syncing user with database", http.StatusInternalServerError)
		return
	}

	http.SetCookie(
		w, &http.Cookie{
			Name:     "auth-token",
			Value:    rawToken.AccessToken,
			Path:     "/",
			Expires:  rawToken.Expiry,
			HttpOnly: true,
			Secure:   true,
		},
	)

	http.SetCookie(
		w, &http.Cookie{
			Name:     "refresh-token",
			Value:    rawToken.RefreshToken,
			Path:     "/",
			Expires:  time.Now().Add(7 * 24 * time.Hour),
			HttpOnly: true,
			Secure:   true,
		},
	)

	userId, err := auth.UserService.UpsertOidcUser(r.Context(), tokenClaims.Sub, tokenClaims.Email, tokenClaims.Username)
	if err != nil {
		logger.Error("upserting oidc user", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	sessionToken, err := auth.generateSessionToken(userId, tokenClaims.Email, shared.AuthMethodGuest)
	if err != nil {
		logger.Error("generating session token", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session-token",
		Value:    sessionToken,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	http.Redirect(w, r, auth.FrontendPublicUrl, http.StatusTemporaryRedirect)
}

func (auth *Auth) logoutHandler(w http.ResponseWriter, r *http.Request) {
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

	logoutURL := fmt.Sprintf(
		"%s/protocol/openid-connect/logout?client_id=%s&post_logout_redirect_uri=%s",
		auth.OidcIssuer,
		auth.OidcConfig.ClientID,
		url.QueryEscape(auth.FrontendPublicUrl),
	)

	http.Redirect(w, r, logoutURL, http.StatusTemporaryRedirect)
}

type userInfoResponse struct {
	Email                  string            `json:"email"`
	Name                   string            `json:"name"`
	DefaultCurrency        *int              `json:"default_currency"`
	HiddenDefaultAccount   *int              `json:"hidden_default_account"`
	AuthentificationMethod shared.AuthMethod `json:"authentification_method"`
}

func (auth *Auth) userInfoHandler(resp http.ResponseWriter, req *http.Request) {
	logger := logging.FromContext(req.Context())

	// Try to parse JWT token
	user, err := auth.parseSessionToken(req.Cookie)
	if err != nil && !errors.Is(err, jwt.ErrInvalidContentType) {
		logger.DebugContext(req.Context(), "parsing guest token", "error", err)
	}

	logger = logger.With("user", user.Email)

	// Get user parameters from database
	params, err := auth.UserService.UserParams(req.Context(), user.ID)
	if err != nil {
		logger.Error("getting user from db", "error", err)
		http.Error(resp, "getting user from db", http.StatusInternalServerError)
		return
	}

	defaultCurrency := int(params.DefaultCurrency)
	hiddenDefaultAccount := int(params.HiddenDefaultAccount)

	response := userInfoResponse{
		Email:                  user.Email,
		Name:                   params.Name,
		DefaultCurrency:        &defaultCurrency,
		HiddenDefaultAccount:   &hiddenDefaultAccount,
		AuthentificationMethod: shared.AuthMethodOidc,
	}

	resp.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(resp).Encode(&response); err != nil {
		logger.Error("encoding response", "error", err)
		http.Error(resp, "encoding response", http.StatusInternalServerError)
		return
	}
}

// parseSessionToken attempts to parse and verify a session JWT token
// Returns user data if the token is a valid session token, false otherwise
func (auth *Auth) parseSessionToken(getCookie func(name string) (*http.Cookie, error)) (*shared.User, error) {
	authTokenCookie, err := getCookie("session-token")
	if err != nil {
		return nil, fmt.Errorf("no session token")
	}

	token, err := jwt.ParseSigned(authTokenCookie.Value, []jose.SignatureAlgorithm{jose.HS256})
	if err != nil {
		return nil, fmt.Errorf("parsing session token: %w", err)
	}

	var tokenMap map[string]interface{}
	if err := token.Claims(auth.guestJWTSecret, &tokenMap); err != nil {
		return nil, err
	}

	var user shared.User
	if id, ok := tokenMap["id"].(string); ok {
		user.ID, err = uuid.Parse(id)
		if err != nil {
			return nil, fmt.Errorf("parsing id [%s] from claims map: %w", id, err)
		}
	}
	if email, ok := tokenMap["email"].(string); ok {
		user.Email = email
	}
	if authMethod, ok := tokenMap["authentification_method"].(shared.AuthMethod); ok {
		user.AuthMethod = authMethod
	}

	return &user, nil
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
	logger := logging.FromContext(r.Context())

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req guestSendCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("decoding request", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := auth.GuestLoginService.SendLoginCode(r.Context(), req.Email, req.Name); err != nil {
		logger.Error("sending login code", "error", err, "email", req.Email)
		http.Error(w, fmt.Sprintf("Failed to send code: %v", err), http.StatusInternalServerError)
		return
	}

	logger.Info("sent guest login code", "email", req.Email)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Code sent successfully"})
}

func (auth *Auth) guestVerifyCodeHandler(w http.ResponseWriter, r *http.Request) {
	logger := logging.FromContext(r.Context())

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req guestVerifyCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("decoding request", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	valid, err := auth.GuestLoginService.VerifyLoginCode(r.Context(), req.Email, req.Code)
	if err != nil {
		logger.Error("verifying login code", "error", err, "email", req.Email)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(guestVerifyCodeResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	if !valid {
		logger.Warn("invalid guest login code", "email", req.Email)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(guestVerifyCodeResponse{
			Success: false,
			Message: "Invalid code",
		})
		return
	}

	logger.Info("guest login code verified successfully", "email", req.Email)

	// Generate user ID for guest user (using UUID derived from email for consistency)
	userID := uuid.NewSHA1(uuid.NameSpaceOID, []byte(req.Email))

	// Create or update the guest user in the database
	username := req.Email // Use email as username for guest users
	if err := auth.UserService.UpsertUser(r.Context(), username, req.Email, model.None[string]()); err != nil {
		logger.Error("upserting guest user", "error", err, "email", req.Email)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(guestVerifyCodeResponse{
			Success: false,
			Message: "Failed to create user session",
		})
		return
	}

	// Generate session token for the guest user
	sessionToken, err := auth.generateSessionToken(userID, req.Email, shared.AuthMethodGuest)
	if err != nil {
		logger.Error("generating guest token", "error", err, "email", req.Email)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(guestVerifyCodeResponse{
			Success: false,
			Message: "Failed to generate authentication tokens",
		})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session-token",
		Value:    sessionToken,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	logger.Info("guest user authenticated successfully", "email", req.Email, "userID", userID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(guestVerifyCodeResponse{
		Success: true,
		Message: "Authentication successful",
	})
}

func (auth *Auth) generateSessionToken(userID uuid.UUID, email string, authMethod shared.AuthMethod) (sessionToken string, err error) {
	signer, err := jose.NewSigner(
		jose.SigningKey{Algorithm: jose.HS256, Key: auth.guestJWTSecret},
		(&jose.SignerOptions{}).WithType("JWT"),
	)
	if err != nil {
		return "", fmt.Errorf("creating JWT signer: %w", err)
	}

	sessionTokenMap := map[string]interface{}{
		"id":                      userID,
		"email":                   email,
		"authentification_method": authMethod,
	}

	sessionToken, err = jwt.Signed(signer).Claims(sessionTokenMap).Serialize()
	if err != nil {
		return "", fmt.Errorf("signing session token: %w", err)
	}

	return sessionToken, nil
}
