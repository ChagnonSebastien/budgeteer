package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"chagnon.dev/budget-server/internal/logging"
)

func (r *Repository) GetAllTransactions(ctx context.Context, userId string) ([]model.Transaction, error) {
	transactionsDao, err := r.queries.GetAllTransactions(ctx, userId)
	if err != nil {
		return nil, err
	}

	transactions := make([]model.Transaction, len(transactionsDao))
	for i, transactionDao := range transactionsDao {
		sender := model.None[model.AccountID]()
		if transactionDao.Sender.Valid {
			sender = model.Some(model.AccountID(transactionDao.Sender.Int32))
		}

		receiver := model.None[model.AccountID]()
		if transactionDao.Receiver.Valid {
			receiver = model.Some(model.AccountID(transactionDao.Receiver.Int32))
		}

		category := model.None[model.CategoryID]()
		if transactionDao.Category.Valid {
			category = model.Some(model.CategoryID(transactionDao.Category.Int32))
		}

		financialIncomeData := model.None[model.FinancialIncomeData]()
		if transactionDao.RelatedCurrencyID.Valid {
			financialIncomeData = model.Some(model.FinancialIncomeData{
				RelatedCurrency: model.CurrencyID(transactionDao.RelatedCurrencyID.Int32),
			})
		}

		transactions[i] = model.Transaction{
			ID:                  model.TransactionID(transactionDao.ID),
			Amount:              int(transactionDao.Amount),
			Currency:            model.CurrencyID(transactionDao.Currency),
			Sender:              sender,
			Receiver:            receiver,
			Category:            category,
			Date:                transactionDao.Date,
			Note:                transactionDao.Note,
			ReceiverCurrency:    model.CurrencyID(transactionDao.ReceiverCurrency),
			ReceiverAmount:      int(transactionDao.ReceiverAmount),
			FinancialIncomeData: financialIncomeData,
		}
	}

	return transactions, nil
}

type CreateFinancialIncomeAdditionalData struct {
	RelatedCurrencyId int
}

func (r *Repository) CreateTransaction(
	ctx context.Context, userId string,
	amount, receiverAmount int,
	currencyId, receiverCurrencyId int,
	senderAccountId, receiverAccountId model.Optional[int],
	categoryId model.Optional[int],
	date time.Time,
	note string,
	financialIncomeData model.Optional[CreateFinancialIncomeAdditionalData],
) (createdTransactionId model.TransactionID, err error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return
	}

	defer func() {
		if err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				logging.FromContext(ctx).Error(fmt.Sprintf("transaction update rollback error: %v", rbErr))
			}
		}
	}()

	sender := sql.NullInt32{Valid: false}
	if value, isSome := senderAccountId.Value(); isSome {
		sender = sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	receiver := sql.NullInt32{Valid: false}
	if value, isSome := receiverAccountId.Value(); isSome {
		receiver = sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	category := sql.NullInt32{Valid: false}
	if value, isSome := categoryId.Value(); isSome {
		category = sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	transactionId, err := r.queries.WithTx(tx).CreateTransaction(
		ctx, &dao.CreateTransactionParams{
			UserID:           userId,
			Amount:           int32(amount),
			Currency:         int32(currencyId),
			Sender:           sender,
			Receiver:         receiver,
			Category:         category,
			Date:             date,
			Note:             note,
			ReceiverCurrency: int32(receiverCurrencyId),
			ReceiverAmount:   int32(receiverAmount),
		},
	)
	if err != nil {
		err = fmt.Errorf("creating transaction: %w", err)
		return
	}

	if financialIncome, isSome := financialIncomeData.Value(); isSome {
		updatedRows, queryErr := r.queries.WithTx(tx).TransactionToFinancialIncome(ctx, &dao.TransactionToFinancialIncomeParams{
			TransactionID:     transactionId,
			RelatedCurrencyID: int32(financialIncome.RelatedCurrencyId),
		})
		if queryErr != nil {
			err = fmt.Errorf("creating financial income: %w", queryErr)
			return
		}
		if updatedRows == 0 {
			err = fmt.Errorf("updated 0 rows when creating financial income")
			return
		}
	}

	if err = tx.Commit(); err != nil {
		err = fmt.Errorf("committing transaction: %w", err)
		return
	}

	return model.TransactionID(transactionId), nil
}

type UpdateFinancialIncomeAdditionalData struct {
	RelatedCurrencyId model.Optional[int]
}

func (u *UpdateFinancialIncomeAdditionalData) nullRelatedCurrencyId() sql.NullInt32 {
	if value, isSome := u.RelatedCurrencyId.Value(); isSome && value != 0 {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

type UpdateTransactionFields struct {
	Amount, ReceiverAmount              model.Optional[int]
	CurrencyId, ReceiverCurrencyId      model.Optional[int]
	SenderAccountId, ReceiverAccountId  model.Optional[model.Optional[int]]
	CategoryId                          model.Optional[model.Optional[int]]
	Date                                model.Optional[time.Time]
	Note                                model.Optional[string]
	UpdateFinancialIncomeAdditionalData model.Optional[UpdateFinancialIncomeAdditionalData]
}

func (u *UpdateTransactionFields) nullNote() sql.NullString {
	if value, isSome := u.Note.Value(); isSome {
		return sql.NullString{Valid: true, String: value}
	}

	return sql.NullString{Valid: false}
}

func (u *UpdateTransactionFields) nullDate() sql.NullTime {
	if value, isSome := u.Date.Value(); isSome {
		return sql.NullTime{Valid: true, Time: value}
	}

	return sql.NullTime{Valid: false}
}

func (u *UpdateTransactionFields) nullAmount() sql.NullInt32 {
	if value, isSome := u.Amount.Value(); isSome {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullReceiverAmount() sql.NullInt32 {
	if value, isSome := u.ReceiverAmount.Value(); isSome {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullSenderAccountId() sql.NullInt32 {
	if optionalValue, isSome := u.SenderAccountId.Value(); isSome {
		if value, isSome := optionalValue.Value(); isSome {
			return sql.NullInt32{Valid: true, Int32: int32(value)}
		}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullReceiverAccountId() sql.NullInt32 {
	if optionalValue, isSome := u.SenderAccountId.Value(); isSome {
		if value, isSome := optionalValue.Value(); isSome {
			return sql.NullInt32{Valid: true, Int32: int32(value)}
		}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullCurrencyId() sql.NullInt32 {
	if value, isSome := u.CurrencyId.Value(); isSome && value != 0 {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullReceiverCurrencyId() sql.NullInt32 {
	if value, isSome := u.ReceiverCurrencyId.Value(); isSome && value != 0 {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullCategoryId() sql.NullInt32 {
	if optionalValue, isSome := u.SenderAccountId.Value(); isSome {
		if value, isSome := optionalValue.Value(); isSome {
			return sql.NullInt32{Valid: true, Int32: int32(value)}
		}
	}

	return sql.NullInt32{Valid: false}
}

func (r *Repository) UpdateTransaction(
	ctx context.Context,
	userId string,
	id model.TransactionID,
	field UpdateTransactionFields,
) (err error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return fmt.Errorf("beginning db transaction: %w", err)
	}

	defer func() {
		if err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				logging.FromContext(ctx).Error(fmt.Sprintf("transaction update rollback error: %v", rbErr))
			}
		}
	}()

	updatedRows, err := r.queries.WithTx(tx).UpdateTransaction(
		ctx, &dao.UpdateTransactionParams{
			UserID:           userId,
			ID:               int32(id),
			Amount:           field.nullAmount(),
			Currency:         field.nullCurrencyId(),
			UpdateSender:     field.SenderAccountId.IsSome(),
			Sender:           field.nullSenderAccountId(),
			UpdateReceiver:   field.ReceiverAccountId.IsSome(),
			Receiver:         field.nullReceiverAccountId(),
			UpdateCategory:   field.CategoryId.IsSome(),
			Category:         field.nullCategoryId(),
			Date:             field.nullDate(),
			Note:             field.nullNote(),
			ReceiverCurrency: field.nullReceiverCurrencyId(),
			ReceiverAmount:   field.nullReceiverAmount(),
		},
	)
	if err != nil {
		err = fmt.Errorf("updating transaction: %w", err)
		return
	}
	if updatedRows == 0 {
		err = fmt.Errorf("updated 0 rows when updating transaction")
		return
	}

	if financialDataFields, isSome := field.UpdateFinancialIncomeAdditionalData.Value(); isSome {
		updatedRows, updateErr := r.queries.WithTx(tx).UpdateFinancialIncome(
			ctx, &dao.UpdateFinancialIncomeParams{
				RelatedCurrencyID: financialDataFields.nullRelatedCurrencyId(),
				TransactionID:     int32(id),
			},
		)
		if updateErr != nil {
			err = fmt.Errorf("updating financial income: %w", updateErr)
			return
		}
		if updatedRows == 0 {
			err = fmt.Errorf("updated 0 rows when updating financial income")
			return
		}
	}

	if err = tx.Commit(); err != nil {
		err = fmt.Errorf("committing transaction: %w", err)
		return
	}

	return
}
