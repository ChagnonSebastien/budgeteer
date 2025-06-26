package grpc

import (
	"chagnon.dev/budget-server/internal/infrastructure/autoupdate"
	"google.golang.org/grpc"

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
	grpcServer := grpc.NewServer()
	dto.RegisterAccountServiceServer(grpcServer, &AccountHandler{accountService: services.Account})
	dto.RegisterCategoryServiceServer(grpcServer, &CategoryHandler{categoryService: services.Category})
	dto.RegisterCurrencyServiceServer(grpcServer, &CurrencyHandler{currencyService: services.Currency, javascriptRunner: autoupdate.RunJavascript})
	dto.RegisterTransactionServiceServer(grpcServer, &TransactionHandler{transactionService: services.Transaction})

	return grpcServer
}
