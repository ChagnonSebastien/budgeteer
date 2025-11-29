package shared

type ClaimsKey struct{}

type AuthMethod string

const (
	AuthMethodOidc     AuthMethod = "oidc"
	AuthMethodUserPass            = "userPass"
	AuthMethodGuest               = "guest"
)

type Claims struct {
	Email                  string     `json:"email"`
	Sub                    string     `json:"sub"`
	Username               string     `json:"preferred_username"`
	Name                   string     `json:"name"`
	DefaultCurrency        *int       `json:"default_currency"`
	HiddenDefaultAccount   *int       `json:"hidden_default_account"`
	AuthentificationMethod AuthMethod `json:"authentification_method"`
}

// IsGuestUser returns true if this is a guest user account
func (c *Claims) IsGuestUser() bool {
	return c.AuthentificationMethod == AuthMethodGuest
}
