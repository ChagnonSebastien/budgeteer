-- liquibase formatted sql

-- changeset ?:1791763200000-1
create table settlements
(
    id                      serial constraint settlements_pk primary key,
    transaction_group_id    integer not null constraint settlements_transaction_group_id_fk references transaction_group on delete cascade,
    amount                  integer not null constraint settlements_positive_amount check (amount > 0),
    date                    date not null,
    note                    text not null default '',
    payer_email             text not null,
    receiver_email          text not null,
    created_by              text not null,
    proposed_by             text not null,
    completed_at            timestamptz,
    payer_transaction_id    integer constraint settlements_payer_transaction_id_fk references transactions on delete set null,
    receiver_transaction_id integer constraint settlements_receiver_transaction_id_fk references transactions on delete set null,
    constraint settlements_distinct_ends check (payer_email <> receiver_email),
    constraint settlements_created_by_an_end check (created_by in (payer_email, receiver_email)),
    constraint settlements_proposed_by_an_end check (proposed_by in (payer_email, receiver_email)),
    constraint settlements_payer_member_fk foreign key (payer_email, transaction_group_id)
        references user_transaction_group (user_email, transaction_group_id),
    constraint settlements_receiver_member_fk foreign key (receiver_email, transaction_group_id)
        references user_transaction_group (user_email, transaction_group_id)
);

-- changeset ?:1791763200000-2
create index settlements_transaction_group_id_index on settlements (transaction_group_id);
