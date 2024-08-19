-- name: UpsertUser :exec
INSERT INTO users (id, username, email)
VALUES (sqlc.arg(id), sqlc.arg(username), sqlc.arg(email))
ON CONFLICT (id)
    DO UPDATE SET
                  username = sqlc.arg(username),
                  email = sqlc.arg(email);

-- name: SetDefaultCurrency :execrows
UPDATE users u
SET default_currency = sqlc.arg(default_currency)
WHERE u.id = sqlc.arg(user_id) AND EXISTS (
    SELECT 1
    FROM currencies c
    WHERE c.id = sqlc.arg(default_currency) AND c.user_id = sqlc.arg(user_id)
);

-- name: GetUserParams :one
SELECT default_currency
FROM users
WHERE id = sqlc.arg(user_id);
