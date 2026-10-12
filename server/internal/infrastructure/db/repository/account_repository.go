package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
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

		var statementNames []string
		if err := json.Unmarshal(accountDao.StatementNames, &statementNames); err != nil {
			return nil, fmt.Errorf("parsing statement names of account %d: %w", accountDao.ID, err)
		}

		accounts[i] = model.Account{
			ID:                   model.AccountID(accountDao.ID),
			Name:                 accountDao.Name,
			InitialBalances:      balances,
			IsMine:               accountDao.IsMine,
			IsDebt:               accountDao.IsDebt,
			Type:                 accountType,
			FinancialInstitution: financialInstitution,
			CreatedAt:            accountDao.CreatedAt,
			StatementNames:       statementNames,
		}
	}

	return accounts, nil
}

func (r *Repository) CreateAccount(
	ctx context.Context,
	userId uuid.UUID,
	name string,
	initialsAmounts []model.Balance,
	isMine, isDebt bool,
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
			IsDebt: isDebt,
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
	IsDebt                            *bool
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

func (u *UpdateAccountFields) nullIsDebt() sql.NullBool {
	if u.IsDebt == nil {
		return sql.NullBool{Valid: false}
	}

	return sql.NullBool{
		Bool:  *u.IsDebt,
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
			IsDebt:                     fields.nullIsDebt(),
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

var (
	ErrAccountNotFound          = errors.New("account not found")
	ErrAccountNotDeletable      = errors.New("the default account cannot be deleted")
	ErrReplacementRequired      = errors.New("an own account needs another own account to take over its transactions")
	ErrReplacementNotAllowed    = errors.New("the replacement must be a different account of the same kind")
	ErrReplacementSelfTransfer  = errors.New("the replacement would turn some transactions into transfers to the same account")
	ErrConflictingDeleteOptions = errors.New("transactions can either be moved to a replacement or deleted, not both")
)

type DeleteAccountResult struct {
	AffectedTransactions int64
	MovedToUnconfirmed   int64
}

func (r *Repository) DeleteAccount(
	ctx context.Context,
	userId uuid.UUID,
	userEmail string,
	id model.AccountID,
	replacementId *model.AccountID,
	deleteTransactions bool,
) (result DeleteAccountResult, err error) {
	err = r.inTx(ctx, func(queries *dao.Queries) error {
		account, err := queries.GetAccountForDeletion(ctx, &dao.GetAccountForDeletionParams{AccountID: int32(id), UserID: userId})
		if errors.Is(err, sql.ErrNoRows) {
			return ErrAccountNotFound
		}
		if err != nil {
			return err
		}
		if account.IsHiddenDefault {
			return ErrAccountNotDeletable
		}
		if deleteTransactions && replacementId != nil {
			return ErrConflictingDeleteOptions
		}
		if account.IsMine && replacementId == nil && !deleteTransactions {
			return ErrReplacementRequired
		}

		accountRef := sql.NullInt32{Int32: account.ID, Valid: true}
		if deleteTransactions {
			moved, err := moveGroupedTransactionsToUnconfirmed(ctx, queries, userId, userEmail, accountRef)
			if err != nil {
				return err
			}
			result.MovedToUnconfirmed = moved

			deleted, err := queries.DeleteTransactionsForAccount(
				ctx, &dao.DeleteTransactionsForAccountParams{UserID: userId, AccountID: accountRef},
			)
			if err != nil {
				return err
			}
			result.AffectedTransactions = deleted
			return deleteAccountRows(ctx, queries, userId, account.ID)
		}

		replacement := sql.NullInt32{}
		if replacementId != nil {
			other, err := queries.GetAccountForDeletion(
				ctx, &dao.GetAccountForDeletionParams{AccountID: int32(*replacementId), UserID: userId},
			)
			if errors.Is(err, sql.ErrNoRows) {
				return ErrAccountNotFound
			}
			if err != nil {
				return err
			}
			if other.ID == account.ID || other.IsMine != account.IsMine || other.IsHiddenDefault {
				return ErrReplacementNotAllowed
			}

			selfTransfers, err := queries.CountSelfTransfersAfterReplacement(
				ctx, &dao.CountSelfTransfersAfterReplacementParams{
					UserID:        userId,
					AccountID:     sql.NullInt32{Int32: account.ID, Valid: true},
					ReplacementID: sql.NullInt32{Int32: other.ID, Valid: true},
				},
			)
			if err != nil {
				return err
			}
			if selfTransfers > 0 {
				return ErrReplacementSelfTransfer
			}

			if err := queries.MergeAccountCurrencies(
				ctx, &dao.MergeAccountCurrenciesParams{ReplacementID: other.ID, AccountID: account.ID},
			); err != nil {
				return err
			}
			replacement = sql.NullInt32{Int32: other.ID, Valid: true}
		}

		asSender, err := queries.ReplaceTransactionSender(
			ctx, &dao.ReplaceTransactionSenderParams{ReplacementID: replacement, UserID: userId, AccountID: accountRef},
		)
		if err != nil {
			return err
		}
		asReceiver, err := queries.ReplaceTransactionReceiver(
			ctx, &dao.ReplaceTransactionReceiverParams{ReplacementID: replacement, UserID: userId, AccountID: accountRef},
		)
		if err != nil {
			return err
		}
		result.AffectedTransactions = asSender + asReceiver
		return deleteAccountRows(ctx, queries, userId, account.ID)
	})
	return result, err
}

func deleteAccountRows(ctx context.Context, queries *dao.Queries, userId uuid.UUID, accountId int32) error {
	if err := queries.DeleteAccountCurrencies(
		ctx, &dao.DeleteAccountCurrenciesParams{AccountID: accountId, UserID: userId},
	); err != nil {
		return err
	}
	if _, err := queries.DeleteAccount(ctx, &dao.DeleteAccountParams{AccountID: accountId, UserID: userId}); err != nil {
		return fmt.Errorf("deleting account %d: %w", accountId, err)
	}
	return nil
}

func moveGroupedTransactionsToUnconfirmed(
	ctx context.Context,
	queries *dao.Queries,
	userId uuid.UUID,
	userEmail string,
	account sql.NullInt32,
) (int64, error) {
	rows, err := queries.GetGroupedTransactionsForAccount(
		ctx, &dao.GetGroupedTransactionsForAccountParams{UserID: userId, AccountID: account},
	)
	if err != nil {
		return 0, err
	}

	snapshots := make([]groupedTransactionSnapshot, len(rows))
	for i, row := range rows {
		snapshots[i] = groupedTransactionSnapshot(row)
	}
	return copyGroupedTransactionsToUnconfirmed(ctx, queries, userEmail, snapshots)
}
