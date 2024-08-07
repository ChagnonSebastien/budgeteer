package service

import (
	"context"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
)

type transactionRepository interface {
	GetAllTransactions(ctx context.Context) ([]model.Transaction, error)
	CreateTransaction(ctx context.Context, amount int, currencyId, senderAccountId, receiverAccountId, categoryId int, date time.Time, note string) (int, error)
}

type TransactionService struct {
	transactionRepository transactionRepository
}

func NewTransactionService(transactionRepository transactionRepository) *TransactionService {
	return &TransactionService{transactionRepository}
}

func (a *TransactionService) GetAllTransactions(ctx context.Context) ([]model.Transaction, error) {
	return a.transactionRepository.GetAllTransactions(ctx)
}

func (a *TransactionService) CreateTransaction(ctx context.Context, amount int, currencyId, senderAccountId, receiverAccountId, categoryId int, date time.Time, note string) (int, error) {
	return a.transactionRepository.CreateTransaction(ctx, amount, currencyId, senderAccountId, receiverAccountId, categoryId, date, note)
}
