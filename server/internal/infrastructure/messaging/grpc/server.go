package grpc

import (
	"google.golang.org/grpc"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/autoupdate"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
)

type Services struct {
	Account          accountRepository
	Category         *service.CategoryService
	Currency         currencyRepository
	Transaction      transactionRepository
	ExchangeRate     exchangeRateRepository
	TransactionGroup transactionGroupRepository
}

func NewServerWithHandlers(services Services) *grpc.Server {
	grpcServer := grpc.NewServer()
	dto.RegisterAccountServiceServer(grpcServer, &AccountHandler{accountService: services.Account})
	dto.RegisterCategoryServiceServer(grpcServer, &CategoryHandler{categoryService: services.Category})
	dto.RegisterCurrencyServiceServer(grpcServer, &CurrencyHandler{currencyService: services.Currency})
	dto.RegisterTransactionServiceServer(grpcServer, &TransactionHandler{transactionService: services.Transaction})
	dto.RegisterExchangeRateServiceServer(grpcServer, &ExchangeRateHandler{exchangeRateService: services.ExchangeRate, javascriptRunner: autoupdate.RunJavascript})
	dto.RegisterTransactionGroupServiceServer(grpcServer, &TransactionGroupHandler{transactionGroupService: services.TransactionGroup})

	return grpcServer
}
