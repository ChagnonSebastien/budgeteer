package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"slices"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"chagnon.dev/budget-server/internal/logging"
	"github.com/google/uuid"
)

func SplitTypeOverrideFromDao(splitType dao.TransactionSplitType) (value model.SplitTypeOverride, err error) {
	switch splitType {
	case dao.TransactionSplitTypeEQUAL:
		return model.SplitTypeOverrideEqual, nil
	case dao.TransactionSplitTypePERCENTAGE:
		return model.SplitTypeOverridePercentage, nil
	case dao.TransactionSplitTypeSHARES:
		return model.SplitTypeOverrideShare, nil
	case dao.TransactionSplitTypeEXACTAMOUNT:
		return model.SplitTypeOverrideExactAmount, nil
	default:
		return value, fmt.Errorf("unknown SplitTypeOverride %s", splitType)
	}
}

func SplitTypeOverrideToDao(splitType model.SplitTypeOverride) (value dao.TransactionSplitType, err error) {
	switch splitType {
	case model.SplitTypeOverrideEqual:
		return dao.TransactionSplitTypeEQUAL, nil
	case model.SplitTypeOverridePercentage:
		return dao.TransactionSplitTypePERCENTAGE, nil
	case model.SplitTypeOverrideShare:
		return dao.TransactionSplitTypeSHARES, nil
	case model.SplitTypeOverrideExactAmount:
		return dao.TransactionSplitTypeEXACTAMOUNT, nil
	default:
		return value, fmt.Errorf("unknown SplitType %s", splitType)
	}
}

type MemberValueOverride struct {
	UserEmail  string `json:"user_email"`
	SplitValue *int   `json:"split_value"`
}

func (r *Repository) GetAllTransactions(ctx context.Context, userId uuid.UUID) ([]model.Transaction, error) {
	transactionsDao, err := r.queries.GetAllTransactions(ctx, userId)
	if err != nil {
		return nil, err
	}

	transactions := make([]model.Transaction, len(transactionsDao))
	for i, transactionDao := range transactionsDao {
		sender := model.None[model.AccountID]()
		if transactionDao.Sender.Valid {
			sender = model.Some(model.AccountID(transactionDao.Sender.Int32))
		}

		receiver := model.None[model.AccountID]()
		if transactionDao.Receiver.Valid {
			receiver = model.Some(model.AccountID(transactionDao.Receiver.Int32))
		}

		category := model.None[model.CategoryID]()
		if transactionDao.Category.Valid {
			category = model.Some(model.CategoryID(transactionDao.Category.Int32))
		}

		financialIncomeData := model.None[model.FinancialIncomeData]()
		if transactionDao.RelatedCurrencyID.Valid {
			financialIncomeData = model.Some(model.FinancialIncomeData{
				RelatedCurrency: model.CurrencyID(transactionDao.RelatedCurrencyID.Int32),
			})
		}

		transactionGroupData := model.None[model.GroupedTransactionData]()
		if transactionDao.TransactionGroupID.Valid {
			groupedTransactionData, err := groupedTransactionDataFromDao(
				transactionDao.TransactionGroupID.Int32,
				transactionDao.TransactionGroupSplitTypeOverride,
				transactionDao.TransactionGroupMemberValues,
			)
			if err != nil {
				return nil, err
			}
			transactionGroupData = model.Some(groupedTransactionData)
		}

		transactions[i] = model.Transaction{
			ID:                     model.TransactionID(transactionDao.ID),
			Owner:                  model.Email(transactionDao.Owner),
			Amount:                 int(transactionDao.Amount),
			Currency:               model.CurrencyID(transactionDao.Currency),
			Sender:                 sender,
			Receiver:               receiver,
			Category:               category,
			Date:                   transactionDao.Date,
			Note:                   transactionDao.Note,
			ReceiverCurrency:       model.CurrencyID(transactionDao.ReceiverCurrency),
			ReceiverAmount:         int(transactionDao.ReceiverAmount),
			FinancialIncomeData:    financialIncomeData,
			GroupedTransactionData: transactionGroupData,
		}
	}

	groupTransactionsDao, err := r.queries.GetGroupTransactionsFromOtherMembers(ctx, userId)
	if err != nil {
		return nil, fmt.Errorf("getting group transactions from other members: %w", err)
	}

	for _, transactionDao := range groupTransactionsDao {
		groupedTransactionData, err := groupedTransactionDataFromDao(
			transactionDao.TransactionGroupID,
			transactionDao.TransactionGroupSplitTypeOverride,
			transactionDao.TransactionGroupMemberValues,
		)
		if err != nil {
			return nil, err
		}

		transactions = append(transactions, model.Transaction{
			ID:                     model.TransactionID(transactionDao.ID),
			Owner:                  model.Email(transactionDao.Owner),
			Amount:                 int(transactionDao.Amount),
			Currency:               model.CurrencyID(transactionDao.ViewerCurrency),
			Sender:                 model.None[model.AccountID](),
			Receiver:               model.None[model.AccountID](),
			Category:               model.None[model.CategoryID](),
			Date:                   transactionDao.Date,
			Note:                   transactionDao.Note,
			ReceiverCurrency:       model.CurrencyID(transactionDao.ViewerCurrency),
			ReceiverAmount:         int(transactionDao.Amount),
			FinancialIncomeData:    model.None[model.FinancialIncomeData](),
			GroupedTransactionData: model.Some(groupedTransactionData),
		})
	}

	return transactions, nil
}

func groupedTransactionDataFromDao(
	transactionGroupId int32,
	splitTypeOverrideDao dao.NullTransactionSplitType,
	memberValuesDao []byte,
) (model.GroupedTransactionData, error) {
	splitOverride := model.None[model.SplitOverride]()
	if splitTypeOverrideDao.Valid {
		splitTypeOverride, err := SplitTypeOverrideFromDao(splitTypeOverrideDao.TransactionSplitType)
		if err != nil {
			return model.GroupedTransactionData{}, err
		}

		var membersDao []MemberValueOverride
		if memberValuesDao != nil {
			if err := json.Unmarshal(memberValuesDao, &membersDao); err != nil {
				return model.GroupedTransactionData{}, fmt.Errorf("parsing members while assembling transaction split override values for members: %s", err)
			}
		}

		members := make([]model.MemberSplitValue, len(membersDao))
		for i, memberDao := range membersDao {
			splitValue := model.None[int]()
			if memberDao.SplitValue != nil {
				splitValue = model.Some(*memberDao.SplitValue)
			}

			members[i] = model.MemberSplitValue{
				Email:      model.Email(memberDao.UserEmail),
				SplitValue: splitValue,
			}
		}

		splitOverride = model.Some(model.SplitOverride{
			SplitTypeOverride: splitTypeOverride,
			Members:           members,
		})
	}

	return model.GroupedTransactionData{
		TransactionGroup: model.TransactionGroupID(transactionGroupId),
		SplitOverride:    splitOverride,
	}, nil
}

func (r *Repository) CreateTransaction(
	ctx context.Context,
	userId uuid.UUID,
	userEmail string,
	ownerEmail string,
	amount, receiverAmount int,
	currencyId, receiverCurrencyId int,
	senderAccountId, receiverAccountId model.Optional[int],
	categoryId model.Optional[int],
	date time.Time,
	note string,
	financialIncomeData model.Optional[model.FinancialIncomeData],
	transactionGroupData model.Optional[model.GroupedTransactionData],
) (createdTransactionId model.TransactionID, err error) {
	if userEmail != ownerEmail {
		err = fmt.Errorf("can only create a transaction for self for now")
		return
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return
	}

	defer func() {
		if err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				logging.FromContext(ctx).Error(fmt.Sprintf("transaction update rollback error: %v", rbErr))
			}
		}
	}()

	createdTransactionId, err = insertTransaction(
		ctx,
		r.queries.WithTx(tx),
		userId,
		amount, receiverAmount,
		currencyId, receiverCurrencyId,
		senderAccountId, receiverAccountId,
		categoryId,
		date,
		note,
		financialIncomeData,
		transactionGroupData,
	)
	if err != nil {
		return
	}

	if err = tx.Commit(); err != nil {
		err = fmt.Errorf("committing transaction: %w", err)
		return
	}

	return
}

func insertTransaction(
	ctx context.Context,
	queries *dao.Queries,
	userId uuid.UUID,
	amount, receiverAmount int,
	currencyId, receiverCurrencyId int,
	senderAccountId, receiverAccountId model.Optional[int],
	categoryId model.Optional[int],
	date time.Time,
	note string,
	financialIncomeData model.Optional[model.FinancialIncomeData],
	transactionGroupData model.Optional[model.GroupedTransactionData],
) (model.TransactionID, error) {
	sender := sql.NullInt32{Valid: false}
	if value, isSome := senderAccountId.Value(); isSome {
		sender = sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	receiver := sql.NullInt32{Valid: false}
	if value, isSome := receiverAccountId.Value(); isSome {
		receiver = sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	category := sql.NullInt32{Valid: false}
	if value, isSome := categoryId.Value(); isSome {
		category = sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	transactionId, err := queries.CreateTransaction(
		ctx, &dao.CreateTransactionParams{
			UserID:           userId,
			Amount:           int32(amount),
			Currency:         int32(currencyId),
			Sender:           sender,
			Receiver:         receiver,
			Category:         category,
			Date:             date,
			Note:             note,
			ReceiverCurrency: int32(receiverCurrencyId),
			ReceiverAmount:   int32(receiverAmount),
		},
	)
	if err != nil {
		return 0, fmt.Errorf("creating transaction: %w", err)
	}

	if financialIncome, isSome := financialIncomeData.Value(); isSome {
		_, err := queries.UpsertFinancialIncome(ctx, &dao.UpsertFinancialIncomeParams{
			TransactionID: transactionId,
			RelatedCurrencyID: sql.NullInt32{
				Int32: int32(financialIncome.RelatedCurrency),
				Valid: true,
			},
		})
		if err != nil {
			return 0, fmt.Errorf("creating financial income: %w", err)
		}
	}

	if transactionGroup, isSome := transactionGroupData.Value(); isSome {
		if err := ensureJoinedTransactionGroupMember(ctx, queries, userId, int32(transactionGroup.TransactionGroup)); err != nil {
			return 0, err
		}

		splitOverride, hasSplitOverride := transactionGroup.SplitOverride.Value()
		var splitOverrideDao dao.TransactionSplitType
		if hasSplitOverride {
			splitOverrideDao, err = SplitTypeOverrideToDao(splitOverride.SplitTypeOverride)
			if err != nil {
				return 0, fmt.Errorf("converting split type override to dao: %w", err)
			}
		}

		_, err := queries.UpsertGroupedTransaction(ctx, &dao.UpsertGroupedTransactionParams{
			TransactionID:           transactionId,
			TransactionGroupID:      sql.NullInt32{Valid: true, Int32: int32(transactionGroup.TransactionGroup)},
			SplitTypeOverride:       dao.NullTransactionSplitType{Valid: hasSplitOverride, TransactionSplitType: splitOverrideDao},
			TriggeredByOwner:        true,
			UpdateSplitTypeOverride: hasSplitOverride,
		})
		if err != nil {
			return 0, fmt.Errorf("upserting grouped transaction: %w", err)
		}

		if hasSplitOverride {
			for _, member := range splitOverride.Members {
				splitValue, hasSplitValue := member.SplitValue.Value()

				_, err := queries.UpsertGroupedTransactionMemberSplitValue(ctx, &dao.UpsertGroupedTransactionMemberSplitValueParams{
					TransactionID: transactionId,
					UserEmail:     string(member.Email),
					SplitValue:    sql.NullInt32{Valid: hasSplitValue, Int32: int32(splitValue)},
				})
				if err != nil {
					return 0, fmt.Errorf("upserting grouped transaction member split value: %w", err)
				}
			}
		}
	}

	return model.TransactionID(transactionId), nil
}

func ensureJoinedTransactionGroupMember(ctx context.Context, queries *dao.Queries, userId uuid.UUID, transactionGroupId int32) error {
	isMember, err := queries.IsJoinedTransactionGroupMember(ctx, &dao.IsJoinedTransactionGroupMemberParams{
		UserID:             userId,
		TransactionGroupID: transactionGroupId,
	})
	if err != nil {
		return fmt.Errorf("checking transaction group membership: %w", err)
	}
	if !isMember {
		return fmt.Errorf("user is not a joined member of transaction group %d", transactionGroupId)
	}

	return nil
}

type UpdateFinancialIncomeAdditionalData struct {
	RelatedCurrencyId model.Optional[int]
}

func (u *UpdateFinancialIncomeAdditionalData) nullRelatedCurrencyId() sql.NullInt32 {
	if value, isSome := u.RelatedCurrencyId.Value(); isSome && value != 0 {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

type UpdateTransactionGroupSplitOverride struct {
	SplitTypeOverride model.Optional[model.SplitTypeOverride]
	Members           model.Optional[[]model.MemberSplitValue]
}

func (u *UpdateTransactionGroupSplitOverride) nullSplitTypeOverride() dao.NullTransactionSplitType {
	if value, isSome := u.SplitTypeOverride.Value(); isSome {
		if splitTypeOverride, err := SplitTypeOverrideToDao(value); err == nil {
			return dao.NullTransactionSplitType{Valid: true, TransactionSplitType: splitTypeOverride}
		}
	}

	return dao.NullTransactionSplitType{Valid: false}
}

type UpdateTransactionGroupAdditionalData struct {
	TransactionGroupId model.Optional[int]
	SplitOverride      model.Optional[model.Optional[UpdateTransactionGroupSplitOverride]]
}

func (u *UpdateTransactionGroupAdditionalData) nullTransactionGroupId() sql.NullInt32 {
	if value, isSome := u.TransactionGroupId.Value(); isSome {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

type UpdateTransactionFields struct {
	Amount, ReceiverAmount               model.Optional[int]
	CurrencyId, ReceiverCurrencyId       model.Optional[int]
	SenderAccountId, ReceiverAccountId   model.Optional[model.Optional[int]]
	CategoryId                           model.Optional[model.Optional[int]]
	Date                                 model.Optional[time.Time]
	Note                                 model.Optional[string]
	UpdateFinancialIncomeAdditionalData  model.Optional[model.Optional[UpdateFinancialIncomeAdditionalData]]
	UpdateTransactionGroupAdditionalData model.Optional[model.Optional[UpdateTransactionGroupAdditionalData]]
}

func (u *UpdateTransactionFields) nullNote() sql.NullString {
	if value, isSome := u.Note.Value(); isSome {
		return sql.NullString{Valid: true, String: value}
	}

	return sql.NullString{Valid: false}
}

func (u *UpdateTransactionFields) nullDate() sql.NullTime {
	if value, isSome := u.Date.Value(); isSome {
		return sql.NullTime{Valid: true, Time: value}
	}

	return sql.NullTime{Valid: false}
}

func (u *UpdateTransactionFields) nullAmount() sql.NullInt32 {
	if value, isSome := u.Amount.Value(); isSome {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullReceiverAmount() sql.NullInt32 {
	if value, isSome := u.ReceiverAmount.Value(); isSome {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullSenderAccountId() sql.NullInt32 {
	if optionalValue, isSome := u.SenderAccountId.Value(); isSome {
		if value, isSome := optionalValue.Value(); isSome {
			return sql.NullInt32{Valid: true, Int32: int32(value)}
		}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullReceiverAccountId() sql.NullInt32 {
	if optionalValue, isSome := u.ReceiverAccountId.Value(); isSome {
		if value, isSome := optionalValue.Value(); isSome {
			return sql.NullInt32{Valid: true, Int32: int32(value)}
		}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullCurrencyId() sql.NullInt32 {
	if value, isSome := u.CurrencyId.Value(); isSome && value != 0 {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullReceiverCurrencyId() sql.NullInt32 {
	if value, isSome := u.ReceiverCurrencyId.Value(); isSome && value != 0 {
		return sql.NullInt32{Valid: true, Int32: int32(value)}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionFields) nullCategoryId() sql.NullInt32 {
	if optionalValue, isSome := u.CategoryId.Value(); isSome {
		if value, isSome := optionalValue.Value(); isSome {
			return sql.NullInt32{Valid: true, Int32: int32(value)}
		}
	}

	return sql.NullInt32{Valid: false}
}

func (r *Repository) UpdateTransaction(
	ctx context.Context,
	userId uuid.UUID,
	id model.TransactionID,
	field UpdateTransactionFields,
) (err error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return fmt.Errorf("beginning db transaction: %w", err)
	}

	defer func() {
		if err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				logging.FromContext(ctx).Error(fmt.Sprintf("transaction update rollback error: %v", rbErr))
			}
		}
	}()

	_, err = r.queries.WithTx(tx).UpdateTransaction(
		ctx, &dao.UpdateTransactionParams{
			UserID:           userId,
			ID:               int32(id),
			Amount:           field.nullAmount(),
			Currency:         field.nullCurrencyId(),
			UpdateSender:     field.SenderAccountId.IsSome(),
			Sender:           field.nullSenderAccountId(),
			UpdateReceiver:   field.ReceiverAccountId.IsSome(),
			Receiver:         field.nullReceiverAccountId(),
			UpdateCategory:   field.CategoryId.IsSome(),
			Category:         field.nullCategoryId(),
			Date:             field.nullDate(),
			Note:             field.nullNote(),
			ReceiverCurrency: field.nullReceiverCurrencyId(),
			ReceiverAmount:   field.nullReceiverAmount(),
		},
	)
	if err != nil {
		err = fmt.Errorf("updating transaction: %w", err)
		return
	}

	if updatingFinancialData, isSome := field.UpdateFinancialIncomeAdditionalData.Value(); isSome {
		if financialDataFields, isSome := updatingFinancialData.Value(); isSome {
			_, updateErr := r.queries.WithTx(tx).UpsertFinancialIncome(
				ctx, &dao.UpsertFinancialIncomeParams{
					RelatedCurrencyID: financialDataFields.nullRelatedCurrencyId(),
					TransactionID:     int32(id),
				},
			)
			if updateErr != nil {
				err = fmt.Errorf("updating financial income: %w", updateErr)
				return
			}
		} else {
			_, deleteErr := r.queries.WithTx(tx).RemoveFinancialIncome(ctx, int32(id))
			if deleteErr != nil {
				err = fmt.Errorf("deleting financial income: %w", deleteErr)
				return
			}
		}
	}

	if updatingTransactionGroupData, isSome := field.UpdateTransactionGroupAdditionalData.Value(); isSome {
		if transactionGroupData, isSome := updatingTransactionGroupData.Value(); isSome {
			previousTransaction, getTransactionError := r.queries.WithTx(tx).GetTransaction(ctx, int32(id))
			if getTransactionError != nil {
				err = fmt.Errorf("getting previous transaction: %w", getTransactionError)
				return
			}

			transactionGroupId := transactionGroupData.nullTransactionGroupId()
			if transactionGroupId.Valid {
				if err = ensureJoinedTransactionGroupMember(ctx, r.queries.WithTx(tx), userId, transactionGroupId.Int32); err != nil {
					return
				}
			}

			updateSplitOverrideData, updateSplitOverride := transactionGroupData.SplitOverride.Value()
			updateSplitTypeOverride := false
			splitTypeOverrideDao := dao.NullTransactionSplitType{Valid: false}

			if updateSplitOverride {
				if splitOverride, isSome := updateSplitOverrideData.Value(); isSome {
					updateSplitTypeOverride = splitOverride.SplitTypeOverride.IsSome()
					splitTypeOverrideDao = splitOverride.nullSplitTypeOverride()
				}
			}

			_, upsertErr := r.queries.WithTx(tx).UpsertGroupedTransaction(ctx, &dao.UpsertGroupedTransactionParams{
				TransactionID:           int32(id),
				TransactionGroupID:      transactionGroupId,
				SplitTypeOverride:       splitTypeOverrideDao,
				TriggeredByOwner:        previousTransaction.UserID == userId,
				UpdateSplitTypeOverride: updateSplitTypeOverride,
			})
			if upsertErr != nil {
				err = fmt.Errorf("upserting grouped transaction: %w", upsertErr)
				return
			}

			if updateSplitOverride {
				var previousMembers []MemberValueOverride
				if marshalErr := json.Unmarshal(previousTransaction.TransactionGroupMemberValues, &previousMembers); marshalErr != nil {
					err = fmt.Errorf("parsing members while assembling previous transaction split override values for members: %s", marshalErr)
					return
				}

				var newMembers = make([]model.MemberSplitValue, 0)

				if splitOverride, isSome := updateSplitOverrideData.Value(); isSome {
					if newMembersData, isSome := splitOverride.Members.Value(); isSome {
						newMembers = newMembersData
					} else {
						// members stay the same
						newMembers = make([]model.MemberSplitValue, len(previousMembers))
						for i, member := range previousMembers {
							splitValue := model.None[int]()
							if member.SplitValue != nil {
								splitValue = model.Some(*member.SplitValue)
							}
							newMembers[i] = model.MemberSplitValue{
								Email:      model.Email(member.UserEmail),
								SplitValue: splitValue,
							}
						}
					}
				}

				//
				// HANDLE REMOVED MEMBERS
				//
				for _, previousMember := range previousMembers {
					if stillHere := slices.ContainsFunc(newMembers, func(member model.MemberSplitValue) bool {
						return string(member.Email) == previousMember.UserEmail
					}); stillHere {
						continue
					}

					_, removalErr := r.queries.WithTx(tx).RemoveGroupedTransactionMember(ctx, &dao.RemoveGroupedTransactionMemberParams{
						TransactionID: int32(id),
						UserEmail:     previousMember.UserEmail,
					})
					if removalErr != nil {
						err = fmt.Errorf("removing member split value from transaction: %s: %w", previousMember.UserEmail, removalErr)
						return
					}
				}

				//
				// HANDLE NEW AND UPDATED MEMBERS
				//
				for _, newMember := range newMembers {
					splitValue := sql.NullInt32{Valid: false}
					if value, isSome := newMember.SplitValue.Value(); isSome {
						splitValue = sql.NullInt32{Valid: true, Int32: int32(value)}
					}

					_, upsertErr := r.queries.WithTx(tx).UpsertGroupedTransactionMemberSplitValue(ctx, &dao.UpsertGroupedTransactionMemberSplitValueParams{
						SplitValue:    splitValue,
						UserEmail:     string(newMember.Email),
						TransactionID: int32(id),
					})
					if upsertErr != nil {
						err = fmt.Errorf("upserting member split value from transaction: %w", upsertErr)
						return
					}
				}
			}
		} else {
			_, deleteErr := r.queries.WithTx(tx).DeleteGroupedTransaction(ctx, int32(id))
			if deleteErr != nil {
				err = fmt.Errorf("deleting grouped transaction data: %w", deleteErr)
				return
			}
		}
	}

	if err = tx.Commit(); err != nil {
		err = fmt.Errorf("committing transaction: %w", err)
		return
	}

	return
}

func (r *Repository) DeleteTransaction(ctx context.Context, userId uuid.UUID, id model.TransactionID) error {
	// Child rows in financialincomes and transaction_transaction_group (and its
	// user-split table) are removed by ON DELETE CASCADE.
	_, err := r.queries.DeleteTransaction(ctx, &dao.DeleteTransactionParams{
		ID:     int32(id),
		UserID: userId,
	})
	if err != nil {
		return fmt.Errorf("deleting transaction: %w", err)
	}

	return nil
}
