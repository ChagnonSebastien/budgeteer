package model

type Account struct {
	ID            int
	Name          string
	InitialAmount int
	CurrencyIds   []int
}
