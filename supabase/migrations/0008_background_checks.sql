-- ─────────────────────────────────────────────────────────────
-- MIGRATION: Background Checks Module
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────

CREATE TYPE background_check_type AS ENUM (
  'criminal',           -- Police Clearance Certificate (PCC)
  'credit',             -- Credit history check
  'employment',         -- Previous employment verification
  'education',          -- Education/degree verification
  'professional'        -- Professional license verification
);

CREATE TYPE background_check_status AS ENUM (
  'pending',            -- Check requested, not started
  'in_progress',        -- Check is being processed
  'completed',          -- Check done, awaiting review
  'passed',             -- Cleared - no issues found
  'failed',             -- Did not pass - disqualifying issues
  'flagged'             -- Passed with concerns (requires HR review)
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: companies (add background check settings)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  background_check_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  background_check_blocks_hiring BOOLEAN NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────
-- TABLE: background_checks
-- ─────────────────────────────────────────────────────────────

CREATE TABLE background_checks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted            BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id             UUID NOT NULL,

  -- Subject of the check (employee or candidate)
  employee_id           UUID REFERENCES employee_profiles(id) ON DELETE CASCADE,
  candidate_id          UUID REFERENCES candidates(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL REFERENCES companies(id),

  -- Check details
  check_type            background_check_type NOT NULL,
  status                background_check_status NOT NULL DEFAULT 'pending',

  -- Request info
  requested_by          UUID NOT NULL REFERENCES users(id),
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Document upload (manual PCC)
  document_url          TEXT,
  document_uploaded_at  TIMESTAMPTZ,

  -- External provider (for API integrations)
  provider_name         TEXT DEFAULT 'manual',  -- 'manual', 'checkr', etc.
  provider_reference    TEXT,
  provider_response     JSONB,

  -- Results
  completed_at          TIMESTAMPTZ,
  reviewed_by           UUID REFERENCES users(id),
  result_summary        TEXT,
  clearance_date        DATE,
  expiry_date           DATE,
  flags                 TEXT[] DEFAULT '{}',  -- Array of concerns found

  -- Notes
  notes                 TEXT,

  -- Constraint: must have either employee_id or candidate_id
  CONSTRAINT check_has_subject CHECK (
    (employee_id IS NOT NULL) OR (candidate_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_background_checks_employee ON background_checks(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_background_checks_candidate ON background_checks(candidate_id) WHERE candidate_id IS NOT NULL;
CREATE INDEX idx_background_checks_company ON background_checks(company_id);
CREATE INDEX idx_background_checks_status ON background_checks(status);
CREATE INDEX idx_background_checks_type ON background_checks(check_type);
CREATE INDEX idx_background_checks_expiry ON background_checks(expiry_date) WHERE expiry_date IS NOT NULL;

-- Auto-update timestamp trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON background_checks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE background_checks ENABLE ROW LEVEL SECURITY;

-- Super Admin bypasses all
CREATE POLICY "bg_checks_super_admin" ON background_checks
  FOR ALL
  USING (current_user_role() = 'super_admin');

-- HR Admins can manage company background checks
CREATE POLICY "bg_checks_hr_admin" ON background_checks
  FOR ALL
  USING (
    current_user_role() = 'hr_admin' AND
    company_id = current_user_company_id()
  );

-- Managers can view their company's background checks
CREATE POLICY "bg_checks_manager_read" ON background_checks
  FOR SELECT
  USING (
    current_user_role() = 'manager' AND
    company_id = current_user_company_id()
  );

-- Employees can view their own background checks
CREATE POLICY "bg_checks_employee_own" ON background_checks
  FOR SELECT
  USING (
    employee_id = current_employee_id()
  );

-- ─────────────────────────────────────────────────────────────
-- FUNCTION: Check if candidate can be hired (background check gate)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION can_hire_candidate(p_candidate_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_requires_check BOOLEAN;
  v_blocks_hiring BOOLEAN;
  v_has_passed_check BOOLEAN;
  v_pending_checks INT;
BEGIN
  -- Get the company settings for this candidate
  SELECT
    jp.company_id,
    COALESCE(c.background_check_required, FALSE),
    COALESCE(c.background_check_blocks_hiring, FALSE)
  INTO v_company_id, v_requires_check, v_blocks_hiring
  FROM candidates cand
  JOIN job_postings jp ON jp.id = cand.job_posting_id
  JOIN companies c ON c.id = jp.company_id
  WHERE cand.id = p_candidate_id;

  -- If background checks not required, allow hiring
  IF NOT v_requires_check THEN
    RETURN jsonb_build_object(
      'can_hire', TRUE,
      'reason', 'background_check_not_required'
    );
  END IF;

  -- Check if candidate has a passed background check
  SELECT EXISTS (
    SELECT 1 FROM background_checks
    WHERE candidate_id = p_candidate_id
      AND status = 'passed'
      AND is_deleted = FALSE
  ) INTO v_has_passed_check;

  -- Count pending checks
  SELECT COUNT(*) INTO v_pending_checks
  FROM background_checks
  WHERE candidate_id = p_candidate_id
    AND status IN ('pending', 'in_progress')
    AND is_deleted = FALSE;

  -- If has passed check, allow hiring
  IF v_has_passed_check THEN
    RETURN jsonb_build_object(
      'can_hire', TRUE,
      'reason', 'background_check_passed'
    );
  END IF;

  -- If blocks hiring and no passed check
  IF v_blocks_hiring THEN
    RETURN jsonb_build_object(
      'can_hire', FALSE,
      'reason', 'background_check_required',
      'pending_checks', v_pending_checks
    );
  END IF;

  -- Soft block - can hire but with warning
  RETURN jsonb_build_object(
    'can_hire', TRUE,
    'warning', TRUE,
    'reason', 'background_check_incomplete',
    'pending_checks', v_pending_checks
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
