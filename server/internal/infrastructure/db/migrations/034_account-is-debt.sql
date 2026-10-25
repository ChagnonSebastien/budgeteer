-- +goose Up

-- changeset ?:1792972800000-1
alter table accounts add column is_debt boolean not null default false;
