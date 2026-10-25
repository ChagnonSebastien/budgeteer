package repository

import (
	"context"
	"slices"
	"testing"

	"github.com/google/uuid"

	"chagnon.dev/budget-server/internal/domain/model"
)

func TestGetAllWithAutoUpdateAlternatesBetweenUsers(t *testing.T) {
	r := migratedRepository(t)
	ctx := context.Background()

	createUser := func() uuid.UUID {
		id, _, err := r.EnsureGuestUser(ctx, unique("rates")+"@example.com")
		if err != nil {
			t.Fatal(err)
		}
		return id
	}
	createCurrency := func(user uuid.UUID) model.CurrencyID {
		id, err := r.CreateCurrency(ctx, user, unique("C"), "$", "", "", 2, "script", true)
		if err != nil {
			t.Fatal(err)
		}
		return id
	}

	hoarder, other := createUser(), createUser()
	hoarded := []model.CurrencyID{createCurrency(hoarder), createCurrency(hoarder), createCurrency(hoarder)}
	single := createCurrency(other)

	var order []model.CurrencyID
	for page := 1; ; page++ {
		currencies, hasMore, err := r.GetAllWithAutoUpdate(ctx, page, 20)
		if err != nil {
			t.Fatal(err)
		}
		for _, currency := range currencies {
			if slices.Contains(hoarded, currency.ID) || currency.ID == single {
				order = append(order, currency.ID)
			}
		}
		if !hasMore {
			break
		}
	}

	want := []model.CurrencyID{hoarded[0], single, hoarded[1], hoarded[2]}
	if !slices.Equal(order, want) && !slices.Equal(order, []model.CurrencyID{single, hoarded[0], hoarded[1], hoarded[2]}) {
		t.Fatalf("expected the other user's currency in the first round, got %v (hoarded %v, single %v)", order, hoarded, single)
	}
}
