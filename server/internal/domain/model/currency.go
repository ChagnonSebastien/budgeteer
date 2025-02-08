package model

type ExchangeRate struct {
	ID   int
	Rate float64
	Date string
}

type ComponentRatio struct {
	Ratio float64 `json:"ratio"`
}

type CompositionType string

const (
	AssetComposition  CompositionType = "asset"
	RegionComposition CompositionType = "region"
	SectorComposition CompositionType = "sector"
)

type Composition struct {
	Date         string                                `json:"date"`
	Compositions map[CompositionType]map[string]ComponentRatio `json:"compositions"`
}

type Currency struct {
	ID            int
	Name          string
	Symbol        string
	DecimalPoints int
	Type          string
	ExchangeRates map[int][]ExchangeRate
	Compositions  []Composition
}
