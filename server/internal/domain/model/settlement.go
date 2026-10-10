package model

import "time"

type SettlementID int

type Settlement struct {
	ID                  SettlementID
	TransactionGroup    TransactionGroupID
	Amount              int // in the group currency
	Date                time.Time
	Note                string
	Payer               Email
	Receiver            Email
	CreatedBy           Email
	ProposedBy          Email
	CompletedAt         Optional[time.Time]
	PayerTransaction    Optional[TransactionID]
	ReceiverTransaction Optional[TransactionID]
}

type SettlementFields struct {
	Amount int
	Date   time.Time
	Note   string
}

type PersonalTransactionFields struct {
	Amount             int
	ReceiverAmount     int
	CurrencyID         int
	ReceiverCurrencyID int
	SenderAccountID    Optional[int]
	ReceiverAccountID  Optional[int]
	CategoryID         Optional[int]
	Date               time.Time
	Note               string
}
