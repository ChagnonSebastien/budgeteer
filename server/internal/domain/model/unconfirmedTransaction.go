package model

import (
	"time"
)

type UnconfirmedTransactionID int

type UnconfirmedTransaction struct {
	ID               UnconfirmedTransactionID
	TransactionGroup TransactionGroupID
	Owner            Email
	CreatedBy        Email
	Amount           int // in the group currency
	Date             time.Time
	Note             string
	SplitOverride    Optional[SplitOverride]
}
