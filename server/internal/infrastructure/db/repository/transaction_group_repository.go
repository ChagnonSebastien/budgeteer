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

func (r *Repository) CreateTransactionGroups(
	ctx context.Context,
	email, name string,
	splitType model.SplitType,
	currencyId model.CurrencyID,
	categoryId model.CategoryID,
) (model.TransactionGroupID, error) {
	logging.FromContext(ctx).Info(fmt.Sprintf("%d, %d, %d, %s", currencyId, categoryId, splitType, name))

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
