-- name: CreateCategory :one
INSERT INTO categories (name, parent, icon_name, icon_color, icon_background)
VALUES (sqlc.arg(name), sqlc.arg(parent), sqlc.arg(icon_name), sqlc.arg(icon_color), sqlc.arg(icon_background))
RETURNING id;

-- name: GetAllCategories :many
SELECT id, name, parent, icon_name, icon_color, icon_background
FROM categories;

-- name: UpdateCategory :exec
UPDATE categories
SET
    name = sqlc.arg(name),
    parent = sqlc.arg(parent),
    icon_name = sqlc.arg(icon_name),
    icon_color = sqlc.arg(icon_color),
    icon_background = sqlc.arg(icon_background)
WHERE id = sqlc.arg(id);
