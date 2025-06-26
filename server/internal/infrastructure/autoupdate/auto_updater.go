package autoupdate

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/logging"
)

type currencyRepository interface {
	GetAllWithAutoUpdate(ctx context.Context, pageNumber, pageSize int) ([]model.Currency, bool, error)
	UpdateExchangeRate(ctx context.Context, currencyID int, newRate float64, date time.Time) error
}

type scriptRunner func(context.Context, string) (string, error)

type Runner struct {
	ctx                context.Context
	currencyRepository currencyRepository
	runner             scriptRunner
}

func NewAutoUpdater(
	ctx context.Context,
	currencyRepository currencyRepository,
	runner scriptRunner,
) *Runner {
	return &Runner{
		ctx:                ctx,
		currencyRepository: currencyRepository,
		runner:             runner,
	}
}

func (r *Runner) NewRunner(ctx context.Context) func() error {
	return func() error {
		logger := logging.FromContext(ctx)
		logger.Info("Starting exchange rate autoupdates")

		page := 0
		pageSize := 20

		for {
			page += 1
			currencies, hasMore, err := r.currencyRepository.GetAllWithAutoUpdate(r.ctx, page, pageSize)
			if err != nil {
				return fmt.Errorf("fetching page %d of currencies for auto update: %s", page, err)
			}

			for _, currency := range currencies {
				logger := logger.With("currencyID", currency.ID)

				result, javascriptErr := r.runner(ctx, currency.RateAutoUpdateSettings.Script)
				if javascriptErr != nil {
					logger.Error("fetching exchange rate for currency", "error", javascriptErr)
					continue
				}

				newRate, conversionErr := strconv.ParseFloat(strings.ReplaceAll(result, ",", "."), 64)
				if conversionErr != nil {
					logger.Error("parsing exchange rate for currency", "error", javascriptErr)
					continue
				}

				yesterday := time.Now().Add(-1 * 24 * time.Hour)
				err := r.currencyRepository.UpdateExchangeRate(r.ctx, currency.ID, newRate, yesterday)
				if err != nil {
					logger.Error("saving exchange rate for currency", "error", javascriptErr)
					continue
				}

				logger.Info("auto updated exchange rate for currency")
			}

			if !hasMore {
				break
			}
		}

		logger.Info("Finished exchange rate autoupdates")
		return nil
	}
}
