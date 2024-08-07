package repository

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (c *Repository) GetAllCurrencies(ctx context.Context) ([]model.Currency, error) {
	currenciesDao, err := c.queries.GetAllCurrencies(ctx)
	if err != nil {
		return nil, err
	}

	currencies := make([]model.Currency, len(currenciesDao))
	for _, currencyDao := range currenciesDao {
		currencies = append(currencies, model.Currency{
			ID:     int(currencyDao.ID),
			Name:   currencyDao.Name,
			Symbol: currencyDao.Symbol,
		})
	}

	return currencies, nil
}

func (c *Repository) CreateCurrency(ctx context.Context, name, symbol string) (int, error) {
	id, err := c.queries.CreateCurrency(ctx, dao.CreateCurrencyParams{
		Name:   name,
		Symbol: symbol,
	})
	if err != nil {
		return 0, err
	}

	return int(id), nil
}
