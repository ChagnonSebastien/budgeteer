-- name: CreateCategory :one
INSERT INTO categories (name, parent, icon_name) 
VALUES (sqlc.arg(name), sqlc.arg(parent), sqlc.arg(icon_name))
RETURNING id;

-- name: GetAllCategories :many
SELECT id, name, parent, icon_name 
FROM categories;
