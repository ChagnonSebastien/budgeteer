-- liquibase formatted sql

-- changeset ?:1724115591013-1
CREATE INDEX "accounts_user_id_index" ON "accounts"("user_id");

-- changeset ?:1724115591013-2
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_name_unique" UNIQUE ("user_id", "name");

-- changeset ?:1724115591013-3
CREATE INDEX "currencies_user_id_index" ON "currencies"("user_id");

-- changeset ?:1724115591013-4
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_name_unique" UNIQUE ("user_id", "name");

-- changeset ?:1724115591013-5
CREATE INDEX "transactions_user_id_date_index" ON "transactions"("user_id", "date" DESC);

-- changeset ?:1724115591013-6
CREATE INDEX "categories_user_id_index" ON "categories"("user_id");

