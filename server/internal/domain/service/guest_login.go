package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
)

type Mailer interface {
	Send(ctx context.Context, to []string, subject, textBody, htmlBody string) error
}

type GuestLoginConfig struct {
	CodeLength         int
	CodeTTL            time.Duration
	CodeResendCooldown time.Duration
	MaxFailedAttempts  int
	BcryptCost         int
	BrandName          string
	BrandURL           string
	SupportEmail       string
}

type GuestLoginService struct {
	repo   *repository.Repository
	mailer Mailer
	cfg    GuestLoginConfig
}

func NewGuestLoginService(repo *repository.Repository, mailer Mailer, cfg GuestLoginConfig) (*GuestLoginService, error) {
	if cfg.CodeLength == 0 {
		cfg.CodeLength = 6
	}
	if cfg.CodeTTL == 0 {
		cfg.CodeTTL = 15 * time.Minute
	}
	if cfg.CodeResendCooldown == 0 {
		cfg.CodeResendCooldown = 5 * time.Minute
	}
	if cfg.MaxFailedAttempts == 0 {
		cfg.MaxFailedAttempts = 3
	}
	if cfg.BcryptCost == 0 {
		cfg.BcryptCost = bcrypt.DefaultCost
	}
	return &GuestLoginService{repo: repo, mailer: mailer, cfg: cfg}, nil
}

func (s *GuestLoginService) SendLoginCode(ctx context.Context, email, name string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return errors.New("email required")
	}
	if name == "" {
		name = "there"
	}

	can, nextAllowed, err := s.repo.CanIssueGuestLoginNow(ctx, email, s.cfg.CodeTTL, s.cfg.CodeResendCooldown)
	if err != nil {
		return fmt.Errorf("cooldown check failed: %w", err)
	}
	if !can {
		return fmt.Errorf("too soon to resend; try again in %dm", int(math.Ceil(nextAllowed.Sub(time.Now()).Minutes())))
	}

	code, err := generateNumericCode(s.cfg.CodeLength)
	if err != nil {
		return fmt.Errorf("generate code: %w", err)
	}

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(code), s.cfg.BcryptCost)
	if err != nil {
		return fmt.Errorf("bcrypt: %w", err)
	}
	hash := string(hashBytes)
	expiry := time.Now().Add(s.cfg.CodeTTL)

	if err := s.repo.UpsertGuestLogin(ctx, email, hash, expiry); err != nil {
		return fmt.Errorf("store code: %w", err)
	}

	subject := fmt.Sprintf("%s — your sign-in code", s.cfg.BrandName)
	textBody := s.makePlain(name, code, s.cfg.CodeTTL)
	htmlBody := s.makeHTML(name, code, s.cfg.CodeTTL)

	if err := s.mailer.Send(ctx, []string{email}, subject, textBody, htmlBody); err != nil {
		return fmt.Errorf("send mail: %w", err)
	}
	return nil
}

func (s *GuestLoginService) VerifyLoginCode(ctx context.Context, email, code string) (bool, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	code = strings.TrimSpace(code)
	if email == "" || code == "" {
		return false, errors.New("email and code required")
	}

	gl, err := s.repo.GetGuestLoginForVerify(ctx, email)
	if err != nil {
		return false, errors.New("no code found or expired")
	}

	if int(gl.FailedAttempts) >= s.cfg.MaxFailedAttempts {
		return false, errors.New("no code found or expired")
	}

	if time.Now().After(gl.CodeExpiry) {
		_ = s.repo.ConsumeGuestLogin(ctx, email)
		return false, errors.New("no code found or expired")
	}

	if bcrypt.CompareHashAndPassword([]byte(gl.CodeHash), []byte(code)) == nil {
		// Success: consume entry
		if err := s.repo.ConsumeGuestLogin(ctx, email); err != nil {
			return false, fmt.Errorf("consume code: %w", err)
		}
		return true, nil
	}

	// Wrong code: increment failed attempts
	count, err := s.repo.IncrementGuestLoginFailedAttempts(ctx, email)
	if err == nil && count >= s.cfg.MaxFailedAttempts {
		return false, errors.New("too many failed attempts; please request a new code")
	}
	return false, errors.New("invalid code")
}

func (s *GuestLoginService) CleanupExpired(ctx context.Context) error {
	return s.repo.DeleteExpiredGuestLogins(ctx)
}

func (s *GuestLoginService) makePlain(name, code string, ttl time.Duration) string {
	return fmt.Sprintf(
		"Hi %s,\n\nYour sign-in code is: %s\n\nThis code expires in %d minutes.\nIf you didn’t request it, ignore this email.\n\n— %s\n%s",
		name, code, int(ttl.Minutes()), s.cfg.BrandName, s.cfg.BrandURL)
}

func (s *GuestLoginService) makeHTML(name, code string, ttl time.Duration) string {
	return fmt.Sprintf(
		`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Your sign-in code</title>
</head>
<body>
<body style="font-family:Arial,sans-serif;color:#333">
  <p>Hi %s,</p>
  <p>Your sign-in code is:</p>
  <p style="font-size:20px;font-weight:bold;letter-spacing:2px">%s</p>
  <p>This code expires in %d minutes.</p>
  <p style="color:#666;font-size:12px">
    If you didn’t request this, you can safely ignore it.
  </p>
  <hr/>
  <p style="font-size:12px">
    © 2025 %s. —
    <a href="%s" style="color:#666">%s</a>%s
  </p>
</body>
</html>`,
		name, code, int(ttl.Minutes()),
		s.cfg.BrandName, s.cfg.BrandURL, s.cfg.BrandURL,
		func() string {
			if s.cfg.SupportEmail != "" {
				return " · Support: " + s.cfg.SupportEmail
			}
			return ""
		}(),
	)
}

func generateNumericCode(n int) (string, error) {
	if n <= 0 {
		n = 6
	}
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := 0; i < n; i++ {
		b[i] = '0' + (b[i] % 10)
	}
	return string(b), nil
}
