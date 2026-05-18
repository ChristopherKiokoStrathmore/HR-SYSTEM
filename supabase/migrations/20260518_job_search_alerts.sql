-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Advanced job search + job alerts system
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend job_postings with location + experience level
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS location_name    TEXT,
  ADD COLUMN IF NOT EXISTS location_lat     NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS location_lng     NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS experience_level TEXT
    CHECK (experience_level IN ('entry', 'mid', 'senior', 'executive'));

-- 2. Job alert subscriptions
CREATE TABLE IF NOT EXISTS job_alerts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT,
  email             TEXT        NOT NULL,
  phone             TEXT,
  keywords          TEXT[]      NOT NULL DEFAULT '{}',
  categories        TEXT[]      NOT NULL DEFAULT '{}',
  job_types         TEXT[]      NOT NULL DEFAULT '{}',
  experience_levels TEXT[]      NOT NULL DEFAULT '{}',
  location_name     TEXT,
  location_lat      NUMERIC(9,6),
  location_lng      NUMERIC(9,6),
  radius_km         INTEGER     NOT NULL DEFAULT 50,
  frequency         TEXT        NOT NULL DEFAULT 'instant'
                    CHECK (frequency IN ('instant', 'daily', 'weekly')),
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  unsubscribe_token UUID        NOT NULL DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Notification log — prevents re-sending same job to same subscriber
CREATE TABLE IF NOT EXISTS job_alert_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id       UUID        NOT NULL REFERENCES job_alerts(id) ON DELETE CASCADE,
  job_posting_id UUID        NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  channel        TEXT        NOT NULL CHECK (channel IN ('email', 'sms')),
  status         TEXT        NOT NULL DEFAULT 'sent',
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alert_id, job_posting_id, channel)
);

-- 4. RLS
ALTER TABLE job_alerts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_alert_logs ENABLE ROW LEVEL SECURITY;

-- Public can subscribe (INSERT only)
DROP POLICY IF EXISTS "public_insert_job_alerts" ON job_alerts;
CREATE POLICY "public_insert_job_alerts" ON job_alerts
  FOR INSERT WITH CHECK (TRUE);

-- Public can read their own alert via unsubscribe_token (for unsubscribe page)
DROP POLICY IF EXISTS "token_select_job_alerts" ON job_alerts;
CREATE POLICY "token_select_job_alerts" ON job_alerts
  FOR SELECT USING (TRUE);

-- Service role bypasses RLS — used by notify API route
