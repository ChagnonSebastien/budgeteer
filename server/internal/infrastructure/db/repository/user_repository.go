package repository

import (
	"context"
	"database/sql"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"github.com/google/uuid"
)

func (r *Repository) UpsertOidcUser(ctx context.Context, oidcSub, email, username string) (uuid.UUID, error) {
	return r.queries.UpsertOidcUser(ctx, &dao.UpsertOidcUserParams{
		Username: username,
		Email:    email,
		OidcSub: sql.NullString{
			Valid:  true,
			String: oidcSub,
		},
	})
}

func (r *Repository) UpsertUser(ctx context.Context, username, email string, oidcSub model.Optional[string]) error {
	return r.queries.UpsertUser(
		ctx, &dao.UpsertUserParams{
			Username: username,
			Email:    email,
			OidcSub: sql.NullString{
				Valid:  oidcSub.IsSome(),
				String: oidcSub.ValueOr(""),
			},
		},
	)
}

func (r *Repository) UserParams(ctx context.Context, id uuid.UUID) (*model.UserParams, error) {
	userParams, err := r.queries.GetUserParams(ctx, id)
	if err != nil {
		return nil, err
	}

	defaultCurrency := 0
	if userParams.DefaultCurrency.Valid {
		defaultCurrency = int(userParams.DefaultCurrency.Int32)
	}

	hiddenDefaultAccount := 0
	if userParams.HiddenDefaultAccount.Valid {
		hiddenDefaultAccount = int(userParams.HiddenDefaultAccount.Int32)
	}

	return &model.UserParams{
		Name:                 userParams.Username,
		DefaultCurrency:      model.CurrencyID(defaultCurrency),
		HiddenDefaultAccount: model.AccountID(hiddenDefaultAccount),
	}, nil
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
