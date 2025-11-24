package model

type TransactionGroupID int

type SplitType int

const (
	SplitTypeEqual SplitType = iota
	SplitTypePercentage
	SplitTypeShare
)

type Member struct {
	Email      Email
	Name       string
	SplitValue Optional[float32]
}

type TransactionGroup struct {
	ID               TransactionGroupID
	Name             string
	OriginalCurrency string
	SplitType        SplitType
	Currency         Optional[CurrencyID]
	Category         Optional[CategoryID]
	Members          []Member
}
