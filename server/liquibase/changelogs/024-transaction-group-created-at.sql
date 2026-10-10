-- liquibase formatted sql

-- changeset ?:1791849600000-1
alter table transaction_group add column created_at timestamptz;

-- changeset ?:1791849600000-2
update transaction_group tg
set created_at = coalesce(
    (
        select min(first_date)
        from (
            select min(t.date)::timestamptz as first_date
            from transactions t
            join transaction_transaction_group ttg on ttg.transaction_id = t.id
            where ttg.transaction_group_id = tg.id
            union all
            select min(ut.date)::timestamptz
            from unconfirmed_transactions ut
            where ut.transaction_group_id = tg.id
        ) dates
    ),
    now()
);

-- changeset ?:1791849600000-3
alter table transaction_group alter column created_at set default now();
alter table transaction_group alter column created_at set not null;
