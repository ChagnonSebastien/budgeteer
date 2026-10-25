package ratelimit

import (
	"testing"
	"time"
)

func TestRateLimiterForgetsIdleKeys(t *testing.T) {
	rl := New(1, time.Millisecond)
	rl.Allow("a")
	time.Sleep(5 * time.Millisecond)
	if !rl.Allow("b") {
		t.Fatal("expected a fresh key to be allowed")
	}
	if _, ok := rl.hits["a"]; ok {
		t.Fatal("expected the idle key to be pruned")
	}
}
