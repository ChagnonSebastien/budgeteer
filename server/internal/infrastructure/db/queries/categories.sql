-- name: CreateCategory :one
INSERT INTO categories (name, parent, icon_name, icon_color, icon_background, user_id, fixed_costs, ordering)
SELECT sqlc.arg(name), sqlc.narg(parent), sqlc.arg(icon_name), sqlc.arg(icon_color), sqlc.arg(icon_background), sqlc.arg(user_id), sqlc.arg(fixed_costs), sqlc.arg(ordering)
WHERE sqlc.narg(parent)::int IS NULL OR EXISTS (
    SELECT 1
    FROM categories p
    WHERE p.id = sqlc.narg(parent)
      AND p.user_id = sqlc.arg(user_id)
)
RETURNING id;

-- name: GetAllCategories :many
SELECT id, name, parent, icon_name, icon_color, icon_background, fixed_costs, ordering
FROM categories
WHERE user_id = sqlc.arg(user_id);

-- name: UpdateCategory :execrows
WITH RECURSIVE ancestors AS (
    SELECT a.id, a.parent FROM categories a WHERE a.id = sqlc.narg(parent) AND a.user_id = sqlc.arg(user_id)
    UNION
    SELECT a.id, a.parent FROM categories a JOIN ancestors s ON a.id = s.parent
)
UPDATE categories c
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
WHERE c.id = sqlc.arg(id)
  AND c.user_id = sqlc.arg(user_id)
  AND (NOT sqlc.arg(update_parent)::boolean OR sqlc.narg(parent)::int IS NULL OR EXISTS (
    SELECT 1
    FROM categories p
    WHERE p.id = sqlc.narg(parent)
      AND p.user_id = sqlc.arg(user_id)
  ))
  AND (NOT sqlc.arg(update_parent)::boolean OR c.id NOT IN (SELECT id FROM ancestors));

-- name: GetCategoryForDeletion :one
SELECT id, parent
FROM categories
WHERE id = sqlc.arg(category_id) AND user_id = sqlc.arg(user_id);

-- name: IsCategoryInSubtree :one
WITH RECURSIVE subtree AS (
    SELECT c.id FROM categories c WHERE c.id = sqlc.arg(subtree_root) AND c.user_id = sqlc.arg(user_id)
    UNION
    SELECT c.id FROM categories c JOIN subtree s ON c.parent = s.id
)
SELECT EXISTS (SELECT 1 FROM subtree st WHERE st.id = sqlc.arg(candidate)::int)::bool;

-- name: MoveCategoryTransactions :execrows
UPDATE transactions
SET category = sqlc.arg(target_id)
WHERE user_id = sqlc.arg(user_id) AND category = sqlc.arg(category_id);

-- name: MoveChildCategories :execrows
UPDATE categories
SET parent = sqlc.arg(target_id)
WHERE user_id = sqlc.arg(user_id) AND parent = sqlc.arg(category_id);

-- name: MoveGroupCategory :exec
UPDATE user_transaction_group
SET category_id = sqlc.arg(target_id)
WHERE category_id = sqlc.arg(category_id);

-- name: DeleteCategory :execrows
DELETE FROM categories
WHERE id = sqlc.arg(category_id) AND user_id = sqlc.arg(user_id);

-- name: GetGroupedTransactionsForCategory :many
SELECT t.id, t.amount, t.date, t.note, ttg.transaction_group_id, ttg.split_type_override
FROM transactions t
JOIN transaction_transaction_group ttg ON ttg.transaction_id = t.id
WHERE t.user_id = sqlc.arg(user_id) AND t.category = sqlc.arg(category_id);

-- name: DeleteTransactionsForCategory :execrows
DELETE FROM transactions
WHERE user_id = sqlc.arg(user_id) AND category = sqlc.arg(category_id);
