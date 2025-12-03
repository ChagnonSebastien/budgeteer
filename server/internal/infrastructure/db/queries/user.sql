-- name: UpsertUser :exec
INSERT INTO users as u (username, email, oidc_sub)
VALUES (
        sqlc.arg(username),
        sqlc.arg(email),
        sqlc.arg(oidc_sub)
)
ON CONFLICT (email)
    DO UPDATE SET
                  username = sqlc.arg(username),
                  oidc_sub = COALESCE(sqlc.narg(oidc_sub), oidc_sub)
RETURNING u.*;

-- name: SetDefaultCurrency :execrows
UPDATE users u
SET default_currency = sqlc.arg(default_currency)
WHERE u.id = sqlc.arg(user_id) AND EXISTS (
    SELECT 1
    FROM currencies c
    WHERE c.id = sqlc.arg(default_currency) AND c.user_id = sqlc.arg(user_id)
);

-- name: UpsertOidcUser :one
INSERT INTO users as u (username, email, oidc_sub)
VALUES (
           sqlc.arg(username),
           sqlc.arg(email),
           sqlc.arg(oidc_sub)
       )
ON CONFLICT (oidc_sub)
    DO UPDATE SET
                  username = sqlc.arg(username),
                  email = sqlc.arg(email)
RETURNING u.id;

-- name: GetUserParams :one
SELECT default_currency, hidden_default_account, username
FROM users
WHERE id = sqlc.arg(user_id);
