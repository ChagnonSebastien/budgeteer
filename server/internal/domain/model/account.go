package model

type Balance struct {
	CurrencyId int
	Value      int
}

type Account struct {
	ID              int
	Name            string
	InitialBalances []Balance
	IsMine          bool
}
