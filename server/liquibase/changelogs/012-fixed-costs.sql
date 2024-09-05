-- liquibase formatted sql

-- changeset ?:1725493473753-1
ALTER TABLE "categories" ADD "fixed_costs" BOOLEAN DEFAULT FALSE NOT NULL;

