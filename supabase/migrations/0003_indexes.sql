-- ─────────────────────────────────────────────────────────────
-- INDEXES — all FK columns, tenant_id, status, date ranges
-- ─────────────────────────────────────────────────────────────

-- companies
CREATE INDEX idx_companies_tenant_id ON companies(tenant_id);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- users
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- employee_profiles
CREATE INDEX idx_emp_user_id ON employee_profiles(user_id);
CREATE INDEX idx_emp_company_id ON employee_profiles(company_id);
CREATE INDEX idx_emp_manager_id ON employee_profiles(manager_id);
CREATE INDEX idx_emp_status ON employee_profiles(employment_status);
CREATE INDEX idx_emp_type ON employee_profiles(employment_type);
CREATE INDEX idx_emp_tenant_id ON employee_profiles(tenant_id);
CREATE INDEX idx_emp_start_date ON employee_profiles(start_date);
CREATE INDEX idx_emp_end_date ON employee_profiles(end_date);

-- documents
CREATE INDEX idx_docs_employee_id ON documents(employee_id);
CREATE INDEX idx_docs_status ON documents(status);
CREATE INDEX idx_docs_type ON documents(type);
CREATE INDEX idx_docs_tenant_id ON documents(tenant_id);
CREATE INDEX idx_docs_expiry_date ON documents(expiry_date);

-- job_postings
CREATE INDEX idx_jobs_company_id ON job_postings(company_id);
CREATE INDEX idx_jobs_status ON job_postings(status);
CREATE INDEX idx_jobs_tenant_id ON job_postings(tenant_id);
CREATE INDEX idx_jobs_closing_date ON job_postings(closing_date);

-- candidates
CREATE INDEX idx_candidates_job_id ON candidates(job_posting_id);
CREATE INDEX idx_candidates_stage ON candidates(current_stage);
CREATE INDEX idx_candidates_tenant_id ON candidates(tenant_id);
CREATE INDEX idx_candidates_ai_score ON candidates(ai_score DESC);

-- attendance
CREATE INDEX idx_att_employee_id ON attendance(employee_id);
CREATE INDEX idx_att_company_id ON attendance(company_id);
CREATE INDEX idx_att_shift_date ON attendance(shift_date);
CREATE INDEX idx_att_status ON attendance(status);
CREATE INDEX idx_att_tenant_id ON attendance(tenant_id);

-- leaves
CREATE INDEX idx_leaves_employee_id ON leaves(employee_id);
CREATE INDEX idx_leaves_company_id ON leaves(company_id);
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_leaves_type ON leaves(leave_type);
CREATE INDEX idx_leaves_start_date ON leaves(start_date);
CREATE INDEX idx_leaves_end_date ON leaves(end_date);
CREATE INDEX idx_leaves_tenant_id ON leaves(tenant_id);

-- leave_balances
CREATE INDEX idx_lb_employee_id ON leave_balances(employee_id);
CREATE INDEX idx_lb_year ON leave_balances(year);
CREATE INDEX idx_lb_tenant_id ON leave_balances(tenant_id);

-- payroll_runs
CREATE INDEX idx_pr_company_id ON payroll_runs(company_id);
CREATE INDEX idx_pr_status ON payroll_runs(status);
CREATE INDEX idx_pr_period ON payroll_runs(period_year, period_month);
CREATE INDEX idx_pr_tenant_id ON payroll_runs(tenant_id);

-- payroll_records
CREATE INDEX idx_prec_run_id ON payroll_records(payroll_run_id);
CREATE INDEX idx_prec_employee_id ON payroll_records(employee_id);
CREATE INDEX idx_prec_status ON payroll_records(payment_status);
CREATE INDEX idx_prec_tenant_id ON payroll_records(tenant_id);

-- kpi_assignments
CREATE INDEX idx_kpi_employee_id ON kpi_assignments(employee_id);
CREATE INDEX idx_kpi_period ON kpi_assignments(period_year, period_quarter);
CREATE INDEX idx_kpi_tenant_id ON kpi_assignments(tenant_id);

-- performance_reviews
CREATE INDEX idx_perf_employee_id ON performance_reviews(employee_id);
CREATE INDEX idx_perf_reviewer_id ON performance_reviews(reviewer_id);
CREATE INDEX idx_perf_tenant_id ON performance_reviews(tenant_id);

-- training_sessions
CREATE INDEX idx_train_company_id ON training_sessions(company_id);
CREATE INDEX idx_train_start_date ON training_sessions(start_date);
CREATE INDEX idx_train_tenant_id ON training_sessions(tenant_id);

-- medical_records
CREATE INDEX idx_med_employee_id ON medical_records(employee_id);
CREATE INDEX idx_med_expiry_date ON medical_records(expiry_date);
CREATE INDEX idx_med_tenant_id ON medical_records(tenant_id);

-- audit_logs
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);

-- announcements
CREATE INDEX idx_ann_company_id ON announcements(company_id);
CREATE INDEX idx_ann_tenant_id ON announcements(tenant_id);
CREATE INDEX idx_ann_expires_at ON announcements(expires_at);

-- Full-text search on CV text
CREATE INDEX idx_candidates_cv_text_fts ON candidates USING GIN(to_tsvector('english', COALESCE(cv_text, '')));
