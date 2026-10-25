package autoupdate

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"

	"chagnon.dev/budget-server/internal/ratelimit"
)

// The daily update runs serially outside this pool, so on-demand runs can never starve it.
const (
	onDemandSlots     = 2
	onDemandSlotWait  = 10 * time.Second
	onDemandUserRuns  = 20
	onDemandRunWindow = 15 * time.Minute
)

var (
	errScriptsBusy     = errors.New("too many scripts are running, try again in a minute")
	errUserScriptBusy  = errors.New("one of your scripts is already running, wait for it to finish")
	errUserRateLimited = fmt.Errorf("scripts can be tested at most %d times every %s", onDemandUserRuns, onDemandRunWindow)
)

type OnDemandRunner struct {
	run     scriptRunner
	slots   chan struct{}
	limiter *ratelimit.Limiter

	mu      sync.Mutex
	running map[uuid.UUID]bool
}

func NewOnDemandRunner(run scriptRunner) *OnDemandRunner {
	return &OnDemandRunner{
		run:     run,
		slots:   make(chan struct{}, onDemandSlots),
		limiter: ratelimit.New(onDemandUserRuns, onDemandRunWindow),
		running: make(map[uuid.UUID]bool),
	}
}

func (o *OnDemandRunner) Run(ctx context.Context, userID uuid.UUID, script string) (string, error) {
	if !o.claimUser(userID) {
		return "", errUserScriptBusy
	}
	defer o.releaseUser(userID)

	if !o.limiter.Allow(userID.String()) {
		return "", errUserRateLimited
	}

	wait := time.NewTimer(onDemandSlotWait)
	defer wait.Stop()
	select {
	case o.slots <- struct{}{}:
		defer func() { <-o.slots }()
	case <-wait.C:
		return "", errScriptsBusy
	case <-ctx.Done():
		return "", errScriptsBusy
	}

	return o.run(ctx, script)
}

func (o *OnDemandRunner) claimUser(userID uuid.UUID) bool {
	o.mu.Lock()
	defer o.mu.Unlock()
	if o.running[userID] {
		return false
	}
	o.running[userID] = true
	return true
}

func (o *OnDemandRunner) releaseUser(userID uuid.UUID) {
	o.mu.Lock()
	defer o.mu.Unlock()
	delete(o.running, userID)
}
