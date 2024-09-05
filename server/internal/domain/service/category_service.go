package service

import (
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
)

type categoryRepository interface {
	GetAllCategories(ctx context.Context, userId string) ([]model.Category, error)
	CreateCategory(
		ctx context.Context,
		userId string,
		name, iconName, iconColor, iconBackground string,
		parentId int,
		fixedCosts bool,
	) (int, error)
	UpdateCategory(
		ctx context.Context,
		userId string,
		id int,
		name, iconName, iconColor, iconBackground string,
		parentId int,
		fixedCosts bool,
	) error
}

type CategoryService struct {
	categoryRepository categoryRepository
}

func NewCategoryService(categoryRepository categoryRepository) *CategoryService {
	return &CategoryService{categoryRepository}
}

func (a *CategoryService) GetAllCategories(ctx context.Context, userId string) ([]model.Category, error) {
	categories, err := a.categoryRepository.GetAllCategories(ctx, userId)
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
			userId,
			rootCategoryName,
			rootIconName,
			rootIconColor,
			rootIconBackground,
			0,
			false,
		)
		if err != nil {
			return nil, err
		}
		categories = append(
			categories, model.Category{
				ID:             rootId,
				Name:           rootCategoryName,
				ParentId:       0,
				IconName:       rootIconName,
				IconColor:      rootIconColor,
				IconBackground: rootIconBackground,
			},
		)
	}

	return categories, nil
}

func (a *CategoryService) CreateCategory(
	ctx context.Context,
	userId string,
	name, iconName, iconColor, iconBackground string,
	parentId int,
	fixedCosts bool,
) (int, error) {
	if parentId == 0 {
		return 0, fmt.Errorf("cannot create root category from request (parentId=0)")
	}

	return a.categoryRepository.CreateCategory(
		ctx,
		userId,
		name,
		iconName,
		iconColor,
		iconBackground,
		parentId,
		fixedCosts,
	)
}

func (a *CategoryService) UpdateCategory(
	ctx context.Context,
	userId string,
	id int,
	name, iconName, iconColor, iconBackground string,
	parentId int,
	fixedCosts bool,
) error {
	return a.categoryRepository.UpdateCategory(
		ctx,
		userId,
		id,
		name,
		iconName,
		iconColor,
		iconBackground,
		parentId,
		fixedCosts,
	)
}
