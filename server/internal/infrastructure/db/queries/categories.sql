-- name: CreateCategory :one
INSERT INTO categories (name, parent, icon_name, icon_color, icon_background, user_id, fixed_costs, ordering)
VALUES (sqlc.arg(name), sqlc.arg(parent), sqlc.arg(icon_name), sqlc.arg(icon_color), sqlc.arg(icon_background), sqlc.arg(user_id), sqlc.arg(fixed_costs), sqlc.arg(ordering))
RETURNING id;

-- name: GetAllCategories :many
SELECT id, name, parent, icon_name, icon_color, icon_background, fixed_costs, ordering
FROM categories
WHERE user_id = sqlc.arg(user_id);

-- name: UpdateCategory :exec
UPDATE categories
SET
    name = COALESCE(sqlc.narg(name), name),
    parent = CASE
        WHEN sqlc.arg(update_parent)::boolean THEN sqlc.narg(parent)
        ELSE parent
    END,
    icon_name = COALESCE(sqlc.narg(icon_name), icon_name),
    icon_color = COALESCE(sqlc.narg(icon_color), icon_color),
    icon_background = COALESCE(sqlc.narg(icon_background), icon_background),
    fixed_costs = COALESCE(sqlc.narg(fixed_costs), fixed_costs),
    ordering = COALESCE(sqlc.narg(ordering), ordering)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);
