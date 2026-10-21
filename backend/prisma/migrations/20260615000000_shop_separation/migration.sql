-- CreateEnum
CREATE TYPE "Shop" AS ENUM ('SHOP_COMPUTER', 'SHOP_XEROX');



-- AlterTable
ALTER TABLE "users" ADD COLUMN "shop_access" "Shop"[] DEFAULT ARRAY['SHOP_COMPUTER']::"Shop"[];

-- AlterTable
ALTER TABLE "services" ADD COLUMN "shop" "Shop" NOT NULL DEFAULT 'SHOP_COMPUTER';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "shop" "Shop" NOT NULL DEFAULT 'SHOP_COMPUTER';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "shop" "Shop" NOT NULL DEFAULT 'SHOP_COMPUTER';

-- AlterTable daily_analytics_snapshots
ALTER TABLE "daily_analytics_snapshots" ADD COLUMN "shop" "Shop" NOT NULL DEFAULT 'SHOP_COMPUTER';
ALTER TABLE "daily_analytics_snapshots" DROP CONSTRAINT "daily_analytics_snapshots_pkey";
-- To add an id column that is the primary key with random uuid:
ALTER TABLE "daily_analytics_snapshots" ADD COLUMN "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "daily_analytics_snapshots" ADD CONSTRAINT "daily_analytics_snapshots_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "daily_analytics_snapshots_date_shop_key" ON "daily_analytics_snapshots"("date", "shop");

-- AlterTable user_daily_analytics_snapshots
ALTER TABLE "user_daily_analytics_snapshots" ADD COLUMN "shop" "Shop" NOT NULL DEFAULT 'SHOP_COMPUTER';
DROP INDEX "user_daily_analytics_snapshots_user_id_date_key";
CREATE UNIQUE INDEX "user_daily_analytics_snapshots_user_id_date_shop_key" ON "user_daily_analytics_snapshots"("user_id", "date", "shop");

-- --------------------------------------------------------
-- Data Migration
-- --------------------------------------------------------

-- 1. Migrate SHOP_XEROX transactions
UPDATE "transactions" 
SET "shop" = 'SHOP_XEROX', "payment_method" = 'CASH'
WHERE "payment_method" = 'SHOP_XEROX';

-- 2. Migrate SHOP_XEROX services (If any existing services match a certain pattern, we could move them here. 
-- The user said "keep some the serive with xerox to shop-xerox." We can move services containing 'xerox' or 'copy'.
UPDATE "services" 
SET "shop" = 'SHOP_XEROX' 
WHERE "name" ILIKE '%xerox%' OR "name" ILIKE '%copy%' OR "name" ILIKE '%print%';
