-- Add is_cash column to bank_accounts
-- Cash is a payment method without tracked balance
ALTER TABLE "bank_accounts" ADD COLUMN "is_cash" BOOLEAN NOT NULL DEFAULT false;
