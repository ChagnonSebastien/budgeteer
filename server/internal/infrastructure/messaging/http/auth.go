package http

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"time"

	"golang.org/x/oauth2"
)

type Auth struct {
	OidcConfig        *oauth2.Config
	FrontendPublicUrl string
	OidcIssuer        string

	stateToken string
}

func NewAuth(
	oidcConfig *oauth2.Config,
	serverPublicUrl string,
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
	mux.HandleFunc("/info", auth.loginHandler)
	mux.HandleFunc("/login", auth.loginHandler)
	mux.HandleFunc("/callback", auth.callbackHandler)
	mux.HandleFunc("/userinfo", auth.userInfoHandler)
	mux.HandleFunc("/refresh-token", auth.refreshTokenHandler)
	mux.HandleFunc("/logout", auth.logoutHandler)
	return mux
}

func (auth *Auth) loginHandler(w http.ResponseWriter, r *http.Request) {
	url := auth.OidcConfig.AuthCodeURL(auth.stateToken)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
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
	json.NewEncoder(w).Encode(newToken)
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

func (auth *Auth) userInfoHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("auth-token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	client := auth.OidcConfig.Client(
		r.Context(), &oauth2.Token{
			AccessToken: cookie.Value,
		},
	)

	resp, err := client.Get(fmt.Sprintf("%s/protocol/openid-connect/userinfo", auth.OidcIssuer))
	if err != nil {
		http.Error(w, "Failed to get user info", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var profile map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&profile)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}
