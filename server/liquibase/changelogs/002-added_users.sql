-- liquibase formatted sql

-- changeset ?:1723857397742-3
CREATE TABLE "users" ("id" TEXT NOT NULL, "username" TEXT NOT NULL, "email" TEXT NOT NULL, CONSTRAINT "users_pkey" PRIMARY KEY ("id"), CONSTRAINT "user_username_unique" UNIQUE (username), CONSTRAINT "user_email_unique" UNIQUE (email));

-- changeset ?:1723857397742-4
ALTER TABLE "accounts" ADD "user_id" TEXT NOT NULL;

-- changeset ?:1723857397742-5
ALTER TABLE "currencies" ADD "user_id" TEXT NOT NULL;

-- changeset ?:1723857397742-6
ALTER TABLE "categories" ADD "user_id" TEXT NOT NULL;

-- changeset ?:1723857397742-7
ALTER TABLE "transactions" ADD "user_id" TEXT NOT NULL;

-- changeset ?:1723857397742-8
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset ?:1723857397742-9
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset ?:1723857397742-10
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset ?:1723857397742-11
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset ?:1723857397742-1
ALTER TABLE "categories" DROP CONSTRAINT "categories_name_unique";

-- changeset ?:1723857397742-2
ALTER TABLE "categories" ADD CONSTRAINT "categories_name_unique" UNIQUE ("name", "user_id");
