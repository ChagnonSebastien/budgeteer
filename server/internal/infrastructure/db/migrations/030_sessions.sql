-- +goose Up

-- changeset ?:1792368000000-1
CREATE TABLE "sessions" (
    "id"         TEXT        NOT NULL,
    "user_id"    UUID        NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "expires_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- changeset ?:1792368000000-2
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
