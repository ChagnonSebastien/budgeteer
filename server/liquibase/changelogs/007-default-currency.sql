-- liquibase formatted sql

-- changeset ?:1724091724024-1
ALTER TABLE "users" ADD "default_currency" INTEGER;

-- changeset ?:1724091724024-2
ALTER TABLE "users" ADD CONSTRAINT "users_currencies_id_fk" FOREIGN KEY ("default_currency") REFERENCES "currencies" ("id") ON UPDATE SET NULL ON DELETE SET NULL;

