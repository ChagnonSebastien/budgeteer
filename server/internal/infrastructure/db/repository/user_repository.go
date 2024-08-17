package repository

import (
	"context"

	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) UpsertUser(ctx context.Context, id, username, email string) error {
	return r.queries.UpsertUser(
		ctx, dao.UpsertUserParams{
			ID:       id,
			Username: username,
			Email:    email,
		},
	)
}
