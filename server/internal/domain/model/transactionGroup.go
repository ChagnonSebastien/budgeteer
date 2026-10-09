package model

type TransactionGroupID int

type SplitType int

const (
	SplitTypeEqual SplitType = iota
	SplitTypePercentage
	SplitTypeShare
)

type SplitChangeScope int

const (
	SplitChangeAllTransactions SplitChangeScope = iota
	SplitChangeTransactionsWithoutCustomSplit
	SplitChangeFutureTransactions
)

type Member struct {
	Email      Email
	Name       string
	SplitValue Optional[int]
	Joined     bool
}

type TransactionGroup struct {
	ID                            TransactionGroupID
	Name                          string
	OriginalCurrency              string
	OriginalCurrencySymbol        string
	OriginalCurrencyDecimalPoints int
	SplitType                     SplitType
	Currency                      Optional[CurrencyID]
	Category                      Optional[CategoryID]
	Members                       []Member
	Hidden                        bool
}
