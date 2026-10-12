package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"github.com/google/uuid"
)

func (r *Repository) ResolveOidcUser(ctx context.Context, identity model.OidcIdentity) (userID uuid.UUID, email string, err error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return uuid.Nil, "", err
	}
	defer func() { _ = tx.Rollback() }()

	queries := r.queries.WithTx(tx)
	sub := sql.NullString{Valid: true, String: identity.Sub}

	known, err := queries.GetUserByOidcSub(ctx, sub)
	switch {
	case err == nil:
		email = known.Email
		if identity.EmailVerified {
			email = identity.Email
		}
		if err := queries.UpdateOidcUserProfile(ctx, &dao.UpdateOidcUserProfileParams{
			Username: identity.Username,
			Email:    email,
			UserID:   known.ID,
		}); err != nil {
			return uuid.Nil, "", err
		}
		userID = known.ID
	case errors.Is(err, sql.ErrNoRows):
		if !identity.EmailVerified {
			return uuid.Nil, "", model.ErrOidcEmailUnverified
		}
		email = identity.Email
		userID, err = linkOrCreateOidcUser(ctx, queries, identity, sub)
		if err != nil {
			return uuid.Nil, "", err
		}
	default:
		return uuid.Nil, "", err
	}

	return userID, email, tx.Commit()
}

func linkOrCreateOidcUser(ctx context.Context, queries *dao.Queries, identity model.OidcIdentity, sub sql.NullString) (uuid.UUID, error) {
	existing, err := queries.GetUserByEmail(ctx, identity.Email)
	if errors.Is(err, sql.ErrNoRows) {
		return queries.CreateOidcUser(ctx, &dao.CreateOidcUserParams{
			Username: identity.Username,
			Email:    identity.Email,
			OidcSub:  sub,
		})
	}
	if err != nil {
		return uuid.Nil, err
	}
	if existing.OidcSub.Valid {
		return uuid.Nil, model.ErrOidcEmailTaken
	}

	if _, err := queries.LinkOidcSub(ctx, &dao.LinkOidcSubParams{
		OidcSub:  sub,
		Username: identity.Username,
		UserID:   existing.ID,
	}); err != nil {
		return uuid.Nil, err
	}
	return existing.ID, nil
}

func (r *Repository) CreateSession(ctx context.Context, sessionID string, userID uuid.UUID, expiresAt time.Time) error {
	if err := r.queries.DeleteExpiredSessions(ctx, userID); err != nil {
		return err
	}
	return r.queries.CreateSession(ctx, &dao.CreateSessionParams{ID: sessionID, UserID: userID, ExpiresAt: expiresAt})
}

func (r *Repository) SessionIsActive(ctx context.Context, sessionID string, userID uuid.UUID) (bool, error) {
	return r.queries.SessionIsActive(ctx, &dao.SessionIsActiveParams{ID: sessionID, UserID: userID})
}

func (r *Repository) DeleteSession(ctx context.Context, sessionID string) error {
	return r.queries.DeleteSession(ctx, sessionID)
}

func (r *Repository) EnsureGuestUser(ctx context.Context, email string) (uuid.UUID, error) {
	return r.queries.EnsureGuestUser(ctx, email)
}

func (r *Repository) SetDisplayName(ctx context.Context, id uuid.UUID, displayName string) error {
	return r.queries.SetDisplayName(ctx, &dao.SetDisplayNameParams{
		DisplayName: sql.NullString{Valid: true, String: displayName},
		UserID:      id,
	})
}

func (r *Repository) UserParams(ctx context.Context, id uuid.UUID) (*model.UserParams, error) {
	userParams, err := r.queries.GetUserParams(ctx, id)
	if err != nil {
		return nil, err
	}

	var defaultCurrency *model.CurrencyID
	if userParams.DefaultCurrency.Valid {
		id := model.CurrencyID(userParams.DefaultCurrency.Int32)
		defaultCurrency = &id
	}

	hiddenDefaultAccount := 0
	if userParams.HiddenDefaultAccount.Valid {
		hiddenDefaultAccount = int(userParams.HiddenDefaultAccount.Int32)
	}

	name := userParams.Username
	var displayName *string
	if userParams.DisplayName.Valid {
		name = userParams.DisplayName.String
		displayName = &userParams.DisplayName.String
	}

	return &model.UserParams{
		Name:                 name,
		DisplayName:          displayName,
		DefaultCurrency:      defaultCurrency,
		HiddenDefaultAccount: model.AccountID(hiddenDefaultAccount),
		Preferences:          userParams.Preferences,
		IsAdmin:              userParams.IsAdmin,
	}, nil
}

func (r *Repository) IsAdmin(ctx context.Context, id uuid.UUID) (bool, error) {
	return r.queries.IsAdmin(ctx, id)
}

func (r *Repository) TouchLastSeen(ctx context.Context, id uuid.UUID) error {
	return r.queries.TouchLastSeen(ctx, id)
}

func (r *Repository) GetAllUsers(ctx context.Context) ([]model.UserSummary, error) {
	rows, err := r.queries.GetAllUsers(ctx)
	if err != nil {
		return nil, err
	}

	users := make([]model.UserSummary, len(rows))
	for i, row := range rows {
		loginMethod := model.LoginMethodNone
		if row.HasOidc {
			loginMethod = model.LoginMethodOidc
		}
		var lastSeenAt *time.Time
		if row.LastSeenAt.Valid {
			lastSeenAt = &row.LastSeenAt.Time
		}
		users[i] = model.UserSummary{
			ID:          row.ID,
			Email:       row.Email,
			Name:        row.Name,
			LoginMethod: loginMethod,
			IsAdmin:     row.IsAdmin,
			LastSeenAt:  lastSeenAt,
		}
	}
	return users, nil
}

func (r *Repository) MergePreferences(ctx context.Context, id uuid.UUID, patch json.RawMessage, maxSize int) (bool, error) {
	rows, err := r.queries.MergeUserPreferences(ctx, &dao.MergeUserPreferencesParams{
		UserID:  id,
		Patch:   patch,
		MaxSize: int32(maxSize),
	})
	return rows == 1, err
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
