-- liquibase formatted sql

-- changeset ?:1723990560495-1
ALTER TABLE "currencies" ADD "decimal_points" SMALLINT DEFAULT 2 NOT NULL;

