package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"
)

func NewPostgresDatabase(ctx context.Context, host, user, pass, name string, port int) (*sql.DB, error) {
	connection_string := fmt.Sprintf("postgresql://%s:%s@%s:%d/%s?sslmode=disable", user, pass, host, port, name)
	db, err := sql.Open("postgres", connection_string)
	if err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	err = db.Ping()
	if err != nil {
		return nil, fmt.Errorf("error pinging the database: %w", err)
	}

	log.Println("Successfully connected to the database")

	return db, nil
}
