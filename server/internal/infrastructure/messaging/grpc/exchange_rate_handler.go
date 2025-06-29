package grpc

import (
	"chagnon.dev/budget-server/internal/domain/model"
	"context"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

type scriptRunner func(context.Context, string) (string, error)

type exchangeRateRepository interface {
	GetAllExchangeRate(ctx context.Context, userId string) ([]model.ExchangeRate, error)
	CreateExchangeRate(
		ctx context.Context, userId string,
		currencyA, currencyB model.CurrencyID, Date time.Time, Rate float64,
	) error
	UpsertExchangeRate(
		ctx context.Context, userId string,
		currencyA, currencyB model.CurrencyID, Date time.Time, Rate float64,
	) error
}

type ExchangeRateHandler struct {
	dto.UnimplementedExchangeRateServiceServer

	exchangeRateService exchangeRateRepository
	javascriptRunner    scriptRunner
}

func (s *ExchangeRateHandler) CreateExchangeRate(ctx context.Context, req *dto.CreateExchangeRateRequest) (*dto.CreateExchangeRateResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	date, err := time.Parse(layout, req.Date)
	if err != nil {
		return nil, fmt.Errorf("parsing exchange rate date: %s", err)
	}

	err = s.exchangeRateService.CreateExchangeRate(ctx, claims.Sub, model.CurrencyID(req.CurrencyA), model.CurrencyID(req.CurrencyB), date, req.Rate)
	if err != nil {
		return nil, fmt.Errorf("creating exchange rate: %s", err)
	}

	return &dto.CreateExchangeRateResponse{}, err
}

func (s *ExchangeRateHandler) UpdateExchangeRate(ctx context.Context, req *dto.UpdateExchangeRateRequest) (*dto.UpdateExchangeRateResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	date, err := time.Parse(layout, req.Date)
	if err != nil {
		return nil, fmt.Errorf("parsing exchange rate date: %s", err)
	}

	err = s.exchangeRateService.UpsertExchangeRate(ctx, claims.Sub, model.CurrencyID(req.CurrencyA), model.CurrencyID(req.CurrencyB), date, req.Fields.Rate)
	if err != nil {
		return nil, fmt.Errorf("upserting exchange rate: %s", err)
	}

	return &dto.UpdateExchangeRateResponse{}, err
}

func (s *ExchangeRateHandler) GetAllExchangeRate(ctx context.Context, _ *dto.GetAllExchangeRateRequest) (*dto.GetAllExchangeRateResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	exchangeRates, err := s.exchangeRateService.GetAllExchangeRate(ctx, claims.Sub)
	if err != nil {
		return nil, fmt.Errorf("getting exchange rates: %s", err)
	}

	exchangeRatesDto := make([]*dto.ExchangeRate, 0, len(exchangeRates))
	for _, exchangeRate := range exchangeRates {
		exchangeRatesDto = append(
			exchangeRatesDto, &dto.ExchangeRate{
				CurrencyA: uint32(exchangeRate.CurrencyA),
				CurrencyB: uint32(exchangeRate.CurrencyB),
				Rate:      exchangeRate.Rate,
				Date:      exchangeRate.Date.Format(layout),
			},
		)
	}

	return &dto.GetAllExchangeRateResponse{
		Rates: exchangeRatesDto,
	}, nil
}

func (s *ExchangeRateHandler) TestGetCurrencyRate(ctx context.Context, req *dto.TestGetCurrencyRateRequest) (*dto.TestGetCurrencyRateResponse, error) {
	returnedValue, err := s.javascriptRunner(ctx, req.Script)
	if err != nil {
		returnedValue = fmt.Sprintf("Error running script: %s", err)
	}

	return &dto.TestGetCurrencyRateResponse{Response: returnedValue}, nil
}
