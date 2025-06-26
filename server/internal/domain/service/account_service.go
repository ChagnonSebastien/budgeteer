package service

import (
	"context"

	"chagnon.dev/budget-server/internal/infrastructure/db/repository"

	"chagnon.dev/budget-server/internal/domain/model"
)

type accountRepository interface {
	GetAllAccountsWithCurrencyIDs(ctx context.Context, userId string) ([]model.Account, error)
	CreateAccount(
		ctx context.Context,
		userId string,
		name string,
		balances []model.Balance,
		isMine bool,
		accountType, financialInstitution string,
	) (int, error)
	UpdateAccount(
		ctx context.Context,
		userId string,
		id int,
		fields repository.UpdateAccountFields,
	) error
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
	accountType string,
	financialInstitution string,
) (
	int,
	error,
) {
	return a.accountRepository.CreateAccount(ctx, userId, name, balances, isMine, accountType, financialInstitution)
}

func (a *AccountService) UpdateAccount(
	ctx context.Context,
	userId string,
	id int,
	fields repository.UpdateAccountFields,
) error {
	return a.accountRepository.UpdateAccount(ctx, userId, id, fields)
}
