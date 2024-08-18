package repository

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) GetAllAccountsWithCurrencyIDs(ctx context.Context, userId string) ([]model.Account, error) {
	accountsDao, err := r.queries.GetAllAccountsWithCurrencyIDs(ctx, userId)
	if err != nil {
		return nil, err
	}

	accounts := make([]model.Account, len(accountsDao))
	for i, accountDao := range accountsDao {
		accounts[i] = model.Account{
			ID:            int(accountDao.ID),
			Name:          accountDao.Name,
			InitialAmount: int(accountDao.InitialAmount),
			IsMine:        accountDao.IsMine,
		}
	}

	return accounts, nil
}

func (r *Repository) CreateAccount(
	ctx context.Context,
	userId string,
	name string,
	initialAmount int,
	isMine bool,
) (int, error) {
	accountId, err := r.queries.CreateAccount(
		ctx, dao.CreateAccountParams{
			UserID:        userId,
			Name:          name,
			InitialAmount: int32(initialAmount),
			IsMine:        isMine,
		},
	)
	if err != nil {
		return 0, err
	}
	return int(accountId), nil
}

func (r *Repository) UpdateAccount(
	ctx context.Context,
	userId string,
	id int,
	name string,
	initialAmount int,
	isMine bool,
) error {
	return r.queries.UpdateAccount(
		ctx, dao.UpdateAccountParams{
			UserID:        userId,
			ID:            int32(id),
			Name:          name,
			InitialAmount: int32(initialAmount),
			IsMine:        isMine,
		},
	)
}
