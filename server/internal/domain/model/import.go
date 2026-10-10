package model

import (
	"encoding/json"
	"time"
)

type ImportID int

type Import struct {
	ID        ImportID
	Account   AccountID
	FileName  string
	RowCount  int
	CreatedAt time.Time
}

type ImportProfile struct {
	Account AccountID
	Mapping json.RawMessage
}
