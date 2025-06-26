package autoupdate

import (
	"context"
	"time"

	"github.com/robfig/cron/v3"

	"chagnon.dev/budget-server/internal/logging"
)

type Scheduler struct {
	schedule cron.Schedule
	job      func() error
}

func NewScheduler(expr string, job func() error) (*Scheduler, error) {
	parser := cron.NewParser(
		cron.SecondOptional |
			cron.Minute |
			cron.Hour |
			cron.Dom |
			cron.Month |
			cron.Dow |
			cron.Descriptor,
	)
	schedule, err := parser.Parse(expr)
	if err != nil {
		return nil, err
	}
	return &Scheduler{schedule: schedule, job: job}, nil
}

func (c *Scheduler) Serve(ctx context.Context) error {
	logger := logging.FromContext(ctx)

	for {
		now := time.Now()
		next := c.schedule.Next(now)
		timer := time.NewTimer(time.Until(next))

		logger.Info("scheduled next exchange rate auto update", "timerDuration", time.Until(next).String())

		select {
		case <-ctx.Done():
			timer.Stop()
			return nil
		case <-timer.C:
			if err := c.job(); err != nil {
				return err
			}
		}
	}
}
