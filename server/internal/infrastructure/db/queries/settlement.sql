-- name: GetUserSettlements :many
SELECT s.*
FROM settlements s
JOIN user_transaction_group utg ON utg.transaction_group_id = s.transaction_group_id
WHERE utg.user_email = sqlc.arg(user_email) AND utg.locked = true
ORDER BY s.date DESC, s.id DESC;

-- name: HasMemberSettlements :one
SELECT EXISTS (
    SELECT 1
    FROM settlements s
    WHERE s.transaction_group_id = sqlc.arg(transaction_group_id)
      AND sqlc.arg(user_email)::text IN (s.payer_email, s.receiver_email)
)::boolean AS has_settlements;

-- name: GetSettlementForUpdate :one
SELECT *
FROM settlements
WHERE id = sqlc.arg(id)
FOR UPDATE;

-- name: CreateSettlement :one
INSERT INTO settlements (
    transaction_group_id, amount, date, note, payer_email, receiver_email,
    created_by, proposed_by, payer_transaction_id, receiver_transaction_id
)
VALUES (
    sqlc.arg(transaction_group_id), sqlc.arg(amount), sqlc.arg(date), sqlc.arg(note),
    sqlc.arg(payer_email), sqlc.arg(receiver_email), sqlc.arg(created_by), sqlc.arg(created_by),
    sqlc.narg(payer_transaction_id), sqlc.narg(receiver_transaction_id)
)
RETURNING id;

-- name: UpdateSettlementProposal :exec
UPDATE settlements
SET amount = sqlc.arg(amount),
    date = sqlc.arg(date),
    note = sqlc.arg(note),
    proposed_by = sqlc.arg(proposed_by),
    payer_transaction_id = sqlc.narg(payer_transaction_id),
    receiver_transaction_id = sqlc.narg(receiver_transaction_id)
WHERE id = sqlc.arg(id);

-- name: SetSettlementTransactions :exec
UPDATE settlements
SET payer_transaction_id = sqlc.narg(payer_transaction_id),
    receiver_transaction_id = sqlc.narg(receiver_transaction_id)
WHERE id = sqlc.arg(id);

-- name: CompleteSettlement :exec
UPDATE settlements
SET completed_at = now(),
    payer_transaction_id = sqlc.narg(payer_transaction_id),
    receiver_transaction_id = sqlc.narg(receiver_transaction_id)
WHERE id = sqlc.arg(id);

-- name: DeleteSettlement :exec
DELETE FROM settlements
WHERE id = sqlc.arg(id);
