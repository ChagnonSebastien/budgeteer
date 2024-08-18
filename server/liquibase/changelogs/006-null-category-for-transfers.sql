-- liquibase formatted sql

-- changeset ?:1724004810369-1
ALTER TABLE "transactions" ALTER COLUMN  "category" DROP NOT NULL;

