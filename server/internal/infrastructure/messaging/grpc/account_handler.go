package grpc

import (
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

type AccountHandler struct {
	dto.UnimplementedAccountServiceServer

	accountService *service.AccountService
}

func (s *AccountHandler) CreateAccount(ctx context.Context, req *dto.CreateAccountRequest) (
	*dto.CreateAccountResponse,
	error,
) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	balances := make([]model.Balance, 0, len(req.Balances))
	for _, balance := range req.Balances {
		balances = append(
			balances, model.Balance{
				CurrencyId: int(balance.CurrencyId),
				Value:      int(balance.Amount),
			},
		)
	}

	newId, err := s.accountService.CreateAccount(ctx, claims.Sub, req.Name, balances, req.IsMine)
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
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	balances := make([]model.Balance, len(req.Account.Balances))
	for _, balance := range req.Account.Balances {
		balances = append(
			balances, model.Balance{
				CurrencyId: int(balance.CurrencyId),
				Value:      int(balance.Amount),
			},
		)
	}

	err := s.accountService.UpdateAccount(
		ctx,
		claims.Sub,
		int(req.Account.Id),
		req.Account.Name,
		balances,
		req.Account.IsMine,
	)
	if err != nil {
		return nil, err
	}

	return &dto.UpdateAccountResponse{}, nil
}

func (s *AccountHandler) GetAllAccounts(ctx context.Context, _ *dto.GetAllAccountsRequest) (
	*dto.GetAllAccountsResponse,
	error,
) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	accounts, err := s.accountService.GetAllAccounts(ctx, claims.Sub)
	if err != nil {
		return nil, err
	}

	accountsDto := make([]*dto.Account, len(accounts))
	for i, account := range accounts {
		balances := make([]*dto.CurrencyBalance, 0)
		for _, balance := range account.InitialBalances {
			balances = append(
				balances, &dto.CurrencyBalance{
					CurrencyId: int32(balance.CurrencyId),
					Amount:     int32(balance.Value),
				},
			)
		}

		accountsDto[i] = &dto.Account{
			Id:       uint32(account.ID),
			Name:     account.Name,
			Balances: balances,
			IsMine:   account.IsMine,
		}
	}

	return &dto.GetAllAccountsResponse{
		Accounts: accountsDto,
	}, nil
}
