package grpc

import (
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
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

	var initialExchangeRate *service.InitialExchangeRate
	if req.InitialExchangeRate != nil {
		initialExchangeRate = &service.InitialExchangeRate{
			Other: int((*req.InitialExchangeRate).Other),
			Rate:  (*req.InitialExchangeRate).Rate,
			Date:  (*req.InitialExchangeRate).Date,
		}
	}

	newCurrencyId, newExchangeRateId, err := s.currencyService.CreateCurrency(
		ctx, claims.Sub, req.Name, req.Symbol, int(req.DecimalPoints),
		initialExchangeRate,
	)
	if err != nil {
		return nil, err
	}

	var newExchangeRateIdPointer *uint32
	if newExchangeRateId != 0 {
		convertedExchangeRateId := uint32(newExchangeRateId)
		newExchangeRateIdPointer = &convertedExchangeRateId
	}

	return &dto.CreateCurrencyResponse{
		CurrencyId:     uint32(newCurrencyId),
		ExchangeRateId: newExchangeRateIdPointer,
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

	var decimalPoints *int
	if req.Fields.DecimalPoints != nil {
		id := int(*req.Fields.DecimalPoints)
		decimalPoints = &id
	}

	err := s.currencyService.UpdateCurrency(
		ctx,
		claims.Sub,
		int(req.Id),
		repository.UpdateCurrencyFields{
			Name:          req.Fields.Name,
			Symbol:        req.Fields.Symbol,
			DecimalPoints: decimalPoints,
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
		exchangeRatesDtos := make(map[uint32]*dto.RatesList)
		for otherCurrencyId, exchangeRates := range currency.ExchangeRates {
			exchangeRatesDto := make([]*dto.ExchangeRate, 0, len(exchangeRates))
			for _, exchangeRate := range exchangeRates {
				exchangeRatesDto = append(
					exchangeRatesDto, &dto.ExchangeRate{
						Id:   uint32(exchangeRate.ID),
						Rate: exchangeRate.Rate,
						Date: exchangeRate.Date,
					},
				)
			}
			exchangeRatesDtos[uint32(otherCurrencyId)] = &dto.RatesList{Rates: exchangeRatesDto}
		}

		currenciesDto[i] = &dto.Currency{
			Id:            uint32(currency.ID),
			Name:          currency.Name,
			Symbol:        currency.Symbol,
			DecimalPoints: uint32(currency.DecimalPoints),
			ExchangeRates: exchangeRatesDtos,
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
