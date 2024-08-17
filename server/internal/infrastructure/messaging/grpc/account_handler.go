package grpc

import (
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
)

type AccountHandler struct {
	dto.UnimplementedAccountServiceServer

	accountService *service.AccountService
}

func (s *AccountHandler) CreateAccount(ctx context.Context, req *dto.CreateAccountRequest) (
	*dto.CreateAccountResponse,
	error,
) {
	_, ok := ctx.Value(claimsKey{}).(interface{})
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	newId, err := s.accountService.CreateAccount(ctx, req.Name, int(req.InitialAmount))
	if err != nil {
		return nil, err
	}

	return &dto.CreateAccountResponse{
		Id: uint32(newId),
	}, nil
}

func (s *AccountHandler) UpdateAccount(
	ctx context.Context,
	req *dto.UpdateAccountRequest,
) (*dto.UpdateAccountResponse, error) {
	_, ok := ctx.Value(claimsKey{}).(interface{})
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	err := s.accountService.UpdateAccount(ctx, int(req.Account.Id), req.Account.Name, int(req.Account.InitialAmount))
	if err != nil {
		return nil, err
	}

	return &dto.UpdateAccountResponse{}, nil
}

func (s *AccountHandler) GetAllAccounts(ctx context.Context, _ *dto.GetAllAccountsRequest) (
	*dto.GetAllAccountsResponse,
	error,
) {
	_, ok := ctx.Value(claimsKey{}).(interface{})
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	accounts, err := s.accountService.GetAllAccounts(ctx)
	if err != nil {
		return nil, err
	}

	accountsDto := make([]*dto.Account, len(accounts))
	for i, category := range accounts {
		accountsDto[i] = &dto.Account{
			Id:            uint32(category.ID),
			Name:          category.Name,
			InitialAmount: int32(category.InitialAmount),
		}
	}

	return &dto.GetAllAccountsResponse{
		Accounts: accountsDto,
	}, nil
}
