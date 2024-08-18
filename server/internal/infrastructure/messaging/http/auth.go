package http

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/coreos/go-oidc"
	"golang.org/x/oauth2"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

type AuthMethods struct {
	OIDC     bool `json:"oidc"`
	UserPass bool `json:"userPass"`
}

type Auth struct {
	UserService       *service.UserService
	OidcConfig        *oauth2.Config
	verifier          *oidc.IDTokenVerifier
	FrontendPublicUrl string
	OidcIssuer        string
	AuthMethods       AuthMethods

	stateToken string
}

func NewAuth(
	userService *service.UserService,
	oidcEnabled,
	userPassEnabled bool,
	oidcConfig *oauth2.Config,
	verifier *oidc.IDTokenVerifier,
	serverPublicUrl,
	oidcIssuer string,
) *Auth {
	frontendUrl := os.Getenv("OVERRIDE_FRONT_END_URL")
	if frontendUrl == "" {
		frontendUrl = serverPublicUrl
	}

	auth := &Auth{
		UserService:       userService,
		OidcConfig:        oidcConfig,
		verifier:          verifier,
		OidcIssuer:        oidcIssuer,
		FrontendPublicUrl: frontendUrl,
		AuthMethods: AuthMethods{
			OIDC:     oidcEnabled,
			UserPass: userPassEnabled,
		},
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
	return mux
}

func (auth *Auth) infoHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(auth.AuthMethods); err != nil {
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
	if r.URL.Query().Get("state") != auth.stateToken {
		http.Error(w, "Invalid state parameter", http.StatusBadRequest)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Code not found", http.StatusBadRequest)
		return
	}

	rawToken, err := auth.OidcConfig.Exchange(r.Context(), code)
	if err != nil {
		http.Error(w, "Token exchange failed", http.StatusInternalServerError)
		return
	}

	token, err := auth.verifier.Verify(r.Context(), rawToken.AccessToken)
	if err != nil {
		http.Error(w, "verifying access token", http.StatusUnauthorized)
		return
	}

	var tokenClaims shared.Claims
	if err := token.Claims(&tokenClaims); err != nil {
		http.Error(w, "parsing claims", http.StatusInternalServerError)
	}

	if err := auth.UserService.Upsert(
		r.Context(),
		tokenClaims.Sub,
		tokenClaims.Username,
		tokenClaims.Email,
	); err != nil {
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
	tokenSource, prevTokenCookie, err := auth.TokenSourceFromCookies(req.Context(), req.Cookie)
	if err != nil {
		http.Error(resp, "reading tokens from request", http.StatusInternalServerError)
		return
	}

	rawToken, err := tokenSource.Token()
	if err != nil {
		log.Printf("getting valid access token: %s", err)
		http.Error(resp, "getting valid access token", http.StatusUnauthorized)
		return
	}

	token, err := auth.verifier.Verify(req.Context(), rawToken.AccessToken)
	if err != nil {
		log.Printf("verifying access token: %s", err)
		http.Error(resp, "verifying access token", http.StatusUnauthorized)
		return
	}

	var tokenClaims shared.Claims
	if err := token.Claims(&tokenClaims); err != nil {
		http.Error(resp, "parsing claims", http.StatusInternalServerError)
	}

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

	resp.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(resp).Encode(tokenClaims); err != nil {
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

	println(authToken, refreshToken)

	return auth.OidcConfig.TokenSource(
		ctx, &oauth2.Token{
			AccessToken:  authToken,
			RefreshToken: refreshToken,
		},
	), authTokenCookie, nil
}
