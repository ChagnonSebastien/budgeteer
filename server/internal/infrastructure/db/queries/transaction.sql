-- name: GetAllTransactions :many
SELECT
    id AS transaction_id,
    amount,
    currency,
    sender,
    receiver,
    category,
    date,
    note
FROM
    transactions;

-- name: CreateTransaction :one
INSERT INTO transactions (amount, currency, sender, receiver, category, date, note) 
VALUES (sqlc.arg(amount), sqlc.arg(currency), sqlc.arg(sender), sqlc.arg(receiver), sqlc.arg(category), sqlc.arg(date), sqlc.arg(note))
RETURNING id;

-- name: UpdateTransaction :exec
UPDATE transactions
SET
    amount = sqlc.arg(amount),
    currency = sqlc.arg(currency),
    sender = sqlc.arg(sender),
    receiver = sqlc.arg(receiver),
    category = sqlc.arg(category),
    date = sqlc.arg(date),
    note = sqlc.arg(note)
WHERE id = sqlc.arg(id);