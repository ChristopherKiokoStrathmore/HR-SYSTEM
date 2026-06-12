-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add tracking_token to candidates
-- Each candidate gets a unique token so they can check their application status.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS tracking_token UUID NOT NULL DEFAULT gen_random_uuid();

-- 'portal' = submitted via careers.sheerlogicltd.com, 'manual' = added by HR in dashboard
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('portal', 'manual'));

CREATE UNIQUE INDEX IF NOT EXISTS candidates_tracking_token_key
  ON candidates (tracking_token);
