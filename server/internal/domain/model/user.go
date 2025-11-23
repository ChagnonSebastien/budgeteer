package model

type Email string

type UserParams struct {
	DefaultCurrency      CurrencyID
	HiddenDefaultAccount AccountID
}
