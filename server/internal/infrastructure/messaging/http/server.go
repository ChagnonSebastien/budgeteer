package http

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"google.golang.org/grpc"
)

const serverPort = 8080
const webDirectory = "/app/static/web"

type GrpcWebServer struct {
	GrpcServer *grpc.Server
}

func (s *GrpcWebServer) Serve() {
	wrappedGrpc := grpcweb.WrapServer(s.GrpcServer)

	httpServer := &http.Server{
		Handler: http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
			if wrappedGrpc.IsGrpcWebRequest(req) {
				wrappedGrpc.ServeHTTP(resp, req)
			} else {
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
		}),
		Addr: fmt.Sprintf(":%d", serverPort),
	}

	log.Printf("Server is running on port :%d\n", serverPort)
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
