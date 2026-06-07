package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"

	_ "github.com/lib/pq"

	"chagnon.dev/budget-server/internal/logging"
)

func NewPostgresDatabase(ctx context.Context, host, user, pass, name string, port int, sslMode string) (*sql.DB, error) {
	if sslMode == "" {
		sslMode = "disable"
	}

	logger := logging.FromContext(ctx)
	logger = logger.
		With("host", host).
		With("port", port).
		With("database", name).
		With("user", user).
		With("sslmode", sslMode)

	logger.Debug("Attempting to connect to postgres database")

	// Build the URL via url.URL so credentials with special characters are
	// correctly percent-encoded rather than corrupting the connection string.
	connectionUrl := url.URL{
		Scheme: "postgresql",
		User:   url.UserPassword(user, pass),
		Host:   fmt.Sprintf("%s:%d", host, port),
		Path:   "/" + name,
	}
	query := connectionUrl.Query()
	query.Set("sslmode", sslMode)
	connectionUrl.RawQuery = query.Encode()

	db, err := sql.Open("postgres", connectionUrl.String())
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
