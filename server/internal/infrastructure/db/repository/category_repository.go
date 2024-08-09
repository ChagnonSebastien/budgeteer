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
			ID:       int(categoryDao.ID),
			Name:     categoryDao.Name,
			ParentId: parentId,
			IconName: categoryDao.IconName,
		}
	}

	return categories, nil
}

func (r *Repository) CreateCategory(ctx context.Context, name, iconName string, parentId int) (int, error) {
	id, err := r.queries.CreateCategory(ctx, dao.CreateCategoryParams{
		Name:     name,
		IconName: iconName,
		Parent: sql.NullInt32{
			Int32: int32(parentId),
			Valid: parentId != 0,
		},
	})
	if err != nil {
		return 0, err
	}

	return int(id), nil
}
