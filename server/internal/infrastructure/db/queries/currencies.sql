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
    name = sqlc.arg(name),
    symbol = sqlc.arg(symbol),
    decimal_points = sqlc.arg(decimal_points)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);
