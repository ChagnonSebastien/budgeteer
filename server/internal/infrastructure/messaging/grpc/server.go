package grpc

import (
	"google.golang.org/grpc"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/autoupdate"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
)

type Services struct {
	Account                accountRepository
	Category               *service.CategoryService
	Currency               currencyRepository
	Transaction            transactionRepository
	ExchangeRate           exchangeRateRepository
	TransactionGroup       transactionGroupRepository
	UnconfirmedTransaction unconfirmedTransactionRepository
	Settlement             settlementRepository
	Import                 importRepository
	User                   userRepository
}

func NewServerWithHandlers(services Services) *grpc.Server {
	grpcServer := grpc.NewServer(grpc.ChainUnaryInterceptor(sanitizeErrorInterceptor, recoverPanicInterceptor))
	dto.RegisterAccountServiceServer(grpcServer, &AccountHandler{accountService: services.Account})
	dto.RegisterCategoryServiceServer(grpcServer, &CategoryHandler{categoryService: services.Category})
	dto.RegisterCurrencyServiceServer(grpcServer, &CurrencyHandler{currencyService: services.Currency})
	dto.RegisterTransactionServiceServer(grpcServer, &TransactionHandler{transactionService: services.Transaction})
	dto.RegisterExchangeRateServiceServer(grpcServer, &ExchangeRateHandler{exchangeRateService: services.ExchangeRate, javascriptRunner: autoupdate.RunJavascript})
	dto.RegisterTransactionGroupServiceServer(grpcServer, &TransactionGroupHandler{transactionGroupService: services.TransactionGroup})
	dto.RegisterUnconfirmedTransactionServiceServer(grpcServer, &UnconfirmedTransactionHandler{unconfirmedTransactionService: services.UnconfirmedTransaction})
	dto.RegisterSettlementServiceServer(grpcServer, &SettlementHandler{settlementService: services.Settlement})
	dto.RegisterImportServiceServer(grpcServer, &ImportHandler{importService: services.Import})
	dto.RegisterUserServiceServer(grpcServer, &UserHandler{userService: services.User})

	return grpcServer
}
