package grpc

import (
	"context"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

type scriptRunner func(context.Context, string) (string, error)

type CurrencyHandler struct {
	dto.UnimplementedCurrencyServiceServer

	currencyService  *service.CurrencyService
	javascriptRunner scriptRunner
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
		date, err := time.Parse(layout, (*req.InitialExchangeRate).Date)
		if err != nil {
			return nil, fmt.Errorf("parsing initial exchange rate date: %s", err)
		}

		initialExchangeRate = &service.InitialExchangeRate{
			Other: int((*req.InitialExchangeRate).Other),
			Rate:  (*req.InitialExchangeRate).Rate,
			Date:  date,
		}
	}

	newCurrencyId, newExchangeRateId, err := s.currencyService.CreateCurrency(
		ctx, claims.Sub, req.Name, req.Symbol, int(req.DecimalPoints),
		initialExchangeRate, req.RateAutoUpdateSettings.Script, req.RateAutoUpdateSettings.Enabled,
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

	var rateAutoUpdateScript *string
	var rateAutoUpdateEnabled *bool
	if req.Fields.AutoUpdateSettings != nil {
		rateAutoUpdateScript = &req.Fields.AutoUpdateSettings.Script
		rateAutoUpdateEnabled = &req.Fields.AutoUpdateSettings.Enabled
	}

	err := s.currencyService.UpdateCurrency(
		ctx,
		claims.Sub,
		int(req.Id),
		repository.UpdateCurrencyFields{
			Name:                  req.Fields.Name,
			Symbol:                req.Fields.Symbol,
			DecimalPoints:         decimalPoints,
			RateAutoUpdateScript:  rateAutoUpdateScript,
			RateAutoUpdateEnabled: rateAutoUpdateEnabled,
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
		exchangeRatesDTOs := make(map[uint32]*dto.RatesList)
		for otherCurrencyId, exchangeRates := range currency.ExchangeRates {
			exchangeRatesDto := make([]*dto.ExchangeRate, 0, len(exchangeRates))
			for _, exchangeRate := range exchangeRates {
				exchangeRatesDto = append(
					exchangeRatesDto, &dto.ExchangeRate{
						Id:   uint32(exchangeRate.ID),
						Rate: exchangeRate.Rate,
						Date: exchangeRate.Date.Format(layout),
					},
				)
			}
			exchangeRatesDTOs[uint32(otherCurrencyId)] = &dto.RatesList{Rates: exchangeRatesDto}
		}

		currenciesDto[i] = &dto.Currency{
			Id:            uint32(currency.ID),
			Name:          currency.Name,
			Symbol:        currency.Symbol,
			DecimalPoints: uint32(currency.DecimalPoints),
			ExchangeRates: exchangeRatesDTOs,
			RateAutoUpdateSettings: &dto.RateAutoUpdateSettings{
				Script:  currency.RateAutoUpdateSettings.Script,
				Enabled: currency.RateAutoUpdateSettings.Enabled,
			},
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

func (s *CurrencyHandler) TestGetCurrencyRate(ctx context.Context, req *dto.TestGetCurrencyRateRequest) (*dto.TestGetCurrencyRateResponse, error) {
	returnedValue, err := s.javascriptRunner(ctx, req.Script)
	if err != nil {
		returnedValue = fmt.Sprintf("Error running script: %s", err)
	}

	return &dto.TestGetCurrencyRateResponse{Response: returnedValue}, nil
}
