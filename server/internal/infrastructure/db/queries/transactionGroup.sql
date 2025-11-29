-- name: GetUserTransactionGroups :many
SELECT
    tg.id,
    tg.name,
    tg.split_type,
    c.name as creator_currency,
    utg.category_id,
    utg.currency_id,
    utg.split_value,
    utg.hidden,
    (
        SELECT json_agg(
                       json_build_object(
                               'user_email', utg2.user_email,
                               'user_name', u.username,
                               'split_value', utg2.split_value,
                               'joined', utg2.locked
                       )
               )
        FROM user_transaction_group utg2
        LEFT JOIN users u ON u.email = utg2.user_email
        WHERE utg2.transaction_group_id = tg.id
    ) AS members
FROM transaction_group tg
         JOIN user_transaction_group utg ON utg.transaction_group_id = tg.id
         JOIN currencies c ON c.id = tg.creator_currency
WHERE utg.user_email = sqlc.arg(user_email)
ORDER BY tg.id DESC;


-- name: GetTransactionGroupMembers :many
SELECT utg.user_email,
       utg.split_value,
       utg.locked as joined,
    utg.hidden
FROM user_transaction_group utg
WHERE utg.transaction_group_id = sqlc.arg(transaction_group_id)
  AND utg.hidden = false;

-- name: CreateTransactionGroupWithCreator :one
WITH new_group AS (
         INSERT INTO transaction_group (name, split_type, creator_currency)
             SELECT
                 sqlc.arg(name),
                 sqlc.arg(split_type)::group_split_type,
                 sqlc.arg(currency_id)          -- creator_currency inferred from currency_row
             RETURNING id
     ),
     creator_link AS (
         INSERT INTO user_transaction_group (
                user_email,
                transaction_group_id,
                category_id,
                currency_id,
                split_value,
                hidden,
                locked
         )
         SELECT
             sqlc.arg(user_email),
             g.id,
             sqlc.narg(category_id),
             sqlc.narg(currency_id),
             sqlc.narg(split_value),
             FALSE,
             TRUE
         FROM new_group g
     )
SELECT id
FROM new_group;

-- name: UpdateTransactionGroupPersonalProperties :execrows
UPDATE user_transaction_group utg
SET
    currency_id = COALESCE(sqlc.narg(currency_id), utg.currency_id),
    category_id = COALESCE(sqlc.narg(category_id), utg.category_id),
    name_override = COALESCE(sqlc.narg(name), utg.name_override),
    hidden = COALESCE(sqlc.narg(hidden), utg.hidden),
    locked = true
WHERE utg.user_email = sqlc.arg(user_email) AND utg.transaction_group_id = sqlc.arg(transaction_group_id);

-- name: UpdateTransactionGroup :execrows
WITH tg_creator_email AS (
    SELECT u.email
    FROM transaction_group tg
             JOIN currencies c
                  ON c.id = tg.creator_currency
             JOIN users u
                  ON u.id = c.user_id
    WHERE tg.id = sqlc.arg(transaction_group_id)
    LIMIT 1
)
UPDATE transaction_group tg2
SET
    name = CASE WHEN (SELECT email FROM tg_creator_email) = sqlc.arg(user_email)
        THEN COALESCE(sqlc.narg(name), tg2.name)
        ELSE tg2.name
        END,
    split_type = COALESCE(sqlc.narg(split_type), split_type)
WHERE tg2.id = sqlc.arg(transaction_group_id);



-- name: UpsertTransactionGroupMember :execrows
INSERT INTO user_transaction_group AS utg (
    user_email,
    transaction_group_id,
    split_value,
    hidden,
    locked
)
VALUES (
           sqlc.arg(user_email),
           sqlc.arg(transaction_group_id),
           sqlc.narg(split_value),
           FALSE,
           FALSE
       )
ON CONFLICT (user_email, transaction_group_id)
    DO UPDATE
    SET
        split_value = COALESCE(EXCLUDED.split_value, utg.split_value);



-- name: RemoveUserFromTransactionGroup :one
WITH deleted_splits AS (
    DELETE FROM transaction_transaction_group_user_split s
        USING transaction_transaction_group ttg
        WHERE
            s.transaction_id = ttg.transaction_id
                AND ttg.transaction_group_id = sqlc.arg(transaction_group_id)
                AND s.user_email = sqlc.arg(user_email)
        RETURNING 1
),
deleted_user_transactions AS (
    DELETE FROM transaction_transaction_group ttg
        USING transactions t
        JOIN users u ON u.id = t.user_id
        WHERE
            ttg.transaction_id = t.id
                AND u.email = sqlc.arg(user_email)
                AND ttg.transaction_group_id = sqlc.arg(transaction_group_id)
        RETURNING ttg.transaction_id
),
deleted_user AS (
    -- Remove the user from the group membership
    DELETE FROM user_transaction_group utg
        WHERE
            utg.transaction_group_id = sqlc.arg(transaction_group_id)
                AND utg.user_email = sqlc.arg(user_email)
        RETURNING 1
)
SELECT
    CAST(COALESCE((SELECT COUNT(*) FROM deleted_splits), 0) AS INTEGER)            AS splits_deleted,
    CAST(COALESCE((SELECT COUNT(*) FROM deleted_user_transactions), 0) AS INTEGER) AS transactions_unlinked,
    CAST(COALESCE((SELECT COUNT(*) FROM deleted_user), 0) AS INTEGER)              AS user_links_deleted;
