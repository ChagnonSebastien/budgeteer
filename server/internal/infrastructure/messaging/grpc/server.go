package grpc

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/peer"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
)

type Services struct {
	Account     *service.AccountService
	Category    *service.CategoryService
	Currency    *service.CurrencyService
	Transaction *service.TransactionService
}

func NewServerWithHandlers(services Services) *grpc.Server {
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(loggingInterceptor))

	dto.RegisterAccountServiceServer(grpcServer, &AccountHandler{accountService: services.Account})
	dto.RegisterCategoryServiceServer(grpcServer, &CategoryHandler{categoryService: services.Category})
	dto.RegisterCurrencyServiceServer(grpcServer, &CurrencyHandler{currencyService: services.Currency})
	dto.RegisterTransactionServiceServer(grpcServer, &TransactionHandler{transactionService: services.Transaction})

	return grpcServer
}

func loggingInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {
	start := time.Now()
	p, _ := peer.FromContext(ctx)

	response, err := handler(ctx, req)

	log.Printf(
		"Request - Method:%s\tDuration:%s\tPeer:%s\tError:%v",
		info.FullMethod,
		time.Since(start),
		p.Addr,
		err,
	)

	return response, err
}
