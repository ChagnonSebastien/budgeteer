-- name: SetDefaultCurrency :execrows
UPDATE users u
SET default_currency = sqlc.arg(default_currency)
WHERE u.id = sqlc.arg(user_id) AND EXISTS (
    SELECT 1
    FROM currencies c
    WHERE c.id = sqlc.arg(default_currency) AND c.user_id = sqlc.arg(user_id)
);

-- name: GetUserByOidcSub :one
SELECT id, email
FROM users
WHERE oidc_sub = sqlc.arg(oidc_sub)
FOR UPDATE;

-- name: GetUserByEmail :one
SELECT id, oidc_sub
FROM users
WHERE email = sqlc.arg(email)
FOR UPDATE;

-- name: UpdateOidcUserProfile :exec
UPDATE users
SET username = sqlc.arg(username),
    email    = sqlc.arg(email)
WHERE id = sqlc.arg(user_id);

-- name: LinkOidcSub :execrows
UPDATE users
SET oidc_sub = sqlc.arg(oidc_sub),
    username = sqlc.arg(username)
WHERE id = sqlc.arg(user_id) AND oidc_sub IS NULL;

-- name: CreateOidcUser :one
INSERT INTO users (username, email, oidc_sub)
VALUES (sqlc.arg(username), sqlc.arg(email), sqlc.arg(oidc_sub))
RETURNING id;

-- name: EnsureGuestUser :one
INSERT INTO users as u (username, email)
VALUES (sqlc.arg(email), sqlc.arg(email))
ON CONFLICT (email)
    DO UPDATE SET email = u.email
RETURNING u.id;

-- name: SetDisplayName :exec
UPDATE users
SET display_name = sqlc.arg(display_name)
WHERE id = sqlc.arg(user_id);

-- name: GetUserParams :one
SELECT default_currency, hidden_default_account, username, display_name, preferences, is_admin
FROM users
WHERE id = sqlc.arg(user_id);

-- name: MergeUserPreferences :execrows
UPDATE users
SET preferences = jsonb_strip_nulls(preferences || sqlc.arg(patch)::jsonb)
WHERE id = sqlc.arg(user_id)
  AND octet_length((preferences || sqlc.arg(patch)::jsonb)::text) <= sqlc.arg(max_size)::int;

-- name: IsAdmin :one
SELECT is_admin
FROM users
WHERE id = sqlc.arg(user_id);

-- name: TouchLastSeen :exec
UPDATE users
SET last_seen_at = now()
WHERE id = sqlc.arg(user_id)
  AND (last_seen_at IS NULL OR last_seen_at < now() - interval '5 minutes');

-- name: GetAllUsers :many
SELECT id,
       email,
       coalesce(display_name, username)::text AS name,
       (oidc_sub IS NOT NULL)::bool          AS has_oidc,
       is_admin,
       last_seen_at
FROM users
ORDER BY last_seen_at DESC NULLS LAST, email;

-- name: GetUserForDeletion :one
SELECT email, is_admin
FROM users
WHERE id = sqlc.arg(user_id)
FOR UPDATE;

-- name: CountUserData :one
SELECT
    (SELECT count(*) FROM accounts a WHERE a.user_id = sqlc.arg(user_id))::int                              AS accounts,
    (SELECT count(*) FROM transactions t WHERE t.user_id = sqlc.arg(user_id))::int                          AS transactions,
    (SELECT count(*) FROM categories c WHERE c.user_id = sqlc.arg(user_id) AND c.parent IS NOT NULL)::int   AS categories,
    (SELECT count(*) FROM currencies c WHERE c.user_id = sqlc.arg(user_id))::int                            AS currencies;

-- name: GetCreatedTransactionGroups :many
SELECT tg.id,
       tg.name,
       (SELECT count(*)
        FROM user_transaction_group utg
        WHERE utg.transaction_group_id = tg.id AND utg.user_email <> sqlc.arg(user_email))::int AS other_members
FROM transaction_group tg
JOIN currencies c ON c.id = tg.creator_currency
WHERE c.user_id = sqlc.arg(user_id)
ORDER BY tg.name;

-- name: GetGroupedTransactionsForUser :many
SELECT t.id, t.amount, t.date, t.note, ttg.transaction_group_id, ttg.split_type_override
FROM transactions t
JOIN transaction_transaction_group ttg ON ttg.transaction_id = t.id
WHERE t.user_id = sqlc.arg(user_id);

-- name: ClearHiddenDefaultAccount :exec
UPDATE users
SET hidden_default_account = NULL
WHERE id = sqlc.arg(user_id);

-- name: DeleteUserTransactions :exec
DELETE FROM transactions
WHERE user_id = sqlc.arg(user_id);

-- name: DeleteUserAccountCurrencies :exec
DELETE FROM accountcurrencies ac
USING accounts a
WHERE ac.account_id = a.id AND a.user_id = sqlc.arg(user_id);

-- name: DeleteUserAccounts :exec
DELETE FROM accounts
WHERE user_id = sqlc.arg(user_id);

-- name: DeleteUserFinancialIncomes :exec
DELETE FROM financialincomes fi
USING currencies c
WHERE fi.related_currency_id = c.id AND c.user_id = sqlc.arg(user_id);

-- name: DeleteUserExchangeRates :exec
DELETE FROM exchangerates er
USING currencies c
WHERE (er.a = c.id OR er.b = c.id) AND c.user_id = sqlc.arg(user_id);

-- name: DeleteUserCurrencies :exec
DELETE FROM currencies
WHERE user_id = sqlc.arg(user_id);

-- name: DeleteUserCategories :exec
DELETE FROM categories
WHERE user_id = sqlc.arg(user_id);

-- name: DeleteGuestLogin :exec
DELETE FROM guest_logins
WHERE email = sqlc.arg(email);

-- name: DeleteUser :execrows
DELETE FROM users
WHERE id = sqlc.arg(user_id) AND NOT is_admin;
