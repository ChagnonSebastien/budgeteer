package http

import (
	"sync"
	"time"
)

// rateLimiter is a simple in-memory sliding-window limiter keyed by an
// arbitrary string (e.g. a client IP). It is safe for concurrent use.
//
// Note: entries are pruned lazily on access, so an IP that hits once and
// never returns lingers until the process restarts. That is acceptable for
// the expected deployment scale; swap in a bounded cache if that changes.
type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		hits:   make(map[string][]time.Time),
		limit:  limit,
		window: window,
	}
}

// allow records an attempt for key and reports whether it is within the
// configured limit over the trailing window.
func (rl *rateLimiter) allow(key string) bool {
	now := time.Now()
	cutoff := now.Add(-rl.window)

	rl.mu.Lock()
	defer rl.mu.Unlock()

	kept := rl.hits[key][:0]
	for _, t := range rl.hits[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}

	if len(kept) >= rl.limit {
		rl.hits[key] = kept
		return false
	}

	rl.hits[key] = append(kept, now)
	return true
}
