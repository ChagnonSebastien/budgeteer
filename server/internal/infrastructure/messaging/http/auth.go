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
	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"gopkg.in/go-jose/go-jose.v2"
	"gopkg.in/go-jose/go-jose.v2/jwt"

	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"chagnon.dev/budget-server/internal/logging"
)

type AuthMethods struct {
	OIDC     bool `json:"oidc"`
	UserPass bool `json:"userPass"`
	Guest    bool `json:"guest"`
}

type userRepository interface {
	UpsertUser(ctx context.Context, id, username, email string) error
	UserParams(ctx context.Context, id string) (*model.UserParams, error)
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

	var tokenClaims shared.Claims
	if err := token.Claims(&tokenClaims); err != nil {
		logger.Error("parsing claims", "error", err)
		http.Error(w, "parsing claims", http.StatusInternalServerError)
	}

	logger = logger.With("user", tokenClaims.Email)

	if err := auth.UserService.UpsertUser(
		r.Context(),
		tokenClaims.Sub,
		tokenClaims.Username,
		tokenClaims.Email,
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

	logoutURL := fmt.Sprintf(
		"%s/protocol/openid-connect/logout?client_id=%s&post_logout_redirect_uri=%s",
		auth.OidcIssuer,
		auth.OidcConfig.ClientID,
		url.QueryEscape(auth.FrontendPublicUrl),
	)

	http.Redirect(w, r, logoutURL, http.StatusTemporaryRedirect)
}

func (auth *Auth) userInfoHandler(resp http.ResponseWriter, req *http.Request) {
	logger := logging.FromContext(req.Context())

	// Get token from cookie
	authTokenCookie, err := req.Cookie("auth-token")
	if err != nil {
		logger.Error("getting auth token cookie", "error", err)
		http.Error(resp, "authentication required", http.StatusUnauthorized)
		return
	}

	accessToken := authTokenCookie.Value

	// Try to parse as guest JWT token first
	var tokenClaims shared.Claims
	isGuestToken, err := auth.parseGuestToken(accessToken, &tokenClaims)
	if err != nil && !errors.Is(err, jwt.ErrInvalidContentType) {
		logger.Error("parsing guest token", "error", err)
	}

	if !isGuestToken {
		// Fall back to OIDC token verification
		tokenSource, prevTokenCookie, err := auth.TokenSourceFromCookies(req.Context(), req.Cookie)
		if err != nil {
			http.Error(resp, "reading tokens from request", http.StatusInternalServerError)
			return
		}

		rawToken, err := tokenSource.Token()
		if err != nil {
			logger.Error("getting valid access token", "error", err)
			http.Error(resp, "getting valid access token", http.StatusUnauthorized)
			return
		}

		token, err := auth.verifier.Verify(req.Context(), rawToken.AccessToken)
		if err != nil {
			logger.Error("verifying access token", "error", err)
			http.Error(resp, "verifying access token", http.StatusUnauthorized)
			return
		}

		if err := token.Claims(&tokenClaims); err != nil {
			logger.Error("parsing claims", "error", err)
			http.Error(resp, "parsing claims", http.StatusInternalServerError)
			return
		}

		// Refresh cookies if token was refreshed
		if prevTokenCookie == nil || prevTokenCookie.Value != rawToken.AccessToken {
			http.SetCookie(
				resp, &http.Cookie{
					Name:     "auth-token",
					Value:    rawToken.AccessToken,
					Path:     "/",
					Expires:  rawToken.Expiry,
					HttpOnly: true,
					Secure:   true,
				},
			)

			http.SetCookie(
				resp, &http.Cookie{
					Name:     "refresh-token",
					Value:    rawToken.RefreshToken,
					Path:     "/",
					Expires:  time.Now().Add(7 * 24 * time.Hour),
					HttpOnly: true,
					Secure:   true,
				},
			)
		}
	}

	logger = logger.With("user", tokenClaims.Email)

	// Get user parameters from database
	params, err := auth.UserService.UserParams(req.Context(), tokenClaims.Sub)
	if err != nil {
		logger.Error("getting user from db", "error", err)
		http.Error(resp, "getting user from db", http.StatusInternalServerError)
		return
	}

	tokenClaims.HiddenDefaultAccount = (*int)(&params.HiddenDefaultAccount)

	if params.DefaultCurrency != 0 {
		tokenClaims.DefaultCurrency = (*int)(&params.DefaultCurrency)
	}

	resp.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(resp).Encode(tokenClaims); err != nil {
		logger.Error("encoding response", "error", err)
		http.Error(resp, "encoding response", http.StatusInternalServerError)
		return
	}
}

// parseGuestToken attempts to parse and verify a guest JWT token
// Returns true if the token is a valid guest token, false otherwise
func (auth *Auth) parseGuestToken(tokenString string, claims *shared.Claims) (bool, error) {
	// Parse the JWT token
	token, err := jwt.ParseSigned(tokenString)
	if err != nil {
		return false, err
	}

	// Extract claims into a map first
	var claimsMap map[string]interface{}
	if err := token.Claims(auth.guestJWTSecret, &claimsMap); err != nil {
		return false, err
	}

	// Check if this is a guest token by looking at the issuer
	issuer, ok := claimsMap["iss"].(string)
	if !ok || issuer != "budgeteer-guest" {
		return false, nil
	}

	// Verify expiry
	if exp, ok := claimsMap["exp"].(float64); ok {
		if time.Now().Unix() > int64(exp) {
			return false, fmt.Errorf("token expired")
		}
	} else {
		return false, fmt.Errorf("missing expiry claim")
	}

	// Map the claims to the shared.Claims structure
	if sub, ok := claimsMap["sub"].(string); ok {
		claims.Sub = sub
	}
	if email, ok := claimsMap["email"].(string); ok {
		claims.Email = email
	}
	if username, ok := claimsMap["preferred_username"].(string); ok {
		claims.Username = username
	}
	if name, ok := claimsMap["name"].(string); ok {
		claims.Name = name
	}
	if isGuest, ok := claimsMap["is_guest"].(bool); ok {
		claims.IsGuest = isGuest
	}

	return true, nil
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
	userID := "guest-" + uuid.NewSHA1(uuid.NameSpaceOID, []byte(req.Email)).String()

	// Create or update the guest user in the database
	username := req.Email // Use email as username for guest users
	if err := auth.UserService.UpsertUser(r.Context(), userID, username, req.Email); err != nil {
		logger.Error("upserting guest user", "error", err, "email", req.Email)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(guestVerifyCodeResponse{
			Success: false,
			Message: "Failed to create user session",
		})
		return
	}

	// Generate JWT tokens for the guest user
	accessToken, refreshToken, expiry, err := auth.generateGuestTokens(userID, req.Email, username)
	if err != nil {
		logger.Error("generating guest tokens", "error", err, "email", req.Email)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(guestVerifyCodeResponse{
			Success: false,
			Message: "Failed to generate authentication tokens",
		})
		return
	}

	// Set authentication cookies
	http.SetCookie(w, &http.Cookie{
		Name:     "auth-token",
		Value:    accessToken,
		Path:     "/",
		Expires:  expiry,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh-token",
		Value:    refreshToken,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	logger.Info("guest user authenticated successfully", "email", req.Email, "userID", userID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(guestVerifyCodeResponse{
		Success: true,
		Message: "Authentication successful",
	})
}

// generateGuestTokens creates JWT access and refresh tokens for guest users
func (auth *Auth) generateGuestTokens(userID, email, username string) (accessToken, refreshToken string, expiry time.Time, err error) {
	// Create signer for JWT tokens
	signer, err := jose.NewSigner(
		jose.SigningKey{Algorithm: jose.HS256, Key: auth.guestJWTSecret},
		(&jose.SignerOptions{}).WithType("JWT"),
	)
	if err != nil {
		return "", "", time.Time{}, fmt.Errorf("creating JWT signer: %w", err)
	}

	// Access token expires in 1 hour
	expiry = time.Now().Add(1 * time.Hour)

	// Create claims for access token
	accessClaimsMap := map[string]interface{}{
		"sub":                userID,
		"email":              email,
		"preferred_username": username,
		"name":               username,
		"is_guest":           true,
		"iss":                "budgeteer-guest",
		"aud":                "budgeteer",
		"exp":                expiry.Unix(),
		"iat":                time.Now().Unix(),
	}

	// Sign access token
	accessToken, err = jwt.Signed(signer).Claims(accessClaimsMap).CompactSerialize()
	if err != nil {
		return "", "", time.Time{}, fmt.Errorf("signing access token: %w", err)
	}

	// Refresh token expires in 7 days
	refreshExpiry := time.Now().Add(7 * 24 * time.Hour)

	// Create claims for refresh token
	refreshClaimsMap := map[string]interface{}{
		"sub":  userID,
		"type": "refresh",
		"iss":  "budgeteer-guest",
		"aud":  "budgeteer",
		"exp":  refreshExpiry.Unix(),
		"iat":  time.Now().Unix(),
	}

	// Sign refresh token
	refreshToken, err = jwt.Signed(signer).Claims(refreshClaimsMap).CompactSerialize()
	if err != nil {
		return "", "", time.Time{}, fmt.Errorf("signing refresh token: %w", err)
	}

	return accessToken, refreshToken, expiry, nil
}
