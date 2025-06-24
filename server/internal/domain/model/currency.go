package model

import "time"

type ExchangeRate struct {
	ID   int
	Rate float64
	Date time.Time
}

type RateAutoUpdateSettings struct {
	Script  string
	Enabled bool
}

type Currency struct {
	ID                     int
	Name                   string
	Symbol                 string
	DecimalPoints          int
	ExchangeRates          map[int][]ExchangeRate
	RateAutoUpdateSettings RateAutoUpdateSettings
}
