package shared

type ClaimsKey struct{}

type Claims struct {
	Email                string `json:"email"`
	Sub                  string `json:"sub"`
	Username             string `json:"preferred_username"`
	Name                 string `json:"name"`
	DefaultCurrency      *int   `json:"default_currency"`
	HiddenDefaultAccount *int   `json:"hidden_default_account"`
	IsGuest              bool   `json:"is_guest,omitempty"` // true for guest users, false/omitted for full OIDC users
}

// IsGuestUser returns true if this is a guest user account
func (c *Claims) IsGuestUser() bool {
	return c.IsGuest
}
