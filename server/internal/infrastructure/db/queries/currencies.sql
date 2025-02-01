-- name: CreateCurrency :one
INSERT INTO currencies (name, symbol, user_id, decimal_points)
VALUES (sqlc.arg(name), sqlc.arg(symbol), sqlc.arg(user_id), sqlc.arg(decimal_points))
RETURNING id;

-- name: GetAllCurrencies :many
SELECT id, name, symbol, decimal_points
FROM currencies
WHERE user_id = sqlc.arg(user_id);

-- name: UpdateCurrency :exec
UPDATE currencies
SET
    name = COALESCE(sqlc.narg(name), name),
    symbol = COALESCE(sqlc.narg(symbol), symbol),
    decimal_points = COALESCE(sqlc.narg(decimal_points), decimal_points)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);

-- name: GetAllExchangeRatesOf :many
SELECT
    id,
    CAST(
            CASE
        WHEN a = sqlc.arg(currency_id) THEN b
        ELSE a
        END AS INTEGER
    ) AS compared_to,
    CAST(
            CASE
        WHEN a = sqlc.arg(currency_id) THEN rate
        ELSE 1 / rate
        END AS DOUBLE PRECISION
    ) AS adjusted_exchange_rate,
    date
FROM
    exchangerates
WHERE
    a = sqlc.arg(currency_id)
   OR b = sqlc.arg(currency_id);

-- name: CreateExchangeRate :one
INSERT INTO exchangerates (a, b, rate, date)
SELECT sqlc.arg(a), sqlc.arg(b), sqlc.arg(rate), sqlc.arg(date)
WHERE EXISTS (
    SELECT 1
    FROM currencies aa
    WHERE aa.id = sqlc.arg(a)
      AND aa.user_id = sqlc.arg(user_id)
) AND EXISTS (
    SELECT 1
    FROM currencies ab
    WHERE ab.id = sqlc.arg(b)
      AND ab.user_id = sqlc.arg(user_id)
)
RETURNING id;
