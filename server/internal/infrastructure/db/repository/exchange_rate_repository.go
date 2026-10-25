package repository

import (
	"context"
	"database/sql"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"github.com/google/uuid"
)

func (r *Repository) GetAllExchangeRate(ctx context.Context, userId uuid.UUID) ([]model.ExchangeRate, error) {
	exchangeRatesDao, err := r.queries.GetAllExchangeRates(ctx, userId)
	if err != nil {
		return nil, err
	}

	exchangeRates := make([]model.ExchangeRate, 0)
	for _, exchangeRateDao := range exchangeRatesDao {
		exchangeRates = append(exchangeRates, model.ExchangeRate{
			CurrencyA: model.CurrencyID(exchangeRateDao.A),
			CurrencyB: model.CurrencyID(exchangeRateDao.B),
			Rate:      exchangeRateDao.Rate,
			Date:      exchangeRateDao.Date,
		})
	}

	return exchangeRates, nil
}

type InitialExchangeRate struct {
	Other int
	Rate  float64
	Date  time.Time
}

func (r *Repository) CreateExchangeRate(
	ctx context.Context,
	userId uuid.UUID,
	currencyA, currencyB model.CurrencyID,
	date time.Time,
	rate float64,
) error {
	return r.recordExchangeRate(ctx, userId, currencyA, currencyB, date, func(queries *dao.Queries) error {
		return queries.CreateExchangeRate(
			ctx, &dao.CreateExchangeRateParams{
				A:      int32(currencyA),
				B:      int32(currencyB),
				Rate:   rate,
				Date:   date,
				UserID: userId,
			},
		)
	})
}

type UpdateExchangeRateFields struct {
	Rate *float64
}

func (u *UpdateExchangeRateFields) nullRate() sql.NullFloat64 {
	if u.Rate == nil {
		return sql.NullFloat64{Valid: false}
	}

	return sql.NullFloat64{
		Float64: *u.Rate,
		Valid:   true,
	}
}

func (r *Repository) UpsertExchangeRate(
	ctx context.Context,
	userId uuid.UUID,
	currencyA, currencyB model.CurrencyID,
	date time.Time,
	rate float64,
) error {
	return r.recordExchangeRate(ctx, userId, currencyA, currencyB, date, func(queries *dao.Queries) error {
		return queries.UpsertExchangeRate(
			ctx, &dao.UpsertExchangeRateParams{
				A:      int32(currencyA),
				B:      int32(currencyB),
				Rate:   rate,
				Date:   date,
				UserID: userId,
			},
		)
	})
}

func (r *Repository) recordExchangeRate(
	ctx context.Context,
	userId uuid.UUID,
	currencyA, currencyB model.CurrencyID,
	date time.Time,
	write func(queries *dao.Queries) error,
) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	queries := r.queries.WithTx(tx)
	if err := write(queries); err != nil {
		return err
	}

	err = queries.ClearRateFetchFailureCoveredBy(
		ctx, &dao.ClearRateFetchFailureCoveredByParams{
			A:      int32(currencyA),
			B:      int32(currencyB),
			UserID: userId,
			Date:   date,
		},
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *Repository) DeleteExchangeRate(
	ctx context.Context,
	userId uuid.UUID,
	currencyA, currencyB model.CurrencyID,
	date time.Time,
) error {
	return r.queries.DeleteExchangeRate(
		ctx, &dao.DeleteExchangeRateParams{
			UserID: userId,
			A:      int32(currencyA),
			B:      int32(currencyB),
			Date:   date,
		},
	)
}

func (r *Repository) UpdateExchangeRateRelativeToDefaultCurrency(ctx context.Context, currencyID model.CurrencyID, date time.Time, newRate float64) error {
	return r.queries.NewAutoExchangeRateEntry(ctx, &dao.NewAutoExchangeRateEntryParams{
		Rate:       newRate,
		Date:       date,
		CurrencyID: int32(currencyID),
	})
}
