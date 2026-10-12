package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"chagnon.dev/budget-server/internal/domain/model"
)

type deletionFixture struct {
	r   *Repository
	ctx context.Context
}

type deletionUser struct {
	id       uuid.UUID
	email    string
	currency int32
}

func (f deletionFixture) user(t *testing.T) deletionUser {
	t.Helper()
	email := unique("deletion") + "@example.com"
	id, err := f.r.EnsureGuestUser(f.ctx, email)
	if err != nil {
		t.Fatal(err)
	}
	currency, err := f.r.CreateCurrency(f.ctx, id, unique("CAD"), "$", "", "", 2, "", false)
	if err != nil {
		t.Fatal(err)
	}
	return deletionUser{id, email, int32(currency)}
}

func (f deletionFixture) group(t *testing.T, creator deletionUser, members ...deletionUser) int32 {
	t.Helper()
	var id int32
	if err := f.r.db.QueryRowContext(f.ctx,
		`INSERT INTO transaction_group (name, split_type, creator_currency) VALUES ($1, 'EQUAL', $2) RETURNING id`,
		unique("group"), creator.currency,
	).Scan(&id); err != nil {
		t.Fatal(err)
	}
	for _, member := range append([]deletionUser{creator}, members...) {
		f.exec(t, `INSERT INTO user_transaction_group (user_email, transaction_group_id, locked, hidden) VALUES ($1, $2, true, false)`, member.email, id)
	}
	return id
}

func (f deletionFixture) transaction(t *testing.T, owner deletionUser, account int) model.TransactionID {
	t.Helper()
	id, err := f.r.CreateTransaction(
		f.ctx, owner.id, owner.email, owner.email, 1000, 1000, int(owner.currency), int(owner.currency),
		model.Some(account), model.None[int](), model.None[int](), time.Now(), "dinner",
		model.None[model.FinancialIncomeData](), model.None[model.GroupedTransactionData](),
	)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func (f deletionFixture) exec(t *testing.T, query string, args ...any) {
	t.Helper()
	if _, err := f.r.db.ExecContext(f.ctx, query, args...); err != nil {
		t.Fatal(err)
	}
}

func (f deletionFixture) count(t *testing.T, query string, args ...any) int {
	t.Helper()
	var n int
	if err := f.r.db.QueryRowContext(f.ctx, query, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestDeleteUser(t *testing.T) {
	f := deletionFixture{migratedRepository(t), context.Background()}

	t.Run("deletes personal data and leaves shared expenses with other people intact", func(t *testing.T) {
		friend, target := f.user(t), f.user(t)
		shared := f.group(t, friend, target)
		solo := f.group(t, target)

		account, err := f.r.CreateAccount(f.ctx, target.id, unique("account"), nil, true, "", "")
		if err != nil {
			t.Fatal(err)
		}
		f.transaction(t, target, int(account))
		grouped := f.transaction(t, target, int(account))
		f.exec(t, `INSERT INTO transaction_transaction_group (transaction_id, transaction_group_id, locked) VALUES ($1, $2, true)`, grouped, shared)
		for _, member := range []deletionUser{friend, target} {
			f.exec(t, `INSERT INTO transaction_transaction_group_user_split (transaction_id, user_email) VALUES ($1, $2)`, grouped, member.email)
		}

		impact, err := f.r.GetUserDeletionImpact(f.ctx, target.id)
		if err != nil {
			t.Fatal(err)
		}
		if impact.Accounts != 1 || impact.Transactions != 2 || impact.Currencies != 1 || impact.MovedToUnconfirmed != 1 ||
			len(impact.DeletedTransactionGroups) != 1 || len(impact.BlockingTransactionGroups) != 0 {
			t.Fatalf("unexpected impact: %+v", impact)
		}

		if err := f.r.DeleteUser(f.ctx, target.id); err != nil {
			t.Fatal(err)
		}

		if n := f.count(t, `SELECT count(*) FROM users WHERE id = $1`, target.id); n != 0 {
			t.Fatal("user still exists")
		}
		if n := f.count(t, `SELECT count(*) FROM transaction_group WHERE id = $1`, solo); n != 0 {
			t.Fatal("the group only the deleted user was in should be gone")
		}
		if n := f.count(t, `SELECT count(*) FROM user_transaction_group WHERE transaction_group_id = $1`, shared); n != 2 {
			t.Fatalf("shared group members: got %d, want 2", n)
		}
		if n := f.count(t, `SELECT count(*) FROM unconfirmed_transactions ut JOIN unconfirmed_transaction_user_split s ON s.unconfirmed_transaction_id = ut.id
			WHERE ut.transaction_group_id = $1 AND ut.owner_email = $2`, shared, target.email); n != 2 {
			t.Fatalf("the shared transaction should stay as unconfirmed with both splits, got %d split rows", n)
		}
		if n := f.count(t, `SELECT count(*) FROM currencies WHERE id = $1`, friend.currency); n != 1 {
			t.Fatal("the other member's currency must stay")
		}
	})

	t.Run("refuses a user who created a group other people are in", func(t *testing.T) {
		friend, target := f.user(t), f.user(t)
		f.group(t, target, friend)

		impact, err := f.r.GetUserDeletionImpact(f.ctx, target.id)
		if err != nil || len(impact.BlockingTransactionGroups) != 1 {
			t.Fatalf("impact: %v %+v", err, impact)
		}
		if err := f.r.DeleteUser(f.ctx, target.id); !errors.Is(err, model.ErrUserCreatedSharedGroups) {
			t.Fatalf("got %v", err)
		}
		if n := f.count(t, `SELECT count(*) FROM currencies WHERE user_id = $1`, target.id); n != 1 {
			t.Fatal("a refused deletion must not delete anything")
		}
	})

	t.Run("refuses admins", func(t *testing.T) {
		target := f.user(t)
		f.exec(t, `UPDATE users SET is_admin = true WHERE id = $1`, target.id)

		if err := f.r.DeleteUser(f.ctx, target.id); !errors.Is(err, model.ErrUserIsAdmin) {
			t.Fatalf("got %v", err)
		}
	})

	t.Run("reports an unknown user", func(t *testing.T) {
		if err := f.r.DeleteUser(f.ctx, uuid.New()); !errors.Is(err, model.ErrUserNotFound) {
			t.Fatalf("got %v", err)
		}
	})
}
