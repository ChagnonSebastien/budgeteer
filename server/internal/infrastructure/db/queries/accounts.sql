-- name: GetAllAccountsWithCurrencyIDs :many
SELECT id, name, initial_amount
FROM accounts;

-- name: CreateAccount :one
INSERT INTO accounts (name, initial_amount) 
VALUES (sqlc.arg(name), sqlc.arg(initial_amount))
RETURNING id;