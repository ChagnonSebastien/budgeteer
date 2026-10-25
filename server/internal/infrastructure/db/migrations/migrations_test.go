package migrations

import (
	"context"
	"database/sql"
	"net/url"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
)

func freshDatabase(t *testing.T) *sql.DB {
	t.Helper()
	serverURL := os.Getenv("TEST_DATABASE_URL")
	if serverURL == "" {
		t.Skip("TEST_DATABASE_URL not set: needs a Postgres where the test can create databases")
	}
	admin, err := sql.Open("postgres", serverURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = admin.Close() })

	name := "migrations_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	if _, err := admin.Exec("create database " + name); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = admin.Exec("drop database " + name + " with (force)") })

	parsed, err := url.Parse(serverURL)
	if err != nil {
		t.Fatal(err)
	}
	parsed.Path = "/" + name
	db, err := sql.Open("postgres", parsed.String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func sources(t *testing.T, db *sql.DB) (*goose.Provider, []*goose.Source) {
	t.Helper()
	provider, err := goose.NewProvider(goose.DialectPostgres, db, files, goose.WithTableName(versionTable))
	if err != nil {
		t.Fatal(err)
	}
	return provider, provider.ListSources()
}

func liquibaseUpTo(t *testing.T, db *sql.DB, count int, extraChangesets ...string) {
	t.Helper()
	ctx := context.Background()
	provider, all := sources(t, db)
	if _, err := provider.UpTo(ctx, all[count-1].Version); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec("drop table " + versionTable); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`create table databasechangelog (id varchar(255), author varchar(255), filename varchar(255));
		create table databasechangeloglock (id int primary key, locked boolean not null);
		insert into databasechangeloglock values (1, false)`); err != nil {
		t.Fatal(err)
	}

	var changesets []string
	for _, source := range all[:count] {
		ids, err := changesetsOf(source.Path)
		if err != nil {
			t.Fatal(err)
		}
		changesets = append(changesets, ids...)
	}
	for _, changeset := range append(changesets, extraChangesets...) {
		author, id, _ := strings.Cut(changeset, ":")
		if _, err := db.Exec(`insert into databasechangelog values ($1, $2, 'changelogs/x.sql')`, id, author); err != nil {
			t.Fatal(err)
		}
	}
}

func appliedVersions(t *testing.T, db *sql.DB) int {
	t.Helper()
	var count int
	if err := db.QueryRow("select count(distinct version_id) from " + versionTable + " where version_id > 0").Scan(&count); err != nil {
		t.Fatal(err)
	}
	return count
}

func TestApplyMigratesAFreshDatabase(t *testing.T) {
	db := freshDatabase(t)
	if err := Apply(context.Background(), db); err != nil {
		t.Fatal(err)
	}
	_, all := sources(t, db)
	if got := appliedVersions(t, db); got != len(all) {
		t.Fatalf("applied %d migrations, want %d", got, len(all))
	}
	if err := Apply(context.Background(), db); err != nil {
		t.Fatalf("second run: %v", err)
	}
}

func TestApplyAdoptsTheLiquibaseHistoryAndRunsTheRest(t *testing.T) {
	db := freshDatabase(t)
	_, all := sources(t, db)
	liquibaseUpTo(t, db, len(all)-3)

	if err := Apply(context.Background(), db); err != nil {
		t.Fatal(err)
	}
	if got := appliedVersions(t, db); got != len(all) {
		t.Fatalf("applied %d migrations, want %d", got, len(all))
	}
}

func TestApplyRefusesAPartlyAppliedLiquibaseFile(t *testing.T) {
	db := freshDatabase(t)
	_, all := sources(t, db)
	partial := -1
	for i, source := range all[1:] {
		if ids, _ := changesetsOf(source.Path); len(ids) > 1 {
			partial = i + 1
			break
		}
	}
	firstOfPartial, _ := changesetsOf(all[partial].Path)
	liquibaseUpTo(t, db, partial, firstOfPartial[0])

	err := Apply(context.Background(), db)
	if err == nil || !strings.Contains(err.Error(), all[partial].Path) {
		t.Fatalf("expected an error naming %s, got %v", all[partial].Path, err)
	}
	var exists bool
	if err := db.QueryRow("select to_regclass($1) is not null", versionTable).Scan(&exists); err != nil || exists {
		t.Fatalf("goose history must not be created on refusal: %v %v", exists, err)
	}
}

func TestApplyRefusesWhileLiquibaseHoldsItsLock(t *testing.T) {
	db := freshDatabase(t)
	_, all := sources(t, db)
	liquibaseUpTo(t, db, len(all))
	if _, err := db.Exec("update databasechangeloglock set locked = true"); err != nil {
		t.Fatal(err)
	}

	err := Apply(context.Background(), db)
	if err == nil || !strings.Contains(err.Error(), "lock") {
		t.Fatalf("expected a lock error, got %v", err)
	}
}
