package grpc

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"chagnon.dev/budget-server/internal/logging"
)

// sanitizeErrorInterceptor keeps internal error details from reaching clients.
//
// A handler that returns a plain error surfaces over gRPC as code Unknown with
// the raw error string as the message; an explicit Internal error is the same
// class of "something broke" response. Both get their detail logged
// server-side and replaced with a generic message.
//
// Errors carrying any other status code are deliberate, client-safe responses
// (set via status.Error(codes.InvalidArgument, "...") and friends) and pass
// through unchanged. This is the seam handlers should use to surface an
// intentional, safe message to the client.
func sanitizeErrorInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {
	resp, err := handler(ctx, req)
	if err == nil {
		return resp, nil
	}

	st, _ := status.FromError(err)
	if st.Code() != codes.Unknown && st.Code() != codes.Internal {
		return resp, err
	}

	logging.FromContext(ctx).Error(
		"grpc handler error",
		"method", info.FullMethod,
		"code", st.Code().String(),
		"error", err,
	)
	return resp, status.Error(codes.Internal, "internal error")
}
