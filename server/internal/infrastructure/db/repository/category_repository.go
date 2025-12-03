package repository

import (
	"context"
	"database/sql"

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
