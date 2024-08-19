package repository

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
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

func (r *Repository) UserParams(ctx context.Context, id string) (*model.UserParams, error) {
	defaultCurrencyDao, err := r.queries.GetUserParams(ctx, id)
	if err != nil {
		return nil, err
	}

	defaultCurrency := 0
	if defaultCurrencyDao.Valid {
		defaultCurrency = int(defaultCurrencyDao.Int32)
	}

	return &model.UserParams{DefaultCurrency: defaultCurrency}, nil
}
