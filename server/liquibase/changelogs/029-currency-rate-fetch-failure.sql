-- liquibase formatted sql

-- changeset ?:1792281600000-1
ALTER TABLE "currencies" ADD COLUMN "rate_fetch_failed_at" TIMESTAMPTZ;

-- changeset ?:1792281600000-2
ALTER TABLE "currencies" ADD COLUMN "rate_fetch_error" TEXT;
