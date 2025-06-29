package model

import "time"

type ExchangeRate struct {
	CurrencyA CurrencyID
	CurrencyB CurrencyID
	Rate      float64
	Date      time.Time
}
