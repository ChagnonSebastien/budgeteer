package service

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
)

type currencyRepository interface {
	GetAllCurrencies(ctx context.Context) ([]model.Currency, error)
	CreateCurrency(ctx context.Context, name, symbol string) (int, error)
	UpdateCurrency(ctx context.Context, id int, name, symbol string) error
}

type CurrencyService struct {
	currencyRepository currencyRepository
}

func NewCurrencyService(currencyRepository currencyRepository) *CurrencyService {
	return &CurrencyService{currencyRepository}
}

func (a *CurrencyService) GetAllCurrencies(ctx context.Context) ([]model.Currency, error) {
	return a.currencyRepository.GetAllCurrencies(ctx)
}

func (a *CurrencyService) CreateCurrency(ctx context.Context, name, symbol string) (int, error) {
	return a.currencyRepository.CreateCurrency(ctx, name, symbol)
}

func (a *CurrencyService) UpdateCurrency(ctx context.Context, id int, name, symbol string) error {
	return a.currencyRepository.UpdateCurrency(ctx, id, name, symbol)
}
