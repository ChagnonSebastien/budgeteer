package model

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

type Email string

type UserParams struct {
	Name                 string
	DisplayName          *string
	DefaultCurrency      *CurrencyID
	HiddenDefaultAccount AccountID
	Preferences          json.RawMessage
	IsAdmin              bool
}

type LoginMethod string

const (
	LoginMethodNone LoginMethod = ""
	LoginMethodOidc LoginMethod = "oidc"
)

type UserSummary struct {
	ID          uuid.UUID
	Email       string
	Name        string
	LoginMethod LoginMethod
	IsAdmin     bool
	LastSeenAt  *time.Time
}

type UserDeletionImpact struct {
	Accounts                  int
	Transactions              int
	Categories                int
	Currencies                int
	MovedToUnconfirmed        int
	DeletedTransactionGroups  []string
	BlockingTransactionGroups []string
}

var (
	ErrUserNotFound            = errors.New("user not found")
	ErrUserIsAdmin             = errors.New("admins cannot be deleted")
	ErrUserCreatedSharedGroups = errors.New("the user created shared groups that other people are in")
	ErrOidcEmailUnverified     = errors.New("the identity provider has not verified this email")
	ErrOidcEmailTaken          = errors.New("this email is already linked to another identity")
)

type OidcIdentity struct {
	Sub           string
	Email         string
	EmailVerified bool
	Username      string
	DisplayName   string
}
