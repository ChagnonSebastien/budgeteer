package repository

import (
	"context"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) UpsertUser(ctx context.Context, id, username, email string) error {
	return r.queries.UpsertUser(
		ctx, &dao.UpsertUserParams{
			ID:       id,
			Username: username,
			Email:    email,
		},
	)
}

func (r *Repository) UserParams(ctx context.Context, id string) (*model.UserParams, error) {
	defaultCurrencyDao, err := r.queries.GetUserParams(ctx, id)
	if err != nil {
		return nil, err
	}

	defaultCurrency := 0
	if defaultCurrencyDao.Valid {
		defaultCurrency = int(defaultCurrencyDao.Int32)
	}

	return &model.UserParams{DefaultCurrency: model.CurrencyID(defaultCurrency)}, nil
}

func (r *Repository) CanIssueGuestLoginNow(ctx context.Context, email string, ttl, cooldown time.Duration) (allowed bool, nextAllowedAt *time.Time, err error) {
	res, err := r.queries.CanIssueNow(ctx, &dao.CanIssueNowParams{
		Email:   email,
		Column2: int32(ttl.Seconds()),
		Column3: int32(cooldown.Seconds()),
	})
	if err != nil {
		return false, nil, err
	}

	if res.NextAllowedAt != nil {
		if t, ok := res.NextAllowedAt.(time.Time); ok {
			return res.Allowed, &t, nil
		}
	}

	return res.Allowed, nil, nil
}

func (r *Repository) UpsertGuestLogin(ctx context.Context, email, codeHash string, expiry time.Time) error {
	return r.queries.UpsertLoginCode(ctx, &dao.UpsertLoginCodeParams{
		Email:      email,
		CodeHash:   codeHash,
		CodeExpiry: expiry,
	})
}

func (r *Repository) GetGuestLoginForVerify(ctx context.Context, email string) (*dao.GuestLogins, error) {
	gl, err := r.queries.GetLoginForVerify(ctx, email)
	if err != nil {
		return nil, err
	}
	return &gl, nil
}

func (r *Repository) ConsumeGuestLogin(ctx context.Context, email string) error {
	return r.queries.ConsumeLoginCode(ctx, email)
}

func (r *Repository) IncrementGuestLoginFailedAttempts(ctx context.Context, email string) (int, error) {
	count, err := r.queries.IncFailedAttempts(ctx, email)
	return int(count), err
}

func (r *Repository) DeleteExpiredGuestLogins(ctx context.Context) error {
	return r.queries.DeleteIfExpired(ctx)
}
