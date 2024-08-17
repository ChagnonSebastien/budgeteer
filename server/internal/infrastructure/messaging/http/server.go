package http

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"google.golang.org/grpc"

	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

const serverPort = 8080
const webDirectory = "/app/static/web"

type GrpcWebServer struct {
	wrappedGrpc *grpcweb.WrappedGrpcServer
	auth        *Auth
}

func NewServer(grpcServer *grpc.Server, auth *Auth) *GrpcWebServer {
	return &GrpcWebServer{
		wrappedGrpc: grpcweb.WrapServer(grpcServer),
		auth:        auth,
	}
}

func (s *GrpcWebServer) Serve() {
	mux := http.NewServeMux()
	mux.Handle("/auth/", http.StripPrefix("/auth", s.auth.ServeMux()))
	mux.Handle("/api/", http.StripPrefix("/api", s.wrappedGrpc))
	mux.HandleFunc("/", s.catchAllHandler)

	httpServer := &http.Server{
		Handler: withLogging(mux),
		Addr:    fmt.Sprintf(":%d", serverPort),
	}

	log.Printf("Server is running on port :%d\n", serverPort)
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

func (s *GrpcWebServer) catchAllHandler(resp http.ResponseWriter, req *http.Request) {
	if s.wrappedGrpc.IsGrpcWebRequest(req) {
		tokenSource, prevTokenCookie, err := s.auth.TokenSourceFromCookies(req.Context(), req.Cookie)
		if err != nil {
			http.Error(resp, "reading tokens from request", http.StatusInternalServerError)
			return
		}

		rawToken, err := tokenSource.Token()
		if err != nil {
			http.Error(resp, "getting valid access token", http.StatusUnauthorized)
			return
		}

		token, err := s.auth.verifier.Verify(req.Context(), rawToken.AccessToken)
		if err != nil {
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

		augmentedReq := req.WithContext(context.WithValue(req.Context(), shared.ClaimsKey{}, tokenClaims))
		s.wrappedGrpc.ServeHTTP(resp, augmentedReq)
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

type LoggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *LoggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			lrw := &LoggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			p := getClientIP(r)

			next.ServeHTTP(lrw, r)

			log.Printf(
				"Request - Method:%s\tDuration:%s\tPeer:%s\tStatusCode:%v",
				r.URL,
				time.Since(start),
				p,
				lrw.statusCode,
			)
		},
	)
}

func getClientIP(r *http.Request) string {
	// Try to get the IP from the X-Forwarded-For header (if behind a proxy)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		return forwarded
	}

	// Fall back to the remote address directly
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}

	return ip
}
