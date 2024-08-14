-- name: CreateCurrency :one
INSERT INTO currencies (name, symbol) 
VALUES (sqlc.arg(name), sqlc.arg(symbol))
RETURNING id;

-- name: GetAllCurrencies :many
SELECT id, name, symbol 
FROM currencies;

-- name: UpdateCurrency :exec
UPDATE currencies
SET
    name = sqlc.arg(name),
    symbol = sqlc.arg(symbol)
WHERE id = sqlc.arg(id);
