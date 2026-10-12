package model

import "time"

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
	IsDebt               bool
	Type                 string
	FinancialInstitution string
	CreatedAt            time.Time
	StatementNames       []string
}
