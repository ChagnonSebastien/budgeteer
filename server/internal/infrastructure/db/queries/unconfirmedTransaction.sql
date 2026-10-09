-- name: GetUnconfirmedTransactions :many
SELECT
    ut.id,
    ut.transaction_group_id,
    ut.owner_email,
    ut.created_by,
    ut.amount,
    ut.date,
    ut.note,
    ut.split_type_override,
    (
        CASE WHEN ut.split_type_override IS NOT NULL
            THEN (
                SELECT COALESCE(
                               json_agg(
                                       json_build_object(
                                               'user_email', utus.user_email,
                                               'split_value', utus.split_value
                                       )
                               )::jsonb,
                               '[]'::jsonb
                       )
                FROM unconfirmed_transaction_user_split utus
                WHERE utus.unconfirmed_transaction_id = ut.id
            )
            ELSE '[]'::jsonb
        END
    ) AS member_values
FROM unconfirmed_transactions ut
    JOIN user_transaction_group utg ON utg.transaction_group_id = ut.transaction_group_id
WHERE utg.user_email = sqlc.arg(user_email)
  AND utg.locked = true
ORDER BY ut.date DESC, ut.id DESC;

-- name: GetUnconfirmedTransactionForUpdate :one
SELECT
    ut.id,
    ut.transaction_group_id,
    ut.owner_email,
    ut.split_type_override,
    (
        SELECT COALESCE(
                       json_agg(
                               json_build_object(
                                       'user_email', utus.user_email,
                                       'split_value', utus.split_value
                               )
                       )::jsonb,
                       '[]'::jsonb
               )
        FROM unconfirmed_transaction_user_split utus
        WHERE utus.unconfirmed_transaction_id = ut.id
    )::jsonb AS member_values
FROM unconfirmed_transactions ut
WHERE ut.id = sqlc.arg(id)
FOR UPDATE OF ut;

-- name: IsTransactionGroupMemberByEmail :one
SELECT EXISTS (
    SELECT 1
    FROM user_transaction_group utg
    WHERE utg.user_email = sqlc.arg(user_email)
      AND utg.transaction_group_id = sqlc.arg(transaction_group_id)
      AND (utg.locked = true OR NOT sqlc.arg(joined_only)::boolean)
)::boolean AS is_member;

-- name: CreateUnconfirmedTransaction :one
INSERT INTO unconfirmed_transactions (transaction_group_id, owner_email, created_by, amount, date, note, split_type_override)
VALUES (
           sqlc.arg(transaction_group_id),
           sqlc.arg(owner_email),
           sqlc.arg(created_by),
           sqlc.arg(amount),
           sqlc.arg(date),
           sqlc.arg(note),
           sqlc.narg(split_type_override)
       )
RETURNING id;

-- name: UpdateUnconfirmedTransaction :execrows
UPDATE unconfirmed_transactions ut
SET
    owner_email = COALESCE(sqlc.narg(owner_email), ut.owner_email),
    amount = COALESCE(sqlc.narg(amount), ut.amount),
    date = COALESCE(sqlc.narg(date), ut.date),
    note = COALESCE(sqlc.narg(note), ut.note),
    split_type_override = CASE WHEN sqlc.arg(update_split_type_override)::boolean
                                   THEN sqlc.narg(split_type_override)
                                   ELSE ut.split_type_override
                          END
WHERE ut.id = sqlc.arg(id);

-- name: DeleteUnconfirmedTransactionUserSplits :exec
DELETE FROM unconfirmed_transaction_user_split
WHERE unconfirmed_transaction_id = sqlc.arg(unconfirmed_transaction_id);

-- name: CreateUnconfirmedTransactionUserSplit :exec
INSERT INTO unconfirmed_transaction_user_split (unconfirmed_transaction_id, user_email, split_value)
VALUES (sqlc.arg(unconfirmed_transaction_id), sqlc.arg(user_email), sqlc.narg(split_value));

-- name: DeleteUnconfirmedTransaction :execrows
DELETE FROM unconfirmed_transactions
WHERE id = sqlc.arg(id);
