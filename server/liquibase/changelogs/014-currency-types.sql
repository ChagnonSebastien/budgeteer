--liquibase formatted sql

--changeset seb:014-currency-types

ALTER TABLE currencies ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'Liquid';

CREATE TYPE composition_type AS ENUM ('asset', 'region', 'sector');

CREATE TABLE compositions (
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    component_type composition_type NOT NULL,
    component_name TEXT NOT NULL,
    ratio DOUBLE PRECISION NOT NULL,
    date DATE NOT NULL,
    PRIMARY KEY (date, currency_id, component_type, component_name)
);

CREATE INDEX idx_compositions_currency ON compositions(currency_id);
