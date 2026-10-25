package grpc

import (
	"context"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestPanickingHandlerReturnsAnInternalError(t *testing.T) {
	info := &grpc.UnaryServerInfo{FullMethod: "/test/Panic"}
	panicking := func(context.Context, interface{}) (interface{}, error) { panic("nil fields") }

	_, err := sanitizeErrorInterceptor(context.Background(), nil, info, func(ctx context.Context, req interface{}) (interface{}, error) {
		return recoverPanicInterceptor(ctx, req, info, panicking)
	})

	if status.Code(err) != codes.Internal {
		t.Fatalf("expected Internal, got %v", err)
	}
}
