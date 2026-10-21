-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'ONLINE');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH';
