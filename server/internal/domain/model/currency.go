package model

type ExchangeRate struct {
	ID   int
	Rate float64
	Date string
}

type Currency struct {
	ID            int
	Name          string
	Symbol        string
	DecimalPoints int
	ExchangeRates map[int][]ExchangeRate
}
