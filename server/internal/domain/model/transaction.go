package model

import (
	"time"
)

type TransactionID int

type FinancialIncomeData struct {
	RelatedCurrency CurrencyID
}

type SplitTypeOverride int

const (
	SplitTypeOverrideEqual SplitTypeOverride = iota
	SplitTypeOverridePercentage
	SplitTypeOverrideShare
	SplitTypeOverrideExactAmount
)

type MemberSplitValue struct {
	Email      Email
	SplitValue Optional[int]
}

type SplitOverride struct {
	SplitTypeOverride SplitTypeOverride
	Members           []MemberSplitValue
}

type GroupedTransactionData struct {
	TransactionGroup  TransactionGroupID
	SplitTypeOverride Optional[SplitOverride]
}

type Transaction struct {
	ID                     TransactionID
	Amount                 int
	Currency               CurrencyID
	Sender                 Optional[AccountID]
	Receiver               Optional[AccountID]
	Category               Optional[CategoryID]
	Date                   time.Time
	Note                   string
	ReceiverCurrency       CurrencyID
	ReceiverAmount         int
	FinancialIncomeData    Optional[FinancialIncomeData]
	GroupedTransactionData Optional[GroupedTransactionData]
}
