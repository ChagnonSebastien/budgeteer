-- name: CreateCurrency :one
INSERT INTO currencies (name, symbol, user_id, decimal_points, rate_fetch_script, auto_update)
VALUES (sqlc.arg(name), sqlc.arg(symbol), sqlc.arg(user_id), sqlc.arg(decimal_points), sqlc.arg(rate_fetch_script), sqlc.arg(auto_update))
RETURNING id;

-- name: GetAllCurrencies :many
SELECT id, name, symbol, decimal_points, rate_fetch_script, auto_update
FROM currencies
WHERE user_id = sqlc.arg(user_id);

-- name: GetAllWithAutoUpdate :many
SELECT id, name, symbol, decimal_points, rate_fetch_script, auto_update
FROM currencies
WHERE auto_update = true
LIMIT sqlc.arg(page_size) OFFSET sqlc.arg(page_offset);

-- name: UpdateCurrency :exec
UPDATE currencies
SET
    name = COALESCE(sqlc.narg(name), name),
    symbol = COALESCE(sqlc.narg(symbol), symbol),
    decimal_points = COALESCE(sqlc.narg(decimal_points), decimal_points),
    rate_fetch_script = COALESCE(sqlc.narg(rate_fetch_script), rate_fetch_script),
    auto_update = COALESCE(sqlc.narg(auto_update), auto_update)
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

-- name: NewAutoExchangeRateEntry :one
INSERT INTO exchangerates (a, b, rate, date)
SELECT
    c.id,
    u.default_currency,
    CAST(sqlc.arg(rate) AS double precision) * POWER(
            10,
            cd.decimal_points
                - c.decimal_points
         ),
    sqlc.arg(date)
FROM currencies AS c
         JOIN users      AS u  ON c.user_id        = u.id
         JOIN currencies AS cd ON u.default_currency = cd.id
WHERE c.id = sqlc.arg(currency_id)
RETURNING id;