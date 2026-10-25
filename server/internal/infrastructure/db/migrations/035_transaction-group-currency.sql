-- +goose Up

-- changeset ?:1793059200000-1
alter table transaction_group
    add column creator_id uuid constraint transaction_group_creator_id_fk references users,
    add column currency_name text,
    add column currency_symbol text,
    add column currency_decimal_points integer;

-- changeset ?:1793059200000-2
update transaction_group tg
set creator_id = c.user_id,
    currency_name = c.name,
    currency_symbol = c.symbol,
    currency_decimal_points = c.decimal_points
from currencies c
where c.id = tg.creator_currency;

-- changeset ?:1793059200000-3
alter table transaction_group
    alter column creator_id set not null,
    alter column currency_name set not null,
    alter column currency_symbol set not null,
    alter column currency_decimal_points set not null,
    drop column creator_currency;
