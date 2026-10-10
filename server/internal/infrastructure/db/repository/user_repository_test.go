package repository

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func migratedRepository(t *testing.T) *Repository {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set: needs a Postgres with the Liquibase changelogs applied")
	}
	db, err := sql.Open("postgres", url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return NewRepository(dao.New(db), db)
}

func unique(prefix string) string {
	return prefix + "-" + uuid.NewString()
}

func TestResolveOidcUser(t *testing.T) {
	r := migratedRepository(t)
	ctx := context.Background()

	t.Run("creates a user for a new verified identity and keeps finding it by sub", func(t *testing.T) {
		sub, email := unique("sub"), unique("new")+"@example.com"
		id, gotEmail, err := r.ResolveOidcUser(ctx, model.OidcIdentity{Sub: sub, Email: email, EmailVerified: true, Username: unique("u")})
		if err != nil || gotEmail != email {
			t.Fatalf("create: %v %q", err, gotEmail)
		}

		changed := unique("changed") + "@example.com"
		again, gotEmail, err := r.ResolveOidcUser(ctx, model.OidcIdentity{Sub: sub, Email: changed, EmailVerified: true, Username: unique("u")})
		if err != nil || again != id || gotEmail != changed {
			t.Fatalf("verified email change: %v %v %q", err, again, gotEmail)
		}

		again, gotEmail, err = r.ResolveOidcUser(ctx, model.OidcIdentity{Sub: sub, Email: unique("unverified") + "@example.com", Username: unique("u")})
		if err != nil || again != id || gotEmail != changed {
			t.Fatalf("an unverified email must not replace the stored one: %v %v %q", err, again, gotEmail)
		}
	})

	t.Run("refuses a new identity with an unverified email", func(t *testing.T) {
		_, _, err := r.ResolveOidcUser(ctx, model.OidcIdentity{Sub: unique("sub"), Email: unique("x") + "@example.com", Username: unique("u")})
		if !errors.Is(err, model.ErrOidcEmailUnverified) {
			t.Fatalf("got %v", err)
		}
	})

	t.Run("links a verified identity to a guest user with the same email", func(t *testing.T) {
		email := unique("guest") + "@example.com"
		guestID, err := r.EnsureGuestUser(ctx, email)
		if err != nil {
			t.Fatal(err)
		}
		id, _, err := r.ResolveOidcUser(ctx, model.OidcIdentity{Sub: unique("sub"), Email: email, EmailVerified: true, Username: unique("u")})
		if err != nil || id != guestID {
			t.Fatalf("expected guest row %v, got %v %v", guestID, id, err)
		}
	})

	t.Run("never rebinds an email already linked to another identity", func(t *testing.T) {
		ownerSub, email := unique("owner"), unique("victim")+"@example.com"
		ownerID, _, err := r.ResolveOidcUser(ctx, model.OidcIdentity{Sub: ownerSub, Email: email, EmailVerified: true, Username: unique("u")})
		if err != nil {
			t.Fatal(err)
		}

		_, _, err = r.ResolveOidcUser(ctx, model.OidcIdentity{Sub: unique("attacker"), Email: email, EmailVerified: true, Username: unique("u")})
		if !errors.Is(err, model.ErrOidcEmailTaken) {
			t.Fatalf("expected email taken, got %v", err)
		}

		id, _, err := r.ResolveOidcUser(ctx, model.OidcIdentity{Sub: ownerSub, Email: email, EmailVerified: true, Username: unique("u")})
		if err != nil || id != ownerID {
			t.Fatalf("owner must keep the account: %v %v", id, err)
		}
	})
}

func TestSessions(t *testing.T) {
	r := migratedRepository(t)
	ctx := context.Background()

	userID, err := r.EnsureGuestUser(ctx, unique("session")+"@example.com")
	if err != nil {
		t.Fatal(err)
	}

	active, expired := unique("s"), unique("s")
	if err := r.CreateSession(ctx, active, userID, time.Now().Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	if err := r.CreateSession(ctx, expired, userID, time.Now().Add(-time.Minute)); err != nil {
		t.Fatal(err)
	}

	check := func(id string, owner uuid.UUID, want bool) {
		t.Helper()
		got, err := r.SessionIsActive(ctx, id, owner)
		if err != nil || got != want {
			t.Fatalf("session %s for %v: want %v, got %v %v", id, owner, want, got, err)
		}
	}
	check(active, userID, true)
	check(active, uuid.New(), false)
	check(expired, userID, false)

	if err := r.DeleteSession(ctx, active); err != nil {
		t.Fatal(err)
	}
	check(active, userID, false)
}
