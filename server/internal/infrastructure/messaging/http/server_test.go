package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSecurityHeadersApplyToEveryResponse(t *testing.T) {
	handler := withSecurityHeaders(http.FileServer(http.Dir(t.TempDir())), "https://app.example.com")
	for _, path := range []string{"/guest.html", "/auth/info", "/"} {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		for _, header := range []string{"Content-Security-Policy", "Referrer-Policy", "X-Content-Type-Options"} {
			if rec.Header().Get(header) == "" {
				t.Errorf("%s: missing %s", path, header)
			}
		}
	}
}
