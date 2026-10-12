package grpc

import (
	"context"
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
}

type UserHandler struct {
	dto.UnimplementedUserServiceServer
	userService userRepository
}

func (s *UserHandler) GetAllUsers(ctx context.Context, _ *dto.GetAllUsersRequest) (*dto.GetAllUsersResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	isAdmin, err := s.userService.IsAdmin(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("checking admin rights: %w", err)
	}
	if !user.HasAdminRights(isAdmin) {
		return nil, status.Error(codes.PermissionDenied, "admin rights required")
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

func newLoginMethodDto(method model.LoginMethod) dto.LoginMethod {
	if method == model.LoginMethodOidc {
		return dto.LoginMethod_LOGIN_METHOD_OIDC
	}
	return dto.LoginMethod_LOGIN_METHOD_NONE
}
