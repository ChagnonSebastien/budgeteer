package shared

import (
	"context"

	"github.com/google/uuid"
)

type userKey struct{}

type AuthMethod string

const (
	AuthMethodOidc     AuthMethod = "oidc"
	AuthMethodUserPass            = "userPass"
	AuthMethodGuest               = "guest"
)

type User struct {
	ID         uuid.UUID
	Email      string
	AuthMethod AuthMethod
}

func (u *User) IsGuestUser() bool {
	return u.AuthMethod == AuthMethodGuest
}

func NewContext(ctx context.Context, u *User) context.Context {
	return context.WithValue(ctx, userKey{}, u)
}

func FromContext(ctx context.Context) (*User, bool) {
	u, ok := ctx.Value(userKey{}).(*User)
	return u, ok
}
