-- name: UpsertUser :exec
INSERT INTO users (id, username, email)
VALUES (sqlc.arg(id), sqlc.arg(username), sqlc.arg(email))
ON CONFLICT (id)
    DO UPDATE SET
                  username = sqlc.arg(username),
                  email = sqlc.arg(email);
