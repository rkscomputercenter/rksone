-- Fix Supabase RLS warning: enable Row Level Security on Prisma's internal
-- migration tracking table. Our backend uses a service-role connection so
-- this has zero functional impact — it only suppresses the Supabase
-- security advisor warning about PostgREST exposure.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
