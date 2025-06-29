package model

type CategoryID int

type Category struct {
	ID             CategoryID
	Name           string
	ParentId       CategoryID
	IconName       string
	IconColor      string
	IconBackground string
	FixedCost      bool
	Ordering       float64
}
