-- name: CreateImport :one
INSERT INTO imports (user_id, account, file_name)
SELECT sqlc.arg(user_id), a.id, sqlc.arg(file_name)
FROM accounts a
WHERE a.id = sqlc.arg(account) AND a.user_id = sqlc.arg(user_id) AND a.is_mine
RETURNING id;

-- name: GetImportForUpdate :one
SELECT id, account
FROM imports
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id)
FOR UPDATE;

-- name: GetAllImports :many
SELECT id, account, file_name, row_count, created_at
FROM imports
WHERE user_id = sqlc.arg(user_id) AND row_count > 0
ORDER BY created_at DESC;

-- name: AddImportRowCount :exec
UPDATE imports
SET row_count = row_count + sqlc.arg(added)
WHERE id = sqlc.arg(id);

-- name: DeleteImport :exec
DELETE FROM imports
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);

-- name: GetImportFingerprint :one
SELECT transaction_id
FROM import_fingerprints
WHERE user_id = sqlc.arg(user_id) AND account = sqlc.arg(account) AND fingerprint = sqlc.arg(fingerprint);

-- name: GetKnownFingerprints :many
SELECT fingerprint, transaction_id
FROM import_fingerprints
WHERE user_id = sqlc.arg(user_id) AND account = sqlc.arg(account) AND fingerprint = ANY(sqlc.arg(fingerprints)::text[]);

-- name: InsertImportFingerprint :exec
INSERT INTO import_fingerprints (user_id, account, fingerprint, transaction_id, import_id)
VALUES (sqlc.arg(user_id), sqlc.arg(account), sqlc.arg(fingerprint), sqlc.arg(transaction_id), sqlc.arg(import_id));

-- name: SetTransactionImport :exec
UPDATE transactions
SET import_id = sqlc.arg(import_id)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);

-- name: GetMergeCandidate :one
SELECT
    t.id,
    t.sender,
    t.receiver,
    t.amount,
    t.currency,
    t.receiver_amount,
    t.receiver_currency,
    t.category,
    (fi.transaction_id IS NOT NULL)::bool AS is_financial_income,
    (ttg.transaction_id IS NOT NULL)::bool AS is_grouped,
    COALESCE(sa.is_mine, false)::bool AS sender_is_mine,
    COALESCE(ra.is_mine, false)::bool AS receiver_is_mine
FROM transactions t
    LEFT OUTER JOIN financialincomes fi ON fi.transaction_id = t.id
    LEFT OUTER JOIN transaction_transaction_group ttg ON ttg.transaction_id = t.id
    LEFT OUTER JOIN accounts sa ON sa.id = t.sender
    LEFT OUTER JOIN accounts ra ON ra.id = t.receiver
WHERE t.id = sqlc.arg(id) AND t.user_id = sqlc.arg(user_id)
FOR UPDATE OF t;

-- name: InsertImportMerge :exec
INSERT INTO import_merges (
    transaction_id, import_id,
    previous_sender, previous_receiver,
    previous_amount, previous_currency,
    previous_receiver_amount, previous_receiver_currency,
    previous_category
)
VALUES (
    sqlc.arg(transaction_id), sqlc.arg(import_id),
    sqlc.narg(previous_sender), sqlc.narg(previous_receiver),
    sqlc.arg(previous_amount), sqlc.arg(previous_currency),
    sqlc.arg(previous_receiver_amount), sqlc.arg(previous_receiver_currency),
    sqlc.narg(previous_category)
);

-- name: MergeTransactionIntoTransfer :execrows
UPDATE transactions
SET sender = sqlc.narg(sender),
    receiver = sqlc.narg(receiver),
    amount = sqlc.arg(amount),
    currency = sqlc.arg(currency),
    receiver_amount = sqlc.arg(receiver_amount),
    receiver_currency = sqlc.arg(receiver_currency),
    category = NULL
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);

-- name: RevertImportMerges :execrows
UPDATE transactions t
SET sender = m.previous_sender,
    receiver = m.previous_receiver,
    amount = m.previous_amount,
    currency = m.previous_currency,
    receiver_amount = m.previous_receiver_amount,
    receiver_currency = m.previous_receiver_currency,
    category = m.previous_category
FROM import_merges m
WHERE m.transaction_id = t.id
  AND m.import_id = sqlc.arg(import_id)
  AND t.user_id = sqlc.arg(user_id);

-- name: DeleteImportedTransactions :execrows
DELETE FROM transactions
WHERE import_id = sqlc.arg(import_id) AND user_id = sqlc.arg(user_id);

-- name: GetAccountStatementNames :one
SELECT statement_names
FROM accounts
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id)
FOR UPDATE;

-- name: SetAccountStatementNames :exec
UPDATE accounts
SET statement_names = sqlc.arg(statement_names)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);

-- name: InsertImportStatementName :exec
INSERT INTO import_statement_names (import_id, account, name)
VALUES (sqlc.arg(import_id), sqlc.arg(account), sqlc.arg(name))
ON CONFLICT DO NOTHING;

-- name: GetImportStatementNames :many
SELECT account, name
FROM import_statement_names
WHERE import_id = sqlc.arg(import_id);

-- name: GetAllImportProfiles :many
SELECT account, mapping
FROM import_profiles
WHERE user_id = sqlc.arg(user_id);

-- name: UpsertImportProfile :execrows
INSERT INTO import_profiles (account, user_id, mapping, updated_at)
SELECT a.id, sqlc.arg(user_id), sqlc.arg(mapping), now()
FROM accounts a
WHERE a.id = sqlc.arg(account) AND a.user_id = sqlc.arg(user_id) AND a.is_mine
ON CONFLICT (account) DO UPDATE
SET mapping = excluded.mapping, updated_at = excluded.updated_at;
