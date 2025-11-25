package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"chagnon.dev/budget-server/internal/logging"
)

func SplitTypeFromDao(splitType dao.GroupSplitType) (model.SplitType, error) {
	switch splitType {
	case dao.GroupSplitTypeEQUAL:
		return model.SplitTypeEqual, nil
	case dao.GroupSplitTypePERCENTAGE:
		return model.SplitTypePercentage, nil
	case dao.GroupSplitTypeSHARES:
		return model.SplitTypeShare, nil
	default:
		return model.SplitTypeEqual, fmt.Errorf("unknown SplitType %s", splitType)
	}
}

func SplitTypeToDao(splitType model.SplitType) (dao.GroupSplitType, error) {
	switch splitType {
	case model.SplitTypeEqual:
		return dao.GroupSplitTypeEQUAL, nil
	case model.SplitTypePercentage:
		return dao.GroupSplitTypePERCENTAGE, nil
	case model.SplitTypeShare:
		return dao.GroupSplitTypeSHARES, nil
	default:
		return dao.GroupSplitTypeEQUAL, fmt.Errorf("unknown SplitType %s", splitType)
	}
}

type GroupMember struct {
	UserEmail  string   `json:"user_email"`
	UserName   string   `json:"user_name"`
	SplitValue *float32 `json:"split_value"` // nullable
}

func (r *Repository) GetUserTransactionGroups(ctx context.Context, userEmail string) ([]model.TransactionGroup, error) {
	transactionGroupsDao, err := r.queries.GetUserTransactionGroups(ctx, userEmail)
	if err != nil {
		return nil, err
	}

	transactionGroups := make([]model.TransactionGroup, len(transactionGroupsDao))
	for i, transactionGroupDao := range transactionGroupsDao {
		splitType, err := SplitTypeFromDao(transactionGroupDao.SplitType)
		if err != nil {
			return nil, fmt.Errorf("parsing split type while assembling transaction groups: %s", err)
		}

		var membersDao []GroupMember
		if transactionGroupDao.Members != nil {
			if err := json.Unmarshal(transactionGroupDao.Members, &membersDao); err != nil {
				return nil, fmt.Errorf("parsing members while assembling transaction groups: %s", err)
			}
		}

		members := make([]model.Member, len(membersDao))
		for i, memberDao := range membersDao {
			splitValue := model.None[float32]()
			if memberDao.SplitValue != nil {
				splitValue = model.Some(*memberDao.SplitValue)
			}

			members[i] = model.Member{
				Email:      model.Email(memberDao.UserEmail),
				Name:       memberDao.UserName,
				SplitValue: splitValue,
			}
		}

		currency := model.None[model.CurrencyID]()
		if transactionGroupDao.CurrencyID.Valid {
			currency = model.Some(model.CurrencyID(transactionGroupDao.CurrencyID.Int32))
		}

		category := model.None[model.CategoryID]()
		if transactionGroupDao.CategoryID.Valid {
			category = model.Some(model.CategoryID(transactionGroupDao.CategoryID.Int32))
		}

		transactionGroups[i] = model.TransactionGroup{
			ID:               model.TransactionGroupID(transactionGroupDao.ID),
			Name:             transactionGroupDao.Name,
			OriginalCurrency: transactionGroupDao.CreatorCurrency,
			SplitType:        splitType,
			Currency:         currency,
			Category:         category,
			Members:          members,
		}
	}

	return transactionGroups, nil
}

func (r *Repository) CreateTransactionGroup(
	ctx context.Context,
	email, name string,
	splitType model.SplitType,
	currencyId model.CurrencyID,
	categoryId model.CategoryID,
) (model.TransactionGroupID, error) {
	currency, err := r.queries.GetCurrency(ctx, int32(currencyId))
	if err != nil {
		return 0, fmt.Errorf("retrieving curency details")
	}

	if currency.Email != email {
		return 0, fmt.Errorf("currency does not seem to belong to creator")
	}

	splitTypeDao, err := SplitTypeToDao(splitType)
	if err != nil {
		return 0, fmt.Errorf("converting split type to dao")
	}

	transactionGroupId, err := r.queries.CreateTransactionGroupWithCreator(ctx, &dao.CreateTransactionGroupWithCreatorParams{
		Name:      name,
		SplitType: splitTypeDao,
		UserEmail: email,
		CategoryID: sql.NullInt32{
			Int32: int32(categoryId),
			Valid: true,
		},
		CurrencyID: sql.NullInt32{
			Int32: int32(currencyId),
			Valid: true,
		},
		SplitValue: sql.NullInt32{
			Valid: false,
		},
	})

	if err != nil {
		return 0, err
	}

	return model.TransactionGroupID(transactionGroupId), nil
}

type UpdateTransactionGroupFields struct {
	Name       model.Optional[string]
	SplitType  model.Optional[model.SplitType]
	CurrencyId model.Optional[model.CurrencyID]
	CategoryId model.Optional[model.CategoryID]
}

func (u *UpdateTransactionGroupFields) nullName() sql.NullString {
	if value, ok := u.Name.Value(); ok {
		return sql.NullString{String: value, Valid: true}
	}

	return sql.NullString{Valid: false}
}

func (u *UpdateTransactionGroupFields) nullSplitType() dao.NullGroupSplitType {
	if value, ok := u.SplitType.Value(); ok {
		if splitType, err := SplitTypeToDao(value); err == nil {
			return dao.NullGroupSplitType{GroupSplitType: splitType, Valid: true}
		}
	}

	return dao.NullGroupSplitType{Valid: false}
}

func (u *UpdateTransactionGroupFields) nullCurrencyId() sql.NullInt32 {
	if value, ok := u.CurrencyId.Value(); ok {
		return sql.NullInt32{Int32: int32(value), Valid: true}
	}

	return sql.NullInt32{Valid: false}
}

func (u *UpdateTransactionGroupFields) nullCategoryId() sql.NullInt32 {
	if value, ok := u.CategoryId.Value(); ok {
		return sql.NullInt32{Int32: int32(value), Valid: true}
	}

	return sql.NullInt32{Valid: false}

}

func (r *Repository) UpdateTransactionGroup(
	ctx context.Context,
	email string,
	id model.TransactionGroupID,
	fields *UpdateTransactionGroupFields,
) (err error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning db transaction: %w", err)
	}

	defer func() {
		if err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				logging.FromContext(ctx).Error(fmt.Sprintf("transaction group update rollback error: %v", rbErr))
			}
		}
	}()

	rowsAffected, err := r.queries.WithTx(tx).UpdateTransactionGroupUser(ctx, &dao.UpdateTransactionGroupUserParams{
		CurrencyID:         fields.nullCurrencyId(),
		CategoryID:         fields.nullCategoryId(),
		Name:               fields.nullName(),
		UserEmail:          email,
		TransactionGroupID: int32(id),
	})
	if err != nil {
		err = fmt.Errorf("updating user - transaction group relationship: %w", err)
		return
	}
	if rowsAffected == 0 {
		err = fmt.Errorf("user - transaction group association returned no result")
		return
	}

	rowsAffected, err = r.queries.WithTx(tx).UpdateTransactionGroup(ctx, &dao.UpdateTransactionGroupParams{
		Name:               fields.nullName(),
		UserEmail:          email,
		SplitType:          fields.nullSplitType(),
		TransactionGroupID: int32(id),
	})
	if err != nil {
		err = fmt.Errorf("updating transaction group: %w", err)
		return
	}
	if rowsAffected == 0 {
		err = fmt.Errorf("transaction group update returned no result")
		return
	}

	if err = tx.Commit(); err != nil {
		err = fmt.Errorf("committing transaction: %w", err)
		return
	}

	return
}
