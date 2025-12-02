-- name: GetTransaction :one
SELECT
    t.id,
    t.user_id,
    ttg.transaction_group_id,
    ttg.split_type_override as transaction_group_split_type_override,
    (
        CASE WHEN ttg.split_type_override IS NOT NULL
                 THEN (
                SELECT COALESCE(
                               json_agg(
                                       json_build_object(
                                               'user_email', ttgus.user_email,
                                               'split_value', ttgus.split_value
                                       )
                               )::jsonb,
                               '[]'::jsonb
                       )
                FROM transaction_transaction_group_user_split ttgus
                WHERE ttgus.transaction_id = t.id
            )
             ELSE '[]'::jsonb
            END
        ) AS transaction_group_member_values
FROM transactions t
         LEFT OUTER JOIN transaction_transaction_group ttg ON t.id = ttg.transaction_id
         LEFT OUTER JOIN users u ON u.id = t.user_id
WHERE t.id = sqlc.arg(transaction_id);

-- name: GetAllTransactions :many
SELECT
    t.id,
    COALESCE(u.email, 'TBD') as owner,
    t.amount,
    t.currency,
    t.sender,
    t.receiver,
    t.category,
    t.date,
    t.note,
    t.receiver_currency,
    t.receiver_amount,
    fi.related_currency_id,
    ttg.transaction_group_id,
    ttg.split_type_override as transaction_group_split_type_override,
    (
        CASE WHEN ttg.split_type_override IS NOT NULL
            THEN (
                SELECT COALESCE(
                               json_agg(
                                       json_build_object(
                                               'user_email', ttgus.user_email,
                                               'split_value', ttgus.split_value
                                       )
                               )::jsonb,
                               '[]'::jsonb
                       )
                FROM transaction_transaction_group_user_split ttgus
                WHERE ttgus.transaction_id = t.id
            )
            ELSE '[]'::jsonb
        END
    ) AS transaction_group_member_values
FROM transactions t
    LEFT OUTER JOIN financialincomes fi ON t.id = fi.transaction_id
    LEFT OUTER JOIN transaction_transaction_group ttg ON t.id = ttg.transaction_id
    LEFT OUTER JOIN users u ON u.id = t.user_id
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

-- name: UpdateTransaction :one
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
  AND t.user_id = sqlc.arg(user_id)
RETURNING t.id;

-- name: UpsertFinancialIncome :one
INSERT INTO financialincomes as fi (transaction_id, related_currency_id)
    VALUES (
        sqlc.arg(transaction_id),
        sqlc.arg(related_currency_id)
    )
    ON CONFLICT (transaction_id)
        DO UPDATE
        SET related_currency_id = COALESCE(sqlc.narg(related_currency_id), fi.related_currency_id)
RETURNING fi.transaction_id;


-- name: RemoveFinancialIncome :many
DELETE FROM financialincomes
WHERE transaction_id = sqlc.arg(transaction_id)
RETURNING transaction_id;


-- name: UpsertGroupedTransaction :one
INSERT INTO transaction_transaction_group as ttg (transaction_id, transaction_group_id, split_type_override, locked)
VALUES (
           sqlc.arg(transaction_id),
           sqlc.narg(transaction_group_id),
           sqlc.narg(split_type_override),
           sqlc.arg(triggered_by_owner)
       )
ON CONFLICT (transaction_id)
    DO UPDATE
    SET transaction_group_id = COALESCE(sqlc.narg(transaction_group_id), ttg.transaction_group_id),
        split_type_override = CASE WHEN sqlc.arg(update_split_type_override)::boolean
                                        THEN sqlc.narg(split_type_override)
                                        ELSE ttg.split_type_override
                              END,
        locked = sqlc.arg(triggered_by_owner)
returning ttg.transaction_id;


-- name: DeleteGroupedTransaction :one
WITH deleted_transaction_group AS (
    DELETE FROM transaction_transaction_group ttg
        WHERE ttg.transaction_id = sqlc.arg(transaction_id)
        RETURNING 1
),
deleted_custom_split AS (
    DELETE FROM transaction_transaction_group_user_split ttgus
        WHERE ttgus.transaction_id = sqlc.arg(transaction_id)
        RETURNING 1
)
SELECT
    CAST(COALESCE((SELECT COUNT(*) FROM deleted_transaction_group), 0) AS INTEGER) AS deleted_transaction_group,
    CAST(COALESCE((SELECT COUNT(*) FROM deleted_custom_split), 0) AS INTEGER)      AS deleted_custom_split;

-- name: UpsertGroupedTransactionMemberSplitValue :one
INSERT INTO transaction_transaction_group_user_split AS ttgus (
    transaction_id,
    user_email,
    split_value
)
VALUES (
           sqlc.arg(transaction_id),
           sqlc.arg(user_email),
           sqlc.narg(split_value)
       )
ON CONFLICT (transaction_id, user_email)
    DO UPDATE
    SET
        split_value = COALESCE(sqlc.narg(split_value), ttgus.split_value)
returning transaction_id;

-- name: RemoveGroupedTransactionMember :execrows
DELETE FROM transaction_transaction_group_user_split
WHERE transaction_id = sqlc.arg(transaction_id) AND user_email = sqlc.arg(user_email)
returning user_email;
