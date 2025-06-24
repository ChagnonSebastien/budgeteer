package autoupdate

import (
	"chagnon.dev/budget-server/internal/domain/model"
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"
)

type CurrencyRepository interface {
	GetAllWithAutoUpdate(ctx context.Context, pageNumber, pageSize int) ([]model.Currency, bool, error)
	UpdateExchangeRate(ctx context.Context, currencyID int, newRate float64, date time.Time) error
}

type JavascriptRunner func(string) (string, error)

type Runner struct {
	ctx                context.Context
	currencyRepository CurrencyRepository
	javascriptRunner   JavascriptRunner
}

func NewRunner(
	ctx context.Context,
	currencyRepository CurrencyRepository,
	javascriptRunner JavascriptRunner,
) *Runner {
	return &Runner{
		ctx:                ctx,
		currencyRepository: currencyRepository,
		javascriptRunner:   javascriptRunner,
	}
}

func (r *Runner) Run() error {
	log.Printf("Starting exchange rate autoupdates\n")
	
	page := 0
	pageSize := 20

	for {
		page += 1
		currencies, hasMore, err := r.currencyRepository.GetAllWithAutoUpdate(r.ctx, page, pageSize)
		if err != nil {
			return fmt.Errorf("fetching currencies with auto update: %s", err)
		}

		for _, currency := range currencies {
			result, javascriptErr := r.javascriptRunner(currency.RateAutoUpdateSettings.Script)
			if javascriptErr != nil {
				log.Printf("Error when fetching exchange rate for currency %d: %s\n", currency.ID, javascriptErr)
				continue
			}

			newRate, conversionErr := strconv.ParseFloat(strings.ReplaceAll(result, ",", "."), 64)
			if conversionErr != nil {
				log.Printf("Error when parsing exchange rate %s for currency %d: %s\n", result, currency.ID, javascriptErr)
				continue
			}

			yesterday := time.Now().Add(-1 * 24 * time.Hour)
			err := r.currencyRepository.UpdateExchangeRate(r.ctx, currency.ID, newRate, yesterday)
			if err != nil {
				log.Printf("Error when saving exchange rate for currency %d: %s\n", currency.ID, javascriptErr)
			}
		}

		if !hasMore {
			break
		}
	}

	log.Printf("Finished exchange rate autoupdates\n")
	return nil
}
