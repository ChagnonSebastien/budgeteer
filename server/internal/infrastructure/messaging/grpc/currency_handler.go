package grpc

import (
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

type CurrencyHandler struct {
	dto.UnimplementedCurrencyServiceServer

	currencyService *service.CurrencyService
}

func (s *CurrencyHandler) CreateCurrency(
	ctx context.Context,
	req *dto.CreateCurrencyRequest,
) (*dto.CreateCurrencyResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	newId, err := s.currencyService.CreateCurrency(ctx, claims.Sub, req.Name, req.Symbol, int(req.DecimalPoints))
	if err != nil {
		return nil, err
	}

	return &dto.CreateCurrencyResponse{
		Id: uint32(newId),
	}, nil
}

func (s *CurrencyHandler) UpdateCurrency(
	ctx context.Context,
	req *dto.UpdateCurrencyRequest,
) (*dto.UpdateCurrencyResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	err := s.currencyService.UpdateCurrency(
		ctx,
		claims.Sub,
		int(req.Currency.Id),
		req.Currency.Name,
		req.Currency.Symbol,
		int(req.Currency.DecimalPoints),
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
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	currencies, err := s.currencyService.GetAllCurrencies(ctx, claims.Sub)
	if err != nil {
		return nil, err
	}

	currenciesDto := make([]*dto.Currency, len(currencies))
	for i, currency := range currencies {
		currenciesDto[i] = &dto.Currency{
			Id:            uint32(currency.ID),
			Name:          currency.Name,
			Symbol:        currency.Symbol,
			DecimalPoints: uint32(currency.DecimalPoints),
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
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	err := s.currencyService.SetDefaultCurrency(ctx, claims.Sub, int(req.CurrencyId))
	if err != nil {
		return nil, err
	}

	return &dto.SetDefaultCurrencyResponse{}, nil
}
