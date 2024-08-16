package http

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"golang.org/x/oauth2"
)

type AuthMethods struct {
	OIDC     bool `json:"oidc"`
	UserPass bool `json:"userPass"`
}

type Auth struct {
	OidcConfig        *oauth2.Config
	FrontendPublicUrl string
	OidcIssuer        string
	AuthMethods       AuthMethods

	stateToken string
}

func NewAuth(
	oidcEnabled,
	userPassEnabled bool,
	oidcConfig *oauth2.Config,
	serverPublicUrl,
	oidcIssuer string,
) *Auth {
	frontendUrl := os.Getenv("OVERRIDE_FRONT_END_URL")
	if frontendUrl == "" {
		frontendUrl = serverPublicUrl
	}

	auth := &Auth{
		OidcConfig:        oidcConfig,
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
	mux.HandleFunc("/refresh-token", auth.refreshTokenHandler)
	mux.HandleFunc("/logout", auth.logoutHandler)
	return mux
}

func (auth *Auth) infoHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(auth.AuthMethods); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (auth *Auth) loginHandler(w http.ResponseWriter, r *http.Request) {
	authCodeURL := auth.OidcConfig.AuthCodeURL(auth.stateToken)
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

	token, err := auth.OidcConfig.Exchange(r.Context(), code)
	if err != nil {
		http.Error(w, "Token exchange failed", http.StatusInternalServerError)
		return
	}

	http.SetCookie(
		w, &http.Cookie{
			Name:     "auth-token",
			Value:    token.AccessToken,
			Path:     "/",
			Expires:  time.Now().Add(time.Duration(token.Expiry.Second()) * time.Second),
			HttpOnly: true,
			Secure:   true,
		},
	)

	http.SetCookie(
		w, &http.Cookie{
			Name:     "refresh-token",
			Value:    token.RefreshToken,
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

func (auth *Auth) fetchUserInfo(ctx context.Context, token *oauth2.Token) (*map[string]interface{}, error) {
	client := auth.OidcConfig.Client(ctx, token)

	resp, err := client.Get(fmt.Sprintf("%s/protocol/openid-connect/userinfo", auth.OidcIssuer))
	if err != nil {
		return nil, err
	}
	defer func() {
		err := resp.Body.Close()
		if err != nil {
			log.Printf("Failed to close response body: %v", err)
		}
	}()

	var profile map[string]interface{}
	return &profile, json.NewDecoder(resp.Body).Decode(&profile)
}

func (auth *Auth) userInfoHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("auth-token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profile, err := auth.fetchUserInfo(
		r.Context(), &oauth2.Token{
			AccessToken: cookie.Value,
		},
	)
	if err != nil {
		http.Error(w, "Fetching user Info", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(profile)
	if err != nil {
		log.Printf("failed to encode profile: %v", err)
		http.Error(w, "encoding response", http.StatusInternalServerError)
	}
}

func (auth *Auth) refreshTokenHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh-token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tokenSource := auth.OidcConfig.TokenSource(
		r.Context(), &oauth2.Token{
			RefreshToken: cookie.Value,
		},
	)

	newToken, err := tokenSource.Token()
	if err != nil {
		http.Error(w, "Token refresh failed", http.StatusInternalServerError)
		return
	}

	profile, err := auth.fetchUserInfo(r.Context(), newToken)
	if err != nil {
		http.Error(w, "Fetching user Info", http.StatusInternalServerError)
		return
	}

	http.SetCookie(
		w, &http.Cookie{
			Name:     "auth-token",
			Value:    newToken.AccessToken,
			Path:     "/",
			Expires:  newToken.Expiry,
			HttpOnly: true,
			Secure:   true,
		},
	)

	http.SetCookie(
		w, &http.Cookie{
			Name:     "refresh-token",
			Value:    newToken.RefreshToken,
			Path:     "/",
			Expires:  time.Now().Add(7 * 24 * time.Hour),
			HttpOnly: true,
			Secure:   true,
		},
	)

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(profile)
	if err != nil {
		log.Printf("failed to encode profile: %v", err)
		http.Error(w, "encoding response", http.StatusInternalServerError)
	}
}
