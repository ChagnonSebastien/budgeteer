package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"github.com/google/uuid"
)

const maxStatementNames = 50

var (
	ErrImportNotFound         = errors.New("import not found")
	ErrImportAccountNotOwn    = errors.New("imports go into one of your own accounts")
	ErrImportRowOutsideImport = errors.New("an imported row must involve the import's account")
	ErrMergeTargetNotFound    = errors.New("the transaction to merge into was not found")
	ErrMergeTargetMismatch    = errors.New("the transaction cannot be merged with this row as a transfer")
)

type NewTransaction struct {
	OwnerEmail                         string
	Amount, ReceiverAmount             int
	CurrencyId, ReceiverCurrencyId     int
	SenderAccountId, ReceiverAccountId model.Optional[int]
	CategoryId                         model.Optional[int]
	Date                               time.Time
	Note                               string
	FinancialIncomeData                model.Optional[model.FinancialIncomeData]
	TransactionGroupData               model.Optional[model.GroupedTransactionData]
}

type ImportRow struct {
	Transaction   NewTransaction
	Fingerprint   string
	StatementName string
	MergeInto     model.Optional[model.TransactionID]
}

type ImportRowOutcome int

const (
	ImportRowCreated ImportRowOutcome = iota
	ImportRowMerged
	ImportRowSkipped
)

type ImportRowResult struct {
	Outcome       ImportRowOutcome
	TransactionID model.TransactionID
}

type BatchImportResult struct {
	Rows           []ImportRowResult
	StatementNames map[model.AccountID][]string
}

type DeleteImportResult struct {
	Deleted  int64
	Reverted int64
}

func (r *Repository) StartImport(ctx context.Context, userId uuid.UUID, account model.AccountID, fileName string) (model.ImportID, error) {
	id, err := r.queries.CreateImport(ctx, &dao.CreateImportParams{UserID: userId, Account: int32(account), FileName: fileName})
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrImportAccountNotOwn
	}
	if err != nil {
		return 0, fmt.Errorf("creating import: %w", err)
	}
	return model.ImportID(id), nil
}

func (r *Repository) GetAllImports(ctx context.Context, userId uuid.UUID) ([]model.Import, error) {
	rows, err := r.queries.GetAllImports(ctx, userId)
	if err != nil {
		return nil, fmt.Errorf("listing imports: %w", err)
	}

	imports := make([]model.Import, len(rows))
	for i, row := range rows {
		imports[i] = model.Import{
			ID:        model.ImportID(row.ID),
			Account:   model.AccountID(row.Account),
			FileName:  row.FileName,
			RowCount:  int(row.RowCount),
			CreatedAt: row.CreatedAt,
		}
	}
	return imports, nil
}

func (r *Repository) BatchCreateTransactions(
	ctx context.Context,
	userId uuid.UUID,
	userEmail string,
	importId model.ImportID,
	rows []ImportRow,
) (result BatchImportResult, err error) {
	err = r.inTx(ctx, func(queries *dao.Queries) error {
		imp, err := queries.GetImportForUpdate(ctx, &dao.GetImportForUpdateParams{ID: int32(importId), UserID: userId})
		if errors.Is(err, sql.ErrNoRows) {
			return ErrImportNotFound
		}
		if err != nil {
			return fmt.Errorf("getting import: %w", err)
		}

		result.Rows = make([]ImportRowResult, len(rows))
		learned := make(map[int32][]string)
		var learnedOrder []int32
		added := int32(0)

		for i, row := range rows {
			existing, err := queries.GetImportFingerprint(ctx, &dao.GetImportFingerprintParams{
				UserID:      userId,
				Account:     imp.Account,
				Fingerprint: row.Fingerprint,
			})
			if err == nil {
				result.Rows[i] = ImportRowResult{Outcome: ImportRowSkipped, TransactionID: model.TransactionID(existing)}
				continue
			}
			if !errors.Is(err, sql.ErrNoRows) {
				return fmt.Errorf("looking up fingerprint: %w", err)
			}

			counterparty, err := importCounterparty(row.Transaction, int(imp.Account))
			if err != nil {
				return err
			}

			var transactionId model.TransactionID
			if mergeId, isSome := row.MergeInto.Value(); isSome {
				if err := mergeIntoTransfer(ctx, queries, userId, importId, int(imp.Account), mergeId, row.Transaction); err != nil {
					return err
				}
				transactionId = mergeId
				result.Rows[i] = ImportRowResult{Outcome: ImportRowMerged, TransactionID: mergeId}
			} else {
				if row.Transaction.OwnerEmail != userEmail {
					return fmt.Errorf("can only import transactions for self")
				}
				transactionId, err = insertNewTransaction(ctx, queries, userId, row.Transaction)
				if err != nil {
					return err
				}
				if err := queries.SetTransactionImport(ctx, &dao.SetTransactionImportParams{
					ImportID: sql.NullInt32{Int32: int32(importId), Valid: true},
					ID:       int32(transactionId),
					UserID:   userId,
				}); err != nil {
					return fmt.Errorf("tagging imported transaction: %w", err)
				}
				result.Rows[i] = ImportRowResult{Outcome: ImportRowCreated, TransactionID: transactionId}
			}

			if err := queries.InsertImportFingerprint(ctx, &dao.InsertImportFingerprintParams{
				UserID:        userId,
				Account:       imp.Account,
				Fingerprint:   row.Fingerprint,
				TransactionID: int32(transactionId),
				ImportID:      int32(importId),
			}); err != nil {
				return fmt.Errorf("recording fingerprint: %w", err)
			}
			added++

			if id, isSome := counterparty.Value(); isSome && row.StatementName != "" {
				if _, seen := learned[int32(id)]; !seen {
					learnedOrder = append(learnedOrder, int32(id))
				}
				learned[int32(id)] = append(learned[int32(id)], row.StatementName)
			}
		}

		if err := queries.AddImportRowCount(ctx, &dao.AddImportRowCountParams{Added: added, ID: imp.ID}); err != nil {
			return fmt.Errorf("counting imported rows: %w", err)
		}

		result.StatementNames = make(map[model.AccountID][]string, len(learnedOrder))
		for _, accountId := range learnedOrder {
			names, err := learnStatementNames(ctx, queries, userId, int32(importId), accountId, learned[accountId])
			if err != nil {
				return err
			}
			result.StatementNames[model.AccountID(accountId)] = names
		}
		return nil
	})
	return result, err
}

func insertNewTransaction(ctx context.Context, queries *dao.Queries, userId uuid.UUID, t NewTransaction) (model.TransactionID, error) {
	return insertTransaction(
		ctx, queries, userId,
		t.Amount, t.ReceiverAmount,
		t.CurrencyId, t.ReceiverCurrencyId,
		t.SenderAccountId, t.ReceiverAccountId,
		t.CategoryId,
		t.Date,
		t.Note,
		t.FinancialIncomeData,
		t.TransactionGroupData,
	)
}

func importCounterparty(t NewTransaction, account int) (model.Optional[int], error) {
	sender, hasSender := t.SenderAccountId.Value()
	receiver, hasReceiver := t.ReceiverAccountId.Value()
	switch {
	case hasSender && sender == account && hasReceiver && receiver == account:
		return model.None[int](), nil
	case hasSender && sender == account:
		return t.ReceiverAccountId, nil
	case hasReceiver && receiver == account:
		return t.SenderAccountId, nil
	default:
		return model.None[int](), ErrImportRowOutsideImport
	}
}

func mergeIntoTransfer(
	ctx context.Context,
	queries *dao.Queries,
	userId uuid.UUID,
	importId model.ImportID,
	account int,
	targetId model.TransactionID,
	row NewTransaction,
) error {
	if row.CategoryId.IsSome() || row.FinancialIncomeData.IsSome() || row.TransactionGroupData.IsSome() {
		return ErrMergeTargetMismatch
	}

	target, err := queries.GetMergeCandidate(ctx, &dao.GetMergeCandidateParams{ID: int32(targetId), UserID: userId})
	if errors.Is(err, sql.ErrNoRows) {
		return ErrMergeTargetNotFound
	}
	if err != nil {
		return fmt.Errorf("getting merge target: %w", err)
	}
	if target.IsGrouped || target.IsFinancialIncome || !target.Category.Valid ||
		target.Sender.Int32 == int32(account) || target.Receiver.Int32 == int32(account) {
		return ErrMergeTargetMismatch
	}

	rowSender, _ := row.SenderAccountId.Value()
	rowReceiver, _ := row.ReceiverAccountId.Value()
	merged := dao.MergeTransactionIntoTransferParams{
		Sender:           target.Sender,
		Receiver:         target.Receiver,
		Amount:           target.Amount,
		Currency:         target.Currency,
		ReceiverAmount:   target.ReceiverAmount,
		ReceiverCurrency: target.ReceiverCurrency,
		ID:               target.ID,
		UserID:           userId,
	}
	switch {
	case rowReceiver == account && target.Sender.Valid && target.SenderIsMine && !target.ReceiverIsMine &&
		row.SenderAccountId.IsSome() && int32(rowSender) == target.Sender.Int32:
		merged.Receiver = sql.NullInt32{Int32: int32(account), Valid: true}
		merged.ReceiverAmount = int32(row.ReceiverAmount)
		merged.ReceiverCurrency = int32(row.ReceiverCurrencyId)
	case rowSender == account && target.Receiver.Valid && target.ReceiverIsMine && !target.SenderIsMine &&
		row.ReceiverAccountId.IsSome() && int32(rowReceiver) == target.Receiver.Int32:
		merged.Sender = sql.NullInt32{Int32: int32(account), Valid: true}
		merged.Amount = int32(row.Amount)
		merged.Currency = int32(row.CurrencyId)
	default:
		return ErrMergeTargetMismatch
	}

	if err := ensureOwnedReferences(
		ctx, queries, userId, nil, nil,
		validIds(sql.NullInt32{Int32: merged.Currency, Valid: true}, sql.NullInt32{Int32: merged.ReceiverCurrency, Valid: true}),
	); err != nil {
		return err
	}

	if err := queries.InsertImportMerge(ctx, &dao.InsertImportMergeParams{
		TransactionID:            target.ID,
		ImportID:                 int32(importId),
		PreviousSender:           target.Sender,
		PreviousReceiver:         target.Receiver,
		PreviousAmount:           target.Amount,
		PreviousCurrency:         target.Currency,
		PreviousReceiverAmount:   target.ReceiverAmount,
		PreviousReceiverCurrency: target.ReceiverCurrency,
		PreviousCategory:         target.Category,
	}); err != nil {
		return fmt.Errorf("recording merge: %w", err)
	}

	if _, err := queries.MergeTransactionIntoTransfer(ctx, &merged); err != nil {
		return fmt.Errorf("merging into transfer: %w", err)
	}
	return nil
}

func loadStatementNames(ctx context.Context, queries *dao.Queries, userId uuid.UUID, accountId int32) ([]string, error) {
	raw, err := queries.GetAccountStatementNames(ctx, &dao.GetAccountStatementNamesParams{ID: accountId, UserID: userId})
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrForeignReference
	}
	if err != nil {
		return nil, fmt.Errorf("getting statement names: %w", err)
	}

	var names []string
	if err := json.Unmarshal(raw, &names); err != nil {
		return nil, fmt.Errorf("parsing statement names of account %d: %w", accountId, err)
	}
	return names, nil
}

func storeStatementNames(ctx context.Context, queries *dao.Queries, userId uuid.UUID, accountId int32, names []string) error {
	raw, err := json.Marshal(names)
	if err != nil {
		return fmt.Errorf("encoding statement names: %w", err)
	}
	if err := queries.SetAccountStatementNames(ctx, &dao.SetAccountStatementNamesParams{
		StatementNames: raw,
		ID:             accountId,
		UserID:         userId,
	}); err != nil {
		return fmt.Errorf("saving statement names: %w", err)
	}
	return nil
}

func learnStatementNames(
	ctx context.Context,
	queries *dao.Queries,
	userId uuid.UUID,
	importId int32,
	accountId int32,
	learned []string,
) ([]string, error) {
	names, err := loadStatementNames(ctx, queries, userId, accountId)
	if err != nil {
		return nil, err
	}

	for _, name := range learned {
		if index := slices.Index(names, name); index >= 0 {
			names = slices.Delete(names, index, index+1)
		} else if err := queries.InsertImportStatementName(ctx, &dao.InsertImportStatementNameParams{
			ImportID: importId,
			Account:  accountId,
			Name:     name,
		}); err != nil {
			return nil, fmt.Errorf("recording learned statement name: %w", err)
		}
		names = append(names, name)
	}
	if len(names) > maxStatementNames {
		names = names[len(names)-maxStatementNames:]
	}

	if err := storeStatementNames(ctx, queries, userId, accountId, names); err != nil {
		return nil, err
	}
	return names, nil
}

func (r *Repository) DeleteImport(ctx context.Context, userId uuid.UUID, id model.ImportID) (result DeleteImportResult, err error) {
	err = r.inTx(ctx, func(queries *dao.Queries) error {
		if _, err := queries.GetImportForUpdate(ctx, &dao.GetImportForUpdateParams{ID: int32(id), UserID: userId}); errors.Is(err, sql.ErrNoRows) {
			return ErrImportNotFound
		} else if err != nil {
			return fmt.Errorf("getting import: %w", err)
		}

		reverted, err := queries.RevertImportMerges(ctx, &dao.RevertImportMergesParams{ImportID: int32(id), UserID: userId})
		if err != nil {
			return fmt.Errorf("reverting merged transfers: %w", err)
		}
		result.Reverted = reverted

		deleted, err := queries.DeleteImportedTransactions(ctx, &dao.DeleteImportedTransactionsParams{
			ImportID: sql.NullInt32{Int32: int32(id), Valid: true},
			UserID:   userId,
		})
		if err != nil {
			return fmt.Errorf("deleting imported transactions: %w", err)
		}
		result.Deleted = deleted

		learned, err := queries.GetImportStatementNames(ctx, int32(id))
		if err != nil {
			return fmt.Errorf("getting learned statement names: %w", err)
		}
		forget := make(map[int32][]string)
		for _, row := range learned {
			forget[row.Account] = append(forget[row.Account], row.Name)
		}
		for accountId, toForget := range forget {
			names, err := loadStatementNames(ctx, queries, userId, accountId)
			if err != nil {
				return err
			}
			names = slices.DeleteFunc(names, func(name string) bool { return slices.Contains(toForget, name) })
			if err := storeStatementNames(ctx, queries, userId, accountId, names); err != nil {
				return err
			}
		}

		if err := queries.DeleteImport(ctx, &dao.DeleteImportParams{ID: int32(id), UserID: userId}); err != nil {
			return fmt.Errorf("deleting import: %w", err)
		}
		return nil
	})
	return result, err
}

func (r *Repository) GetKnownFingerprints(
	ctx context.Context,
	userId uuid.UUID,
	account model.AccountID,
	fingerprints []string,
) (map[string]model.TransactionID, error) {
	rows, err := r.queries.GetKnownFingerprints(ctx, &dao.GetKnownFingerprintsParams{
		UserID:       userId,
		Account:      int32(account),
		Fingerprints: fingerprints,
	})
	if err != nil {
		return nil, fmt.Errorf("looking up fingerprints: %w", err)
	}

	known := make(map[string]model.TransactionID, len(rows))
	for _, row := range rows {
		known[row.Fingerprint] = model.TransactionID(row.TransactionID)
	}
	return known, nil
}

func (r *Repository) GetAllImportProfiles(ctx context.Context, userId uuid.UUID) ([]model.ImportProfile, error) {
	rows, err := r.queries.GetAllImportProfiles(ctx, userId)
	if err != nil {
		return nil, fmt.Errorf("listing import profiles: %w", err)
	}

	profiles := make([]model.ImportProfile, len(rows))
	for i, row := range rows {
		profiles[i] = model.ImportProfile{Account: model.AccountID(row.Account), Mapping: row.Mapping}
	}
	return profiles, nil
}

func (r *Repository) SaveImportProfile(ctx context.Context, userId uuid.UUID, profile model.ImportProfile) error {
	saved, err := r.queries.UpsertImportProfile(ctx, &dao.UpsertImportProfileParams{
		UserID:  userId,
		Account: int32(profile.Account),
		Mapping: profile.Mapping,
	})
	if err != nil {
		return fmt.Errorf("saving import profile: %w", err)
	}
	if saved == 0 {
		return ErrImportAccountNotOwn
	}
	return nil
}
