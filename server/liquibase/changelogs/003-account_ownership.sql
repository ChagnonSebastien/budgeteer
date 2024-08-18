-- liquibase formatted sql

-- changeset ?:1723938534793-1
ALTER TABLE "accounts" ADD "is_mine" BOOLEAN DEFAULT FALSE NOT NULL;

