-- name: CanIssueNow :one
WITH gl AS (
    SELECT code_expiry
    FROM guest_logins
    WHERE email = $1
)
SELECT
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM gl)
            THEN true
        WHEN now() >= ( (SELECT code_expiry FROM gl)
                            - make_interval(secs => $2::int)
            + make_interval(secs => $3::int) )
            THEN true
        ELSE false
        END AS allowed,
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM gl)
            THEN NULL::timestamp
        ELSE ( (SELECT code_expiry FROM gl)
                   - make_interval(secs => $2::int)
            + make_interval(secs => $3::int) )
        END AS next_allowed_at;

-- name: UpsertLoginCode :exec
INSERT INTO guest_logins (email, code_hash, code_expiry, failed_attempts)
VALUES ($1, $2, $3, 0)
ON CONFLICT (email) DO UPDATE
    SET code_hash = EXCLUDED.code_hash,
        code_expiry = EXCLUDED.code_expiry,
        failed_attempts = 0;

-- name: ClaimLoginAttempt :one
UPDATE guest_logins
SET failed_attempts = failed_attempts + 1
WHERE email = sqlc.arg(email)
  AND failed_attempts < sqlc.arg(max_attempts)::int
  AND code_expiry > now()
RETURNING code_hash, failed_attempts;

-- name: ConsumeLoginCode :execrows
DELETE FROM guest_logins
WHERE email = sqlc.arg(email)
  AND code_hash = sqlc.arg(code_hash);

-- name: DeleteIfExpired :exec
DELETE FROM guest_logins
WHERE code_expiry < now();
