package shared

type ClaimsKey struct{}

type Claims struct {
	Email    string `json:"email"`
	Sub      string `json:"sub"`
	Username string `json:"preferred_username"`
	Name     string `json:"name"`
}
