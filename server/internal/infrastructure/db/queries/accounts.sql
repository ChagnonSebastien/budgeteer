-- name: GetAllAccountsWithCurrencyIDs :many
SELECT id, name, initial_amount
FROM accounts
WHERE user_id = sqlc.arg(user_id);

-- name: CreateAccount :one
INSERT INTO accounts (name, initial_amount, user_id)
VALUES (sqlc.arg(name), sqlc.arg(initial_amount), sqlc.arg(user_id))
RETURNING id;

-- name: UpdateAccount :exec
UPDATE accounts
SET
    name = sqlc.arg(name),
    initial_amount = sqlc.arg(initial_amount)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);
