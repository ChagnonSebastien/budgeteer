package migrations

import (
	"bufio"
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"strings"

	"github.com/pressly/goose/v3"
	"github.com/pressly/goose/v3/database"
	"github.com/pressly/goose/v3/lock"

	"chagnon.dev/budget-server/internal/logging"
)

//go:embed *.sql
var files embed.FS

const versionTable = "goose_db_version"

func Apply(ctx context.Context, db *sql.DB) error {
	provider, err := goose.NewProvider(goose.DialectPostgres, db, files, goose.WithTableName(versionTable))
	if err != nil {
		return fmt.Errorf("loading migrations: %w", err)
	}

	// One lock spans adoption and Up so two instances can't both adopt.
	conn, err := db.Conn(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()
	locker, err := lock.NewPostgresSessionLocker()
	if err != nil {
		return err
	}
	if err := locker.SessionLock(ctx, conn); err != nil {
		return fmt.Errorf("waiting for the migration lock: %w", err)
	}
	defer func() { _ = locker.SessionUnlock(context.WithoutCancel(ctx), conn) }()

	if err := adoptLiquibase(ctx, conn, provider.ListSources()); err != nil {
		return err
	}

	results, err := provider.Up(ctx)
	if err != nil {
		return fmt.Errorf("applying migrations: %w", err)
	}
	for _, result := range results {
		logging.FromContext(ctx).Info("applied migration", "file", result.Source.Path, "duration", result.Duration)
	}
	return nil
}

func adoptLiquibase(ctx context.Context, conn *sql.Conn, sources []*goose.Source) error {
	var hasGoose, hasLiquibase, hasLiquibaseLock bool
	err := conn.QueryRowContext(ctx, `select
		to_regclass($1) is not null,
		to_regclass('databasechangelog') is not null,
		to_regclass('databasechangeloglock') is not null`, versionTable,
	).Scan(&hasGoose, &hasLiquibase, &hasLiquibaseLock)
	if err != nil {
		return fmt.Errorf("looking for migration history: %w", err)
	}
	if hasGoose || !hasLiquibase {
		return nil
	}

	var locked bool
	if hasLiquibaseLock {
		err = conn.QueryRowContext(ctx, `select coalesce(bool_or(locked), false) from databasechangeloglock`).Scan(&locked)
		if err != nil {
			return fmt.Errorf("checking the Liquibase lock: %w", err)
		}
	}
	if locked {
		return errors.New("Liquibase holds its migration lock (databasechangeloglock): a Liquibase run crashed or is still running; release the lock before upgrading")
	}

	applied, err := liquibaseChangesets(ctx, conn)
	if err != nil {
		return err
	}

	var adopted []int64
	pendingFrom := ""
	for _, source := range sources {
		changesets, err := changesetsOf(source.Path)
		if err != nil {
			return err
		}
		done := 0
		for _, changeset := range changesets {
			if applied[changeset] {
				done++
			}
		}
		switch {
		case done == 0:
			if pendingFrom == "" {
				pendingFrom = source.Path
			}
		case done < len(changesets):
			return fmt.Errorf("Liquibase applied only part of %s: run the last Liquibase release of the server once so it finishes, then upgrade", source.Path)
		case pendingFrom != "":
			return fmt.Errorf("Liquibase applied %s but not %s: the database does not match these migrations", source.Path, pendingFrom)
		default:
			adopted = append(adopted, source.Version)
		}
	}

	store, err := database.NewStore(goose.DialectPostgres, versionTable)
	if err != nil {
		return err
	}
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if err := store.CreateVersionTable(ctx, tx); err != nil {
		return fmt.Errorf("creating the goose version table: %w", err)
	}
	for _, version := range append([]int64{0}, adopted...) {
		if err := store.Insert(ctx, tx, database.InsertRequest{Version: version}); err != nil {
			return fmt.Errorf("recording migration %d: %w", version, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	logging.FromContext(ctx).Info("adopted the Liquibase migration history", "migrations", len(adopted))
	return nil
}

func liquibaseChangesets(ctx context.Context, conn *sql.Conn) (map[string]bool, error) {
	rows, err := conn.QueryContext(ctx, `select author, id from databasechangelog`)
	if err != nil {
		return nil, fmt.Errorf("reading the Liquibase history: %w", err)
	}
	defer func() { _ = rows.Close() }()

	applied := map[string]bool{}
	for rows.Next() {
		var author, id string
		if err := rows.Scan(&author, &id); err != nil {
			return nil, err
		}
		applied[author+":"+id] = true
	}
	return applied, rows.Err()
}

func changesetsOf(path string) ([]string, error) {
	file, err := fs.ReadFile(files, path)
	if err != nil {
		return nil, err
	}
	var changesets []string
	scanner := bufio.NewScanner(strings.NewReader(string(file)))
	for scanner.Scan() {
		if rest, ok := strings.CutPrefix(scanner.Text(), "-- changeset "); ok {
			changesets = append(changesets, strings.Fields(rest)[0])
		}
	}
	return changesets, scanner.Err()
}
