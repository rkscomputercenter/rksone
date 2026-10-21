-- ============================================================
-- Migration: Add missing schema fields
-- Adds columns and tables that exist in schema.prisma
-- but were never included in the original migrations.
-- ============================================================

-- AlterTable: Add banned_until to users
ALTER TABLE "users" ADD COLUMN "banned_until" TIMESTAMPTZ;

-- CreateTable: sessions
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "login_time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_time" TIMESTAMPTZ,
    "last_seen" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_kicked" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: system_config
CREATE TABLE "system_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_message" TEXT NOT NULL DEFAULT 'Server is under maintenance. Please try again later.',
    "server_message" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable: expense_categories
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: sessions
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_login_time_idx" ON "sessions"("login_time");

-- CreateIndex: expense_categories
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- AddForeignKey: sessions → users
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
