-- name: GetAllExchangeRates :many
SELECT
    er.a, er.b,
    er.date,
    er.rate
FROM
    exchangerates er join currencies c ON er.a = c.id
WHERE
    c.user_id = sqlc.arg(user_id);

-- name: CreateExchangeRate :exec
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
);

-- name: UpsertExchangeRate :exec
INSERT INTO exchangerates (a, b, rate, date)
SELECT
    sqlc.arg(a),
    sqlc.arg(b),
    sqlc.arg(rate),
    sqlc.arg(date)
WHERE EXISTS (
    SELECT 1
    FROM currencies aa
    WHERE aa.id = sqlc.arg(a)
      AND aa.user_id = sqlc.arg(user_id)
)
  AND EXISTS (
    SELECT 1
    FROM currencies ab
    WHERE ab.id = sqlc.arg(b)
      AND ab.user_id = sqlc.arg(user_id)
)
ON CONFLICT (a, b, date)
    DO UPDATE
    SET rate = sqlc.arg(date);


-- name: NewAutoExchangeRateEntry :exec
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
ON CONFLICT (a, b, date)
    DO UPDATE
    SET rate = EXCLUDED.rate;