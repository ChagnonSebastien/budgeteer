package http

import (
	"sync"
	"time"
)

// rateLimiter is a simple in-memory sliding-window limiter keyed by an
// arbitrary string (e.g. a client IP). It is safe for concurrent use.
type rateLimiter struct {
	mu        sync.Mutex
	hits      map[string][]time.Time
	limit     int
	window    time.Duration
	lastSweep time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		hits:      make(map[string][]time.Time),
		limit:     limit,
		window:    window,
		lastSweep: time.Now(),
	}
}

// allow records an attempt for key and reports whether it is within the
// configured limit over the trailing window.
func (rl *rateLimiter) allow(key string) bool {
	now := time.Now()
	cutoff := now.Add(-rl.window)

	rl.mu.Lock()
	defer rl.mu.Unlock()

	if now.Sub(rl.lastSweep) > rl.window {
		rl.sweep(cutoff)
		rl.lastSweep = now
	}

	kept := recentHits(rl.hits[key], cutoff)
	if len(kept) >= rl.limit {
		rl.hits[key] = kept
		return false
	}

	rl.hits[key] = append(kept, now)
	return true
}

func (rl *rateLimiter) sweep(cutoff time.Time) {
	for key, hits := range rl.hits {
		if kept := recentHits(hits, cutoff); len(kept) > 0 {
			rl.hits[key] = kept
		} else {
			delete(rl.hits, key)
		}
	}
}

func recentHits(hits []time.Time, cutoff time.Time) []time.Time {
	kept := hits[:0]
	for _, t := range hits {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	return kept
}
