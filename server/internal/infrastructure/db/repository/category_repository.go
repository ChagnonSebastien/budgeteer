package repository

import (
	"context"
	"database/sql"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) GetAllCategories(ctx context.Context, userId string) ([]model.Category, error) {
	categoriesDao, err := r.queries.GetAllCategories(ctx, userId)
	if err != nil {
		return nil, err
	}

	categories := make([]model.Category, len(categoriesDao))
	for i, categoryDao := range categoriesDao {
		var parentId int
		if categoryDao.Parent.Valid {
			parentId = int(categoryDao.Parent.Int32)
		}

		categories[i] = model.Category{
			ID:             int(categoryDao.ID),
			Name:           categoryDao.Name,
			ParentId:       parentId,
			IconName:       categoryDao.IconName,
			IconColor:      categoryDao.IconColor,
			IconBackground: categoryDao.IconBackground,
			FixedCost:      categoryDao.FixedCosts,
		}
	}

	return categories, nil
}

func (r *Repository) CreateCategory(
	ctx context.Context,
	userId string,
	name, iconName, iconColor, iconBackground string,
	parentId int,
	fixedCosts bool,
) (int, error) {
	id, err := r.queries.CreateCategory(
		ctx, dao.CreateCategoryParams{
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
		},
	)
	if err != nil {
		return 0, err
	}

	return int(id), nil
}

func (r *Repository) UpdateCategory(
	ctx context.Context,
	userId string,
	id int,
	name, iconName, iconColor, iconBackground string,
	parentId int,
	fixedCosts bool,
) error {
	return r.queries.UpdateCategory(
		ctx, dao.UpdateCategoryParams{
			UserID: userId,
			ID:     int32(id),
			Name:   name,
			Parent: sql.NullInt32{
				Int32: int32(parentId),
				Valid: parentId != 0,
			},
			IconName:       iconName,
			IconColor:      iconColor,
			IconBackground: iconBackground,
			FixedCosts:     fixedCosts,
		},
	)
}
