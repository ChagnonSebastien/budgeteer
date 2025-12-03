-- liquibase formatted sql

-- changeset ?:1764769682000-1
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- changeset ?:1764769682000-2
ALTER TABLE users
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- changeset ?:1764769682000-3
ALTER TABLE users
    ALTER COLUMN id TYPE uuid USING id::uuid;

-- changeset ?:1764769682000-3
ALTER TABLE transactions
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- changeset ?:1764769682000-3
ALTER TABLE currencies
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- changeset ?:1764769682000-3
ALTER TABLE categories
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- changeset ?:1764769682000-3
ALTER TABLE accounts
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
