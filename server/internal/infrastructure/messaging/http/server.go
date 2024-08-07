package http

import (
	"fmt"
	"log"
	"net/http"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"google.golang.org/grpc"
)

type GrpcWebServer struct {
	Port       int
	GrpcServer *grpc.Server
}

func (s *GrpcWebServer) Serve() {
	wrappedGrpc := grpcweb.WrapServer(s.GrpcServer)

	httpServer := &http.Server{
		Handler: http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
			if wrappedGrpc.IsGrpcWebRequest(req) {
				wrappedGrpc.ServeHTTP(resp, req)
			} else {
				http.NotFound(resp, req)
			}
		}),
		Addr: fmt.Sprintf(":%d", s.Port),
	}

	log.Printf("Server is running on port :%d\n", s.Port)
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
