package repository

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (c *Repository) GetAllAccountsWithCurrencyIDs(ctx context.Context) ([]model.Account, error) {
	accountsDao, err := c.queries.GetAllAccountsWithCurrencyIDs(ctx)
	if err != nil {
		return nil, err
	}

	accounts := make([]model.Account, len(accountsDao))
	for _, accountDao := range accountsDao {
		currencyIds := make([]int, len(accountDao.CurrencyIds))
		for _, currencyIdDao := range accountDao.CurrencyIds {
			currencyIds = append(currencyIds, int(currencyIdDao))
		}

		accounts = append(accounts, model.Account{
			ID:            int(accountDao.AccountID),
			Name:          accountDao.AccountName,
			InitialAmount: int(accountDao.AccountInitialAmount),
			CurrencyIds:   currencyIds,
		})
	}

	return accounts, nil
}

func (c *Repository) CreateAccount(ctx context.Context, name string, initialAmount int) (int, error) {
	accountId, err := c.queries.CreateAccount(ctx, dao.CreateAccountParams{
		Name:          name,
		InitialAmount: int32(initialAmount),
	})
	if err != nil {
		return 0, err
	}
	return int(accountId), nil
}
