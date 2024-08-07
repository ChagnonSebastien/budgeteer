package service

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
)

type categoryRepository interface {
	GetAllCategories(ctx context.Context) ([]model.Category, error)
	CreateCategory(ctx context.Context, name, iconName string, parentId int) (int, error)
}

type CategoryService struct {
	categoryRepository categoryRepository
}

func NewCategoryService(categoryRepository categoryRepository) *CategoryService {
	return &CategoryService{categoryRepository}
}

func (a *CategoryService) GetAllCategories(ctx context.Context) ([]model.Category, error) {
	return a.categoryRepository.GetAllCategories(ctx)
}

func (a *CategoryService) CreateCategory(ctx context.Context, name, iconName string, parentId int) (int, error) {
	return a.categoryRepository.CreateCategory(ctx, name, iconName, parentId)
}
