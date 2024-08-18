package service

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
)

type accountRepository interface {
	GetAllAccountsWithCurrencyIDs(ctx context.Context, userId string) ([]model.Account, error)
	CreateAccount(ctx context.Context, userId string, name string, balances []model.Balance, isMine bool) (int, error)
	UpdateAccount(ctx context.Context, userId string, id int, name string, balances []model.Balance, isMine bool) error
}

type AccountService struct {
	accountRepository accountRepository
}

func NewAccountService(accountRepository accountRepository) *AccountService {
	return &AccountService{accountRepository}
}

func (a *AccountService) GetAllAccounts(ctx context.Context, userId string) ([]model.Account, error) {
	return a.accountRepository.GetAllAccountsWithCurrencyIDs(ctx, userId)
}

func (a *AccountService) CreateAccount(
	ctx context.Context,
	userId string,
	name string,
	balances []model.Balance,
	isMine bool,
) (
	int,
	error,
) {
	return a.accountRepository.CreateAccount(ctx, userId, name, balances, isMine)
}

func (a *AccountService) UpdateAccount(
	ctx context.Context,
	userId string,
	id int,
	name string,
	balances []model.Balance,
	isMine bool,
) error {
	return a.accountRepository.UpdateAccount(ctx, userId, id, name, balances, isMine)
}
