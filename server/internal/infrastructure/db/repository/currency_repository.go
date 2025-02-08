package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) GetAllCurrencies(ctx context.Context, userId string) ([]model.Currency, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, err
	}

	queries := r.queries.WithTx(tx)

	currenciesDao, err := queries.GetAllCurrencies(ctx, userId)
	if err != nil {
		return nil, err
	}

	exchangeRatesDAOs := make([][]dao.GetAllExchangeRatesOfRow, len(currenciesDao))
	for i, currency := range currenciesDao {
		exchangeRatesDao, err := queries.GetAllExchangeRatesOf(ctx, currency.ID)
		if err != nil {
			return nil, err
		}
		exchangeRatesDAOs[i] = exchangeRatesDao
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	currencies := make([]model.Currency, len(currenciesDao))
	for i, currencyDao := range currenciesDao {
		exchangeRates := make(map[int][]model.ExchangeRate)
		for _, exchangeRateDao := range exchangeRatesDAOs[i] {
			currencySpecificRates, ok := exchangeRates[int(exchangeRateDao.ComparedTo)]
			if !ok {
				currencySpecificRates = make([]model.ExchangeRate, 0)
			}
			currencySpecificRates = append(
				currencySpecificRates, model.ExchangeRate{
					ID:   int(exchangeRateDao.ID),
					Rate: exchangeRateDao.AdjustedExchangeRate,
					Date: exchangeRateDao.Date,
				},
			)
			exchangeRates[int(exchangeRateDao.ComparedTo)] = currencySpecificRates
		}

		currencies[i] = model.Currency{
			ID:            int(currencyDao.ID),
			Name:          currencyDao.Name,
			Symbol:        currencyDao.Symbol,
			DecimalPoints: int(currencyDao.DecimalPoints),
			ExchangeRates: exchangeRates,
		}
	}

	return currencies, nil
}

func (r *Repository) UpdateComposition(ctx context.Context, userId string, currencyId int, date time.Time, compositions map[model.CompositionType]map[string]float64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	queries := r.queries.WithTx(tx)

	currencies, err := queries.GetAllCurrencies(ctx, userId)
	if err != nil {
		return err
	}
	found := false
	for _, c := range currencies {
		if int(c.ID) == currencyId {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("currency not found or not owned by user")
	}

	err = queries.DeleteCompositions(ctx, &dao.DeleteCompositionsParams{
		CurrencyID: int32(currencyId),
		Date:       date,
	})
	if err != nil {
		return err
	}

	for componentType, components := range compositions {
		daoType := dao.CompositionTypeAsset
		if componentType == model.RegionComposition {
			daoType = dao.CompositionTypeRegion
		} else if componentType == model.SectorComposition {
			daoType = dao.CompositionTypeSector
		}

		for componentName, ratio := range components {
			err = queries.CreateComposition(ctx, &dao.CreateCompositionParams{
				CurrencyID:    int32(currencyId),
				ComponentType: daoType,
				ComponentName: componentName,
				Ratio:         ratio,
				Date:          date,
			})
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

type InitialExchangeRate struct {
	Other int
	Rate  float64
	Date  string
}

func (r *Repository) CreateCurrency(
	ctx context.Context,
	userId string,
	name, symbol string,
	decimalPoints int,
	initialExchangeRate *InitialExchangeRate,
) (
	int,
	int,
	error,
) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, err
	}

	queries := r.queries.WithTx(tx)

	currencyId, err := queries.CreateCurrency(
		ctx, &dao.CreateCurrencyParams{
			UserID:        userId,
			Name:          name,
			Symbol:        symbol,
			DecimalPoints: int16(decimalPoints),
		},
	)
	if err != nil {
		return 0, 0, err
	}

	var rateId int32
	if initialExchangeRate != nil {
		rateId, err = queries.CreateExchangeRate(
			ctx, &dao.CreateExchangeRateParams{
				A:      currencyId,
				B:      int32(initialExchangeRate.Other),
				Rate:   initialExchangeRate.Rate,
				Date:   initialExchangeRate.Date,
				UserID: userId,
			},
		)
		if err != nil {
			return 0, 0, err
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, 0, err
	}

	return int(currencyId), int(rateId), nil
}

type UpdateCurrencyFields struct {
	Name, Symbol  *string
	DecimalPoints *int
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

func (r *Repository) UpdateCurrency(
	ctx context.Context,
	userId string,
	id int,
	fields UpdateCurrencyFields,
) error {
	return r.queries.UpdateCurrency(
		ctx, &dao.UpdateCurrencyParams{
			UserID:        userId,
			ID:            int32(id),
			Name:          fields.nullName(),
			Symbol:        fields.nullSymbol(),
			DecimalPoints: fields.nullDecimalPoint(),
		},
	)
}

func (r *Repository) SetDefaultCurrency(
	ctx context.Context,
	userId string,
	currencyId int,
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
