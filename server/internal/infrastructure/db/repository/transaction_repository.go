package repository

import (
	"context"
	"database/sql"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) GetAllTransactions(ctx context.Context) ([]model.Transaction, error) {
	transactionsDao, err := r.queries.GetAllTransactions(ctx)
	if err != nil {
		return nil, err
	}

	transactions := make([]model.Transaction, len(transactionsDao))
	for _, transactionDao := range transactionsDao {
		var note string
		if transactionDao.Note.Valid {
			note = transactionDao.Note.String
		}

		var sender int
		if transactionDao.Sender.Valid {
			sender = int(transactionDao.Sender.Int32)
		}

		var receiver int
		if transactionDao.Receiver.Valid {
			receiver = int(transactionDao.Receiver.Int32)
		}

		transactions = append(transactions, model.Transaction{
			ID:       int(transactionDao.TransactionID),
			Amount:   int(transactionDao.Amount),
			Currency: int(transactionDao.Currency),
			Sender:   sender,
			Receiver: receiver,
			Category: int(transactionDao.Category),
			Date:     transactionDao.Date,
			Note:     note,
		})
	}

	return transactions, nil
}

func (r *Repository) CreateTransaction(ctx context.Context, amount int, currencyId, senderAccountId, receiverAccountId, categoryId int, date time.Time, note string) (int, error) {
	transactionId, err := r.queries.CreateTransaction(ctx, dao.CreateTransactionParams{
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
		Category: int32(categoryId),
		Date:     date,
		Note: sql.NullString{
			String: note,
			Valid:  note != "",
		},
	})
	if err != nil {
		return 0, err
	}
	return int(transactionId), nil
}
