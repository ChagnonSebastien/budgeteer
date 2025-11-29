package model

import (
	"encoding/json"
	"errors"
)

type Optional[T any] struct {
	value T
	ok    bool
}

// Some creates an Optional containing a value
func Some[T any](v T) Optional[T] {
	return Optional[T]{value: v, ok: true}
}

// None creates an Optional with no value
func None[T any]() Optional[T] {
	var zero T
	return Optional[T]{value: zero, ok: false}
}

// IsSome returns true if the Optional contains a value
func (o Optional[T]) IsSome() bool {
	return o.ok
}

// IsNone returns true if the Optional contains no value
func (o Optional[T]) IsNone() bool {
	return !o.IsSome()
}

// Value returns the inner value and whether it exists
func (o Optional[T]) Value() (T, bool) {
	return o.value, o.ok
}

// ValueOr returns the value or a default
func (o Optional[T]) ValueOr(defaultValue T) T {
	if o.ok {
		return o.value
	}
	return defaultValue
}

// MarshalJSON marshals the value if present, otherwise `null`
func (o Optional[T]) MarshalJSON() ([]byte, error) {
	if !o.ok {
		return []byte("null"), nil
	}
	return json.Marshal(o.value)
}

// UnmarshalJSON treats `null` as empty
func (o *Optional[T]) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		o.ok = false
		var zero T
		o.value = zero
		return nil
	}

	var tmp T
	if err := json.Unmarshal(data, &tmp); err != nil {
		return err
	}

	o.value = tmp
	o.ok = true
	return nil
}

// GetOrPanic returns the value or panics if empty
func (o Optional[T]) GetOrPanic() T {
	if !o.ok {
		panic(errors.New("optional has no value"))
	}
	return o.value
}
