-- name: GetAllTransactions :many
SELECT
    t.id,
    t.amount,
    t.currency,
    t.sender,
    t.receiver,
    t.category,
    t.date,
    t.note,
    t.receiver_currency,
    t.receiver_amount,
    fi.related_currency_id
FROM
    transactions t LEFT OUTER JOIN financialincomes fi ON t.id = fi.transaction_id
WHERE t.user_id = sqlc.arg(user_id)
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

-- name: UpsertFinancialIncome :execrows
INSERT INTO financialincomes (transaction_id, related_currency_id)
    VALUES (
        sqlc.arg(transaction_id),
        sqlc.arg(related_currency_id)
    )
    ON CONFLICT (transaction_id)
        DO UPDATE
        SET related_currency_id = COALESCE(sqlc.narg(related_currency_id), related_currency_id);


-- name: RemoveFinancialIncome :execrows
DELETE FROM financialincomes
WHERE transaction_id = sqlc.arg(transaction_id);
