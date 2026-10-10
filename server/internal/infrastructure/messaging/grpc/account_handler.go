package grpc

import (
	"context"
	"errors"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type accountRepository interface {
	GetAllAccountsWithCurrencyIDs(ctx context.Context, userId uuid.UUID) ([]model.Account, error)
	CreateAccount(
		ctx context.Context,
		userId uuid.UUID,
		name string,
		balances []model.Balance,
		isMine bool,
		accountType, financialInstitution string,
	) (model.AccountID, error)
	UpdateAccount(
		ctx context.Context,
		userId uuid.UUID,
		id model.AccountID,
		fields repository.UpdateAccountFields,
	) error
	DeleteAccount(
		ctx context.Context,
		userId uuid.UUID,
		userEmail string,
		id model.AccountID,
		replacementId *model.AccountID,
		deleteTransactions bool,
	) (repository.DeleteAccountResult, error)
}

type AccountHandler struct {
	dto.UnimplementedAccountServiceServer

	accountService accountRepository
}

func (s *AccountHandler) CreateAccount(ctx context.Context, req *dto.CreateAccountRequest) (
	*dto.CreateAccountResponse,
	error,
) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
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
		user.ID,
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
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
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
		user.ID,
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
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	accounts, err := s.accountService.GetAllAccountsWithCurrencyIDs(ctx, user.ID)
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
			CreatedAt:            account.CreatedAt.Format(time.RFC3339),
			StatementNames:       account.StatementNames,
		}
	}

	return &dto.GetAllAccountsResponse{
		Accounts: accountsDto,
	}, nil
}

func (s *AccountHandler) DeleteAccount(ctx context.Context, req *dto.DeleteAccountRequest) (*dto.DeleteAccountResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	var replacementId *model.AccountID
	if req.ReplacementId != nil {
		id := model.AccountID(*req.ReplacementId)
		replacementId = &id
	}

	result, err := s.accountService.DeleteAccount(
		ctx, user.ID, user.Email, model.AccountID(req.Id), replacementId, req.DeleteTransactions,
	)
	switch {
	case errors.Is(err, repository.ErrAccountNotFound):
		return nil, status.Error(codes.NotFound, err.Error())
	case errors.Is(err, repository.ErrAccountNotDeletable),
		errors.Is(err, repository.ErrReplacementRequired),
		errors.Is(err, repository.ErrReplacementNotAllowed),
		errors.Is(err, repository.ErrReplacementSelfTransfer),
		errors.Is(err, repository.ErrConflictingDeleteOptions):
		return nil, status.Error(codes.FailedPrecondition, err.Error())
	case err != nil:
		return nil, err
	}

	return &dto.DeleteAccountResponse{
		AffectedTransactions: uint32(result.AffectedTransactions),
		MovedToUnconfirmed:   uint32(result.MovedToUnconfirmed),
	}, nil
}
