-- name: GetAllTransactions :many
SELECT
    id,
    amount,
    currency,
    sender,
    receiver,
    category,
    date,
    note
FROM
    transactions
WHERE user_id = sqlc.arg(user_id)
ORDER BY date DESC;

-- name: CreateTransaction :one
INSERT INTO transactions (user_id, amount, currency, sender, receiver, category, date, note)
SELECT sqlc.arg(user_id),
       sqlc.arg(amount),
       sqlc.arg(currency),
       sqlc.arg(sender),
       sqlc.arg(receiver),
       sqlc.arg(category),
       sqlc.arg(date),
       sqlc.arg(note)
WHERE EXISTS (
    SELECT 1
    FROM accounts ra
    WHERE ra.id = sqlc.arg(receiver)
      AND ra.user_id = sqlc.arg(user_id)
) AND EXISTS (
    SELECT 1
    FROM accounts sa
    WHERE sa.id = sqlc.arg(sender)
      AND sa.user_id = sqlc.arg(user_id)
) AND EXISTS (
    SELECT 1
    FROM currencies cu
    WHERE cu.id = sqlc.arg(currency)
      AND cu.user_id = sqlc.arg(user_id)
) AND EXISTS (
    SELECT 1
    FROM categories ca
    WHERE ca.id = sqlc.arg(category)
      AND ca.user_id = sqlc.arg(user_id)
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
    note = sqlc.arg(note)
WHERE t.id = sqlc.arg(id)
  AND t.user_id = sqlc.arg(user_id)
  AND EXISTS (
    SELECT 1
    FROM accounts ra
    WHERE ra.id = sqlc.arg(receiver)
      AND ra.user_id = sqlc.arg(user_id)
) AND EXISTS (
    SELECT 1
    FROM accounts sa
    WHERE sa.id = sqlc.arg(sender)
      AND sa.user_id = sqlc.arg(user_id)
) AND EXISTS (
    SELECT 1
    FROM currencies cu
    WHERE cu.id = sqlc.arg(currency)
      AND cu.user_id = sqlc.arg(user_id)
) AND EXISTS (
    SELECT 1
    FROM categories ca
    WHERE ca.id = sqlc.arg(category)
      AND ca.user_id = sqlc.arg(user_id)
);