package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"chagnon.dev/budget-server/internal/logging"
	"github.com/google/uuid"
)

func (r *Repository) inTx(ctx context.Context, fn func(queries *dao.Queries) error) (err error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning db transaction: %w", err)
	}

	defer func() {
		if err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				logging.FromContext(ctx).Error(fmt.Sprintf("rollback error: %v", rbErr))
			}
		}
	}()

	if err = fn(r.queries.WithTx(tx)); err != nil {
		return
	}

	if err = tx.Commit(); err != nil {
		err = fmt.Errorf("committing transaction: %w", err)
	}

	return
}

func ensureTransactionGroupMember(ctx context.Context, queries *dao.Queries, email string, transactionGroupId int32, joinedOnly bool) error {
	isMember, err := queries.IsTransactionGroupMemberByEmail(ctx, &dao.IsTransactionGroupMemberByEmailParams{
		UserEmail:          email,
		TransactionGroupID: transactionGroupId,
		JoinedOnly:         joinedOnly,
	})
	if err != nil {
		return fmt.Errorf("checking transaction group membership: %w", err)
	}
	if !isMember {
		return fmt.Errorf("%s is not a member of transaction group %d", email, transactionGroupId)
	}

	return nil
}

func replaceUnconfirmedTransactionSplit(ctx context.Context, queries *dao.Queries, id int32, members []model.MemberSplitValue) error {
	if err := queries.DeleteUnconfirmedTransactionUserSplits(ctx, id); err != nil {
		return fmt.Errorf("clearing unconfirmed transaction split values: %w", err)
	}

	for _, member := range members {
		splitValue, hasSplitValue := member.SplitValue.Value()
		err := queries.CreateUnconfirmedTransactionUserSplit(ctx, &dao.CreateUnconfirmedTransactionUserSplitParams{
			UnconfirmedTransactionID: id,
			UserEmail:                string(member.Email),
			SplitValue:               sql.NullInt32{Valid: hasSplitValue, Int32: int32(splitValue)},
		})
		if err != nil {
			return fmt.Errorf("creating unconfirmed transaction split value: %w", err)
		}
	}

	return nil
}

func nullSplitTypeOverride(splitOverride model.Optional[model.SplitOverride]) (dao.NullTransactionSplitType, error) {
	value, isSome := splitOverride.Value()
	if !isSome {
		return dao.NullTransactionSplitType{Valid: false}, nil
	}

	splitTypeOverride, err := SplitTypeOverrideToDao(value.SplitTypeOverride)
	if err != nil {
		return dao.NullTransactionSplitType{}, fmt.Errorf("converting split type override to dao: %w", err)
	}

	return dao.NullTransactionSplitType{Valid: true, TransactionSplitType: splitTypeOverride}, nil
}

func (r *Repository) GetUnconfirmedTransactions(ctx context.Context, userEmail string) ([]model.UnconfirmedTransaction, error) {
	unconfirmedTransactionsDao, err := r.queries.GetUnconfirmedTransactions(ctx, userEmail)
	if err != nil {
		return nil, fmt.Errorf("getting unconfirmed transactions: %w", err)
	}

	unconfirmedTransactions := make([]model.UnconfirmedTransaction, len(unconfirmedTransactionsDao))
	for i, unconfirmedTransactionDao := range unconfirmedTransactionsDao {
		groupedTransactionData, err := groupedTransactionDataFromDao(
			unconfirmedTransactionDao.TransactionGroupID,
			unconfirmedTransactionDao.SplitTypeOverride,
			unconfirmedTransactionDao.MemberValues,
		)
		if err != nil {
			return nil, err
		}

		unconfirmedTransactions[i] = model.UnconfirmedTransaction{
			ID:               model.UnconfirmedTransactionID(unconfirmedTransactionDao.ID),
			TransactionGroup: groupedTransactionData.TransactionGroup,
			Owner:            model.Email(unconfirmedTransactionDao.OwnerEmail),
			CreatedBy:        model.Email(unconfirmedTransactionDao.CreatedBy),
			Amount:           int(unconfirmedTransactionDao.Amount),
			Date:             unconfirmedTransactionDao.Date,
			Note:             unconfirmedTransactionDao.Note,
			SplitOverride:    groupedTransactionData.SplitOverride,
		}
	}

	return unconfirmedTransactions, nil
}

func (r *Repository) CreateUnconfirmedTransaction(
	ctx context.Context,
	userEmail string,
	transactionGroupId model.TransactionGroupID,
	ownerEmail string,
	amount int,
	date time.Time,
	note string,
	splitOverride model.Optional[model.SplitOverride],
) (createdId model.UnconfirmedTransactionID, err error) {
	splitTypeOverride, err := nullSplitTypeOverride(splitOverride)
	if err != nil {
		return 0, err
	}

	err = r.inTx(ctx, func(queries *dao.Queries) error {
		if err := ensureTransactionGroupMember(ctx, queries, userEmail, int32(transactionGroupId), true); err != nil {
			return err
		}
		if err := ensureTransactionGroupMember(ctx, queries, ownerEmail, int32(transactionGroupId), false); err != nil {
			return err
		}

		id, err := queries.CreateUnconfirmedTransaction(ctx, &dao.CreateUnconfirmedTransactionParams{
			TransactionGroupID: int32(transactionGroupId),
			OwnerEmail:         ownerEmail,
			CreatedBy:          userEmail,
			Amount:             int32(amount),
			Date:               date,
			Note:               note,
			SplitTypeOverride:  splitTypeOverride,
		})
		if err != nil {
			return fmt.Errorf("creating unconfirmed transaction: %w", err)
		}

		if value, isSome := splitOverride.Value(); isSome {
			if err := replaceUnconfirmedTransactionSplit(ctx, queries, id, value.Members); err != nil {
				return err
			}
		}

		createdId = model.UnconfirmedTransactionID(id)
		return nil
	})

	return
}

type UpdateUnconfirmedTransactionFields struct {
	Owner         model.Optional[string]
	Amount        model.Optional[int]
	Date          model.Optional[time.Time]
	Note          model.Optional[string]
	SplitOverride model.Optional[model.Optional[model.SplitOverride]]
}

func (r *Repository) UpdateUnconfirmedTransaction(
	ctx context.Context,
	userEmail string,
	id model.UnconfirmedTransactionID,
	fields UpdateUnconfirmedTransactionFields,
) error {
	return r.inTx(ctx, func(queries *dao.Queries) error {
		previous, err := queries.GetUnconfirmedTransactionForUpdate(ctx, int32(id))
		if err != nil {
			return fmt.Errorf("getting unconfirmed transaction: %w", err)
		}
		if err := ensureTransactionGroupMember(ctx, queries, userEmail, previous.TransactionGroupID, true); err != nil {
			return err
		}

		params := &dao.UpdateUnconfirmedTransactionParams{ID: int32(id)}

		if owner, isSome := fields.Owner.Value(); isSome {
			if err := ensureTransactionGroupMember(ctx, queries, owner, previous.TransactionGroupID, false); err != nil {
				return err
			}
			params.OwnerEmail = sql.NullString{Valid: true, String: owner}
		}
		if amount, isSome := fields.Amount.Value(); isSome {
			params.Amount = sql.NullInt32{Valid: true, Int32: int32(amount)}
		}
		if date, isSome := fields.Date.Value(); isSome {
			params.Date = sql.NullTime{Valid: true, Time: date}
		}
		if note, isSome := fields.Note.Value(); isSome {
			params.Note = sql.NullString{Valid: true, String: note}
		}

		splitOverride, updateSplitOverride := fields.SplitOverride.Value()
		if updateSplitOverride {
			params.UpdateSplitTypeOverride = true
			if params.SplitTypeOverride, err = nullSplitTypeOverride(splitOverride); err != nil {
				return err
			}
		}

		if _, err := queries.UpdateUnconfirmedTransaction(ctx, params); err != nil {
			return fmt.Errorf("updating unconfirmed transaction: %w", err)
		}

		if updateSplitOverride {
			var members []model.MemberSplitValue
			if value, isSome := splitOverride.Value(); isSome {
				members = value.Members
			}
			if err := replaceUnconfirmedTransactionSplit(ctx, queries, int32(id), members); err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *Repository) DeleteUnconfirmedTransaction(ctx context.Context, userEmail string, id model.UnconfirmedTransactionID) error {
	return r.inTx(ctx, func(queries *dao.Queries) error {
		previous, err := queries.GetUnconfirmedTransactionForUpdate(ctx, int32(id))
		if err != nil {
			return fmt.Errorf("getting unconfirmed transaction: %w", err)
		}
		if err := ensureTransactionGroupMember(ctx, queries, userEmail, previous.TransactionGroupID, true); err != nil {
			return err
		}

		if _, err := queries.DeleteUnconfirmedTransaction(ctx, int32(id)); err != nil {
			return fmt.Errorf("deleting unconfirmed transaction: %w", err)
		}

		return nil
	})
}

func (r *Repository) PromoteUnconfirmedTransaction(
	ctx context.Context,
	userId uuid.UUID,
	userEmail string,
	id model.UnconfirmedTransactionID,
	amount, receiverAmount int,
	currencyId, receiverCurrencyId int,
	senderAccountId, receiverAccountId model.Optional[int],
	categoryId model.Optional[int],
	date time.Time,
	note string,
) (createdTransactionId model.TransactionID, err error) {
	err = r.inTx(ctx, func(queries *dao.Queries) error {
		unconfirmed, err := queries.GetUnconfirmedTransactionForUpdate(ctx, int32(id))
		if err != nil {
			return fmt.Errorf("getting unconfirmed transaction: %w", err)
		}
		if unconfirmed.OwnerEmail != userEmail {
			return fmt.Errorf("only the owner of an unconfirmed transaction can promote it")
		}

		groupedTransactionData, err := groupedTransactionDataFromDao(
			unconfirmed.TransactionGroupID,
			unconfirmed.SplitTypeOverride,
			unconfirmed.MemberValues,
		)
		if err != nil {
			return err
		}

		createdTransactionId, err = insertTransaction(
			ctx,
			queries,
			userId,
			amount, receiverAmount,
			currencyId, receiverCurrencyId,
			senderAccountId, receiverAccountId,
			categoryId,
			date,
			note,
			model.None[model.FinancialIncomeData](),
			model.Some(groupedTransactionData),
		)
		if err != nil {
			return err
		}

		if _, err := queries.DeleteUnconfirmedTransaction(ctx, int32(id)); err != nil {
			return fmt.Errorf("deleting promoted unconfirmed transaction: %w", err)
		}

		return nil
	})

	return
}

type groupedTransactionSnapshot struct {
	ID                 int32
	Amount             int32
	Date               time.Time
	Note               string
	TransactionGroupID int32
	SplitTypeOverride  dao.NullTransactionSplitType
}

func copyGroupedTransactionsToUnconfirmed(
	ctx context.Context,
	queries *dao.Queries,
	userEmail string,
	transactions []groupedTransactionSnapshot,
) (int64, error) {
	for _, transaction := range transactions {
		unconfirmedId, err := queries.CreateUnconfirmedTransaction(
			ctx, &dao.CreateUnconfirmedTransactionParams{
				TransactionGroupID: transaction.TransactionGroupID,
				OwnerEmail:         userEmail,
				CreatedBy:          userEmail,
				Amount:             transaction.Amount,
				Date:               transaction.Date,
				Note:               transaction.Note,
				SplitTypeOverride:  transaction.SplitTypeOverride,
			},
		)
		if err != nil {
			return 0, fmt.Errorf("moving transaction %d to unconfirmed: %w", transaction.ID, err)
		}

		splits, err := queries.GetGroupedTransactionUserSplits(ctx, transaction.ID)
		if err != nil {
			return 0, err
		}
		for _, split := range splits {
			if err := queries.CreateUnconfirmedTransactionUserSplit(
				ctx, &dao.CreateUnconfirmedTransactionUserSplitParams{
					UnconfirmedTransactionID: unconfirmedId,
					UserEmail:                split.UserEmail,
					SplitValue:               split.SplitValue,
				},
			); err != nil {
				return 0, err
			}
		}
	}

	return int64(len(transactions)), nil
}
