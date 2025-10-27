-- liquibase formatted sql

-- changeset ?:1761582072000-1
alter table users add hidden_default_account integer constraint users_default_account_id_fk references accounts;

-- changeset ?:1761582072000-2
create type group_split_type as enum ('EQUAL', 'PERCENTAGE', 'SHARES');

-- changeset ?:1761582072000-3
create type transaction_split_type as enum ('EQUAL', 'PERCENTAGE', 'EXACT_AMOUNT', 'SHARES');

-- changeset ?:1761582072000-4
create table transaction_group
(
    id serial constraint transaction_group_pk primary key,
    name text not null,
    split_type group_split_type not null default 'EQUAL',
    creator_currency integer not null constraint transaction_group_creator_currency_fk references currencies on delete cascade
);

-- changeset ?:1761582072000-5
create table user_transaction_group
(
    user_id text not null constraint user_transaction_group_user_id_fk references users on delete cascade,
    transaction_group_id integer not null constraint user_transaction_group_transaction_group_id_fk references transaction_group on delete cascade,
    category_id integer constraint user_transaction_group_category_id_fk references categories on delete cascade,
    currency_id integer constraint user_transaction_group_currency_id_fk references currencies on delete cascade,
    split_value numeric,
    constraint user_transaction_group_pk primary key (user_id, transaction_group_id)
);

-- changeset ?:1761582072000-6
create table transaction_transaction_group
(
    transaction_id integer not null constraint transaction_transaction_group_transaction_id_fk references transactions on delete cascade,
    transaction_group_id integer not null constraint transaction_transaction_group_group_id_fk references transaction_group on delete cascade,
    split_type_override transaction_split_type,
    constraint transaction_transaction_group_pk primary key (transaction_id)
);

-- changeset ?:1761582072000-7
create table transaction_transaction_group_user_split
(
    transaction_id integer not null,
    user_id text not null constraint transaction_transaction_group_user_split_user_id_fk references users on delete cascade,
    split_value numeric,
    constraint transaction_transaction_group_user_split_pk primary key (transaction_id, user_id),
    constraint transaction_transaction_group_user_split_ttg_fk foreign key (transaction_id) references transaction_transaction_group on delete cascade
);

-- changeset ?:1761582072000-8
create table guest_logins
(
    email text not null,
    code_hash text not null,
    code_expiry timestamp not null,
    failed_attempts integer not null default 0,
    constraint guest_logins_pk primary key (email)
);

-- changeset ?:1761582072000-9
ALTER TABLE guest_logins
    ALTER COLUMN code_expiry TYPE timestamptz
        USING code_expiry AT TIME ZONE 'UTC';