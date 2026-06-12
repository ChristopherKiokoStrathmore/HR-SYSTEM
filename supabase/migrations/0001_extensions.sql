-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgsodium";   -- Supabase Vault for PII encryption
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- For fuzzy text search on CVs

-- Vault: store a random encryption key for PII columns.
-- Uses uuid concatenation (always available) as the entropy source.
DO $$
BEGIN
  PERFORM vault.create_secret(
    'encryption_key',
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  );
EXCEPTION WHEN others THEN
  -- Vault may already hold this secret from a previous run; ignore.
  NULL;
END $$;
