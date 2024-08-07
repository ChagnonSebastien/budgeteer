package repository

import (
	"context"
	"database/sql"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (t *Repository) GetAllTransactions(ctx context.Context) ([]model.Transaction, error) {
	transactionsDao, err := t.queries.GetAllTransactions(ctx)
	if err != nil {
		return nil, err
	}

	transactions := make([]model.Transaction, len(transactionsDao))
	for _, transactionDao := range transactionsDao {
		note := ""
		if transactionDao.Note.Valid {
			note = transactionDao.Note.String
		}

		transactions = append(transactions, model.Transaction{
			ID:       int(transactionDao.TransactionID),
			Amount:   int(transactionDao.Amount),
			Currency: int(transactionDao.Currency),
			Sender:   int(transactionDao.Sender),
			Receiver: int(transactionDao.Receiver),
			Category: int(transactionDao.Category),
			Date:     transactionDao.Date,
			Note:     note,
		})
	}

	return transactions, nil
}

func (t *Repository) CreateTransaction(ctx context.Context, amount int, currencyId, senderAccountId, receiverAccountId, categoryId int, date time.Time, note string) (int, error) {
	transactionId, err := t.queries.CreateTransaction(ctx, dao.CreateTransactionParams{
		Amount:   int32(amount),
		Currency: int32(currencyId),
		Sender:   int32(senderAccountId),
		Receiver: int32(receiverAccountId),
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
