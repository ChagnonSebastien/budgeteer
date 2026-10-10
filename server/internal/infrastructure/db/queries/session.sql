-- name: CreateSession :exec
INSERT INTO sessions (id, user_id, expires_at)
VALUES (sqlc.arg(id), sqlc.arg(user_id), sqlc.arg(expires_at));

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions
WHERE user_id = sqlc.arg(user_id) AND expires_at < now();

-- name: SessionIsActive :one
SELECT EXISTS (
    SELECT 1
    FROM sessions
    WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id) AND expires_at > now()
);

-- name: DeleteSession :exec
DELETE FROM sessions
WHERE id = sqlc.arg(id);
