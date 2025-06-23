-- liquibase formatted sql

-- changeset ?:1750718057000-1
ALTER TABLE "exchangerates" ADD COLUMN "date_new" DATE NOT NULL default CURRENT_DATE;

-- changeset ?:1750718057000-2
UPDATE "exchangerates" SET "date_new" = to_date("date", 'YYYY-MM-DD HH24:MI:SS');

-- changeset ?:1750718057000-3
ALTER TABLE "exchangerates" DROP CONSTRAINT "exchangerates_a_b_date_key";

-- changeset ?:1750718057000-4
ALTER TABLE "exchangerates" DROP COLUMN "date";

-- changeset ?:1750718057000-5
ALTER TABLE "exchangerates" RENAME COLUMN "date_new" TO "date";

-- changeset ?:1750718057000-6
ALTER TABLE "exchangerates" ADD CONSTRAINT "exchangerates_a_b_date_key" UNIQUE ("a","b","date");

-- changeset ?:1750718057000-7
ALTER TABLE "currencies" ADD COLUMN "rate_fetch_script" DATE;