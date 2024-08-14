-- name: GetAllAccountsWithCurrencyIDs :many
SELECT id, name, initial_amount
FROM accounts;

-- name: CreateAccount :one
INSERT INTO accounts (name, initial_amount) 
VALUES (sqlc.arg(name), sqlc.arg(initial_amount))
RETURNING id;

-- name: UpdateAccount :exec
UPDATE accounts
SET
    name = sqlc.arg(name),
    initial_amount = sqlc.arg(initial_amount)
WHERE id = sqlc.arg(id);
