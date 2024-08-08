-- name: GetAllAccountsWithCurrencyIDs :many
SELECT 
    a.id AS account_id,
    a.name AS account_name,
    a.initial_amount AS account_initial_amount,
    array_agg(ac.currency_id)::int[] AS currency_ids
FROM 
    accounts a
LEFT JOIN 
    accountcurrencies ac ON a.id = ac.account_id
GROUP BY 
    a.id;

-- name: CreateAccount :one
INSERT INTO accounts (name, initial_amount) 
VALUES (sqlc.arg(name), sqlc.arg(initial_amount))
RETURNING id;