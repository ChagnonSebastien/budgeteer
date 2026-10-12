-- liquibase formatted sql

-- changeset ?:1792886400000-1
alter table users add column is_admin boolean not null default false;

-- changeset ?:1792886400000-2
alter table users add column last_seen_at timestamptz;
