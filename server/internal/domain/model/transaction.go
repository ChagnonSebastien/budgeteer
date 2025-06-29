package model

import (
	"time"
)

type TransactionID int

type Transaction struct {
	ID               TransactionID
	Amount           int
	Currency         CurrencyID
	Sender           AccountID
	Receiver         AccountID
	Category         CategoryID
	Date             time.Time
	Note             string
	ReceiverCurrency CurrencyID
	ReceiverAmount   int
}
