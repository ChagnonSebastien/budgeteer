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
    name = sqlc.arg(name),
    parent = sqlc.arg(parent),
    icon_name = sqlc.arg(icon_name),
    icon_color = sqlc.arg(icon_color),
    icon_background = sqlc.arg(icon_background),
    fixed_costs = sqlc.arg(fixed_costs),
    ordering = sqlc.arg(ordering)
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);
