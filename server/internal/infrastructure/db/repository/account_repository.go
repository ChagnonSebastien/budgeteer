package repository

import (
	"context"
	"database/sql"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) GetAllAccountsWithCurrencyIDs(ctx context.Context, userId string) ([]model.Account, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, err
	}

	queries := r.queries.WithTx(tx)

	accountsDao, err := queries.GetAllAccounts(ctx, userId)
	if err != nil {
		return nil, err
	}

	accountsCurrenciesDao, err := queries.GetAllAccountCurrencies(ctx, userId)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	accounts := make([]model.Account, len(accountsDao))
	for i, accountDao := range accountsDao {
		balances := make([]model.Balance, 0)
		for _, balance := range accountsCurrenciesDao {
			if balance.AccountID == accountDao.ID {
				balances = append(
					balances, model.Balance{
						CurrencyId: int(balance.CurrencyID),
						Value:      int(balance.Value),
					},
				)
			}
		}

		accounts[i] = model.Account{
			ID:              int(accountDao.ID),
			Name:            accountDao.Name,
			InitialBalances: balances,
			IsMine:          accountDao.IsMine,
		}
	}

	return accounts, nil
}

func (r *Repository) CreateAccount(
	ctx context.Context,
	userId string,
	name string,
	initialsAmounts []model.Balance,
	isMine bool,
) (int, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}

	queries := r.queries.WithTx(tx)

	accountId, err := queries.CreateAccount(
		ctx, dao.CreateAccountParams{
			UserID: userId,
			Name:   name,
			IsMine: isMine,
		},
	)
	if err != nil {
		return 0, err
	}

	for _, balance := range initialsAmounts {
		println(accountId, balance.CurrencyId, balance.Value)
		err := queries.InsertAccountCurrency(
			ctx, dao.InsertAccountCurrencyParams{
				AccountID:  accountId,
				CurrencyID: int32(balance.CurrencyId),
				Value:      int32(balance.Value),
			},
		)
		if err != nil {
			return 0, err
		}
	}

	err = tx.Commit()
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
	initialsAmounts []model.Balance,
	isMine bool,
) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	queries := r.queries.WithTx(tx)

	err = queries.UpdateAccount(
		ctx, dao.UpdateAccountParams{
			UserID: userId,
			ID:     int32(id),
			Name:   name,
			IsMine: isMine,
		},
	)
	if err != nil {
		return err
	}

	err = queries.DeleteAccountCurrencies(
		ctx, dao.DeleteAccountCurrenciesParams{
			AccountID: int32(id),
			UserID:    userId,
		},
	)
	if err != nil {
		return err
	}

	for _, balance := range initialsAmounts {
		err := queries.InsertAccountCurrency(
			ctx, dao.InsertAccountCurrencyParams{
				AccountID:  int32(id),
				CurrencyID: int32(balance.CurrencyId),
				Value:      int32(balance.Value),
			},
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
