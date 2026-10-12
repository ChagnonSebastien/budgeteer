package grpc

import (
	"context"
	"errors"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type userRepository interface {
	IsAdmin(ctx context.Context, userId uuid.UUID) (bool, error)
	GetAllUsers(ctx context.Context) ([]model.UserSummary, error)
	GetUserDeletionImpact(ctx context.Context, id uuid.UUID) (model.UserDeletionImpact, error)
	DeleteUser(ctx context.Context, id uuid.UUID) error
}

type UserHandler struct {
	dto.UnimplementedUserServiceServer
	userService userRepository
}

func (s *UserHandler) ensureAdmin(ctx context.Context) error {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return fmt.Errorf("getting user from context")
	}

	isAdmin, err := s.userService.IsAdmin(ctx, user.ID)
	if err != nil {
		return fmt.Errorf("checking admin rights: %w", err)
	}
	if !user.HasAdminRights(isAdmin) {
		return status.Error(codes.PermissionDenied, "admin rights required")
	}
	return nil
}

func (s *UserHandler) GetAllUsers(ctx context.Context, _ *dto.GetAllUsersRequest) (*dto.GetAllUsersResponse, error) {
	if err := s.ensureAdmin(ctx); err != nil {
		return nil, err
	}

	users, err := s.userService.GetAllUsers(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting users: %w", err)
	}

	response := &dto.GetAllUsersResponse{Users: make([]*dto.User, len(users))}
	for i, u := range users {
		var lastSeenAt *string
		if u.LastSeenAt != nil {
			formatted := u.LastSeenAt.Format(time.RFC3339)
			lastSeenAt = &formatted
		}
		response.Users[i] = &dto.User{
			Id:          u.ID.String(),
			Email:       u.Email,
			Name:        u.Name,
			LoginMethod: newLoginMethodDto(u.LoginMethod),
			IsAdmin:     u.IsAdmin,
			LastSeenAt:  lastSeenAt,
		}
	}
	return response, nil
}

func (s *UserHandler) GetUserDeletionImpact(ctx context.Context, req *dto.GetUserDeletionImpactRequest) (*dto.GetUserDeletionImpactResponse, error) {
	if err := s.ensureAdmin(ctx); err != nil {
		return nil, err
	}
	id, err := uuid.Parse(req.Id)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid user id")
	}

	impact, err := s.userService.GetUserDeletionImpact(ctx, id)
	if err != nil {
		return nil, userDeletionError(err)
	}
	return &dto.GetUserDeletionImpactResponse{
		Accounts:                  uint32(impact.Accounts),
		Transactions:              uint32(impact.Transactions),
		Categories:                uint32(impact.Categories),
		Currencies:                uint32(impact.Currencies),
		MovedToUnconfirmed:        uint32(impact.MovedToUnconfirmed),
		DeletedTransactionGroups:  impact.DeletedTransactionGroups,
		BlockingTransactionGroups: impact.BlockingTransactionGroups,
	}, nil
}

func (s *UserHandler) DeleteUser(ctx context.Context, req *dto.DeleteUserRequest) (*dto.DeleteUserResponse, error) {
	if err := s.ensureAdmin(ctx); err != nil {
		return nil, err
	}
	id, err := uuid.Parse(req.Id)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid user id")
	}

	if err := s.userService.DeleteUser(ctx, id); err != nil {
		return nil, userDeletionError(err)
	}
	return &dto.DeleteUserResponse{}, nil
}

func userDeletionError(err error) error {
	switch {
	case errors.Is(err, model.ErrUserNotFound):
		return status.Error(codes.NotFound, "user not found")
	case errors.Is(err, model.ErrUserIsAdmin):
		return status.Error(codes.FailedPrecondition, "admins cannot be deleted")
	case errors.Is(err, model.ErrUserCreatedSharedGroups):
		return status.Error(codes.FailedPrecondition, "this user created shared groups that other people are in")
	default:
		return fmt.Errorf("deleting user: %w", err)
	}
}

func newLoginMethodDto(method model.LoginMethod) dto.LoginMethod {
	if method == model.LoginMethodOidc {
		return dto.LoginMethod_LOGIN_METHOD_OIDC
	}
	return dto.LoginMethod_LOGIN_METHOD_NONE
}
