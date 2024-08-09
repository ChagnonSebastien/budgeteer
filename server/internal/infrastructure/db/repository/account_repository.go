package repository

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) GetAllAccountsWithCurrencyIDs(ctx context.Context) ([]model.Account, error) {
	accountsDao, err := r.queries.GetAllAccountsWithCurrencyIDs(ctx)
	if err != nil {
		return nil, err
	}

	accounts := make([]model.Account, len(accountsDao))
	for i, accountDao := range accountsDao {
		accounts[i] = model.Account{
			ID:            int(accountDao.ID),
			Name:          accountDao.Name,
			InitialAmount: int(accountDao.InitialAmount),
		}
	}

	return accounts, nil
}

func (r *Repository) CreateAccount(ctx context.Context, name string, initialAmount int) (int, error) {
	accountId, err := r.queries.CreateAccount(ctx, dao.CreateAccountParams{
		Name:          name,
		InitialAmount: int32(initialAmount),
	})
	if err != nil {
		return 0, err
	}
	return int(accountId), nil
}
