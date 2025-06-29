package repository

import (
	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"context"
	"database/sql"
	"fmt"
)

func (r *Repository) GetAllCurrencies(ctx context.Context, userId string) ([]model.Currency, error) {
	currenciesDao, err := r.queries.GetAllCurrencies(ctx, userId)
	if err != nil {
		return nil, err
	}

	currencies := make([]model.Currency, len(currenciesDao))
	for i, currencyDao := range currenciesDao {
		currencies[i] = model.Currency{
			ID:            model.CurrencyID(currencyDao.ID),
			Name:          currencyDao.Name,
			Symbol:        currencyDao.Symbol,
			DecimalPoints: int(currencyDao.DecimalPoints),
			RateAutoUpdateSettings: model.RateAutoUpdateSettings{
				Script:  currencyDao.RateFetchScript,
				Enabled: currencyDao.AutoUpdate,
			},
		}
	}

	return currencies, nil
}

func (r *Repository) CreateCurrency(
	ctx context.Context,
	userId string,
	name, symbol string,
	decimalPoints int,
	rateAutoUpdateScript string,
	rateAutoUpdateEnabled bool,
) (
	model.CurrencyID,
	error,
) {
	currencyId, err := r.queries.CreateCurrency(
		ctx, &dao.CreateCurrencyParams{
			UserID:          userId,
			Name:            name,
			Symbol:          symbol,
			DecimalPoints:   int16(decimalPoints),
			RateFetchScript: rateAutoUpdateScript,
			AutoUpdate:      rateAutoUpdateEnabled,
		},
	)
	return model.CurrencyID(currencyId), err
}

type UpdateCurrencyFields struct {
	Name, Symbol          *string
	DecimalPoints         *int
	RateAutoUpdateScript  *string
	RateAutoUpdateEnabled *bool
}

func (u *UpdateCurrencyFields) nullName() sql.NullString {
	if u.Name == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.Name,
		Valid:  true,
	}
}

func (u *UpdateCurrencyFields) nullSymbol() sql.NullString {
	if u.Symbol == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.Symbol,
		Valid:  true,
	}
}

func (u *UpdateCurrencyFields) nullDecimalPoint() sql.NullInt16 {
	if u.DecimalPoints == nil {
		return sql.NullInt16{Valid: false}
	}

	return sql.NullInt16{
		Int16: int16(*u.DecimalPoints),
		Valid: true,
	}
}

func (u *UpdateCurrencyFields) nullRateAutoUpdateScript() sql.NullString {
	if u.RateAutoUpdateScript == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.RateAutoUpdateScript,
		Valid:  true,
	}
}

func (u *UpdateCurrencyFields) nullRateAutoUpdateEnabled() sql.NullBool {
	if u.RateAutoUpdateEnabled == nil {
		return sql.NullBool{Valid: false}
	}

	return sql.NullBool{
		Bool:  *u.RateAutoUpdateEnabled,
		Valid: true,
	}
}

func (r *Repository) UpdateCurrency(
	ctx context.Context,
	userId string,
	id model.CurrencyID,
	fields UpdateCurrencyFields,
) error {
	return r.queries.UpdateCurrency(
		ctx, &dao.UpdateCurrencyParams{
			Name:            fields.nullName(),
			Symbol:          fields.nullSymbol(),
			DecimalPoints:   fields.nullDecimalPoint(),
			RateFetchScript: fields.nullRateAutoUpdateScript(),
			AutoUpdate:      fields.nullRateAutoUpdateEnabled(),
			ID:              int32(id),
			UserID:          userId,
		},
	)
}

func (r *Repository) SetDefaultCurrency(
	ctx context.Context,
	userId string,
	currencyId model.CurrencyID,
) error {
	i, err := r.queries.SetDefaultCurrency(
		ctx, &dao.SetDefaultCurrencyParams{
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

func (r *Repository) GetAllWithAutoUpdate(ctx context.Context, pageNumber, pageSize int) ([]model.Currency, bool, error) {
	currenciesDao, err := r.queries.GetAllWithAutoUpdate(ctx, &dao.GetAllWithAutoUpdateParams{
		PageOffset: int32((pageNumber - 1) * pageSize),
		PageSize:   int32(pageSize + 1),
	})
	if err != nil {
		return nil, false, err
	}

	currencies := make([]model.Currency, min(len(currenciesDao), pageSize))
	for i, currencyDao := range currenciesDao {
		if i >= pageSize {
			break
		}

		currencies[i] = model.Currency{
			ID:            model.CurrencyID(currencyDao.ID),
			Name:          currencyDao.Name,
			Symbol:        currencyDao.Symbol,
			DecimalPoints: int(currencyDao.DecimalPoints),
			RateAutoUpdateSettings: model.RateAutoUpdateSettings{
				Script:  currencyDao.RateFetchScript,
				Enabled: currencyDao.AutoUpdate,
			},
		}
	}

	return currencies, len(currenciesDao) > pageSize, nil
}
