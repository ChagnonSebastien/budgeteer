package model

type Email string

type UserParams struct {
	Name                 string
	DefaultCurrency      CurrencyID
	HiddenDefaultAccount AccountID
}
