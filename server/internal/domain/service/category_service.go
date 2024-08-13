package service

import (
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
)

type categoryRepository interface {
	GetAllCategories(ctx context.Context) ([]model.Category, error)
	CreateCategory(ctx context.Context, name, iconName, iconColor, iconBackground string, parentId int) (int, error)
}

type CategoryService struct {
	categoryRepository categoryRepository
}

func NewCategoryService(categoryRepository categoryRepository) *CategoryService {
	return &CategoryService{categoryRepository}
}

func (a *CategoryService) GetAllCategories(ctx context.Context) ([]model.Category, error) {
	categories, err := a.categoryRepository.GetAllCategories(ctx)
	if err != nil {
		return nil, err
	}

	if len(categories) == 0 {
		rootCategoryName := "Any"
		rootIconName := "MdCategory"
		rootIconColor := "rgb(53, 44, 77)"
		rootIconBackground := "rgb(242, 198, 230)"
		rootId, err := a.categoryRepository.CreateCategory(
			ctx,
			rootCategoryName,
			rootIconName,
			rootIconColor,
			rootIconBackground,
			0,
		)
		if err != nil {
			return nil, err
		}
		categories = append(
			categories, model.Category{
				ID:       rootId,
				Name:     rootCategoryName,
				ParentId: 0,
				IconName: rootIconName,
			},
		)
	}

	return categories, nil
}

func (a *CategoryService) CreateCategory(
	ctx context.Context,
	name, iconName, iconColor, iconBackground string,
	parentId int,
) (int, error) {
	if parentId == 0 {
		return 0, fmt.Errorf("cannot create root category from request (parentId=0)")
	}

	return a.categoryRepository.CreateCategory(ctx, name, iconName, iconColor, iconBackground, parentId)
}
