-- liquibase formatted sql

-- changeset ?:1751383969000-1
ALTER TABLE "currencies" ADD COLUMN "risk" TEXT NOT NULL DEFAULT '';

-- changeset ?:1751383969000-2
ALTER TABLE "currencies" ADD COLUMN "type" TEXT NOT NULL DEFAULT '';
