package grpc

import (
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
)

type AuthHandler struct {
	dto.UnimplementedAuthServiceServer

	UserPassEnabled bool
	OIDCEnabled     bool

	ClientID    string
	ProviderURL string
	RedirectURL string
}

func (s *AuthHandler) GetOIDCConfig(
	_ context.Context,
	_ *dto.GetOIDCConfigRequest,
) (*dto.GetOIDCConfigResponse, error) {
	if !s.OIDCEnabled {
		return nil, fmt.Errorf("OIDC is not enabled on this server")
	}

	return &dto.GetOIDCConfigResponse{
		ClientID:    s.ClientID,
		ProviderURL: s.ProviderURL,
		RedirectURL: s.RedirectURL,
	}, nil
}

func (s *AuthHandler) CheckAuthMethods(
	_ context.Context,
	_ *dto.CheckAuthMethodsRequest,
) (*dto.CheckAuthMethodsResponse, error) {
	return &dto.CheckAuthMethodsResponse{
		Oidc:     s.OIDCEnabled,
		UserPass: s.UserPassEnabled,
	}, nil
}
