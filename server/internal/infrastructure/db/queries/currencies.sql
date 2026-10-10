-- name: CreateCurrency :one
INSERT INTO currencies (name, symbol, risk, type, user_id, decimal_points, rate_fetch_script, auto_update)
VALUES (sqlc.arg(name), sqlc.arg(symbol), sqlc.arg(risk), sqlc.arg(type), sqlc.arg(user_id), sqlc.arg(decimal_points), sqlc.arg(rate_fetch_script), sqlc.arg(auto_update))
RETURNING id;

-- name: GetCurrency :one
SELECT c.*, u.email
FROM currencies c
    JOIN users u ON c.user_id = u.id
WHERE c.id = sqlc.arg(currency_id);

-- name: GetAllCurrencies :many
SELECT id, name, symbol, risk, type, decimal_points, rate_fetch_script, auto_update, rate_fetch_failed_at, rate_fetch_error
FROM currencies
WHERE user_id = sqlc.arg(user_id);

-- name: GetAllWithAutoUpdate :many
SELECT id, name, symbol, risk, type, decimal_points, rate_fetch_script, auto_update
FROM currencies
WHERE auto_update = true
LIMIT sqlc.arg(page_size) OFFSET sqlc.arg(page_offset);

-- name: UpdateCurrency :exec
UPDATE currencies
SET
    name = COALESCE(sqlc.narg(name), name),
    symbol = COALESCE(sqlc.narg(symbol), symbol),
    risk = COALESCE(sqlc.narg(risk), risk),
    type = COALESCE(sqlc.narg(type), type),
    decimal_points = COALESCE(sqlc.narg(decimal_points), decimal_points),
    rate_fetch_script = COALESCE(sqlc.narg(rate_fetch_script), rate_fetch_script),
    auto_update = COALESCE(sqlc.narg(auto_update), auto_update),
    rate_fetch_failed_at = CASE
        WHEN sqlc.narg(rate_fetch_script)::text IS NULL AND sqlc.narg(auto_update)::boolean IS NULL THEN rate_fetch_failed_at
    END,
    rate_fetch_error = CASE
        WHEN sqlc.narg(rate_fetch_script)::text IS NULL AND sqlc.narg(auto_update)::boolean IS NULL THEN rate_fetch_error
    END
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);

-- name: RecordRateFetchFailure :exec
UPDATE currencies
SET rate_fetch_failed_at = now(), rate_fetch_error = sqlc.arg(error)
WHERE id = sqlc.arg(id);

-- name: ClearRateFetchFailure :exec
UPDATE currencies
SET rate_fetch_failed_at = NULL, rate_fetch_error = NULL
WHERE id = sqlc.arg(id);

-- name: GetCurrencyForDeletion :one
SELECT c.id, c.decimal_points, coalesce(u.default_currency = c.id, false)::bool AS is_default
FROM currencies c
JOIN users u ON u.id = c.user_id
WHERE c.id = sqlc.arg(currency_id) AND c.user_id = sqlc.arg(user_id);

-- name: CountCurrencyGroupUses :one
SELECT (SELECT count(*) FROM user_transaction_group utg WHERE utg.currency_id = sqlc.arg(currency_id))
     + (SELECT count(*) FROM transaction_group tg WHERE tg.creator_currency = sqlc.arg(currency_id));

-- name: MigrateTransactionCurrency :execrows
UPDATE transactions
SET currency = sqlc.arg(target_id)
WHERE user_id = sqlc.arg(user_id) AND currency = sqlc.arg(currency_id);

-- name: MigrateTransactionReceiverCurrency :execrows
UPDATE transactions
SET receiver_currency = sqlc.arg(target_id)
WHERE user_id = sqlc.arg(user_id) AND receiver_currency = sqlc.arg(currency_id);

-- name: CountTransactionsUsingCurrency :one
SELECT count(*)
FROM transactions
WHERE user_id = sqlc.arg(user_id) AND (currency = sqlc.arg(currency_id) OR receiver_currency = sqlc.arg(currency_id));

-- name: MigrateFinancialIncomeCurrency :exec
UPDATE financialincomes
SET related_currency_id = sqlc.arg(target_id)
WHERE related_currency_id = sqlc.arg(currency_id);

-- name: MigrateGroupCurrencies :exec
UPDATE user_transaction_group
SET currency_id = sqlc.arg(target_id)
WHERE currency_id = sqlc.arg(currency_id);

-- name: MigrateGroupCreatorCurrency :exec
UPDATE transaction_group
SET creator_currency = sqlc.arg(target_id)
WHERE creator_currency = sqlc.arg(currency_id);

-- name: GetGroupedTransactionsForCurrency :many
SELECT t.id, t.amount, t.date, t.note, ttg.transaction_group_id, ttg.split_type_override
FROM transactions t
JOIN transaction_transaction_group ttg ON ttg.transaction_id = t.id
WHERE t.user_id = sqlc.arg(user_id) AND (t.currency = sqlc.arg(currency_id) OR t.receiver_currency = sqlc.arg(currency_id));

-- name: DeleteTransactionsForCurrency :execrows
DELETE FROM transactions
WHERE user_id = sqlc.arg(user_id) AND (currency = sqlc.arg(currency_id) OR receiver_currency = sqlc.arg(currency_id));

-- name: DeleteFinancialIncomesForCurrency :exec
DELETE FROM financialincomes
WHERE related_currency_id = sqlc.arg(currency_id);

-- name: DeleteBalancesForCurrency :execrows
DELETE FROM accountcurrencies ac
USING accounts a
WHERE ac.account_id = a.id AND a.user_id = sqlc.arg(user_id) AND ac.currency_id = sqlc.arg(currency_id);

-- name: DeleteExchangeRatesForCurrency :exec
DELETE FROM exchangerates
WHERE a = sqlc.arg(currency_id) OR b = sqlc.arg(currency_id);

-- name: DeleteCurrency :execrows
DELETE FROM currencies
WHERE id = sqlc.arg(currency_id) AND user_id = sqlc.arg(user_id);
