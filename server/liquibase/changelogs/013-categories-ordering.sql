-- liquibase formatted sql

-- changeset ?:1737251774673-1
ALTER TABLE categories ADD COLUMN ordering double precision NOT NULL DEFAULT ((random() * 2 - 1) * 1.0e100);

