package model

type RateAutoUpdateSettings struct {
	Script  string
	Enabled bool
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
}
