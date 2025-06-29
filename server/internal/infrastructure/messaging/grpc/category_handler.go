package grpc

import (
	"chagnon.dev/budget-server/internal/domain/model"
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

type categoryRepository interface {
	GetAllCategories(ctx context.Context, userId string) ([]model.Category, error)
	CreateCategory(
		ctx context.Context,
		userId string,
		name, iconName, iconColor, iconBackground string,
		parentId int,
		fixedCosts bool,
		ordering float64,
	) (model.CategoryID, error)
	UpdateCategory(
		ctx context.Context,
		userId string,
		id model.CategoryID,
		fields repository.UpdateCategoryFields,
	) error
}

type CategoryHandler struct {
	dto.UnimplementedCategoryServiceServer

	categoryService categoryRepository
}

func (s *CategoryHandler) CreateCategory(
	ctx context.Context,
	req *dto.CreateCategoryRequest,
) (*dto.CreateCategoryResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	newId, err := s.categoryService.CreateCategory(
		ctx,
		claims.Sub,
		req.Name,
		req.IconName,
		req.IconColor,
		req.IconBackground,
		int(req.ParentId),
		req.FixedCosts,
		req.Ordering,
	)
	if err != nil {
		return nil, err
	}

	return &dto.CreateCategoryResponse{
		Id: uint32(newId),
	}, nil
}

func (s *CategoryHandler) UpdateCategory(
	ctx context.Context,
	req *dto.UpdateCategoryRequest,
) (*dto.UpdateCategoryResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	var parentId *int
	if req.Fields.UpdateParentId {
		if req.Fields.ParentId != nil {
			id := int(*req.Fields.ParentId)
			parentId = &id
		} else {
			id := 0
			parentId = &id
		}
	}

	err := s.categoryService.UpdateCategory(
		ctx,
		claims.Sub,
		model.CategoryID(req.Id),
		repository.UpdateCategoryFields{
			Name:           req.Fields.Name,
			IconName:       req.Fields.IconName,
			IconColor:      req.Fields.IconColor,
			IconBackground: req.Fields.IconBackground,
			ParentId:       parentId,
			FixedCosts:     req.Fields.FixedCosts,
			Ordering:       req.Fields.Ordering,
		},
	)
	if err != nil {
		return nil, err
	}

	return &dto.UpdateCategoryResponse{}, nil
}

func (s *CategoryHandler) GetAllCategories(
	ctx context.Context,
	_ *dto.GetAllCategoriesRequest,
) (*dto.GetAllCategoriesResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	categories, err := s.categoryService.GetAllCategories(ctx, claims.Sub)
	if err != nil {
		return nil, err
	}

	categoriesDto := make([]*dto.Category, len(categories))
	for i, category := range categories {
		categoriesDto[i] = &dto.Category{
			Id:             uint32(category.ID),
			Name:           category.Name,
			ParentId:       uint32(category.ParentId),
			IconName:       category.IconName,
			IconColor:      category.IconColor,
			IconBackground: category.IconBackground,
			FixedCosts:     category.FixedCost,
			Ordering:       category.Ordering,
		}
	}

	return &dto.GetAllCategoriesResponse{
		Categories: categoriesDto,
	}, nil
}
