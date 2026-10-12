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
