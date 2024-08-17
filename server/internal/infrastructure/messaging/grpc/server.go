package grpc

import (
	"context"
	"log"
	"strings"

	"github.com/coreos/go-oidc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
)

type Services struct {
	Account     *service.AccountService
	Category    *service.CategoryService
	Currency    *service.CurrencyService
	Transaction *service.TransactionService
}

func NewServerWithHandlers(services Services, verifier *oidc.IDTokenVerifier) *grpc.Server {
	interceptor := interceptorWithTokenVerifier(verifier)
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(interceptor))

	dto.RegisterAccountServiceServer(grpcServer, &AccountHandler{accountService: services.Account})
	dto.RegisterCategoryServiceServer(grpcServer, &CategoryHandler{categoryService: services.Category})
	dto.RegisterCurrencyServiceServer(grpcServer, &CurrencyHandler{currencyService: services.Currency})
	dto.RegisterTransactionServiceServer(grpcServer, &TransactionHandler{transactionService: services.Transaction})

	return grpcServer
}

func interceptorWithTokenVerifier(verifier *oidc.IDTokenVerifier) func(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (any, error) {
	interceptor := func(
		ctx context.Context,
		req interface{},
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (any, error) {
		// Extract the metadata from the incoming context
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Errorf(codes.Unauthenticated, "missing metadata")
		}

		cookieHeader, ok := md["cookie"]
		if !ok || len(cookieHeader) == 0 {
			return nil, status.Errorf(codes.Unauthenticated, "missing cookie header")
		}

		rawIDToken := ""
		for _, cookie := range strings.Split(cookieHeader[0], "; ") {
			if strings.HasPrefix(cookie, "auth-token=") {
				rawIDToken = strings.TrimPrefix(cookie, "auth-token=")
				break
			}
		}

		idToken, err := verifier.Verify(ctx, rawIDToken)
		if err != nil {
			log.Printf("verifying token: %v", err)
			return nil, status.Errorf(codes.Unauthenticated, "invalid auth-token: %v", err)
		}

		var tokenClaims Claims
		if err := idToken.Claims(&tokenClaims); err != nil {
			log.Printf("parsing claims: %v", idToken)
			return nil, status.Errorf(codes.Internal, "failed to parse claims: %v", err)
		}

		return handler(context.WithValue(ctx, claimsKey{}, tokenClaims), req)
	}

	return interceptor
}
