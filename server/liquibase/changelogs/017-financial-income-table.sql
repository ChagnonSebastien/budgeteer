-- liquibase formatted sql

-- changeset ?:1754447337000-1
CREATE TABLE "financialincomes" ("transaction_id" INTEGER NOT NULL, "related_currency_id" INTEGER NOT NULL, CONSTRAINT "financialincomes_pkey" PRIMARY KEY ("transaction_id"));

-- changeset ?:1754447337000-2
ALTER TABLE "financialincomes" ADD CONSTRAINT "financialincomes_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION;

-- changeset ?:1754447337000-3
ALTER TABLE "financialincomes" ADD CONSTRAINT "financialincomes_related_currency_id_fkey" FOREIGN KEY ("related_currency_id") REFERENCES "currencies" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION;