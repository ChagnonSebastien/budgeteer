package repository

import (
	"context"

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
			ID:     int(currencyDao.ID),
			Name:   currencyDao.Name,
			Symbol: currencyDao.Symbol,
		}
	}

	return currencies, nil
}

func (r *Repository) CreateCurrency(ctx context.Context, userId string, name, symbol string) (int, error) {
	id, err := r.queries.CreateCurrency(
		ctx, dao.CreateCurrencyParams{
			UserID: userId,
			Name:   name,
			Symbol: symbol,
		},
	)
	if err != nil {
		return 0, err
	}

	return int(id), nil
}

func (r *Repository) UpdateCurrency(ctx context.Context, userId string, id int, name, symbol string) error {
	return r.queries.UpdateCurrency(
		ctx, dao.UpdateCurrencyParams{
			UserID: userId,
			ID:     int32(id),
			Name:   name,
			Symbol: symbol,
		},
	)
}
