package repository

import (
	"context"
	"database/sql"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"github.com/google/uuid"
)

func (r *Repository) GetAllAccountsWithCurrencyIDs(ctx context.Context, userId uuid.UUID) ([]model.Account, error) {
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

		accountType := ""
		if accountDao.Type.Valid {
			accountType = accountDao.Type.String
		}

		financialInstitution := ""
		if accountDao.FinancialInstitution.Valid {
			financialInstitution = accountDao.FinancialInstitution.String
		}

		accounts[i] = model.Account{
			ID:                   model.AccountID(accountDao.ID),
			Name:                 accountDao.Name,
			InitialBalances:      balances,
			IsMine:               accountDao.IsMine,
			Type:                 accountType,
			FinancialInstitution: financialInstitution,
		}
	}

	return accounts, nil
}

func (r *Repository) CreateAccount(
	ctx context.Context,
	userId uuid.UUID,
	name string,
	initialsAmounts []model.Balance,
	isMine bool,
	accountType, financialInstitution string,
) (model.AccountID, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}

	queries := r.queries.WithTx(tx)

	accountId, err := queries.CreateAccount(
		ctx, &dao.CreateAccountParams{
			Name:   name,
			UserID: userId,
			IsMine: isMine,
			Type: sql.NullString{
				String: accountType,
				Valid:  accountType != "",
			},
			FinancialInstitution: sql.NullString{
				String: financialInstitution,
				Valid:  financialInstitution != "",
			},
		},
	)
	if err != nil {
		return 0, err
	}

	for _, balance := range initialsAmounts {
		changedRows, err := queries.InsertAccountCurrency(
			ctx, &dao.InsertAccountCurrencyParams{
				AccountID:  accountId,
				CurrencyID: int32(balance.CurrencyId),
				Value:      int32(balance.Value),
			},
		)
		if err != nil {
			return 0, err
		}
		if changedRows == 0 {
			return 0, fmt.Errorf(
				"inserting new account(%d)-currency(%d) relationship for user %s",
				accountId,
				balance.CurrencyId,
				userId,
			)
		}
	}

	err = tx.Commit()
	if err != nil {
		return 0, err
	}

	return model.AccountID(accountId), nil
}

type UpdateAccountFields struct {
	Name                              *string
	InitialsAmounts                   *[]model.Balance
	IsMine                            *bool
	AccountType, FinancialInstitution *string
}

func (u *UpdateAccountFields) nullName() sql.NullString {
	if u.Name == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.Name,
		Valid:  true,
	}
}

func (u *UpdateAccountFields) nullIsMine() sql.NullBool {
	if u.IsMine == nil {
		return sql.NullBool{Valid: false}
	}

	return sql.NullBool{
		Bool:  *u.IsMine,
		Valid: true,
	}
}

func (u *UpdateAccountFields) nullAccountType() sql.NullString {
	if u.AccountType == nil || *u.AccountType == "" {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.AccountType,
		Valid:  true,
	}
}

func (u *UpdateAccountFields) nullFinancialInstitution() sql.NullString {
	if u.FinancialInstitution == nil || *u.FinancialInstitution == "" {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.FinancialInstitution,
		Valid:  true,
	}
}

func (r *Repository) UpdateAccount(
	ctx context.Context,
	userId uuid.UUID,
	id model.AccountID,
	fields UpdateAccountFields,
) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	queries := r.queries.WithTx(tx)

	err = queries.UpdateAccount(
		ctx, &dao.UpdateAccountParams{
			UserID:                     userId,
			ID:                         int32(id),
			Name:                       fields.nullName(),
			IsMine:                     fields.nullIsMine(),
			UpdateType:                 fields.AccountType != nil,
			Type:                       fields.nullAccountType(),
			UpdateFinancialInstitution: fields.FinancialInstitution != nil,
			FinancialInstitution:       fields.nullFinancialInstitution(),
		},
	)
	if err != nil {
		return err
	}

	if fields.InitialsAmounts != nil {
		err = queries.DeleteAccountCurrencies(
			ctx, &dao.DeleteAccountCurrenciesParams{
				AccountID: int32(id),
				UserID:    userId,
			},
		)
		if err != nil {
			return err
		}

		for _, balance := range *fields.InitialsAmounts {
			changedRows, err := queries.InsertAccountCurrency(
				ctx, &dao.InsertAccountCurrencyParams{
					AccountID:  int32(id),
					CurrencyID: int32(balance.CurrencyId),
					Value:      int32(balance.Value),
				},
			)
			if err != nil {
				return err
			}
			if changedRows == 0 {
				return fmt.Errorf(
					"inserting new account(%d)-currency(%d) relationship for user %s",
					id,
					balance.CurrencyId,
					userId,
				)
			}
		}
	}

	return tx.Commit()
}
