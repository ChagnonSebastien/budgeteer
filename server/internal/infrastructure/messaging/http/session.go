package http

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
	"github.com/google/uuid"

	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"chagnon.dev/budget-server/internal/logging"
)

const sessionTokenTTL = 7 * 24 * time.Hour

var errSessionRevoked = errors.New("session revoked or expired")

type sessionClaims struct {
	sessionID string
	user      shared.User
}

func (auth *Auth) issueSession(ctx context.Context, w http.ResponseWriter, user *shared.User) error {
	signer, err := jose.NewSigner(
		jose.SigningKey{Algorithm: jose.HS256, Key: auth.guestJWTSecret},
		(&jose.SignerOptions{}).WithType("JWT"),
	)
	if err != nil {
		return fmt.Errorf("creating JWT signer: %w", err)
	}

	sessionID := generateStateToken()
	now := time.Now()
	expiresAt := now.Add(sessionTokenTTL)

	if err := auth.UserService.CreateSession(ctx, sessionID, user.ID, expiresAt); err != nil {
		return fmt.Errorf("storing session: %w", err)
	}

	sessionToken, err := jwt.Signed(signer).Claims(map[string]interface{}{
		"jti":                     sessionID,
		"id":                      user.ID,
		"email":                   user.Email,
		"authentification_method": user.AuthMethod,
		"iat":                     jwt.NewNumericDate(now),
		"exp":                     jwt.NewNumericDate(expiresAt),
	}).Serialize()
	if err != nil {
		return fmt.Errorf("signing session token: %w", err)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session-token",
		Value:    sessionToken,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})
	return nil
}

func (auth *Auth) readSessionClaims(getCookie func(name string) (*http.Cookie, error)) (*sessionClaims, error) {
	sessionCookie, err := getCookie("session-token")
	if err != nil {
		return nil, fmt.Errorf("no session token")
	}

	token, err := jwt.ParseSigned(sessionCookie.Value, []jose.SignatureAlgorithm{jose.HS256})
	if err != nil {
		return nil, fmt.Errorf("parsing session token: %w", err)
	}

	var standardClaims jwt.Claims
	var customClaims struct {
		ID         string `json:"id"`
		Email      string `json:"email"`
		AuthMethod string `json:"authentification_method"`
	}
	if err := token.Claims(auth.guestJWTSecret, &standardClaims, &customClaims); err != nil {
		return nil, err
	}

	if standardClaims.Expiry == nil { // Validate skips exp when absent, so the token would never expire
		return nil, fmt.Errorf("session token missing exp claim")
	}
	if err := standardClaims.Validate(jwt.Expected{Time: time.Now()}); err != nil {
		return nil, fmt.Errorf("validating session token: %w", err)
	}
	if standardClaims.ID == "" {
		return nil, fmt.Errorf("session token missing jti claim")
	}

	userID, err := uuid.Parse(customClaims.ID)
	if err != nil {
		return nil, fmt.Errorf("parsing id [%s] from session token: %w", customClaims.ID, err)
	}

	return &sessionClaims{
		sessionID: standardClaims.ID,
		user: shared.User{
			ID:         userID,
			Email:      customClaims.Email,
			AuthMethod: shared.AuthMethod(customClaims.AuthMethod),
		},
	}, nil
}

func (auth *Auth) parseSessionToken(ctx context.Context, getCookie func(name string) (*http.Cookie, error)) (*shared.User, error) {
	claims, err := auth.readSessionClaims(getCookie)
	if err != nil {
		return nil, err
	}

	active, err := auth.UserService.SessionIsActive(ctx, claims.sessionID, claims.user.ID)
	if err != nil {
		return nil, fmt.Errorf("checking session: %w", err)
	}
	if !active {
		return nil, errSessionRevoked
	}

	if err := auth.UserService.TouchLastSeen(ctx, claims.user.ID); err != nil {
		logging.FromContext(ctx).Error("recording last seen", "error", err)
	}

	return &claims.user, nil
}
