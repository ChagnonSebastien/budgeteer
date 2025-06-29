package grpc

import (
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

type accountRepository interface {
	GetAllAccountsWithCurrencyIDs(ctx context.Context, userId string) ([]model.Account, error)
	CreateAccount(
		ctx context.Context,
		userId string,
		name string,
		balances []model.Balance,
		isMine bool,
		accountType, financialInstitution string,
	) (model.AccountID, error)
	UpdateAccount(
		ctx context.Context,
		userId string,
		id model.AccountID,
		fields repository.UpdateAccountFields,
	) error
}

type AccountHandler struct {
	dto.UnimplementedAccountServiceServer

	accountService accountRepository
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

	newId, err := s.accountService.CreateAccount(
		ctx,
		claims.Sub,
		req.Name,
		balances,
		req.IsMine,
		req.Type,
		req.FinancialInstitution,
	)
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

	var initialAmounts *[]model.Balance
	if req.Fields.UpdateBalances {
		balances := make([]model.Balance, 0, len(req.Fields.Balances))
		for _, balance := range req.Fields.Balances {
			balances = append(
				balances, model.Balance{
					CurrencyId: int(balance.CurrencyId),
					Value:      int(balance.Amount),
				},
			)
		}
		initialAmounts = &balances
	}

	err := s.accountService.UpdateAccount(
		ctx,
		claims.Sub,
		model.AccountID(req.Id),
		repository.UpdateAccountFields{
			Name:                 req.Fields.Name,
			InitialsAmounts:      initialAmounts,
			AccountType:          req.Fields.Type,
			FinancialInstitution: req.Fields.FinancialInstitution,
		},
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

	accounts, err := s.accountService.GetAllAccountsWithCurrencyIDs(ctx, claims.Sub)
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
			Id:                   uint32(account.ID),
			Name:                 account.Name,
			Balances:             balances,
			IsMine:               account.IsMine,
			Type:                 account.Type,
			FinancialInstitution: account.FinancialInstitution,
		}
	}

	return &dto.GetAllAccountsResponse{
		Accounts: accountsDto,
	}, nil
}
