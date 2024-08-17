package grpc

type claimsKey struct{}

type Claims struct {
	Email    string `json:"email"`
	Sid      string `json:"sid"`
	Username string `json:"preferred_username"`
	Name     string `json:"name"`
}
