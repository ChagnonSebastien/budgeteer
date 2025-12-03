-- liquibase formatted sql

-- changeset ?:1764769682000-1
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- changeset ?:1764769682000-2
ALTER TABLE users
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- changeset ?:1764769682000-3
ALTER TABLE accounts      DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;
ALTER TABLE transactions  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE currencies    DROP CONSTRAINT IF EXISTS currencies_user_id_fkey;
ALTER TABLE categories    DROP CONSTRAINT IF EXISTS categories_user_id_fkey;

-- changeset ?:1764769682000-4
ALTER TABLE users
    ALTER COLUMN id TYPE uuid USING id::uuid;

-- changeset ?:1764769682000-5
ALTER TABLE transactions
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE currencies
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE categories
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE accounts
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- changeset ?:1764769682000-6
ALTER TABLE accounts
    ADD CONSTRAINT accounts_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE transactions
    ADD CONSTRAINT transactions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE currencies
    ADD CONSTRAINT currencies_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE categories
    ADD CONSTRAINT categories_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id);

-- changeset ?:1764769682000-7
ALTER TABLE users
    ADD CONSTRAINT users_oidc_sub_key UNIQUE (oidc_sub);
