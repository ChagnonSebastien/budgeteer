-- liquibase formatted sql

-- changeset ?:1724377943902-1
ALTER TABLE "transactions" ADD "receiver_currency" INTEGER NOT NULL;

-- changeset ?:1724377943902-2
ALTER TABLE "transactions" ADD "receiver_amount" INTEGER NOT NULL;

-- changeset ?:1724377943902-3
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_currencies_id_fk" FOREIGN KEY ("receiver_currency") REFERENCES "currencies" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION;

