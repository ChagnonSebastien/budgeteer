-- +goose Up

-- changeset ?:1792800000000-1
alter table currencies add column created_at timestamptz;

-- changeset ?:1792800000000-2
update currencies c
set created_at = coalesce(
    (
        select min(first_use)
        from (
            select min(t.date)::timestamptz as first_use
            from transactions t
            where t.currency = c.id or t.receiver_currency = c.id
            union all
            select min(t.date)::timestamptz
            from financialincomes fi
            join transactions t on t.id = fi.transaction_id
            where fi.related_currency_id = c.id
            union all
            select min(a.created_at)
            from accountcurrencies ac
            join accounts a on a.id = ac.account_id
            where ac.currency_id = c.id
            union all
            select min(tg.created_at)
            from transaction_group tg
            where tg.creator_currency = c.id
            union all
            select min(tg.created_at)
            from user_transaction_group utg
            join transaction_group tg on tg.id = utg.transaction_group_id
            where utg.currency_id = c.id
        ) uses
    ),
    now()
);

-- changeset ?:1792800000000-3
alter table currencies alter column created_at set default now();
alter table currencies alter column created_at set not null;
