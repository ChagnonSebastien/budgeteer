package service

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/model"
)

type currencyRepository interface {
	GetAllCurrencies(ctx context.Context, userId string) ([]model.Currency, error)
	CreateCurrency(ctx context.Context, userId string, name, symbol string, decimalPoints int) (int, error)
	UpdateCurrency(ctx context.Context, userId string, id int, name, symbol string, decimalPoints int) error
}

type CurrencyService struct {
	currencyRepository currencyRepository
}

func NewCurrencyService(currencyRepository currencyRepository) *CurrencyService {
	return &CurrencyService{currencyRepository}
}

func (a *CurrencyService) GetAllCurrencies(ctx context.Context, userId string) ([]model.Currency, error) {
	return a.currencyRepository.GetAllCurrencies(ctx, userId)
}

func (a *CurrencyService) CreateCurrency(
	ctx context.Context,
	userId string,
	name, symbol string,
	decimalPoints int,
) (int, error) {
	return a.currencyRepository.CreateCurrency(ctx, userId, name, symbol, decimalPoints)
}

func (a *CurrencyService) UpdateCurrency(
	ctx context.Context,
	userId string,
	id int,
	name, symbol string,
	decimalPoints int,
) error {
	return a.currencyRepository.UpdateCurrency(ctx, userId, id, name, symbol, decimalPoints)
}
