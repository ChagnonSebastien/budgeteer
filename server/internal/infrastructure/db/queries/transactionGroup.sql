-- name: GetUserTransactionGroups :many
SELECT
    tg.id,
    tg.name,
    tg.split_type,
    c.name as creator_currency,
    utg.category_id,
    utg.currency_id,
    utg.split_value,
    (
        SELECT json_agg(
                       json_build_object(
                               'user_email', utg2.user_email,
                               'user_name', u.username,
                               'split_value', utg2.split_value
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
                                             split_value
             )
             SELECT
                 sqlc.arg(user_email),
                 g.id,
                 sqlc.narg(category_id),
                 sqlc.narg(currency_id),
                 sqlc.narg(split_value)
             FROM new_group g
     )
SELECT id
FROM new_group;




-- name: AddUserToTransactionGroup :exec
INSERT INTO user_transaction_group (
    user_email,
    transaction_group_id,
    category_id,
    currency_id,
    split_value
)
VALUES (
           sqlc.arg(user_email),
           sqlc.arg(transaction_group_id),
           sqlc.narg(category_id),
           sqlc.narg(currency_id),
           sqlc.narg(split_value)
       );


-- name: RemoveUserFromTransactionGroup :one
WITH deleted_splits AS (
    -- Remove this user's splits for any transactions in the group
    DELETE FROM transaction_transaction_group_user_split s
        USING transaction_transaction_group ttg
        WHERE
            s.transaction_id = ttg.transaction_id
                AND ttg.transaction_group_id = sqlc.arg(transaction_group_id)
                AND s.user_email = sqlc.arg(user_email)
        RETURNING 1
),
     deleted_user_transactions AS (
         -- Unlink all transactions FROM this user in the group
         -- (transactions where transactions.user_email = user_email)
         DELETE FROM transaction_transaction_group ttg
             USING transactions t
             WHERE
                 ttg.transaction_id = t.id
                     AND t.user_id = sqlc.arg(user_id)
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
    COALESCE((SELECT COUNT(*) FROM deleted_splits), 0)            AS splits_deleted,
    COALESCE((SELECT COUNT(*) FROM deleted_user_transactions), 0) AS transactions_unlinked,
    COALESCE((SELECT COUNT(*) FROM deleted_user), 0)              AS user_links_deleted;




-- name: AddTransactionToGroup :exec
INSERT INTO transaction_transaction_group (
    transaction_id,
    transaction_group_id,
    split_type_override
)
VALUES (
           sqlc.arg(transaction_id),
           sqlc.arg(transaction_group_id),
           sqlc.narg(split_type_override)::transaction_split_type
       );



-- name: RemoveTransactionFromGroup :execrows
DELETE FROM transaction_transaction_group
WHERE transaction_id = sqlc.arg(transaction_id);



-- name: UpdateTransactionGroupSplitType :execrows
UPDATE transaction_group
SET split_type = sqlc.arg(split_type)::group_split_type
WHERE id = sqlc.arg(transaction_group_id);



-- name: UpdateUserTransactionGroupShare :execrows
UPDATE user_transaction_group
SET split_value = sqlc.arg(split_value)
WHERE
    user_email = sqlc.arg(user_email)
  AND transaction_group_id = sqlc.arg(transaction_group_id);
