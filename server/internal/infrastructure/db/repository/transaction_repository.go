package repository

import (
	"context"
	"database/sql"
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

		transactions[i] = model.Transaction{
			ID:               int(transactionDao.ID),
			Amount:           int(transactionDao.Amount),
			Currency:         int(transactionDao.Currency),
			Sender:           sender,
			Receiver:         receiver,
			Category:         category,
			Date:             transactionDao.Date,
			Note:             transactionDao.Note,
			ReceiverCurrency: int(transactionDao.ReceiverCurrency),
			ReceiverAmount:   int(transactionDao.ReceiverAmount),
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
	receiverCurrencyId, receiverAmount int,
) (int, error) {
	transactionId, err := r.queries.CreateTransaction(
		ctx, dao.CreateTransactionParams{
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
	return int(transactionId), nil
}

func (r *Repository) UpdateTransaction(
	ctx context.Context,
	userId string,
	id,
	amount int,
	currencyId, senderAccountId, receiverAccountId, categoryId int,
	date time.Time,
	note string,
	receiverCurrencyId, receiverAmount int,
) error {
	updatedRows, err := r.queries.UpdateTransaction(
		ctx, dao.UpdateTransactionParams{
			UserID:   userId,
			ID:       int32(id),
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
		return err
	}
	if updatedRows == 0 {
		return err
	}
	return nil
}
