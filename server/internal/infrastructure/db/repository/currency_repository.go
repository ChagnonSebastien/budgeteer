package repository

import (
	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"github.com/google/uuid"

	"context"
	"database/sql"
	"errors"
	"fmt"
)

func (r *Repository) GetAllCurrencies(ctx context.Context, userId uuid.UUID) ([]model.Currency, error) {
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
			Risk:          currencyDao.Risk,
			Type:          currencyDao.Type,
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
	userId uuid.UUID,
	name, symbol, risk, cType string,
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
			Risk:            risk,
			Type:            cType,
			DecimalPoints:   int16(decimalPoints),
			RateFetchScript: rateAutoUpdateScript,
			AutoUpdate:      rateAutoUpdateEnabled,
		},
	)
	return model.CurrencyID(currencyId), err
}

type UpdateCurrencyFields struct {
	Name, Symbol, Risk, Type *string
	DecimalPoints            *int
	RateAutoUpdateScript     *string
	RateAutoUpdateEnabled    *bool
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

func (u *UpdateCurrencyFields) nullRisk() sql.NullString {
	if u.Risk == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.Risk,
		Valid:  true,
	}
}

func (u *UpdateCurrencyFields) nullType() sql.NullString {
	if u.Type == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.Type,
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
	userId uuid.UUID,
	id model.CurrencyID,
	fields UpdateCurrencyFields,
) error {
	return r.queries.UpdateCurrency(
		ctx, &dao.UpdateCurrencyParams{
			Name:            fields.nullName(),
			Symbol:          fields.nullSymbol(),
			Risk:            fields.nullRisk(),
			Type:            fields.nullType(),
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
	userId uuid.UUID,
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
			Risk:          currencyDao.Risk,
			Type:          currencyDao.Type,
			DecimalPoints: int(currencyDao.DecimalPoints),
			RateAutoUpdateSettings: model.RateAutoUpdateSettings{
				Script:  currencyDao.RateFetchScript,
				Enabled: currencyDao.AutoUpdate,
			},
		}
	}

	return currencies, len(currenciesDao) > pageSize, nil
}

var (
	ErrCurrencyNotFound       = errors.New("currency not found")
	ErrDefaultCurrency        = errors.New("the main currency cannot be deleted")
	ErrCurrencyTargetMismatch = errors.New("the target must be another currency with the same number of decimal places")
	ErrCurrencyUsedByGroups   = errors.New("this currency is used by transaction groups, so its transactions must move to another currency")
)

type DeleteCurrencyResult struct {
	MigratedTransactions int64
	DeletedTransactions  int64
	MovedToUnconfirmed   int64
	DeletedBalances      int64
}

func (r *Repository) DeleteCurrency(
	ctx context.Context,
	userId uuid.UUID,
	userEmail string,
	id model.CurrencyID,
	targetId *model.CurrencyID,
) (result DeleteCurrencyResult, err error) {
	err = r.inTx(ctx, func(queries *dao.Queries) error {
		currency, err := queries.GetCurrencyForDeletion(ctx, &dao.GetCurrencyForDeletionParams{CurrencyID: int32(id), UserID: userId})
		if errors.Is(err, sql.ErrNoRows) {
			return ErrCurrencyNotFound
		}
		if err != nil {
			return err
		}
		if currency.IsDefault {
			return ErrDefaultCurrency
		}

		if targetId != nil {
			target, err := queries.GetCurrencyForDeletion(
				ctx, &dao.GetCurrencyForDeletionParams{CurrencyID: int32(*targetId), UserID: userId},
			)
			if errors.Is(err, sql.ErrNoRows) {
				return ErrCurrencyNotFound
			}
			if err != nil {
				return err
			}
			if target.ID == currency.ID || target.DecimalPoints != currency.DecimalPoints {
				return ErrCurrencyTargetMismatch
			}

			asSender, err := queries.MigrateTransactionCurrency(
				ctx, &dao.MigrateTransactionCurrencyParams{TargetID: target.ID, UserID: userId, CurrencyID: currency.ID},
			)
			if err != nil {
				return err
			}
			asReceiver, err := queries.MigrateTransactionReceiverCurrency(
				ctx, &dao.MigrateTransactionReceiverCurrencyParams{TargetID: target.ID, UserID: userId, CurrencyID: currency.ID},
			)
			if err != nil {
				return err
			}
			result.MigratedTransactions = asSender + asReceiver

			if err := queries.MigrateFinancialIncomeCurrency(
				ctx, &dao.MigrateFinancialIncomeCurrencyParams{TargetID: target.ID, CurrencyID: currency.ID},
			); err != nil {
				return err
			}
			if err := queries.MigrateGroupCurrencies(ctx, &dao.MigrateGroupCurrenciesParams{
				TargetID:   sql.NullInt32{Int32: target.ID, Valid: true},
				CurrencyID: sql.NullInt32{Int32: currency.ID, Valid: true},
			}); err != nil {
				return err
			}
			if err := queries.MigrateGroupCreatorCurrency(
				ctx, &dao.MigrateGroupCreatorCurrencyParams{TargetID: target.ID, CurrencyID: currency.ID},
			); err != nil {
				return err
			}
		} else {
			groupUses, err := queries.CountCurrencyGroupUses(ctx, sql.NullInt32{Int32: currency.ID, Valid: true})
			if err != nil {
				return err
			}
			if groupUses > 0 {
				return ErrCurrencyUsedByGroups
			}

			rows, err := queries.GetGroupedTransactionsForCurrency(
				ctx, &dao.GetGroupedTransactionsForCurrencyParams{UserID: userId, CurrencyID: currency.ID},
			)
			if err != nil {
				return err
			}
			snapshots := make([]groupedTransactionSnapshot, len(rows))
			for i, row := range rows {
				snapshots[i] = groupedTransactionSnapshot(row)
			}
			if result.MovedToUnconfirmed, err = copyGroupedTransactionsToUnconfirmed(ctx, queries, userEmail, snapshots); err != nil {
				return err
			}
			if result.DeletedTransactions, err = queries.DeleteTransactionsForCurrency(
				ctx, &dao.DeleteTransactionsForCurrencyParams{UserID: userId, CurrencyID: currency.ID},
			); err != nil {
				return err
			}
			if err := queries.DeleteFinancialIncomesForCurrency(ctx, currency.ID); err != nil {
				return err
			}
		}

		if result.DeletedBalances, err = queries.DeleteBalancesForCurrency(
			ctx, &dao.DeleteBalancesForCurrencyParams{UserID: userId, CurrencyID: currency.ID},
		); err != nil {
			return err
		}
		if err := queries.DeleteExchangeRatesForCurrency(ctx, currency.ID); err != nil {
			return err
		}
		if _, err := queries.DeleteCurrency(ctx, &dao.DeleteCurrencyParams{CurrencyID: currency.ID, UserID: userId}); err != nil {
			return fmt.Errorf("deleting currency %d: %w", currency.ID, err)
		}
		return nil
	})
	return result, err
}
