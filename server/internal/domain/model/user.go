package model

import "encoding/json"

type Email string

type UserParams struct {
	Name                 string
	DisplayName          *string
	DefaultCurrency      *CurrencyID
	HiddenDefaultAccount AccountID
	Preferences          json.RawMessage
}
