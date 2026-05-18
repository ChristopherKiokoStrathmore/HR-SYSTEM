-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY POLICIES
-- ─────────────────────────────────────────────────────────────
-- Pattern: 3 policies per table
--   1. Employees see own rows
--   2. HR Admins see company rows
--   3. Super Admin bypasses all
-- ─────────────────────────────────────────────────────────────

-- Helper function: get role of current user
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid() AND is_deleted = FALSE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get company_id of current user
CREATE OR REPLACE FUNCTION current_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid() AND is_deleted = FALSE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get employee profile id of current user
CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID AS $$
  SELECT id FROM employee_profiles WHERE user_id = auth.uid() AND is_deleted = FALSE LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── companies ───────────────────────────────────────────────

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON companies
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see own company" ON companies
  FOR SELECT USING (id = current_user_company_id());

-- ─── users ───────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON users
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company users" ON users
  USING (company_id = current_user_company_id());

CREATE POLICY "Employees see own user" ON users
  FOR SELECT USING (id = auth.uid());

-- ─── employee_profiles ───────────────────────────────────────

ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON employee_profiles
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company employees" ON employee_profiles
  USING (company_id = current_user_company_id());

CREATE POLICY "Employees see own profile" ON employee_profiles
  FOR SELECT USING (user_id = auth.uid());

-- ─── documents ───────────────────────────────────────────────

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON documents
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company documents" ON documents
  USING (
    employee_id IN (
      SELECT id FROM employee_profiles
      WHERE company_id = current_user_company_id() AND is_deleted = FALSE
    )
  );

CREATE POLICY "Employees see own documents" ON documents
  FOR SELECT USING (employee_id = current_employee_id());

-- ─── job_postings ─────────────────────────────────────────────

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON job_postings
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company postings" ON job_postings
  USING (company_id = current_user_company_id());

-- ─── candidates ───────────────────────────────────────────────

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON candidates
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company candidates" ON candidates
  USING (
    job_posting_id IN (
      SELECT id FROM job_postings
      WHERE company_id = current_user_company_id() AND is_deleted = FALSE
    )
  );

-- ─── attendance ───────────────────────────────────────────────

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON attendance
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company attendance" ON attendance
  USING (company_id = current_user_company_id());

CREATE POLICY "Employees see own attendance" ON attendance
  FOR SELECT USING (employee_id = current_employee_id());

-- ─── leaves ───────────────────────────────────────────────────

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON leaves
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company leaves" ON leaves
  USING (company_id = current_user_company_id());

CREATE POLICY "Employees see own leaves" ON leaves
  FOR SELECT USING (employee_id = current_employee_id());

CREATE POLICY "Employees insert own leaves" ON leaves
  FOR INSERT WITH CHECK (employee_id = current_employee_id());

-- ─── leave_balances ───────────────────────────────────────────

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON leave_balances
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company balances" ON leave_balances
  USING (
    employee_id IN (
      SELECT id FROM employee_profiles
      WHERE company_id = current_user_company_id() AND is_deleted = FALSE
    )
  );

CREATE POLICY "Employees see own balances" ON leave_balances
  FOR SELECT USING (employee_id = current_employee_id());

-- ─── payroll_runs ─────────────────────────────────────────────

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON payroll_runs
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company payroll runs" ON payroll_runs
  USING (company_id = current_user_company_id());

-- ─── payroll_records ──────────────────────────────────────────

ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON payroll_records
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company payroll" ON payroll_records
  USING (
    payroll_run_id IN (
      SELECT id FROM payroll_runs
      WHERE company_id = current_user_company_id() AND is_deleted = FALSE
    )
  );

CREATE POLICY "Employees see own payslip" ON payroll_records
  FOR SELECT USING (employee_id = current_employee_id());

-- ─── kpi_assignments ──────────────────────────────────────────

ALTER TABLE kpi_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON kpi_assignments
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company KPIs" ON kpi_assignments
  USING (
    employee_id IN (
      SELECT id FROM employee_profiles
      WHERE company_id = current_user_company_id() AND is_deleted = FALSE
    )
  );

CREATE POLICY "Employees see own KPIs" ON kpi_assignments
  FOR SELECT USING (employee_id = current_employee_id());

-- ─── performance_reviews ──────────────────────────────────────

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON performance_reviews
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company reviews" ON performance_reviews
  USING (
    employee_id IN (
      SELECT id FROM employee_profiles
      WHERE company_id = current_user_company_id() AND is_deleted = FALSE
    )
  );

CREATE POLICY "Employees see own reviews" ON performance_reviews
  FOR SELECT USING (employee_id = current_employee_id());

-- ─── training_sessions ────────────────────────────────────────

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON training_sessions
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company training" ON training_sessions
  USING (company_id = current_user_company_id());

CREATE POLICY "Employees see training" ON training_sessions
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM employee_profiles
      WHERE user_id = auth.uid() AND is_deleted = FALSE LIMIT 1
    )
  );

-- ─── training_attendees ───────────────────────────────────────

ALTER TABLE training_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON training_attendees
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins manage attendees" ON training_attendees
  USING (
    training_session_id IN (
      SELECT id FROM training_sessions
      WHERE company_id = current_user_company_id() AND is_deleted = FALSE
    )
  );

-- ─── medical_records ──────────────────────────────────────────

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON medical_records
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company medical" ON medical_records
  USING (
    employee_id IN (
      SELECT id FROM employee_profiles
      WHERE company_id = current_user_company_id() AND is_deleted = FALSE
    )
  );

CREATE POLICY "Employees see own medical" ON medical_records
  FOR SELECT USING (employee_id = current_employee_id());

-- ─── audit_logs ───────────────────────────────────────────────

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin sees all logs" ON audit_logs
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins see company logs" ON audit_logs
  USING (company_id = current_user_company_id());

-- ─── announcements ────────────────────────────────────────────

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin bypasses all" ON announcements
  USING (current_user_role() = 'super_admin');

CREATE POLICY "HR Admins manage company announcements" ON announcements
  USING (company_id = current_user_company_id());

CREATE POLICY "Employees see active announcements" ON announcements
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM employee_profiles
      WHERE user_id = auth.uid() AND is_deleted = FALSE LIMIT 1
    )
    AND (expires_at IS NULL OR expires_at > NOW())
    AND is_deleted = FALSE
  );
