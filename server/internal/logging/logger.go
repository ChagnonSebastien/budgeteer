package logging

import (
	"context"
	"log/slog"
	"os"
)

type loggerKey struct{}

func NewLogger(level slog.Level, addSource bool) *slog.Logger {
	handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		AddSource: addSource,
		Level:     level,
	})
	return slog.New(handler)
}

func WithLogger(ctx context.Context, lg *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerKey{}, lg)
}

func FromContext(ctx context.Context) *slog.Logger {
	if lg, ok := ctx.Value(loggerKey{}).(*slog.Logger); ok {
		return lg
	}

	return slog.Default()
}
