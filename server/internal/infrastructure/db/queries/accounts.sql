-- name: GetAllAccounts :many
SELECT id, name, is_mine
FROM accounts
WHERE user_id = sqlc.arg(user_id);

-- name: CreateAccount :one
INSERT INTO accounts (name, user_id, is_mine)
VALUES (sqlc.arg(name), sqlc.arg(user_id), sqlc.arg(is_mine))
RETURNING id;

-- name: UpdateAccount :exec
UPDATE accounts
SET
    name = sqlc.arg(name),
    is_mine = sqlc.arg(is_mine)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);

-- name: GetAllAccountCurrencies :many
SELECT
    a.id AS account_id,
    ac.currency_id,
    ac.value
FROM
    accounts a
        JOIN
    accountcurrencies ac ON a.id = ac.account_id
WHERE
    a.user_id = sqlc.arg(user_id);

-- name: DeleteAccountCurrencies :exec
DELETE FROM accountcurrencies ac
    USING accounts a
WHERE ac.account_id = sqlc.arg(account_id)
  AND ac.account_id = a.id
  AND a.user_id = sqlc.arg(user_id);

-- name: InsertAccountCurrency :execrows
INSERT INTO accountcurrencies (account_id, currency_id, value)
SELECT sqlc.arg(account_id), sqlc.arg(currency_id), sqlc.arg(value)
WHERE EXISTS (
    SELECT 1
    FROM accounts a
    WHERE a.id = sqlc.arg(account_id)
      AND a.user_id = sqlc.arg(user_id)
)
  AND EXISTS (
    SELECT 1
    FROM currencies c
    WHERE c.id = sqlc.arg(currency_id)
      AND c.user_id = sqlc.arg(user_id)
);
