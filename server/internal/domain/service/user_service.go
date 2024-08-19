package service

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
)

type userRepository interface {
	UpsertUser(ctx context.Context, id, username, email string) error
	UserParams(ctx context.Context, id string) (*model.UserParams, error)
}

type UserService struct {
	userRepository userRepository
}

func NewUserService(userRepository userRepository) *UserService {
	return &UserService{userRepository}
}

func (a *UserService) Upsert(ctx context.Context, userId, username, email string) error {
	return a.userRepository.UpsertUser(ctx, userId, username, email)
}

func (a *UserService) UserParams(ctx context.Context, userId string) (*model.UserParams, error) {
	return a.userRepository.UserParams(ctx, userId)
}
