package model

type Balance struct {
	CurrencyId int
	Value      int
}

type AccountID int

type Account struct {
	ID                   AccountID
	Name                 string
	InitialBalances      []Balance
	IsMine               bool
	Type                 string
	FinancialInstitution string
}
