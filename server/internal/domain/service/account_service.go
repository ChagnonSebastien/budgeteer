package service

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
)

type accountRepository interface {
	GetAllAccountsWithCurrencyIDs(ctx context.Context) ([]model.Account, error)
	CreateAccount(ctx context.Context, name string, initialAmount int) (int, error)
	UpdateAccount(ctx context.Context, id int, name string, initialAmount int) error
}

type AccountService struct {
	accountRepository accountRepository
}

func NewAccountService(accountRepository accountRepository) *AccountService {
	return &AccountService{accountRepository}
}

func (a *AccountService) GetAllAccounts(ctx context.Context) ([]model.Account, error) {
	return a.accountRepository.GetAllAccountsWithCurrencyIDs(ctx)
}

func (a *AccountService) CreateAccount(ctx context.Context, name string, initialAmount int) (int, error) {
	return a.accountRepository.CreateAccount(ctx, name, initialAmount)
}

func (a *AccountService) UpdateAccount(ctx context.Context, id int, name string, initialAmount int) error {
	return a.accountRepository.UpdateAccount(ctx, id, name, initialAmount)
}
