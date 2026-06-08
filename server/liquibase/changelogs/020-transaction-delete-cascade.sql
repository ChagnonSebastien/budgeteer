-- liquibase formatted sql

-- changeset ?:1765200000000-1
ALTER TABLE "financialincomes" DROP CONSTRAINT IF EXISTS "financialincomes_transaction_id_fkey";
ALTER TABLE "financialincomes"
    ADD CONSTRAINT "financialincomes_transaction_id_fkey"
        FOREIGN KEY ("transaction_id") REFERENCES "transactions" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
