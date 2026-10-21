-- CreateTable
CREATE TABLE "user_daily_analytics_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "income" DECIMAL(12,2) NOT NULL,
    "cashIncome" DECIMAL(12,2) NOT NULL,
    "onlineIncome" DECIMAL(12,2) NOT NULL,
    "otherIncome" DECIMAL(12,2) NOT NULL,
    "shopXeroxIncome" DECIMAL(12,2) NOT NULL,
    "expenses" DECIMAL(12,2) NOT NULL,
    "profit" DECIMAL(12,2) NOT NULL,
    "transaction_count" INTEGER NOT NULL,

    CONSTRAINT "user_daily_analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_analytics_snapshots_user_id_date_key" ON "user_daily_analytics_snapshots"("user_id", "date");

-- AddForeignKey
ALTER TABLE "user_daily_analytics_snapshots" ADD CONSTRAINT "user_daily_analytics_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
