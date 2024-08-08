package repository

import (
	"context"
	"database/sql"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
)

func (c *Repository) GetAllCategories(ctx context.Context) ([]model.Category, error) {
	categoriesDao, err := c.queries.GetAllCategories(ctx)
	if err != nil {
		return nil, err
	}

	categories := make([]model.Category, len(categoriesDao))
	for _, categoryDao := range categoriesDao {
		var parentId int
		if categoryDao.Parent.Valid {
			parentId = int(categoryDao.Parent.Int32)
		}

		categories = append(categories, model.Category{
			ID:       int(categoryDao.ID),
			Name:     categoryDao.Name,
			ParentId: parentId,
			IconName: categoryDao.IconName,
		})
	}

	return categories, nil
}

func (c *Repository) CreateCategory(ctx context.Context, name, iconName string, parentId int) (int, error) {
	id, err := c.queries.CreateCategory(ctx, dao.CreateCategoryParams{
		Name: name,
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
