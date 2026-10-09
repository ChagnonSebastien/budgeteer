package model

type Email string

type UserParams struct {
	Name                 string
	DisplayName          *string
	DefaultCurrency      *CurrencyID
	HiddenDefaultAccount AccountID
}
