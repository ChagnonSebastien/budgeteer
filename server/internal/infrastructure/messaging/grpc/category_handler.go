package grpc

import (
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

type CategoryHandler struct {
	dto.UnimplementedCategoryServiceServer

	categoryService *service.CategoryService
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

	err := s.categoryService.UpdateCategory(
		ctx,
		claims.Sub,
		int(req.Category.Id),
		req.Category.Name,
		req.Category.IconName,
		req.Category.IconColor,
		req.Category.IconBackground,
		int(req.Category.ParentId),
		req.Category.FixedCosts,
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
		}
	}

	return &dto.GetAllCategoriesResponse{
		Categories: categoriesDto,
	}, nil
}
