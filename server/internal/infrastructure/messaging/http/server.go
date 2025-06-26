package http

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"google.golang.org/grpc"

	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"chagnon.dev/budget-server/internal/logging"
)

const serverPort = 8080
const webDirectory = "/app/static/web"

type GrpcWebServer struct {
	wrappedGrpc *grpcweb.WrappedGrpcServer
	auth        *Auth
}

func (s *GrpcWebServer) Stop() {
	panic("implement me")
}

func NewServer(grpcServer *grpc.Server, auth *Auth) *GrpcWebServer {
	return &GrpcWebServer{
		wrappedGrpc: grpcweb.WrapServer(grpcServer),
		auth:        auth,
	}
}

func (s *GrpcWebServer) Serve(ctx context.Context) error {
	mux := http.NewServeMux()

	mux.Handle("/auth/", http.StripPrefix("/auth", s.auth.ServeMux()))
	mux.Handle("/api/", http.StripPrefix("/api", s.wrappedGrpc))
	mux.HandleFunc("/", s.catchAllHandler)

	httpServer := &http.Server{
		Handler: withLogging(mux),
		Addr:    fmt.Sprintf(":%d", serverPort),
	}

	logging.FromContext(ctx).Info("running http server", "port", serverPort)
	return httpServer.ListenAndServe()
}

func (s *GrpcWebServer) catchAllHandler(resp http.ResponseWriter, req *http.Request) {
	if s.wrappedGrpc.IsGrpcWebRequest(req) {
		logger := logging.FromContext(req.Context())

		tokenSource, prevTokenCookie, err := s.auth.TokenSourceFromCookies(req.Context(), req.Cookie)
		if err != nil {
			logger.Error("reading tokens from request", "error", err)
			http.Error(resp, "reading tokens from request", http.StatusInternalServerError)
			return
		}

		rawToken, err := tokenSource.Token()
		if err != nil {
			logger.Error("getting valid access token", "error", err)
			http.Error(resp, "getting valid access token", http.StatusUnauthorized)
			return
		}

		token, err := s.auth.verifier.Verify(req.Context(), rawToken.AccessToken)
		if err != nil {
			logger.Error("verifying access token", "error", err)
			http.Error(resp, "verifying access token", http.StatusUnauthorized)
			return
		}

		var tokenClaims shared.Claims
		if err := token.Claims(&tokenClaims); err != nil {
			logger.Error("parsing claims", "error", err)
			http.Error(resp, "parsing claims", http.StatusInternalServerError)
		}

		logger = logger.With("user", tokenClaims.Email)

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

		augmentedCtx := context.WithValue(req.Context(), shared.ClaimsKey{}, tokenClaims)
		augmentedReq := req.WithContext(logging.WithLogger(augmentedCtx, logger))
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

	securityPolicies := []string{
		"upgrade-insecure-requests;",
		"default-src 'self';",
		"style-src 'self' 'unsafe-inline';",
		"script-src 'self';",
		"script-src-elem 'self' 'unsafe-inline';",
		"worker-src 'self';",
		fmt.Sprintf("base-uri %s;", s.auth.FrontendPublicUrl),
		"form-action 'none';",
		"frame-ancestors 'none';",
		"object-src 'none';",
	}

	resp.Header().Set(
		"Content-Security-Policy",
		strings.Join(securityPolicies, " "),
	)

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
			logger := logging.FromContext(r.Context()).With("correlationId", uuid.NewString())
			logger.Info("received http request", "method", r.URL, "peer", getClientIP(r))

			start := time.Now()
			lrw := &LoggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(lrw, r)

			logger.Debug("finished handling http request", "duration", time.Since(start), "statusCode", lrw.statusCode)
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
