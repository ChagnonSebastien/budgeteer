-- name: CreateCurrency :one
INSERT INTO currencies (name, symbol, risk, type, user_id, decimal_points, rate_fetch_script, auto_update)
VALUES (sqlc.arg(name), sqlc.arg(symbol), sqlc.arg(risk), sqlc.arg(type), sqlc.arg(user_id), sqlc.arg(decimal_points), sqlc.arg(rate_fetch_script), sqlc.arg(auto_update))
RETURNING id;

-- name: GetAllCurrencies :many
SELECT id, name, symbol, risk, type, decimal_points, rate_fetch_script, auto_update
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
    auto_update = COALESCE(sqlc.narg(auto_update), auto_update)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);
