package autoupdate

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/logging"
)

type currencyRepository interface {
	GetAllWithAutoUpdate(ctx context.Context, pageNumber, pageSize int) ([]model.Currency, bool, error)
	UpdateExchangeRateRelativeToDefaultCurrency(ctx context.Context, currencyID model.CurrencyID, date time.Time, newRate float64) error
	RecordRateFetchFailure(ctx context.Context, currencyID model.CurrencyID, message string) error
	ClearRateFetchFailure(ctx context.Context, currencyID model.CurrencyID) error
}

type fetchFailure struct {
	userMessage string // shown to the currency owner: no server internals
	cause       error
}

const maxFailureMessageLength = 500

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

				if failure := r.updateCurrency(ctx, currency); failure != nil {
					logger.Error("auto updating exchange rate for currency", "error", failure.cause)

					message := []rune(failure.userMessage)
					if len(message) > maxFailureMessageLength {
						message = message[:maxFailureMessageLength]
					}
					if err := r.currencyRepository.RecordRateFetchFailure(r.ctx, currency.ID, string(message)); err != nil {
						logger.Error("recording exchange rate fetch failure", "error", err)
					}
					continue
				}

				if err := r.currencyRepository.ClearRateFetchFailure(r.ctx, currency.ID); err != nil {
					logger.Error("clearing exchange rate fetch failure", "error", err)
				}

				logger.Info("auto updated exchange rate for currency")
				time.Sleep(5 * time.Second)
			}

			if !hasMore {
				break
			}
		}

		logger.Info("Finished exchange rate autoupdates")
		return nil
	}
}

func (r *Runner) updateCurrency(ctx context.Context, currency model.Currency) *fetchFailure {
	result, err := r.runner(ctx, currency.RateAutoUpdateSettings.Script)
	if err != nil {
		return &fetchFailure{userMessage: fmt.Sprintf("The script failed: %s", err), cause: err}
	}

	newRate, err := strconv.ParseFloat(strings.ReplaceAll(result, ",", "."), 64)
	if err != nil || math.IsNaN(newRate) || math.IsInf(newRate, 0) || newRate <= 0 {
		return &fetchFailure{
			userMessage: fmt.Sprintf("The script returned %q, which is not a positive number", result),
			cause:       fmt.Errorf("parsing rate %q: %v", result, err),
		}
	}

	yesterday := time.Now().Add(-1 * 24 * time.Hour)
	if err := r.currencyRepository.UpdateExchangeRateRelativeToDefaultCurrency(r.ctx, currency.ID, yesterday, newRate); err != nil {
		return &fetchFailure{userMessage: "The rate was fetched but could not be saved", cause: err}
	}

	return nil
}
