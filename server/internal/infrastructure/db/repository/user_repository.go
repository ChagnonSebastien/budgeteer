package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
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
			Username:    identity.Username,
			Email:       email,
			DisplayName: displayName(identity),
			UserID:      known.ID,
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
			Username:    identity.Username,
			Email:       identity.Email,
			OidcSub:     sub,
			DisplayName: displayName(identity),
		})
	}
	if err != nil {
		return uuid.Nil, err
	}
	if existing.OidcSub.Valid {
		return uuid.Nil, model.ErrOidcEmailTaken
	}

	if _, err := queries.LinkOidcSub(ctx, &dao.LinkOidcSubParams{
		OidcSub:     sub,
		Username:    identity.Username,
		DisplayName: displayName(identity),
		UserID:      existing.ID,
	}); err != nil {
		return uuid.Nil, err
	}
	return existing.ID, nil
}

func displayName(identity model.OidcIdentity) sql.NullString {
	return sql.NullString{String: identity.DisplayName, Valid: identity.DisplayName != ""}
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

type userDeletionPlan struct {
	email         string
	impact        model.UserDeletionImpact
	deletedGroups []int32
	grouped       []groupedTransactionSnapshot
}

func planUserDeletion(ctx context.Context, queries *dao.Queries, id uuid.UUID) (*userDeletionPlan, error) {
	target, err := queries.GetUserForDeletion(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, model.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	if target.IsAdmin {
		return nil, model.ErrUserIsAdmin
	}

	counts, err := queries.CountUserData(ctx, id)
	if err != nil {
		return nil, err
	}
	plan := &userDeletionPlan{
		email: target.Email,
		impact: model.UserDeletionImpact{
			Accounts:     int(counts.Accounts),
			Transactions: int(counts.Transactions),
			Categories:   int(counts.Categories),
			Currencies:   int(counts.Currencies),
		},
	}

	created, err := queries.GetCreatedTransactionGroups(ctx, &dao.GetCreatedTransactionGroupsParams{UserID: id, UserEmail: target.Email})
	if err != nil {
		return nil, err
	}
	for _, group := range created {
		// The group's amounts are in the creator's currency, so it cannot outlive that currency.
		if group.OtherMembers > 0 {
			plan.impact.BlockingTransactionGroups = append(plan.impact.BlockingTransactionGroups, group.Name)
			continue
		}
		plan.deletedGroups = append(plan.deletedGroups, group.ID)
		plan.impact.DeletedTransactionGroups = append(plan.impact.DeletedTransactionGroups, group.Name)
	}

	rows, err := queries.GetGroupedTransactionsForUser(ctx, id)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		if slices.Contains(plan.deletedGroups, row.TransactionGroupID) {
			continue
		}
		plan.grouped = append(plan.grouped, groupedTransactionSnapshot(row))
	}
	plan.impact.MovedToUnconfirmed = len(plan.grouped)
	return plan, nil
}

func (r *Repository) GetUserDeletionImpact(ctx context.Context, id uuid.UUID) (impact model.UserDeletionImpact, err error) {
	err = r.inTx(ctx, func(queries *dao.Queries) error {
		plan, err := planUserDeletion(ctx, queries, id)
		if err != nil {
			return err
		}
		impact = plan.impact
		return nil
	})
	return impact, err
}

func (r *Repository) DeleteUser(ctx context.Context, id uuid.UUID) error {
	return r.inTx(ctx, func(queries *dao.Queries) error {
		plan, err := planUserDeletion(ctx, queries, id)
		if err != nil {
			return err
		}
		if len(plan.impact.BlockingTransactionGroups) > 0 {
			return model.ErrUserCreatedSharedGroups
		}

		for _, group := range plan.deletedGroups {
			if err := queries.DeleteTransactionGroup(ctx, group); err != nil {
				return fmt.Errorf("deleting transaction group %d: %w", group, err)
			}
		}
		if _, err := copyGroupedTransactionsToUnconfirmed(ctx, queries, plan.email, plan.grouped); err != nil {
			return err
		}

		steps := []struct {
			name string
			run  func(context.Context, uuid.UUID) error
		}{
			{"clearing the default account", queries.ClearHiddenDefaultAccount},
			{"deleting transactions", queries.DeleteUserTransactions},
			{"deleting account balances", queries.DeleteUserAccountCurrencies},
			{"deleting accounts", queries.DeleteUserAccounts},
			{"deleting financial incomes", queries.DeleteUserFinancialIncomes},
			{"deleting exchange rates", queries.DeleteUserExchangeRates},
			{"deleting currencies", queries.DeleteUserCurrencies},
			{"deleting categories", queries.DeleteUserCategories},
		}
		for _, step := range steps {
			if err := step.run(ctx, id); err != nil {
				return fmt.Errorf("%s: %w", step.name, err)
			}
		}

		if err := queries.DeleteGuestLogin(ctx, plan.email); err != nil {
			return fmt.Errorf("deleting guest login: %w", err)
		}
		deleted, err := queries.DeleteUser(ctx, id)
		if err != nil {
			return fmt.Errorf("deleting user: %w", err)
		}
		if deleted != 1 {
			return model.ErrUserNotFound
		}
		return nil
	})
}
