package grpc

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
)

type CategoryHandler struct {
	dto.UnimplementedCategoryServiceServer

	categoryService *service.CategoryService
}

func (s *CategoryHandler) CreateCategory(ctx context.Context, req *dto.CreateCategoryRequest) (*dto.CreateCategoryResponse, error) {
	newId, err := s.categoryService.CreateCategory(ctx, req.Name, req.IconName, int(req.ParentId))
	if err != nil {
		return nil, err
	}

	return &dto.CreateCategoryResponse{
		Id: uint32(newId),
	}, nil
}

func (s *CategoryHandler) GetAllCategories(ctx context.Context, req *dto.GetAllCategoriesRequest) (*dto.GetAllCategoriesResponse, error) {
	categories, err := s.categoryService.GetAllCategories(ctx)
	if err != nil {
		return nil, err
	}

	categoriesDto := make([]*dto.Category, len(categories))
	for _, category := range categories {
		categoriesDto = append(categoriesDto, &dto.Category{
			Id:       uint32(category.ID),
			Name:     category.Name,
			IconName: category.IconName,
			ParentId: uint32(category.ParentId),
		})
	}

	return &dto.GetAllCategoriesResponse{
		Categories: categoriesDto,
	}, nil
}
