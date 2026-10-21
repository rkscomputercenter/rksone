-- Revoke usage on the public schema from Supabase API roles
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

-- Revoke all privileges on all existing tables in the public schema
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Ensure any future tables created in the public schema also have privileges revoked
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
