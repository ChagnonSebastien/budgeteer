-- name: GetAllAccounts :many
SELECT id, name, is_mine, type, financial_institution
FROM accounts
WHERE user_id = sqlc.arg(user_id);

-- name: CreateAccount :one
INSERT INTO accounts (name, user_id, is_mine, type, financial_institution)
VALUES (sqlc.arg(name), sqlc.arg(user_id), sqlc.arg(is_mine), sqlc.arg(type), sqlc.arg(financial_institution))
RETURNING id;

-- name: UpdateAccount :exec
UPDATE accounts
SET
    name = COALESCE(sqlc.narg(name), name),
    is_mine = COALESCE(sqlc.narg(is_mine), is_mine),
    type = CASE
        WHEN sqlc.arg(update_type)::boolean THEN sqlc.narg(type)
        ELSE type
    END,
    financial_institution = CASE
        WHEN sqlc.arg(update_financial_institution)::boolean THEN sqlc.narg(financial_institution)
        ELSE financial_institution
    END
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
VALUES (sqlc.arg(account_id), sqlc.arg(currency_id), sqlc.arg(value));
