-- liquibase formatted sql

-- changeset ?:1764769682000-1
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- changeset ?:1764769682000-2
ALTER TABLE users
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- changeset ?:1764769682000-3
ALTER TABLE users
    ALTER COLUMN id TYPE uuid USING id::uuid;