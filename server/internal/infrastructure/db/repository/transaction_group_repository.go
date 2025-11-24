package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
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
