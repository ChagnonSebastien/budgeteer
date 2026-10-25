-- liquibase formatted sql

-- changeset ?:1792954474000-1
update users
set preferences = preferences || '{"sharedExpensesOnly": false}'::jsonb
where default_currency is not null
  and preferences -> 'sharedExpensesOnly' is null;
