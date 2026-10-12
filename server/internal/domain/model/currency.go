package model

import "time"

type RateAutoUpdateSettings struct {
	Script  string
	Enabled bool
}

type RateFetchFailure struct {
	At      time.Time
	Message string
}

type CurrencyID int

type Currency struct {
	ID                     CurrencyID
	Name                   string
	Symbol                 string
	Risk                   string
	Type                   string
	DecimalPoints          int
	RateAutoUpdateSettings RateAutoUpdateSettings
	LastRateFetchFailure   *RateFetchFailure
	CreatedAt              time.Time
}
