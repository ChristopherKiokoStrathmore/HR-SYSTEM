-- ─────────────────────────────────────────────────────────────
-- PG_CRON JOBS
-- pg_cron and pg_net must be enabled in the Supabase dashboard:
--   Database → Extensions → pg_cron  (toggle ON)
--   Database → Extensions → pg_net   (toggle ON)
-- This migration is wrapped in an exception block so that
-- the rest of the schema applies even if extensions are absent.
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Contract expiry notifications — daily at 08:00 EAT (05:00 UTC)
  PERFORM cron.schedule(
    'contract-expiry-daily',
    '0 5 * * *',
    $job$
      SELECT net.http_post(
        url     := current_setting('app.supabase_url') || '/functions/v1/contract-expiry-cron',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body    := '{}'::jsonb
      );
    $job$
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_cron not available — skipping cron job registration. Enable pg_cron and pg_net in the Supabase dashboard, then re-run this migration.';
END $$;
