package repository

import (
	"database/sql"

	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

type Repository struct {
	queries *dao.Queries
	db      *sql.DB
}

func NewRepository(queries *dao.Queries, db *sql.DB) *Repository {
	return &Repository{queries, db}
}
