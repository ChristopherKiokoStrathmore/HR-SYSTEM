-- ─────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('super_admin', 'hr_admin', 'manager', 'employee');
CREATE TYPE employment_type AS ENUM ('white_collar', 'casual');
CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'suspended', 'terminated', 'resigned');
CREATE TYPE payment_method AS ENUM ('bank', 'mpesa', 'airtel');
CREATE TYPE document_type AS ENUM ('id', 'nssf', 'nhif', 'kra', 'bank_details', 'photo', 'contract', 'medical', 'pcc', 'other');
CREATE TYPE document_status AS ENUM ('pending', 'uploaded', 'verified', 'rejected');
CREATE TYPE leave_type AS ENUM ('annual', 'sick', 'maternity', 'paternity', 'study', 'compassionate', 'unpaid', 'adoption', 'family');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day');
CREATE TYPE payroll_run_status AS ENUM ('draft', 'processing', 'completed', 'failed');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE candidate_stage AS ENUM ('screened', 'interview_l1', 'interview_l2', 'offer_sent', 'hired', 'rejected');
CREATE TYPE job_posting_status AS ENUM ('open', 'closed', 'on_hold');
CREATE TYPE fitness_status AS ENUM ('fit', 'fit_with_conditions', 'unfit');
CREATE TYPE announcement_priority AS ENUM ('normal', 'urgent');
CREATE TYPE termination_reason AS ENUM ('resigned', 'terminated', 'contract_end', 'redundancy', 'misconduct');

-- ─────────────────────────────────────────────────────────────
-- HELPER: auto-update updated_at
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- TABLE: companies
-- ─────────────────────────────────────────────────────────────

CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id     UUID NOT NULL DEFAULT gen_random_uuid(),

  name          TEXT NOT NULL,
  logo_url      TEXT,
  industry      TEXT,
  country       TEXT NOT NULL DEFAULT 'Kenya',
  city          TEXT,
  primary_color TEXT,
  contact_email TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: users (extends auth.users)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id         UUID NOT NULL,

  full_name         TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  role              user_role NOT NULL DEFAULT 'employee',
  company_id        UUID NOT NULL REFERENCES companies(id),
  avatar_url        TEXT,
  phone             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'sw')),
  last_login_at     TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: employee_profiles
-- ─────────────────────────────────────────────────────────────

CREATE TABLE employee_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted                BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id                 UUID NOT NULL,

  user_id                   UUID NOT NULL REFERENCES users(id),
  employee_number           TEXT NOT NULL,
  company_id                UUID NOT NULL REFERENCES companies(id),
  department                TEXT,
  job_title                 TEXT NOT NULL,
  employment_type           employment_type NOT NULL,
  employment_status         employment_status NOT NULL DEFAULT 'active',
  manager_id                UUID REFERENCES users(id),
  start_date                DATE NOT NULL,
  end_date                  DATE,
  contract_duration_months  INTEGER,
  salary                    NUMERIC(14, 2) NOT NULL,
  payment_method            payment_method NOT NULL,

  -- PII: encrypted via Supabase Vault
  bank_name                 TEXT,
  bank_account              TEXT,  -- encrypted
  mpesa_number              TEXT,  -- encrypted
  airtel_number             TEXT,  -- encrypted
  nssf_number               TEXT,  -- encrypted
  nhif_number               TEXT,  -- encrypted
  kra_pin                   TEXT,  -- encrypted
  id_number                 TEXT,  -- encrypted

  date_of_birth             DATE,
  gender                    TEXT,
  nationality               TEXT,
  next_of_kin_name          TEXT,
  next_of_kin_phone         TEXT,
  next_of_kin_relationship  TEXT,

  UNIQUE (company_id, employee_number)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON employee_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: documents
-- ─────────────────────────────────────────────────────────────

CREATE TABLE documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id        UUID NOT NULL,

  employee_id      UUID NOT NULL REFERENCES employee_profiles(id),
  type             document_type NOT NULL,
  file_url         TEXT NOT NULL,
  status           document_status NOT NULL DEFAULT 'uploaded',
  rejection_reason TEXT,
  expiry_date      DATE,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by      UUID REFERENCES users(id)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: job_postings
-- ─────────────────────────────────────────────────────────────

CREATE TABLE job_postings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id               UUID NOT NULL,

  company_id              UUID NOT NULL REFERENCES companies(id),
  title                   TEXT NOT NULL,
  department              TEXT,
  description             TEXT NOT NULL,
  required_keywords       TEXT[] NOT NULL DEFAULT '{}',
  nice_to_have_keywords   TEXT[] NOT NULL DEFAULT '{}',
  employment_type         employment_type NOT NULL,
  status                  job_posting_status NOT NULL DEFAULT 'open',
  auto_reject_threshold   INTEGER NOT NULL DEFAULT 30 CHECK (auto_reject_threshold BETWEEN 0 AND 100),
  closing_date            DATE,
  created_by              UUID NOT NULL REFERENCES users(id)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: candidates
-- ─────────────────────────────────────────────────────────────

CREATE TABLE candidates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id            UUID NOT NULL,

  job_posting_id       UUID NOT NULL REFERENCES job_postings(id),
  full_name            TEXT NOT NULL,
  email                TEXT NOT NULL,
  phone                TEXT,
  cv_url               TEXT NOT NULL,
  cv_text              TEXT,
  ai_score             INTEGER CHECK (ai_score BETWEEN 0 AND 100),
  ai_summary           TEXT,
  ai_extracted_skills  TEXT[] NOT NULL DEFAULT '{}',
  ai_experience_years  INTEGER,
  ai_education         TEXT,
  current_stage        candidate_stage NOT NULL DEFAULT 'screened',
  rejection_reason     TEXT,
  notes                TEXT
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: attendance
-- ─────────────────────────────────────────────────────────────

CREATE TABLE attendance (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id           UUID NOT NULL,

  employee_id         UUID NOT NULL REFERENCES employee_profiles(id),
  company_id          UUID NOT NULL REFERENCES companies(id),
  check_in_time       TIMESTAMPTZ,
  check_out_time      TIMESTAMPTZ,
  check_in_lat        DOUBLE PRECISION,
  check_in_lng        DOUBLE PRECISION,
  check_out_lat       DOUBLE PRECISION,
  check_out_lng       DOUBLE PRECISION,
  gps_path            JSONB,
  distance_covered_km DOUBLE PRECISION,
  is_late             BOOLEAN NOT NULL DEFAULT FALSE,
  is_early_departure  BOOLEAN NOT NULL DEFAULT FALSE,
  shift_date          DATE NOT NULL,
  status              attendance_status NOT NULL DEFAULT 'present',

  UNIQUE (employee_id, shift_date)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: leaves
-- ─────────────────────────────────────────────────────────────

CREATE TABLE leaves (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id           UUID NOT NULL,

  employee_id         UUID NOT NULL REFERENCES employee_profiles(id),
  company_id          UUID NOT NULL REFERENCES companies(id),
  leave_type          leave_type NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  days_requested      INTEGER NOT NULL,
  reason              TEXT NOT NULL,
  supporting_doc_url  TEXT,
  status              leave_status NOT NULL DEFAULT 'pending',
  approved_by         UUID REFERENCES users(id),
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON leaves
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: leave_balances
-- ─────────────────────────────────────────────────────────────

CREATE TABLE leave_balances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id      UUID NOT NULL,

  employee_id    UUID NOT NULL REFERENCES employee_profiles(id),
  leave_type     leave_type NOT NULL,
  year           INTEGER NOT NULL,
  total_days     INTEGER NOT NULL DEFAULT 0,
  used_days      INTEGER NOT NULL DEFAULT 0,
  remaining_days INTEGER NOT NULL DEFAULT 0,

  UNIQUE (employee_id, leave_type, year)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: payroll_runs
-- ─────────────────────────────────────────────────────────────

CREATE TABLE payroll_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id        UUID NOT NULL,

  company_id       UUID NOT NULL REFERENCES companies(id),
  period_month     INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year      INTEGER NOT NULL,
  status           payroll_run_status NOT NULL DEFAULT 'draft',
  total_gross      NUMERIC(16, 2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(16, 2) NOT NULL DEFAULT 0,
  total_net        NUMERIC(16, 2) NOT NULL DEFAULT 0,
  run_by           UUID NOT NULL REFERENCES users(id),
  completed_at     TIMESTAMPTZ,

  UNIQUE (company_id, period_month, period_year)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: payroll_records
-- ─────────────────────────────────────────────────────────────

CREATE TABLE payroll_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id         UUID NOT NULL,

  payroll_run_id    UUID NOT NULL REFERENCES payroll_runs(id),
  employee_id       UUID NOT NULL REFERENCES employee_profiles(id),
  gross_salary      NUMERIC(14, 2) NOT NULL,
  paye              NUMERIC(14, 2) NOT NULL DEFAULT 0,
  nssf              NUMERIC(14, 2) NOT NULL DEFAULT 0,
  nhif              NUMERIC(14, 2) NOT NULL DEFAULT 0,
  helb              NUMERIC(14, 2) NOT NULL DEFAULT 0,
  other_deductions  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_salary        NUMERIC(14, 2) NOT NULL,
  payment_method    payment_method NOT NULL,
  payment_status    payment_status NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  paid_at           TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON payroll_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: kpi_assignments
-- ─────────────────────────────────────────────────────────────

CREATE TABLE kpi_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id       UUID NOT NULL,

  employee_id     UUID NOT NULL REFERENCES employee_profiles(id),
  template_id     UUID,
  period_quarter  INTEGER NOT NULL CHECK (period_quarter BETWEEN 1 AND 4),
  period_year     INTEGER NOT NULL,
  targets         JSONB NOT NULL DEFAULT '[]',
  scores          JSONB NOT NULL DEFAULT '[]',
  final_score     NUMERIC(5, 2),
  reviewed_by     UUID REFERENCES users(id),
  submitted_at    TIMESTAMPTZ,

  UNIQUE (employee_id, period_quarter, period_year)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON kpi_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: performance_reviews
-- ─────────────────────────────────────────────────────────────

CREATE TABLE performance_reviews (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id               UUID NOT NULL,

  employee_id             UUID NOT NULL REFERENCES employee_profiles(id),
  reviewer_id             UUID NOT NULL REFERENCES users(id),
  period                  TEXT NOT NULL,
  rating                  INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  strengths               TEXT,
  improvements            TEXT,
  promotion_recommended   BOOLEAN NOT NULL DEFAULT FALSE,
  award_given             TEXT,
  notes                   TEXT
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON performance_reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: training_sessions
-- ─────────────────────────────────────────────────────────────

CREATE TABLE training_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id    UUID NOT NULL,

  company_id   UUID NOT NULL REFERENCES companies(id),
  title        TEXT NOT NULL,
  description  TEXT,
  trainer_name TEXT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  department   TEXT
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON training_sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: training_attendees (junction)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE training_attendees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID NOT NULL REFERENCES training_sessions(id),
  employee_id         UUID NOT NULL REFERENCES employee_profiles(id),
  attended            BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (training_session_id, employee_id)
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: medical_records
-- ─────────────────────────────────────────────────────────────

CREATE TABLE medical_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id      UUID NOT NULL,

  employee_id    UUID NOT NULL REFERENCES employee_profiles(id),
  record_type    TEXT NOT NULL,
  file_url       TEXT NOT NULL,
  fitness_status fitness_status NOT NULL,
  issued_by      TEXT,
  issued_date    DATE NOT NULL,
  expiry_date    DATE,
  notes          TEXT
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: audit_logs
-- ─────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  company_id  UUID NOT NULL REFERENCES companies(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: announcements
-- ─────────────────────────────────────────────────────────────

CREATE TABLE announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id  UUID NOT NULL,

  company_id UUID NOT NULL REFERENCES companies(id),
  department TEXT,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  priority   announcement_priority NOT NULL DEFAULT 'normal',
  created_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
