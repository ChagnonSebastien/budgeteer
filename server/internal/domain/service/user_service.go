package service

import (
	"context"
)

type userRepository interface {
	UpsertUser(ctx context.Context, id, username, email string) error
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
