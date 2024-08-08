package model

import (
	"time"
)

type Transaction struct {
	ID       int
	Amount   int
	Currency int
	Sender   int
	Receiver int
	Category int
	Date     time.Time
	Note     string
}
