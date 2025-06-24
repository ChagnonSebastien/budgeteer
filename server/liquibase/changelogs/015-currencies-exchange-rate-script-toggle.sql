-- liquibase formatted sql

-- changeset ?:1750731241000-1
ALTER TABLE "currencies" ADD COLUMN "auto_update" BOOLEAN NOT NULL DEFAULT false;

-- changeset ?:1750731241000-2
ALTER TABLE "currencies" DROP COLUMN "rate_fetch_script";

-- changeset ?:1750731241000-3
ALTER TABLE "currencies" ADD COLUMN "rate_fetch_script" TEXT NOT NULL DEFAULT '';