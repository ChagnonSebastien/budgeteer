package grpc

import (
	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"github.com/google/uuid"

	"context"
	"fmt"
)

type currencyRepository interface {
	GetAllCurrencies(ctx context.Context, userId uuid.UUID) ([]model.Currency, error)
	CreateCurrency(
		ctx context.Context,
		userId uuid.UUID,
		name, symbol, risk, cType string,
		decimalPoints int,
		rateAutoUpdateScript string,
		rateAutoUpdateEnabled bool,
	) (
		model.CurrencyID,
		error,
	)
	UpdateCurrency(ctx context.Context, userId uuid.UUID, id model.CurrencyID, fields repository.UpdateCurrencyFields) error
	SetDefaultCurrency(ctx context.Context, userId uuid.UUID, currencyId model.CurrencyID) error
}

type CurrencyHandler struct {
	dto.UnimplementedCurrencyServiceServer

	currencyService currencyRepository
}

func (s *CurrencyHandler) CreateCurrency(
	ctx context.Context,
	req *dto.CreateCurrencyRequest,
) (*dto.CreateCurrencyResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	newCurrencyId, err := s.currencyService.CreateCurrency(
		ctx, user.ID, req.Name, req.Symbol, req.Risk, req.Type, int(req.DecimalPoints),
		req.AutoUpdateSettingsScript, req.AutoUpdateSettingsEnabled,
	)
	if err != nil {
		return nil, err
	}

	return &dto.CreateCurrencyResponse{
		CurrencyId: uint32(newCurrencyId),
	}, nil
}

func (s *CurrencyHandler) UpdateCurrency(
	ctx context.Context,
	req *dto.UpdateCurrencyRequest,
) (*dto.UpdateCurrencyResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	var decimalPoints *int
	if req.Fields.DecimalPoints != nil {
		id := int(*req.Fields.DecimalPoints)
		decimalPoints = &id
	}

	err := s.currencyService.UpdateCurrency(
		ctx,
		user.ID,
		model.CurrencyID(req.Id),
		repository.UpdateCurrencyFields{
			Name:                  req.Fields.Name,
			Symbol:                req.Fields.Symbol,
			Risk:                  req.Fields.Risk,
			Type:                  req.Fields.Type,
			DecimalPoints:         decimalPoints,
			RateAutoUpdateScript:  req.Fields.AutoUpdateSettingsScript,
			RateAutoUpdateEnabled: req.Fields.AutoUpdateSettingsEnabled,
		},
	)
	if err != nil {
		return nil, err
	}

	return &dto.UpdateCurrencyResponse{}, nil
}

func (s *CurrencyHandler) GetAllCurrencies(
	ctx context.Context,
	_ *dto.GetAllCurrenciesRequest,
) (*dto.GetAllCurrenciesResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	currencies, err := s.currencyService.GetAllCurrencies(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	currenciesDto := make([]*dto.Currency, len(currencies))
	for i, currency := range currencies {

		currenciesDto[i] = &dto.Currency{
			Id:                        uint32(currency.ID),
			Name:                      currency.Name,
			Symbol:                    currency.Symbol,
			Risk:                      currency.Risk,
			Type:                      currency.Type,
			DecimalPoints:             uint32(currency.DecimalPoints),
			AutoUpdateSettingsScript:  currency.RateAutoUpdateSettings.Script,
			AutoUpdateSettingsEnabled: currency.RateAutoUpdateSettings.Enabled,
		}
	}

	return &dto.GetAllCurrenciesResponse{
		Currencies: currenciesDto,
	}, nil
}

func (s *CurrencyHandler) SetDefaultCurrency(
	ctx context.Context,
	req *dto.SetDefaultCurrencyRequest,
) (*dto.SetDefaultCurrencyResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	err := s.currencyService.SetDefaultCurrency(ctx, user.ID, model.CurrencyID(req.CurrencyId))
	if err != nil {
		return nil, err
	}

	return &dto.SetDefaultCurrencyResponse{}, nil
}
