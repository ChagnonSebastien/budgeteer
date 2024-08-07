package repository

import (
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

type Repository struct {
	queries *dao.Queries
}

func NewRepository(queries *dao.Queries) *Repository {
	return &Repository{queries}
}
