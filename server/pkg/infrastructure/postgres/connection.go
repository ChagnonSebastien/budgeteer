package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"os/exec"
)

func NewPostgresDatabase(ctx context.Context, host, user, pass, name string, port int) (*sql.DB, error) {

	connection_string := fmt.Sprintf("jdbc:postgresql://%s:%d/%s?user=%s&password=%s", host, port, name, user, pass)
	err := runLiquibaseCommand(connection_string)
	if err != nil {
		fmt.Printf("error running liquibase: %s", err)
		return nil, err
	}

	connection_string = fmt.Sprintf("postgresql://%s:%s@%s:%d/%s?sslmode=disable", user, pass, host, port, name)
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

func runLiquibaseCommand(connection_string string) error {
	cmd := exec.Command(
		"liquibase",
		"update",
		"--driver=org.postgresql.Driver",
		fmt.Sprintf("--url=%s", connection_string),
		"--changeLogFile=./liquibase/changelog/db.changelog-master.yaml",
	)

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}
