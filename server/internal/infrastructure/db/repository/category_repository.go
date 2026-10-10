package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"github.com/google/uuid"
)

func (r *Repository) GetAllCategories(ctx context.Context, userId uuid.UUID) ([]model.Category, error) {
	categoriesDao, err := r.queries.GetAllCategories(ctx, userId)
	if err != nil {
		return nil, err
	}

	categories := make([]model.Category, len(categoriesDao))
	for i, categoryDao := range categoriesDao {
		var parentId model.CategoryID
		if categoryDao.Parent.Valid {
			parentId = model.CategoryID(categoryDao.Parent.Int32)
		}

		categories[i] = model.Category{
			ID:             model.CategoryID(categoryDao.ID),
			Name:           categoryDao.Name,
			ParentId:       parentId,
			IconName:       categoryDao.IconName,
			IconColor:      categoryDao.IconColor,
			IconBackground: categoryDao.IconBackground,
			FixedCost:      categoryDao.FixedCosts,
			Ordering:       categoryDao.Ordering,
		}
	}

	return categories, nil
}

func (r *Repository) CreateCategory(
	ctx context.Context,
	userId uuid.UUID,
	name, iconName, iconColor, iconBackground string,
	parentId int,
	fixedCosts bool,
	ordering float64,
) (model.CategoryID, error) {
	id, err := r.queries.CreateCategory(
		ctx, &dao.CreateCategoryParams{
			UserID: userId,
			Name:   name,
			Parent: sql.NullInt32{
				Int32: int32(parentId),
				Valid: parentId != 0,
			},
			IconName:       iconName,
			IconColor:      iconColor,
			IconBackground: iconBackground,
			FixedCosts:     fixedCosts,
			Ordering:       ordering,
		},
	)
	if err != nil {
		return 0, err
	}

	return model.CategoryID(id), nil
}

type UpdateCategoryFields struct {
	Name, IconName, IconColor, IconBackground *string
	ParentId                                  *int
	FixedCosts                                *bool
	Ordering                                  *float64
}

func (u *UpdateCategoryFields) nullName() sql.NullString {
	if u.Name == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.Name,
		Valid:  true,
	}
}

func (u *UpdateCategoryFields) nullIconName() sql.NullString {
	if u.IconName == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.IconName,
		Valid:  true,
	}
}

func (u *UpdateCategoryFields) nullIconColor() sql.NullString {
	if u.IconColor == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.IconColor,
		Valid:  true,
	}
}

func (u *UpdateCategoryFields) nullIconBackground() sql.NullString {
	if u.IconBackground == nil {
		return sql.NullString{Valid: false}
	}

	return sql.NullString{
		String: *u.IconBackground,
		Valid:  true,
	}
}

func (u *UpdateCategoryFields) nullParentId() sql.NullInt32 {
	if u.ParentId == nil || *u.ParentId == 0 {
		return sql.NullInt32{Valid: false}
	}

	return sql.NullInt32{
		Int32: int32(*u.ParentId),
		Valid: true,
	}
}

func (u *UpdateCategoryFields) nullFixedCosts() sql.NullBool {
	if u.FixedCosts == nil {
		return sql.NullBool{Valid: false}
	}

	return sql.NullBool{
		Bool:  *u.FixedCosts,
		Valid: true,
	}
}

func (u *UpdateCategoryFields) nullOrdering() sql.NullFloat64 {
	if u.Ordering == nil {
		return sql.NullFloat64{Valid: false}
	}

	return sql.NullFloat64{
		Float64: *u.Ordering,
		Valid:   true,
	}
}

func (r *Repository) UpdateCategory(
	ctx context.Context,
	userId uuid.UUID,
	id model.CategoryID,
	fields UpdateCategoryFields,
) error {
	return r.queries.UpdateCategory(
		ctx, &dao.UpdateCategoryParams{
			UserID:         userId,
			ID:             int32(id),
			Name:           fields.nullName(),
			UpdateParent:   fields.ParentId != nil,
			Parent:         fields.nullParentId(),
			IconName:       fields.nullIconName(),
			IconColor:      fields.nullIconColor(),
			IconBackground: fields.nullIconBackground(),
			FixedCosts:     fields.nullFixedCosts(),
			Ordering:       fields.nullOrdering(),
		},
	)
}

var (
	ErrCategoryNotFound      = errors.New("category not found")
	ErrRootCategory          = errors.New("the root category cannot be deleted")
	ErrInvalidCategoryTarget = errors.New("the target must be a category outside the deleted category")
)

type DeleteCategoryResult struct {
	MovedTransactions   int64
	MovedCategories     int64
	DeletedTransactions int64
	MovedToUnconfirmed  int64
}

func (r *Repository) DeleteCategory(
	ctx context.Context,
	userId uuid.UUID,
	userEmail string,
	id model.CategoryID,
	targetId *model.CategoryID,
	deleteTransactions bool,
) (result DeleteCategoryResult, err error) {
	err = r.inTx(ctx, func(queries *dao.Queries) error {
		category, err := queries.GetCategoryForDeletion(ctx, &dao.GetCategoryForDeletionParams{CategoryID: int32(id), UserID: userId})
		if errors.Is(err, sql.ErrNoRows) {
			return ErrCategoryNotFound
		}
		if err != nil {
			return err
		}
		if !category.Parent.Valid {
			return ErrRootCategory
		}

		target := category.Parent.Int32
		if targetId != nil {
			if _, err := queries.GetCategoryForDeletion(
				ctx, &dao.GetCategoryForDeletionParams{CategoryID: int32(*targetId), UserID: userId},
			); errors.Is(err, sql.ErrNoRows) {
				return ErrCategoryNotFound
			} else if err != nil {
				return err
			}
			inSubtree, err := queries.IsCategoryInSubtree(
				ctx, &dao.IsCategoryInSubtreeParams{Candidate: int32(*targetId), SubtreeRoot: category.ID, UserID: userId},
			)
			if err != nil {
				return err
			}
			if inSubtree {
				return ErrInvalidCategoryTarget
			}
			target = int32(*targetId)
		}

		categoryRef := sql.NullInt32{Int32: category.ID, Valid: true}
		targetRef := sql.NullInt32{Int32: target, Valid: true}

		if deleteTransactions {
			rows, err := queries.GetGroupedTransactionsForCategory(
				ctx, &dao.GetGroupedTransactionsForCategoryParams{UserID: userId, CategoryID: categoryRef},
			)
			if err != nil {
				return err
			}
			snapshots := make([]groupedTransactionSnapshot, len(rows))
			for i, row := range rows {
				snapshots[i] = groupedTransactionSnapshot(row)
			}
			if result.MovedToUnconfirmed, err = copyGroupedTransactionsToUnconfirmed(ctx, queries, userEmail, snapshots); err != nil {
				return err
			}
			if result.DeletedTransactions, err = queries.DeleteTransactionsForCategory(
				ctx, &dao.DeleteTransactionsForCategoryParams{UserID: userId, CategoryID: categoryRef},
			); err != nil {
				return err
			}
		} else if result.MovedTransactions, err = queries.MoveCategoryTransactions(
			ctx, &dao.MoveCategoryTransactionsParams{TargetID: targetRef, UserID: userId, CategoryID: categoryRef},
		); err != nil {
			return err
		}

		if result.MovedCategories, err = queries.MoveChildCategories(
			ctx, &dao.MoveChildCategoriesParams{TargetID: targetRef, UserID: userId, CategoryID: categoryRef},
		); err != nil {
			return err
		}
		if err := queries.MoveGroupCategory(ctx, &dao.MoveGroupCategoryParams{TargetID: targetRef, CategoryID: categoryRef}); err != nil {
			return err
		}
		if _, err := queries.DeleteCategory(ctx, &dao.DeleteCategoryParams{CategoryID: category.ID, UserID: userId}); err != nil {
			return fmt.Errorf("deleting category %d: %w", category.ID, err)
		}
		return nil
	})
	return result, err
}
