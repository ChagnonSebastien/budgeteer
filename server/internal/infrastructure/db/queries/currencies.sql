-- name: CreateCurrency :one
INSERT INTO currencies (name, symbol, user_id, decimal_points, type)
VALUES (sqlc.arg(name), sqlc.arg(symbol), sqlc.arg(user_id), sqlc.arg(decimal_points), sqlc.arg(type))
RETURNING id;

-- name: GetAllCurrencies :many
SELECT id, name, symbol, decimal_points, type
FROM currencies
WHERE user_id = sqlc.arg(user_id);

-- name: UpdateCurrency :exec
UPDATE currencies
SET
    name = COALESCE(sqlc.narg(name), name),
    symbol = COALESCE(sqlc.narg(symbol), symbol),
    decimal_points = COALESCE(sqlc.narg(decimal_points), decimal_points),
    type = COALESCE(sqlc.narg(type), type)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);

-- name: CreateComposition :exec
INSERT INTO compositions (
    currency_id, component_type, component_name, ratio, date
) VALUES (
    sqlc.arg(currency_id), sqlc.arg(component_type), sqlc.arg(component_name),
    sqlc.arg(ratio), sqlc.arg(date)
);

-- name: DeleteCompositions :exec
DELETE FROM compositions c
WHERE c.currency_id = sqlc.arg(currency_id) 
AND c.date = sqlc.arg(date);

-- name: GetLatestCompositions :one
WITH latest_date AS (
    SELECT MAX(date) as max_date
    FROM compositions c
    WHERE c.currency_id = sqlc.arg(currency_id)
),
grouped_compositions AS (
    SELECT 
        component_type,
        jsonb_object_agg(
            component_name,
            json_build_object('ratio', ratio)
        ) as type_compositions
    FROM compositions c
    WHERE c.currency_id = sqlc.arg(currency_id)
    AND date = (SELECT max_date FROM latest_date)
    GROUP BY component_type
)
SELECT 
    (SELECT max_date FROM latest_date) as date,
    jsonb_object_agg(
        component_type,
        type_compositions
    ) as compositions
FROM grouped_compositions;

-- name: GetCompositionHistory :many
WITH grouped_compositions AS (
    SELECT 
        date,
        component_type,
        jsonb_object_agg(
            component_name,
            json_build_object('ratio', ratio)
        ) as type_compositions
    FROM compositions c
    WHERE c.currency_id = sqlc.arg(currency_id)
    GROUP BY date, component_type
)
SELECT 
    date,
    jsonb_object_agg(
        component_type,
        type_compositions
    ) as compositions
FROM grouped_compositions
GROUP BY date
ORDER BY date DESC;

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
