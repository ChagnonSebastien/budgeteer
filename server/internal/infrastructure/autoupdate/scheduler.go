package autoupdate

import (
	"context"
	"time"

	"github.com/robfig/cron/v3"

	"chagnon.dev/budget-server/internal/logging"
)

type Scheduler struct {
	name     string
	schedule cron.Schedule
	job      func(context.Context) error
}

func NewScheduler(name, expr string, job func(context.Context) error) (*Scheduler, error) {
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
	return &Scheduler{name: name, schedule: schedule, job: job}, nil
}

func (c *Scheduler) Serve(ctx context.Context) error {
	logger := logging.FromContext(ctx).With("job", c.name)

	for {
		next := c.schedule.Next(time.Now())
		timer := time.NewTimer(time.Until(next))

		logger.Info("scheduled next run", "timerDuration", time.Until(next).String())

		select {
		case <-ctx.Done():
			timer.Stop()
			return nil
		case <-timer.C:
			if err := c.run(ctx, c.schedule.Next(next)); err != nil {
				return err
			}
		}
	}
}

func (c *Scheduler) run(ctx context.Context, deadline time.Time) error {
	ctx, cancel := context.WithDeadline(ctx, deadline)
	defer cancel()
	return c.job(ctx)
}
