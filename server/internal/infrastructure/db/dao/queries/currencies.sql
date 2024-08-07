-- name: CreateCurrency :one
INSERT INTO currencies (name, symbol) 
VALUES (sqlc.arg(name), sqlc.arg(symbol))
RETURNING id;

-- name: GetAllCurrencies :many
SELECT id, name, symbol 
FROM currencies;