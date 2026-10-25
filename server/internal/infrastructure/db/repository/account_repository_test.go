package repository

import (
	"errors"
	"slices"
	"testing"

	"chagnon.dev/budget-server/internal/domain/model"
)

func TestAccountBalancesRejectForeignReferences(t *testing.T) {
	victim := newImportFixture(t)
	attacker := newImportFixture(t)
	victimAccount := victim.account(t, true)
	attackerAccount := attacker.account(t, true)

	balances := []model.Balance{{CurrencyId: attacker.currency, Value: 999}}
	err := attacker.r.UpdateAccount(attacker.ctx, attacker.userID, model.AccountID(victimAccount), UpdateAccountFields{InitialsAmounts: &balances})
	if !errors.Is(err, ErrForeignReference) {
		t.Fatalf("updating another user's account balances: expected ErrForeignReference, got %v", err)
	}
	accounts, err := victim.r.GetAllAccountsWithCurrencyIDs(victim.ctx, victim.userID)
	if err != nil {
		t.Fatal(err)
	}
	index := slices.IndexFunc(accounts, func(a model.Account) bool { return a.ID == model.AccountID(victimAccount) })
	if len(accounts[index].InitialBalances) != 0 {
		t.Fatalf("victim account got balances %v", accounts[index].InitialBalances)
	}

	foreignCurrency := []model.Balance{{CurrencyId: victim.currency, Value: 1}}
	err = attacker.r.UpdateAccount(attacker.ctx, attacker.userID, model.AccountID(attackerAccount), UpdateAccountFields{InitialsAmounts: &foreignCurrency})
	if !errors.Is(err, ErrForeignReference) {
		t.Fatalf("own account with another user's currency: expected ErrForeignReference, got %v", err)
	}
	_, err = attacker.r.CreateAccount(attacker.ctx, attacker.userID, unique("account"), foreignCurrency, true, false, "", "")
	if !errors.Is(err, ErrForeignReference) {
		t.Fatalf("creating an account with another user's currency: expected ErrForeignReference, got %v", err)
	}
}
