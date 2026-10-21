CREATE TABLE "login_attempts" (
    "ip_address" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "past_blocks" INTEGER NOT NULL DEFAULT 0,
    "blocked_until" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("ip_address")
);
