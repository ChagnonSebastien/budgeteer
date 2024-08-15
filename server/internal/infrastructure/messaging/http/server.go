package http

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"golang.org/x/oauth2"
	"google.golang.org/grpc"
)

const serverPort = 8080
const webDirectory = "/app/static/web"

type GrpcWebServer struct {
	GrpcServer      *grpc.Server
	OidcConfig      *oauth2.Config
	wrappedGrpc     *grpcweb.WrappedGrpcServer
	stateToken      string
	ServerPublicUrl string
	OidcIssuer      string
}

func (s *GrpcWebServer) Serve() {
	s.wrappedGrpc = grpcweb.WrapServer(s.GrpcServer)
	s.stateToken = s.generateStateToken()

	mux := http.NewServeMux()

	mux.HandleFunc("/login", s.loginHandler)
	mux.HandleFunc("/callback", s.callbackHandler)
	mux.HandleFunc("/refresh-token", s.refreshTokenHandler)
	mux.HandleFunc("/logout", s.logoutHandler)
	mux.HandleFunc("/userinfo", s.userInfoHandler)

	mux.HandleFunc("/", s.catchAllHandler)

	httpServer := &http.Server{
		Handler: mux,
		Addr:    fmt.Sprintf(":%d", serverPort),
	}

	log.Printf("Server is running on port :%d\n", serverPort)
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

func (s *GrpcWebServer) catchAllHandler(resp http.ResponseWriter, req *http.Request) {
	if s.wrappedGrpc.IsGrpcWebRequest(req) {
		s.wrappedGrpc.ServeHTTP(resp, req)
		return
	}

	if req.URL.Path != "/" {
		filePath := filepath.Join(webDirectory, req.URL.Path)
		_, err := os.Stat(filePath)
		if err == nil {
			http.ServeFile(resp, req, filePath)
			return
		}
	}

	http.ServeFile(resp, req, filepath.Join(webDirectory, "index.html"))
}

func (s *GrpcWebServer) generateStateToken() string {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		panic(err)
	}
	return base64.URLEncoding.EncodeToString(b)
}

func (s *GrpcWebServer) loginHandler(w http.ResponseWriter, r *http.Request) {
	url := s.OidcConfig.AuthCodeURL(s.stateToken)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (s *GrpcWebServer) callbackHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("state") != s.stateToken {
		http.Error(w, "Invalid state parameter", http.StatusBadRequest)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Code not found", http.StatusBadRequest)
		return
	}

	token, err := s.OidcConfig.Exchange(r.Context(), code)
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

	http.Redirect(w, r, s.ServerPublicUrl, http.StatusTemporaryRedirect)
}

func (s *GrpcWebServer) refreshTokenHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh-token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tokenSource := s.OidcConfig.TokenSource(
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

func (s *GrpcWebServer) logoutHandler(w http.ResponseWriter, r *http.Request) {
	// Clear the cookie
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

	logoutURL := fmt.Sprintf("%s/protocol/openid-connect/logout", s.OidcIssuer)

	http.Redirect(w, r, logoutURL, http.StatusTemporaryRedirect)
}

func (s *GrpcWebServer) userInfoHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("auth-token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	client := s.OidcConfig.Client(
		r.Context(), &oauth2.Token{
			AccessToken: cookie.Value,
		},
	)

	resp, err := client.Get(fmt.Sprintf("%s/protocol/openid-connect/userinfo", s.OidcIssuer))
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
