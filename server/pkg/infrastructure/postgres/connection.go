package postgres

import (
	"chagnon.dev/budget-server/internal/logging"
	"context"
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
)

func NewPostgresDatabase(ctx context.Context, host, user, pass, name string, port int) (*sql.DB, error) {
	logger := logging.FromContext(ctx)
	logger = logger.
		With("host", host).
		With("port", port).
		With("database", name).
		With("user", user)

	logger.Debug("Attempting to connect to postgres database")

	connectionString := fmt.Sprintf("postgresql://%s:%s@%s:%d/%s?sslmode=disable", user, pass, host, port, name)
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("connecting to postgres database: %w", err)
	}

	err = db.Ping()
	if err != nil {
		return nil, fmt.Errorf("pinging the postgres database: %w", err)
	}

	logger.Info("Connected to the postgres database")

	return db, nil
}
