package repository

import (
	"context"
	"database/sql"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (r *Repository) GetAllCategories(ctx context.Context) ([]model.Category, error) {
	categoriesDao, err := r.queries.GetAllCategories(ctx)
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
		}
	}

	return categories, nil
}

func (r *Repository) CreateCategory(
	ctx context.Context,
	name, iconName, iconColor, iconBackground string,
	parentId int,
) (int, error) {
	id, err := r.queries.CreateCategory(
		ctx, dao.CreateCategoryParams{
			Name: name,
			Parent: sql.NullInt32{
				Int32: int32(parentId),
				Valid: parentId != 0,
			},
			IconName:       iconName,
			IconColor:      iconColor,
			IconBackground: iconBackground,
		},
	)
	if err != nil {
		return 0, err
	}

	return int(id), nil
}

func (r *Repository) UpdateCategory(
	ctx context.Context,
	id int,
	name, iconName, iconColor, iconBackground string,
	parentId int,
) error {
	return r.queries.UpdateCategory(
		ctx, dao.UpdateCategoryParams{
			ID:   int32(id),
			Name: name,
			Parent: sql.NullInt32{
				Int32: int32(parentId),
				Valid: parentId != 0,
			},
			IconName:       iconName,
			IconColor:      iconColor,
			IconBackground: iconBackground,
		},
	)
}
