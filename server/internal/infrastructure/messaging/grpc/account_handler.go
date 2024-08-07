package grpc

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
)

type AccountHandler struct {
	dto.UnimplementedAccountServiceServer

	accountService *service.AccountService
}

func (s *AccountHandler) CreateAccount(ctx context.Context, req *dto.CreateAccountRequest) (*dto.CreateAccountResponse, error) {
	newId, err := s.accountService.CreateAccount(ctx, req.Name, int(req.InitialAmount))
	if err != nil {
		return nil, err
	}

	return &dto.CreateAccountResponse{
		Id: int32(newId),
	}, nil
}

func (s *AccountHandler) GetAllAccounts(ctx context.Context, req *dto.GetAllAccountsRequest) (*dto.GetAllAccountsResponse, error) {
	accounts, err := s.accountService.GetAllAccounts(ctx)
	if err != nil {
		return nil, err
	}

	accountsDto := make([]*dto.Account, len(accounts))
	for _, category := range accounts {
		accountsDto = append(accountsDto, &dto.Account{
			Id:            int32(category.ID),
			Name:          category.Name,
			InitialAmount: int32(category.InitialAmount),
		})
	}

	return &dto.GetAllAccountsResponse{
		Accounts: accountsDto,
	}, nil
}
