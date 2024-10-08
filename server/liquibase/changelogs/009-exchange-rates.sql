-- liquibase formatted sql

-- changeset ?:1724174253437-1
CREATE TABLE "exchangerates" ("id" INTEGER GENERATED BY DEFAULT AS IDENTITY NOT NULL, "a" INTEGER NOT NULL, "b" INTEGER NOT NULL, "rate" DOUBLE PRECISION NOT NULL, "date" TEXT NOT NULL, CONSTRAINT "exchangerates_pkey" PRIMARY KEY ("id"));

-- changeset ?:1724174253437-2
ALTER TABLE "exchangerates" ADD CONSTRAINT "exchangerates_a_b_date_key" UNIQUE ("a", "b", "date");

-- changeset ?:1724174253437-3
ALTER TABLE "exchangerates" ADD CONSTRAINT "exchangerates_a_fkey" FOREIGN KEY ("a") REFERENCES "currencies" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION;

-- changeset ?:1724174253437-4
ALTER TABLE "exchangerates" ADD CONSTRAINT "exchangerates_b_fkey" FOREIGN KEY ("b") REFERENCES "currencies" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION;

