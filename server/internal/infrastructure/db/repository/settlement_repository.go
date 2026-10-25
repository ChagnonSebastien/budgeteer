package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"github.com/google/uuid"
)

func settlementFromDao(s dao.Settlements) model.Settlement {
	settlement := model.Settlement{
		ID:                  model.SettlementID(s.ID),
		TransactionGroup:    model.TransactionGroupID(s.TransactionGroupID),
		Amount:              int(s.Amount),
		Date:                s.Date,
		Note:                s.Note,
		Payer:               model.Email(s.PayerEmail),
		Receiver:            model.Email(s.ReceiverEmail),
		CreatedBy:           model.Email(s.CreatedBy),
		ProposedBy:          model.Email(s.ProposedBy),
		CompletedAt:         model.None[time.Time](),
		PayerTransaction:    model.None[model.TransactionID](),
		ReceiverTransaction: model.None[model.TransactionID](),
	}
	if s.CompletedAt.Valid {
		settlement.CompletedAt = model.Some(s.CompletedAt.Time)
	}
	if s.PayerTransactionID.Valid {
		settlement.PayerTransaction = model.Some(model.TransactionID(s.PayerTransactionID.Int32))
	}
	if s.ReceiverTransactionID.Valid {
		settlement.ReceiverTransaction = model.Some(model.TransactionID(s.ReceiverTransactionID.Int32))
	}
	return settlement
}

func (r *Repository) GetUserSettlements(ctx context.Context, userEmail string) ([]model.Settlement, error) {
	rows, err := r.queries.GetUserSettlements(ctx, userEmail)
	if err != nil {
		return nil, fmt.Errorf("getting settlements: %w", err)
	}
	settlements := make([]model.Settlement, len(rows))
	for i, row := range rows {
		settlements[i] = settlementFromDao(row)
	}
	return settlements, nil
}

func recordPersonalTransaction(
	ctx context.Context,
	queries *dao.Queries,
	userId uuid.UUID,
	fields model.Optional[model.PersonalTransactionFields],
) (sql.NullInt32, error) {
	own, isSome := fields.Value()
	if !isSome {
		return sql.NullInt32{}, nil
	}
	id, err := insertTransaction(
		ctx, queries, userId,
		own.Amount, own.ReceiverAmount,
		own.CurrencyID, own.ReceiverCurrencyID,
		own.SenderAccountID, own.ReceiverAccountID,
		own.CategoryID,
		own.Date,
		own.Note,
		model.None[model.FinancialIncomeData](),
		model.None[model.GroupedTransactionData](),
	)
	if err != nil {
		return sql.NullInt32{}, fmt.Errorf("recording settlement transaction: %w", err)
	}
	return sql.NullInt32{Valid: true, Int32: int32(id)}, nil
}

func settlementLinks(s dao.Settlements, userEmail string, own, other sql.NullInt32) (sql.NullInt32, sql.NullInt32) {
	if s.PayerEmail == userEmail {
		return own, other
	}
	return other, own
}

func ownAndOtherLinks(s dao.Settlements, userEmail string) (own, other sql.NullInt32) {
	if s.PayerEmail == userEmail {
		return s.PayerTransactionID, s.ReceiverTransactionID
	}
	return s.ReceiverTransactionID, s.PayerTransactionID
}

func lockOwnSettlement(ctx context.Context, queries *dao.Queries, userEmail string, id model.SettlementID) (dao.Settlements, error) {
	s, err := queries.GetSettlementForUpdate(ctx, int32(id))
	if err != nil {
		return s, fmt.Errorf("getting settlement: %w", err)
	}
	if userEmail != s.PayerEmail && userEmail != s.ReceiverEmail {
		return s, fmt.Errorf("only the two ends of a settlement can change it")
	}
	return s, nil
}

func deleteOwnSettlementTransaction(ctx context.Context, queries *dao.Queries, s dao.Settlements, userId uuid.UUID, userEmail string) error {
	own, _ := ownAndOtherLinks(s, userEmail)
	if !own.Valid {
		return nil
	}
	if _, err := queries.DeleteTransaction(ctx, &dao.DeleteTransactionParams{ID: own.Int32, UserID: userId}); err != nil {
		return fmt.Errorf("deleting settlement transaction: %w", err)
	}
	return nil
}

func (r *Repository) CreateSettlement(
	ctx context.Context,
	userId uuid.UUID,
	userEmail string,
	groupId model.TransactionGroupID,
	payer, receiver model.Email,
	fields model.SettlementFields,
	own model.Optional[model.PersonalTransactionFields],
) (id model.SettlementID, err error) {
	err = r.inTx(ctx, func(queries *dao.Queries) error {
		if userEmail != string(payer) && userEmail != string(receiver) {
			return fmt.Errorf("a settlement can only be recorded by one of its two ends")
		}
		for _, end := range []model.Email{payer, receiver} {
			if err := ensureTransactionGroupMember(ctx, queries, string(end), int32(groupId), string(end) == userEmail); err != nil {
				return err
			}
		}

		ownLink, err := recordPersonalTransaction(ctx, queries, userId, own)
		if err != nil {
			return err
		}
		payerLink, receiverLink := sql.NullInt32{}, sql.NullInt32{}
		if userEmail == string(payer) {
			payerLink = ownLink
		} else {
			receiverLink = ownLink
		}

		created, err := queries.CreateSettlement(ctx, &dao.CreateSettlementParams{
			TransactionGroupID:    int32(groupId),
			Amount:                int32(fields.Amount),
			Date:                  fields.Date,
			Note:                  fields.Note,
			PayerEmail:            string(payer),
			ReceiverEmail:         string(receiver),
			CreatedBy:             userEmail,
			PayerTransactionID:    payerLink,
			ReceiverTransactionID: receiverLink,
		})
		if err != nil {
			return fmt.Errorf("creating settlement: %w", err)
		}
		id = model.SettlementID(created)
		return nil
	})
	return
}

func (r *Repository) UpdateSettlement(
	ctx context.Context,
	userId uuid.UUID,
	userEmail string,
	id model.SettlementID,
	fields model.SettlementFields,
	own model.Optional[model.PersonalTransactionFields],
) error {
	return r.inTx(ctx, func(queries *dao.Queries) error {
		s, err := lockOwnSettlement(ctx, queries, userEmail, id)
		if err != nil {
			return err
		}
		if s.CompletedAt.Valid {
			return fmt.Errorf("a completed settlement can't be changed")
		}

		// The editor becomes the proposer; the other end's transaction stays as is until they confirm the new values.
		if err := deleteOwnSettlementTransaction(ctx, queries, s, userId, userEmail); err != nil {
			return err
		}
		ownLink, err := recordPersonalTransaction(ctx, queries, userId, own)
		if err != nil {
			return err
		}
		_, otherLink := ownAndOtherLinks(s, userEmail)
		payerLink, receiverLink := settlementLinks(s, userEmail, ownLink, otherLink)

		if err := queries.UpdateSettlementProposal(ctx, &dao.UpdateSettlementProposalParams{
			Amount:                int32(fields.Amount),
			Date:                  fields.Date,
			Note:                  fields.Note,
			ProposedBy:            userEmail,
			PayerTransactionID:    payerLink,
			ReceiverTransactionID: receiverLink,
			ID:                    int32(id),
		}); err != nil {
			return fmt.Errorf("updating settlement: %w", err)
		}
		return nil
	})
}

func (r *Repository) ConfirmSettlement(
	ctx context.Context,
	userId uuid.UUID,
	userEmail string,
	id model.SettlementID,
	own model.Optional[model.PersonalTransactionFields],
) error {
	return r.inTx(ctx, func(queries *dao.Queries) error {
		s, err := lockOwnSettlement(ctx, queries, userEmail, id)
		if err != nil {
			return err
		}
		if s.CompletedAt.Valid {
			return fmt.Errorf("settlement is already completed")
		}
		if s.ProposedBy == userEmail {
			return fmt.Errorf("the other end of the settlement must confirm it")
		}

		// A confirmer who recorded an earlier proposal replaces their own transaction with the confirmed values.
		if err := deleteOwnSettlementTransaction(ctx, queries, s, userId, userEmail); err != nil {
			return err
		}
		ownLink, err := recordPersonalTransaction(ctx, queries, userId, own)
		if err != nil {
			return err
		}
		_, otherLink := ownAndOtherLinks(s, userEmail)
		payerLink, receiverLink := settlementLinks(s, userEmail, ownLink, otherLink)

		if err := queries.CompleteSettlement(ctx, &dao.CompleteSettlementParams{
			PayerTransactionID:    payerLink,
			ReceiverTransactionID: receiverLink,
			ID:                    int32(id),
		}); err != nil {
			return fmt.Errorf("completing settlement: %w", err)
		}
		return nil
	})
}

func (r *Repository) DeleteSettlement(ctx context.Context, userId uuid.UUID, userEmail string, id model.SettlementID) error {
	return r.inTx(ctx, func(queries *dao.Queries) error {
		s, err := lockOwnSettlement(ctx, queries, userEmail, id)
		if err != nil {
			return err
		}
		if s.CompletedAt.Valid {
			return fmt.Errorf("a completed settlement can't be deleted")
		}
		if err := deleteOwnSettlementTransaction(ctx, queries, s, userId, userEmail); err != nil {
			return err
		}
		if err := queries.DeleteSettlement(ctx, int32(id)); err != nil {
			return fmt.Errorf("deleting settlement: %w", err)
		}
		return nil
	})
}

func (r *Repository) RecordSettlementTransaction(
	ctx context.Context,
	userId uuid.UUID,
	userEmail string,
	id model.SettlementID,
	own model.PersonalTransactionFields,
) error {
	return r.inTx(ctx, func(queries *dao.Queries) error {
		s, err := lockOwnSettlement(ctx, queries, userEmail, id)
		if err != nil {
			return err
		}
		if !s.CompletedAt.Valid {
			return fmt.Errorf("only a completed settlement can be recorded again")
		}
		currentOwn, otherLink := ownAndOtherLinks(s, userEmail)
		if currentOwn.Valid {
			return fmt.Errorf("this settlement is already in your transactions")
		}

		ownLink, err := recordPersonalTransaction(ctx, queries, userId, model.Some(own))
		if err != nil {
			return err
		}
		payerLink, receiverLink := settlementLinks(s, userEmail, ownLink, otherLink)
		if err := queries.SetSettlementTransactions(ctx, &dao.SetSettlementTransactionsParams{
			PayerTransactionID:    payerLink,
			ReceiverTransactionID: receiverLink,
			ID:                    int32(id),
		}); err != nil {
			return fmt.Errorf("linking settlement transaction: %w", err)
		}
		return nil
	})
}
