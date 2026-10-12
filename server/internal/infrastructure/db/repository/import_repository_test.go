package repository

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/google/uuid"

	"chagnon.dev/budget-server/internal/domain/model"
)

type importFixture struct {
	r        *Repository
	ctx      context.Context
	userID   uuid.UUID
	email    string
	currency int
	category int
}

func newImportFixture(t *testing.T) importFixture {
	t.Helper()
	r := migratedRepository(t)
	ctx := context.Background()
	email := unique("import") + "@example.com"
	userID, err := r.EnsureGuestUser(ctx, email)
	if err != nil {
		t.Fatal(err)
	}
	currency, err := r.CreateCurrency(ctx, userID, unique("CAD"), "$", "", "", 2, "", false)
	if err != nil {
		t.Fatal(err)
	}
	category, err := r.CreateCategory(ctx, userID, unique("Food"), "", "", "", 0, false, 0)
	if err != nil {
		t.Fatal(err)
	}
	return importFixture{r, ctx, userID, email, int(currency), int(category)}
}

func (f importFixture) account(t *testing.T, isMine bool) int {
	t.Helper()
	id, err := f.r.CreateAccount(f.ctx, f.userID, unique("account"), nil, isMine, false, "", "")
	if err != nil {
		t.Fatal(err)
	}
	return int(id)
}

func (f importFixture) transaction(t *testing.T, id model.TransactionID) model.Transaction {
	t.Helper()
	all, err := f.r.GetAllTransactions(f.ctx, f.userID)
	if err != nil {
		t.Fatal(err)
	}
	index := slices.IndexFunc(all, func(tr model.Transaction) bool { return tr.ID == id })
	if index < 0 {
		t.Fatalf("transaction %d not found", id)
	}
	return all[index]
}

func (f importFixture) exists(t *testing.T, id model.TransactionID) bool {
	t.Helper()
	all, err := f.r.GetAllTransactions(f.ctx, f.userID)
	if err != nil {
		t.Fatal(err)
	}
	return slices.ContainsFunc(all, func(tr model.Transaction) bool { return tr.ID == id })
}

func (f importFixture) row(sender, receiver model.Optional[int], category model.Optional[int], amount int) ImportRow {
	return ImportRow{
		Transaction: NewTransaction{
			OwnerEmail:         f.email,
			Amount:             amount,
			ReceiverAmount:     amount,
			CurrencyId:         f.currency,
			ReceiverCurrencyId: f.currency,
			SenderAccountId:    sender,
			ReceiverAccountId:  receiver,
			CategoryId:         category,
			Date:               time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC),
			Note:               "MCDONALD'S #4521",
		},
		Fingerprint:   unique("fp"),
		StatementName: "mcdonalds",
	}
}

func TestBatchCreateTransactions(t *testing.T) {
	f := newImportFixture(t)
	card, payee := f.account(t, true), f.account(t, false)

	importID, err := f.r.StartImport(f.ctx, f.userID, model.AccountID(card), "card.csv")
	if err != nil {
		t.Fatal(err)
	}
	rows := []ImportRow{
		f.row(model.Some(card), model.Some(payee), model.Some(f.category), 450),
		f.row(model.Some(card), model.Some(payee), model.Some(f.category), 450),
	}

	first, err := f.r.BatchCreateTransactions(f.ctx, f.userID, f.email, importID, rows)
	if err != nil {
		t.Fatal(err)
	}
	for _, row := range first.Rows {
		if row.Outcome != ImportRowCreated {
			t.Fatalf("expected created rows, got %+v", first.Rows)
		}
	}
	if names := first.StatementNames[model.AccountID(payee)]; !slices.Equal(names, []string{"mcdonalds"}) {
		t.Fatalf("statement names learned on the payee: %v", names)
	}

	again, err := f.r.BatchCreateTransactions(f.ctx, f.userID, f.email, importID, rows)
	if err != nil {
		t.Fatal(err)
	}
	for i, row := range again.Rows {
		if row.Outcome != ImportRowSkipped || row.TransactionID != first.Rows[i].TransactionID {
			t.Fatalf("re-importing must skip onto the stored rows, got %+v", again.Rows)
		}
	}

	known, err := f.r.GetKnownFingerprints(f.ctx, f.userID, model.AccountID(card), []string{rows[0].Fingerprint, "unknown"})
	if err != nil || len(known) != 1 || known[rows[0].Fingerprint] != first.Rows[0].TransactionID {
		t.Fatalf("known fingerprints: %v %v", known, err)
	}

	result, err := f.r.DeleteImport(f.ctx, f.userID, importID)
	if err != nil || result.Deleted != 2 {
		t.Fatalf("delete import: %+v %v", result, err)
	}
	if f.exists(t, first.Rows[0].TransactionID) {
		t.Fatal("undo must delete the imported rows")
	}
	accounts, err := f.r.GetAllAccountsWithCurrencyIDs(f.ctx, f.userID)
	if err != nil {
		t.Fatal(err)
	}
	for _, account := range accounts {
		if int(account.ID) == payee && len(account.StatementNames) != 0 {
			t.Fatalf("undo must forget the names it learned: %v", account.StatementNames)
		}
	}
}

func TestBatchCreateTransactionsMergesTransfers(t *testing.T) {
	f := newImportFixture(t)
	chequing, card, payee := f.account(t, true), f.account(t, true), f.account(t, false)

	storedID, err := f.r.CreateTransaction(
		f.ctx, f.userID, f.email, f.email, 10000, 10000, f.currency, f.currency,
		model.Some(chequing), model.Some(payee), model.Some(f.category),
		time.Date(2026, 10, 2, 0, 0, 0, 0, time.UTC), "payment", model.None[model.FinancialIncomeData](), model.None[model.GroupedTransactionData](),
	)
	if err != nil {
		t.Fatal(err)
	}

	importID, err := f.r.StartImport(f.ctx, f.userID, model.AccountID(card), "card.csv")
	if err != nil {
		t.Fatal(err)
	}

	wrong := f.row(model.Some(payee), model.Some(card), model.None[int](), 10000)
	wrong.MergeInto = model.Some(storedID)
	if _, err := f.r.BatchCreateTransactions(f.ctx, f.userID, f.email, importID, []ImportRow{wrong}); !errors.Is(err, ErrMergeTargetMismatch) {
		t.Fatalf("a merge must keep the stored side, got %v", err)
	}

	merge := f.row(model.Some(chequing), model.Some(card), model.None[int](), 10000)
	merge.MergeInto = model.Some(storedID)
	result, err := f.r.BatchCreateTransactions(f.ctx, f.userID, f.email, importID, []ImportRow{merge})
	if err != nil || result.Rows[0].Outcome != ImportRowMerged {
		t.Fatalf("merge: %+v %v", result, err)
	}
	merged := f.transaction(t, storedID)
	if merged.Receiver != model.Some(model.AccountID(card)) || merged.Category.IsSome() {
		t.Fatalf("expected a transfer to the card, got %+v", merged)
	}

	if _, err := f.r.DeleteImport(f.ctx, f.userID, importID); err != nil {
		t.Fatal(err)
	}
	reverted := f.transaction(t, storedID)
	if reverted.Receiver != model.Some(model.AccountID(payee)) || reverted.Category != model.Some(model.CategoryID(f.category)) {
		t.Fatalf("undo must restore the stored transaction, got %+v", reverted)
	}
}

func TestStartImportRefusesPayeeAccounts(t *testing.T) {
	f := newImportFixture(t)
	payee := f.account(t, false)
	if _, err := f.r.StartImport(f.ctx, f.userID, model.AccountID(payee), "x.csv"); !errors.Is(err, ErrImportAccountNotOwn) {
		t.Fatalf("got %v", err)
	}
}
