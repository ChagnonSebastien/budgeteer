package repository

import (
	"context"
	"database/sql"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) GetAllCurrencies(ctx context.Context, userId string) ([]model.Currency, error) {
	currenciesDao, err := r.queries.GetAllCurrencies(ctx, userId)
	if err != nil {
		return nil, err
	}

	currencies := make([]model.Currency, len(currenciesDao))
	for i, currencyDao := range currenciesDao {
		currencies[i] = model.Currency{
			ID:            int(currencyDao.ID),
			Name:          currencyDao.Name,
			Symbol:        currencyDao.Symbol,
			DecimalPoints: int(currencyDao.DecimalPoints),
		}
	}

	return currencies, nil
}

func (r *Repository) CreateCurrency(ctx context.Context, userId string, name, symbol string, decimalPoints int) (
	int,
	error,
) {
	id, err := r.queries.CreateCurrency(
		ctx, dao.CreateCurrencyParams{
			UserID:        userId,
			Name:          name,
			Symbol:        symbol,
			DecimalPoints: int16(decimalPoints),
		},
	)
	if err != nil {
		return 0, err
	}

	return int(id), nil
}

func (r *Repository) UpdateCurrency(
	ctx context.Context,
	userId string,
	id int,
	name, symbol string,
	decimalPoints int,
) error {
	return r.queries.UpdateCurrency(
		ctx, dao.UpdateCurrencyParams{
			UserID:        userId,
			ID:            int32(id),
			Name:          name,
			Symbol:        symbol,
			DecimalPoints: int16(decimalPoints),
		},
	)
}

func (r *Repository) SetDefaultCurrency(
	ctx context.Context,
	userId string,
	currencyId int,
) error {
	i, err := r.queries.SetDefaultCurrency(
		ctx, dao.SetDefaultCurrencyParams{
			UserID: userId,
			DefaultCurrency: sql.NullInt32{
				Int32: int32(currencyId),
				Valid: true,
			},
		},
	)
	if err != nil {
		return err
	}
	if i == 0 {
		return fmt.Errorf("no row was changed")
	}
	return nil
}
