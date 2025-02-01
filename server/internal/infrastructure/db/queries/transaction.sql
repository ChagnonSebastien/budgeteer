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
    amount = COALESCE(sqlc.narg(amount), amount),
    currency = COALESCE(sqlc.narg(currency), currency),
    sender = CASE
        WHEN sqlc.arg(update_sender)::boolean THEN sqlc.narg(sender)
        ELSE sender
    END,
    receiver = CASE
        WHEN sqlc.arg(update_receiver)::boolean THEN sqlc.narg(receiver)
        ELSE receiver
    END,
    category = CASE
        WHEN sqlc.arg(update_category)::boolean THEN sqlc.narg(category)
        ELSE category
    END,
    date = COALESCE(sqlc.narg(date), date),
    note = COALESCE(sqlc.narg(note), note),
    receiver_currency = COALESCE(sqlc.narg(receiver_currency), receiver_currency),
    receiver_amount = COALESCE(sqlc.narg(receiver_amount), receiver_amount)
WHERE t.id = sqlc.arg(id)
  AND t.user_id = sqlc.arg(user_id);
