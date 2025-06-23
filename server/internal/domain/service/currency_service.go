package service

import (
	"context"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
)

type currencyRepository interface {
	GetAllCurrencies(ctx context.Context, userId string) ([]model.Currency, error)
	CreateCurrency(
		ctx context.Context,
		userId string,
		name, symbol string,
		decimalPoints int,
		initialExchangeRate *repository.InitialExchangeRate,
	) (
		int,
		int,
		error,
	)
	UpdateCurrency(ctx context.Context, userId string, id int, fields repository.UpdateCurrencyFields) error
	SetDefaultCurrency(ctx context.Context, userId string, currencyId int) error
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

type InitialExchangeRate struct {
	Other int
	Rate  float64
	Date  time.Time
}

func (a *CurrencyService) CreateCurrency(
	ctx context.Context,
	userId string,
	name, symbol string,
	decimalPoints int,
	initialExchangeRate *InitialExchangeRate,
) (int, int, error) {
	var t *repository.InitialExchangeRate
	if initialExchangeRate != nil {
		t = &repository.InitialExchangeRate{
			Other: initialExchangeRate.Other,
			Rate:  initialExchangeRate.Rate,
			Date:  initialExchangeRate.Date,
		}
	}

	return a.currencyRepository.CreateCurrency(
		ctx,
		userId,
		name,
		symbol,
		decimalPoints,
		t,
	)
}

func (a *CurrencyService) UpdateCurrency(
	ctx context.Context,
	userId string,
	id int,
	fields repository.UpdateCurrencyFields,
) error {
	return a.currencyRepository.UpdateCurrency(ctx, userId, id, fields)
}

func (a *CurrencyService) SetDefaultCurrency(ctx context.Context, userid string, currencyId int) error {
	return a.currencyRepository.SetDefaultCurrency(ctx, userid, currencyId)
}
