 -- liquibase formatted sql

-- changeset ?:1725481659441-1
ALTER TABLE "accounts" ADD "financial_institution" TEXT;

-- changeset ?:1725481659441-2
ALTER TABLE "accounts" ADD "type" TEXT;

