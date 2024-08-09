package grpc

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
)

type CurrencyHandler struct {
	dto.UnimplementedCurrencyServiceServer

	currencyService *service.CurrencyService
}

func (s *CurrencyHandler) CreateCurrency(ctx context.Context, req *dto.CreateCurrencyRequest) (*dto.CreateCurrencyResponse, error) {
	newId, err := s.currencyService.CreateCurrency(ctx, req.Name, req.Symbol)
	if err != nil {
		return nil, err
	}

	return &dto.CreateCurrencyResponse{
		Id: uint32(newId),
	}, nil
}

func (s *CurrencyHandler) GetAllCurrencies(ctx context.Context, _ *dto.GetAllCurrenciesRequest) (*dto.GetAllCurrenciesResponse, error) {
	currencies, err := s.currencyService.GetAllCurrencies(ctx)
	if err != nil {
		return nil, err
	}

	currenciesDto := make([]*dto.Currency, len(currencies))
	for i, currency := range currencies {
		currenciesDto[i] = &dto.Currency{
			Id:     uint32(currency.ID),
			Name:   currency.Name,
			Symbol: currency.Symbol,
		}
	}

	return &dto.GetAllCurrenciesResponse{
		Currencies: currenciesDto,
	}, nil
}
