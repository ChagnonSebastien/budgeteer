-- name: GetAllAccounts :many
SELECT id, name, is_mine, is_debt, type, financial_institution, created_at, statement_names
FROM accounts
WHERE user_id = sqlc.arg(user_id);

-- name: CreateAccount :one
INSERT INTO accounts (name, user_id, is_mine, is_debt, type, financial_institution)
VALUES (sqlc.arg(name), sqlc.arg(user_id), sqlc.arg(is_mine), sqlc.arg(is_debt), sqlc.arg(type), sqlc.arg(financial_institution))
RETURNING id;

-- name: UpdateAccount :exec
UPDATE accounts
SET
    name = COALESCE(sqlc.narg(name), name),
    is_mine = COALESCE(sqlc.narg(is_mine), is_mine),
    is_debt = COALESCE(sqlc.narg(is_debt), is_debt),
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
SELECT sqlc.arg(account_id), sqlc.arg(currency_id), sqlc.arg(value)
WHERE EXISTS (
    SELECT 1
    FROM accounts a
    WHERE a.id = sqlc.arg(account_id)
      AND a.user_id = sqlc.arg(user_id)
) AND EXISTS (
    SELECT 1
    FROM currencies c
    WHERE c.id = sqlc.arg(currency_id)
      AND c.user_id = sqlc.arg(user_id)
);

-- name: GetAccountForDeletion :one
SELECT a.id, a.is_mine, coalesce(u.hidden_default_account = a.id, false)::bool AS is_hidden_default
FROM accounts a
JOIN users u ON u.id = a.user_id
WHERE a.id = sqlc.arg(account_id) AND a.user_id = sqlc.arg(user_id);

-- name: CountSelfTransfersAfterReplacement :one
SELECT count(*)
FROM transactions
WHERE user_id = sqlc.arg(user_id)
  AND ((sender = sqlc.arg(account_id) AND receiver = sqlc.arg(replacement_id))
    OR (receiver = sqlc.arg(account_id) AND sender = sqlc.arg(replacement_id)));

-- name: ReplaceTransactionSender :execrows
UPDATE transactions
SET sender = sqlc.narg(replacement_id)
WHERE user_id = sqlc.arg(user_id) AND sender = sqlc.arg(account_id);

-- name: ReplaceTransactionReceiver :execrows
UPDATE transactions
SET receiver = sqlc.narg(replacement_id)
WHERE user_id = sqlc.arg(user_id) AND receiver = sqlc.arg(account_id);

-- name: MergeAccountCurrencies :exec
INSERT INTO accountcurrencies (account_id, currency_id, value)
SELECT sqlc.arg(replacement_id)::int, src.currency_id, src.value
FROM accountcurrencies src
WHERE src.account_id = sqlc.arg(account_id)
ON CONFLICT (account_id, currency_id) DO UPDATE SET value = accountcurrencies.value + excluded.value;

-- name: DeleteAccount :execrows
DELETE FROM accounts
WHERE id = sqlc.arg(account_id) AND user_id = sqlc.arg(user_id);

-- name: GetGroupedTransactionsForAccount :many
SELECT t.id, t.amount, t.date, t.note, ttg.transaction_group_id, ttg.split_type_override
FROM transactions t
JOIN transaction_transaction_group ttg ON ttg.transaction_id = t.id
WHERE t.user_id = sqlc.arg(user_id) AND (t.sender = sqlc.arg(account_id) OR t.receiver = sqlc.arg(account_id));

-- name: GetGroupedTransactionUserSplits :many
SELECT user_email, split_value
FROM transaction_transaction_group_user_split
WHERE transaction_id = sqlc.arg(transaction_id);

-- name: DeleteTransactionsForAccount :execrows
DELETE FROM transactions
WHERE user_id = sqlc.arg(user_id) AND (sender = sqlc.arg(account_id) OR receiver = sqlc.arg(account_id));
