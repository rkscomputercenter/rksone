ALTER TABLE "system_config" ADD COLUMN "auto_cleanup_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "system_config" ADD COLUMN "auto_cleanup_duration_months" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "system_config" ADD COLUMN "last_cleanup_date" TIMESTAMPTZ;
ALTER TABLE "system_config" ADD COLUMN "next_cleanup_date" TIMESTAMPTZ;

CREATE TABLE "data_exports" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_data" BYTEA NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "scheduled_for" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "data_exports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_analytics_snapshots" (
    "date" DATE NOT NULL,
    "income" DECIMAL(12,2) NOT NULL,
    "cashIncome" DECIMAL(12,2) NOT NULL,
    "onlineIncome" DECIMAL(12,2) NOT NULL,
    "otherIncome" DECIMAL(12,2) NOT NULL,
    "shopXeroxIncome" DECIMAL(12,2) NOT NULL,
    "expenses" DECIMAL(12,2) NOT NULL,
    "profit" DECIMAL(12,2) NOT NULL,
    "transaction_count" INTEGER NOT NULL,

    CONSTRAINT "daily_analytics_snapshots_pkey" PRIMARY KEY ("date")
);
