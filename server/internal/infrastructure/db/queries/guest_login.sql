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

-- name: GetLoginForVerify :one
SELECT email, code_hash, code_expiry, failed_attempts
FROM guest_logins
WHERE email = $1;

-- name: ConsumeLoginCode :exec
DELETE FROM guest_logins
WHERE email = $1;

-- name: IncFailedAttempts :one
UPDATE guest_logins
SET failed_attempts = failed_attempts + 1
WHERE email = $1
RETURNING failed_attempts;

-- name: DeleteIfExpired :exec
DELETE FROM guest_logins
WHERE code_expiry < now();
