-- +goose Up

-- changeset ?:1791590400000-1
create table unconfirmed_transactions
(
    id serial constraint unconfirmed_transactions_pk primary key,
    transaction_group_id integer not null constraint unconfirmed_transactions_transaction_group_id_fk references transaction_group on delete cascade,
    owner_email text not null,
    created_by text not null,
    amount integer not null,
    date date not null,
    note text not null,
    split_type_override transaction_split_type
);

-- changeset ?:1791590400000-2
create table unconfirmed_transaction_user_split
(
    unconfirmed_transaction_id integer not null constraint unconfirmed_transaction_user_split_ut_fk references unconfirmed_transactions on delete cascade,
    user_email text not null,
    split_value integer,
    constraint unconfirmed_transaction_user_split_pk primary key (unconfirmed_transaction_id, user_email)
);

-- changeset ?:1791590400000-3
create index unconfirmed_transactions_transaction_group_id_index on unconfirmed_transactions (transaction_group_id);
