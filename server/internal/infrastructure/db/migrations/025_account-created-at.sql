-- +goose Up

-- changeset ?:1791936000000-1
alter table accounts add column created_at timestamptz;

-- changeset ?:1791936000000-2
update accounts a
set created_at = coalesce(
    (select min(t.date)::timestamptz from transactions t where t.sender = a.id or t.receiver = a.id),
    (select min(t.date)::timestamptz from transactions t where t.user_id = a.user_id),
    now()
);

-- changeset ?:1791936000000-3
alter table accounts alter column created_at set default now();
alter table accounts alter column created_at set not null;
