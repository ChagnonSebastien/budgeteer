-- name: CreateCurrency :one
INSERT INTO currencies (name, symbol, user_id)
VALUES (sqlc.arg(name), sqlc.arg(symbol), sqlc.arg(user_id))
RETURNING id;

-- name: GetAllCurrencies :many
SELECT id, name, symbol 
FROM currencies
WHERE user_id = sqlc.arg(user_id);

-- name: UpdateCurrency :exec
UPDATE currencies
SET
    name = sqlc.arg(name),
    symbol = sqlc.arg(symbol)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);
