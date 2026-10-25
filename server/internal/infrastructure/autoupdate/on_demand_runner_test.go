package autoupdate

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

func blockingRunner(started chan<- struct{}, release <-chan struct{}) scriptRunner {
	return func(ctx context.Context, _ string) (string, error) {
		started <- struct{}{}
		<-release
		return "1", nil
	}
}

func TestOnDemandRunnerAllowsOneRunPerUser(t *testing.T) {
	started, release := make(chan struct{}), make(chan struct{})
	runner := NewOnDemandRunner(blockingRunner(started, release))
	user := uuid.New()

	done := make(chan error)
	go func() {
		_, err := runner.Run(context.Background(), user, "")
		done <- err
	}()
	<-started

	if _, err := runner.Run(context.Background(), user, ""); !errors.Is(err, errUserScriptBusy) {
		t.Fatalf("expected the second run to be refused, got %v", err)
	}

	close(release)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
}

func TestOnDemandRunnerGivesUpWhenEverySlotIsTaken(t *testing.T) {
	started, release := make(chan struct{}), make(chan struct{})
	defer close(release)
	runner := NewOnDemandRunner(blockingRunner(started, release))

	for range onDemandSlots {
		go func() { _, _ = runner.Run(context.Background(), uuid.New(), "") }()
		<-started
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := runner.Run(ctx, uuid.New(), ""); !errors.Is(err, errScriptsBusy) {
		t.Fatalf("expected busy, got %v", err)
	}
}

func TestOnDemandRunnerLimitsRunsPerUser(t *testing.T) {
	runner := NewOnDemandRunner(func(context.Context, string) (string, error) { return "1", nil })
	user := uuid.New()

	for range onDemandUserRuns {
		if _, err := runner.Run(context.Background(), user, ""); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := runner.Run(context.Background(), user, ""); !errors.Is(err, errUserRateLimited) {
		t.Fatalf("expected rate limited, got %v", err)
	}
	if _, err := runner.Run(context.Background(), uuid.New(), ""); err != nil {
		t.Fatalf("another user must not be limited: %v", err)
	}
}
