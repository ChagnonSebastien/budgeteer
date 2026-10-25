-- +goose Up

-- changeset ?:1792022400000-1
alter table users add column preferences jsonb not null default '{}'::jsonb;
