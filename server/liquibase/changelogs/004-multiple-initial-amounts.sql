-- liquibase formatted sql

-- changeset ?:1723943820776-1
ALTER TABLE "accountcurrencies" ADD "value" INTEGER DEFAULT 0 NOT NULL;

-- changeset ?:1723943820776-2
ALTER TABLE "accounts" DROP COLUMN "initial_amount";

