package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) GetAllTransactions(ctx context.Context, userId string) ([]model.Transaction, error) {
	transactionsDao, err := r.queries.GetAllTransactions(ctx, userId)
	if err != nil {
		return nil, err
	}

	transactions := make([]model.Transaction, len(transactionsDao))
	for i, transactionDao := range transactionsDao {
		var sender int
		if transactionDao.Sender.Valid {
			sender = int(transactionDao.Sender.Int32)
		}

		var receiver int
		if transactionDao.Receiver.Valid {
			receiver = int(transactionDao.Receiver.Int32)
		}

		var category int
		if transactionDao.Category.Valid {
			category = int(transactionDao.Category.Int32)
		}

		var additionalData any
		if transactionDao.RelatedCurrencyID.Valid {
			additionalData = &model.FinancialIncomeData{
				RelatedCurrency: model.CurrencyID(transactionDao.RelatedCurrencyID.Int32),
			}
		}

		transactions[i] = model.Transaction{
			ID:               model.TransactionID(transactionDao.ID),
			Amount:           int(transactionDao.Amount),
			Currency:         model.CurrencyID(transactionDao.Currency),
			Sender:           model.AccountID(sender),
			Receiver:         model.AccountID(receiver),
			Category:         model.CategoryID(category),
			Date:             transactionDao.Date,
			Note:             transactionDao.Note,
			ReceiverCurrency: model.CurrencyID(transactionDao.ReceiverCurrency),
			ReceiverAmount:   int(transactionDao.ReceiverAmount),
			AdditionalData:   additionalData,
		}
	}

	return transactions, nil
}

func (r *Repository) CreateTransaction(
	ctx context.Context,
	userId string,
	amount int,
	currencyId, senderAccountId, receiverAccountId, categoryId int,
	date time.Time,
	note string,
	receiverCurrencyId, receiverAmount, relatedCurrencyId int,
) (model.TransactionID, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return 0, err
	}

	transactionId, err := r.queries.WithTx(tx).CreateTransaction(
		ctx, &dao.CreateTransactionParams{
			UserID:   userId,
			Amount:   int32(amount),
			Currency: int32(currencyId),
			Sender: sql.NullInt32{
				Int32: int32(senderAccountId),
				Valid: senderAccountId != 0,
			},
			Receiver: sql.NullInt32{
				Int32: int32(receiverAccountId),
				Valid: receiverAccountId != 0,
			},
			Category: sql.NullInt32{
				Int32: int32(categoryId),
				Valid: categoryId != 0,
			},
			Date:             date,
			Note:             note,
			ReceiverCurrency: int32(receiverCurrencyId),
			ReceiverAmount:   int32(receiverAmount),
		},
	)
	if err != nil {
		return 0, err
	}

	if relatedCurrencyId != 0 {
		_, err := r.queries.WithTx(tx).TransactionToFinancialIncome(
			ctx, &dao.TransactionToFinancialIncomeParams{
				TransactionID:     transactionId,
				RelatedCurrencyID: int32(relatedCurrencyId),
			},
		)
		if err != nil {
			return 0, err
		}
	}

	return model.TransactionID(transactionId), tx.Commit()
}

type UpdateTransactionFields struct {
	Amount                             *int
	CurrencyId, SenderAccountId        *int
	ReceiverAccountId, CategoryId      *int
	Date                               *time.Time
	Note                               *string
	ReceiverCurrencyId, ReceiverAmount *int
	RelatedCurrencyId                  *int
}

func (u *UpdateTransactionFields) nullNote() sql.NullString {
	if u.Note == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.Note,
		Valid:  true,
	}
}

func (u *UpdateTransactionFields) nullDate() sql.NullTime {
	if u.Date == nil {
		return sql.NullTime{Valid: false}
	}

	return sql.NullTime{
		Time:  *u.Date,
		Valid: true,
	}
}

func (u *UpdateTransactionFields) nullAmount() sql.NullInt32 {
	if u.Amount == nil {
		return sql.NullInt32{Valid: false}
	}

	return sql.NullInt32{
		Int32: int32(*u.Amount),
		Valid: true,
	}
}

func (u *UpdateTransactionFields) nullReceiverAmount() sql.NullInt32 {
	if u.ReceiverAmount == nil {
		return sql.NullInt32{Valid: false}
	}

	return sql.NullInt32{
		Int32: int32(*u.ReceiverAmount),
		Valid: true,
	}
}

func (u *UpdateTransactionFields) nullSenderAccountId() sql.NullInt32 {
	if u.SenderAccountId == nil || *u.SenderAccountId == 0 {
		return sql.NullInt32{Valid: false}
	}

	return sql.NullInt32{
		Int32: int32(*u.SenderAccountId),
		Valid: true,
	}
}

func (u *UpdateTransactionFields) nullReceiverAccountId() sql.NullInt32 {
	if u.ReceiverAccountId == nil || *u.ReceiverAccountId == 0 {
		return sql.NullInt32{Valid: false}
	}

	return sql.NullInt32{
		Int32: int32(*u.ReceiverAccountId),
		Valid: true,
	}
}

func (u *UpdateTransactionFields) nullCurrencyId() sql.NullInt32 {
	if u.CurrencyId == nil {
		return sql.NullInt32{Valid: false}
	}

	return sql.NullInt32{
		Int32: int32(*u.CurrencyId),
		Valid: true,
	}
}

func (u *UpdateTransactionFields) nullReceiverCurrencyId() sql.NullInt32 {
	if u.ReceiverCurrencyId == nil {
		return sql.NullInt32{Valid: false}
	}

	return sql.NullInt32{
		Int32: int32(*u.ReceiverCurrencyId),
		Valid: true,
	}
}

func (u *UpdateTransactionFields) nullCategoryId() sql.NullInt32 {
	if u.CategoryId == nil || *u.CategoryId == 0 {
		return sql.NullInt32{Valid: false}
	}

	return sql.NullInt32{
		Int32: int32(*u.CategoryId),
		Valid: true,
	}
}

func (u *UpdateTransactionFields) nullRelatedCurrencyId() sql.NullInt32 {
	if u.RelatedCurrencyId == nil || *u.RelatedCurrencyId == 0 {
		return sql.NullInt32{Valid: false}
	}

	return sql.NullInt32{
		Int32: int32(*u.RelatedCurrencyId),
		Valid: true,
	}
}

func (r *Repository) UpdateTransaction(
	ctx context.Context,
	userId string,
	id model.TransactionID,
	field UpdateTransactionFields,
) error {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return err
	}

	updatedRows, err := r.queries.WithTx(tx).UpdateTransaction(
		ctx, &dao.UpdateTransactionParams{
			UserID:           userId,
			ID:               int32(id),
			Amount:           field.nullAmount(),
			Currency:         field.nullCurrencyId(),
			UpdateSender:     field.SenderAccountId != nil,
			Sender:           field.nullSenderAccountId(),
			UpdateReceiver:   field.ReceiverAccountId != nil,
			Receiver:         field.nullReceiverAccountId(),
			UpdateCategory:   field.CategoryId != nil,
			Category:         field.nullCategoryId(),
			Date:             field.nullDate(),
			Note:             field.nullNote(),
			ReceiverCurrency: field.nullReceiverCurrencyId(),
			ReceiverAmount:   field.nullReceiverAmount(),
		},
	)
	if err != nil {
		return err
	}
	if updatedRows == 0 {
		return fmt.Errorf("updated 0 rows")
	}

	_, err = r.queries.WithTx(tx).UpdateFinancialIncome(
		ctx, &dao.UpdateFinancialIncomeParams{
			RelatedCurrencyID: field.nullRelatedCurrencyId(),
			TransactionID:     int32(id),
		},
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}
