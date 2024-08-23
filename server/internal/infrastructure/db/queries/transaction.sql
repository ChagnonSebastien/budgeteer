-- name: GetAllTransactions :many
SELECT
    id,
    amount,
    currency,
    sender,
    receiver,
    category,
    date,
    note,
    receiver_currency,
    receiver_amount
FROM
    transactions
WHERE user_id = sqlc.arg(user_id)
ORDER BY date DESC;

-- name: CreateTransaction :one
INSERT INTO transactions (user_id, amount, currency, sender, receiver, category, date, note, receiver_currency, receiver_amount)
VALUES (
           sqlc.arg(user_id),
           sqlc.arg(amount),
           sqlc.arg(currency),
           sqlc.arg(sender),
           sqlc.arg(receiver),
           sqlc.arg(category),
           sqlc.arg(date),
           sqlc.arg(note),
           sqlc.arg(receiver_currency),
           sqlc.arg(receiver_amount)
       )
RETURNING id;

-- name: UpdateTransaction :execrows
UPDATE transactions t
SET
    amount = sqlc.arg(amount),
    currency = sqlc.arg(currency),
    sender = sqlc.arg(sender),
    receiver = sqlc.arg(receiver),
    category = sqlc.arg(category),
    date = sqlc.arg(date),
    note = sqlc.arg(note),
    receiver_currency = sqlc.arg(receiver_currency),
    receiver_amount = sqlc.arg(receiver_amount)
WHERE t.id = sqlc.arg(id)
  AND t.user_id = sqlc.arg(user_id);