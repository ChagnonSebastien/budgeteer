package model

import (
	"encoding/json"
	"errors"
)

type Email string

type UserParams struct {
	Name                 string
	DisplayName          *string
	DefaultCurrency      *CurrencyID
	HiddenDefaultAccount AccountID
	Preferences          json.RawMessage
}

var (
	ErrOidcEmailUnverified = errors.New("the identity provider has not verified this email")
	ErrOidcEmailTaken      = errors.New("this email is already linked to another identity")
)

type OidcIdentity struct {
	Sub           string
	Email         string
	EmailVerified bool
	Username      string
}
