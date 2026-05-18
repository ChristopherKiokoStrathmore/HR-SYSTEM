-- ─────────────────────────────────────────────────────────────
-- SEED DATA — Demo data for prototype / staging
-- ─────────────────────────────────────────────────────────────
-- HOW TO USE:
--   1. Create Supabase auth users first (Dashboard → Auth → Users or CLI):
--      supabase auth users create --email admin@demo.co.ke --password Demo1234!
--      Repeat for: hr@demo.co.ke, manager@demo.co.ke, david@demo.co.ke,
--                  esther@demo.co.ke, felix@demo.co.ke, grace@demo.co.ke, henry@demo.co.ke
--   2. Copy the generated auth user UUIDs into the uid_* variables below
--   3. Run: supabase db reset  (runs migrations + this seed)
--      OR:  psql $DATABASE_URL -f supabase/seed.sql
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  tid  UUID := '11111111-0000-0000-0000-000000000001';
  cid1 UUID := '11111111-0000-0000-0000-000000000001';
  cid2 UUID := '11111111-0000-0000-0000-000000000002';
  cid3 UUID := '11111111-0000-0000-0000-000000000003';

  -- !! Replace these with real auth.users UUIDs after creating them !!
  uid_admin UUID := '00000000-0000-0000-0000-000000000001';
  uid_hr    UUID := '00000000-0000-0000-0000-000000000002';
  uid_mgr   UUID := '00000000-0000-0000-0000-000000000003';
  uid_e1    UUID := '00000000-0000-0000-0000-000000000004';
  uid_e2    UUID := '00000000-0000-0000-0000-000000000005';
  uid_e3    UUID := '00000000-0000-0000-0000-000000000006';
  uid_e4    UUID := '00000000-0000-0000-0000-000000000007';
  uid_e5    UUID := '00000000-0000-0000-0000-000000000008';

  -- Employee profile UUIDs
  ep_mgr UUID := 'eeee0000-0000-0000-0000-000000000001';
  ep_e1  UUID := 'eeee0000-0000-0000-0000-000000000002';
  ep_e2  UUID := 'eeee0000-0000-0000-0000-000000000003';
  ep_e3  UUID := 'eeee0000-0000-0000-0000-000000000004';
  ep_e4  UUID := 'eeee0000-0000-0000-0000-000000000005';
  ep_e5  UUID := 'eeee0000-0000-0000-0000-000000000006';
BEGIN

-- ── Companies ────────────────────────────────────────────────
INSERT INTO companies (id, tenant_id, name, industry, country, city, contact_email, is_active)
VALUES
  (cid1, tid, 'Sheer Logic Management Consultants', 'HR Outsourcing',  'Kenya', 'Nairobi', 'info@sheerlogicltd.com', TRUE),
  (cid2, tid, 'Acme Corp Kenya',                    'Manufacturing',   'Kenya', 'Mombasa', 'hr@acme.co.ke',          TRUE),
  (cid3, tid, 'Savanna Tech Ltd',                   'Technology',      'Kenya', 'Nairobi', 'people@savannatech.co.ke', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── Users (auth.users must exist first) ─────────────────────
INSERT INTO users (id, tenant_id, full_name, email, role, company_id, is_active, preferred_language)
VALUES (uid_admin, tid, 'Alice Kamau', 'admin@demo.co.ke', 'super_admin', cid1, TRUE, 'en')
ON CONFLICT (email) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  is_active = EXCLUDED.is_active,
  preferred_language = EXCLUDED.preferred_language
RETURNING id INTO uid_admin;

INSERT INTO users (id, tenant_id, full_name, email, role, company_id, is_active, preferred_language)
VALUES (uid_hr, tid, 'Brian Otieno', 'hr@demo.co.ke', 'hr_admin', cid2, TRUE, 'en')
ON CONFLICT (email) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  is_active = EXCLUDED.is_active,
  preferred_language = EXCLUDED.preferred_language
RETURNING id INTO uid_hr;

INSERT INTO users (id, tenant_id, full_name, email, role, company_id, is_active, preferred_language)
VALUES (uid_mgr, tid, 'Carol Njeri', 'manager@demo.co.ke', 'manager', cid2, TRUE, 'en')
ON CONFLICT (email) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  is_active = EXCLUDED.is_active,
  preferred_language = EXCLUDED.preferred_language
RETURNING id INTO uid_mgr;

INSERT INTO users (id, tenant_id, full_name, email, role, company_id, is_active, preferred_language)
VALUES (uid_e1, tid, 'David Kimani', 'david@demo.co.ke', 'employee', cid2, TRUE, 'en')
ON CONFLICT (email) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  is_active = EXCLUDED.is_active,
  preferred_language = EXCLUDED.preferred_language
RETURNING id INTO uid_e1;

INSERT INTO users (id, tenant_id, full_name, email, role, company_id, is_active, preferred_language)
VALUES (uid_e2, tid, 'Esther Wangui', 'esther@demo.co.ke', 'employee', cid2, TRUE, 'sw')
ON CONFLICT (email) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  is_active = EXCLUDED.is_active,
  preferred_language = EXCLUDED.preferred_language
RETURNING id INTO uid_e2;

INSERT INTO users (id, tenant_id, full_name, email, role, company_id, is_active, preferred_language)
VALUES (uid_e3, tid, 'Felix Omondi', 'felix@demo.co.ke', 'employee', cid2, TRUE, 'en')
ON CONFLICT (email) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  is_active = EXCLUDED.is_active,
  preferred_language = EXCLUDED.preferred_language
RETURNING id INTO uid_e3;

INSERT INTO users (id, tenant_id, full_name, email, role, company_id, is_active, preferred_language)
VALUES (uid_e4, tid, 'Grace Achieng', 'grace@demo.co.ke', 'employee', cid3, TRUE, 'en')
ON CONFLICT (email) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  is_active = EXCLUDED.is_active,
  preferred_language = EXCLUDED.preferred_language
RETURNING id INTO uid_e4;

INSERT INTO users (id, tenant_id, full_name, email, role, company_id, is_active, preferred_language)
VALUES (uid_e5, tid, 'Henry Mwangi', 'henry@demo.co.ke', 'employee', cid3, TRUE, 'en')
ON CONFLICT (email) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  is_active = EXCLUDED.is_active,
  preferred_language = EXCLUDED.preferred_language
RETURNING id INTO uid_e5;

-- ── Employee Profiles ────────────────────────────────────────
INSERT INTO employee_profiles (
  id, tenant_id, user_id, employee_number, company_id,
  department, job_title, employment_type, employment_status,
  manager_id, start_date, salary, payment_method,
  bank_name, bank_account, nssf_number, nhif_number, kra_pin,
  id_number, date_of_birth, gender, nationality
)
VALUES
  (ep_mgr, tid, uid_mgr, 'ACM-001', cid2,
   'Management', 'HR Manager', 'white_collar', 'active',
   NULL, '2021-03-01', 150000, 'bank', 'Equity Bank', '0123456789', 'NSSF001', 'NHIF001', 'A001234567K',
   '12345678', '1985-06-15', 'Female', 'Kenyan'),

  (ep_e1, tid, uid_e1, 'ACM-002', cid2,
   'Engineering', 'Software Engineer', 'white_collar', 'active',
   ep_mgr, '2022-01-10', 120000, 'mpesa', NULL, NULL, 'NSSF002', 'NHIF002', 'A002345678K',
   '23456789', '1990-11-20', 'Male', 'Kenyan'),

  (ep_e2, tid, uid_e2, 'ACM-003', cid2,
   'Finance', 'Accountant', 'white_collar', 'active',
   ep_mgr, '2022-06-15', 95000, 'bank', 'KCB', '9876543210', 'NSSF003', 'NHIF003', 'A003456789K',
   '34567890', '1992-03-08', 'Female', 'Kenyan'),

  (ep_e3, tid, uid_e3, 'ACM-004', cid2,
   'Operations', 'Operations Officer', 'white_collar', 'active',
   ep_mgr, '2023-02-01', 80000, 'bank', 'NCBA', '1122334455', 'NSSF004', 'NHIF004', 'A004567890K',
   '45678901', '1988-09-14', 'Male', 'Kenyan'),

  (ep_e4, tid, uid_e4, 'SVT-001', cid3,
   'Engineering', 'Frontend Developer', 'white_collar', 'active',
   NULL, '2023-05-10', 130000, 'mpesa', NULL, NULL, 'NSSF005', 'NHIF005', 'A005678901K',
   '56789012', '1995-07-22', 'Female', 'Kenyan'),

  (ep_e5, tid, uid_e5, 'SVT-002', cid3,
   'Sales', 'Sales Executive', 'white_collar', 'active',
   NULL, '2024-01-15', 75000, 'bank', 'Cooperative Bank', '5566778899', 'NSSF006', 'NHIF006', 'A006789012K',
   '67890123', '1993-12-30', 'Male', 'Kenyan')
ON CONFLICT (id) DO NOTHING;

-- ── Documents (for onboarding view) ─────────────────────────
INSERT INTO documents (id, tenant_id, employee_id, type, file_url, status, uploaded_at)
VALUES
  -- David: all docs except bank_details
  (gen_random_uuid(), tid, ep_e1, 'id',          'https://storage/demo/id_david.pdf',   'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e1, 'nssf',        'https://storage/demo/nssf_david.pdf', 'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e1, 'nhif',        'https://storage/demo/nhif_david.pdf', 'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e1, 'kra',         'https://storage/demo/kra_david.pdf',  'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e1, 'contract',    'https://storage/demo/ct_david.pdf',   'verified',  NOW()),
  -- Esther: all docs complete
  (gen_random_uuid(), tid, ep_e2, 'id',          'https://storage/demo/id_esther.pdf',  'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e2, 'nssf',        'https://storage/demo/nssf_esther.pdf','verified',  NOW()),
  (gen_random_uuid(), tid, ep_e2, 'nhif',        'https://storage/demo/nhif_esther.pdf','verified',  NOW()),
  (gen_random_uuid(), tid, ep_e2, 'kra',         'https://storage/demo/kra_esther.pdf', 'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e2, 'bank_details','https://storage/demo/bk_esther.pdf',  'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e2, 'contract',    'https://storage/demo/ct_esther.pdf',  'verified',  NOW()),
  -- Grace: NSSF pending
  (gen_random_uuid(), tid, ep_e4, 'id',          'https://storage/demo/id_grace.pdf',   'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e4, 'nhif',        'https://storage/demo/nhif_grace.pdf', 'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e4, 'kra',         'https://storage/demo/kra_grace.pdf',  'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e4, 'bank_details','https://storage/demo/bk_grace.pdf',   'verified',  NOW()),
  (gen_random_uuid(), tid, ep_e4, 'contract',    'https://storage/demo/ct_grace.pdf',   'verified',  NOW())
ON CONFLICT DO NOTHING;

-- ── Leave balances (2026) ────────────────────────────────────
INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type, year, total_days, used_days, remaining_days)
VALUES
  -- David
  (gen_random_uuid(), tid, ep_e1, 'annual',        2026, 21, 5,  16),
  (gen_random_uuid(), tid, ep_e1, 'sick',          2026, 14, 0,  14),
  (gen_random_uuid(), tid, ep_e1, 'study',         2026,  5, 0,   5),
  (gen_random_uuid(), tid, ep_e1, 'compassionate', 2026,  3, 0,   3),
  -- Esther
  (gen_random_uuid(), tid, ep_e2, 'annual',        2026, 21, 0,  21),
  (gen_random_uuid(), tid, ep_e2, 'sick',          2026, 14, 2,  12),
  (gen_random_uuid(), tid, ep_e2, 'study',         2026,  5, 0,   5),
  (gen_random_uuid(), tid, ep_e2, 'compassionate', 2026,  3, 0,   3),
  -- Felix
  (gen_random_uuid(), tid, ep_e3, 'annual',        2026, 21, 0,  21),
  (gen_random_uuid(), tid, ep_e3, 'sick',          2026, 14, 0,  14),
  (gen_random_uuid(), tid, ep_e3, 'study',         2026,  5, 0,   5),
  (gen_random_uuid(), tid, ep_e3, 'compassionate', 2026,  3, 0,   3),
  -- Grace
  (gen_random_uuid(), tid, ep_e4, 'annual',        2026, 21, 0,  21),
  (gen_random_uuid(), tid, ep_e4, 'sick',          2026, 14, 0,  14),
  (gen_random_uuid(), tid, ep_e4, 'study',         2026,  5, 0,   5),
  -- Henry
  (gen_random_uuid(), tid, ep_e5, 'annual',        2026, 21, 0,  21),
  (gen_random_uuid(), tid, ep_e5, 'sick',          2026, 14, 0,  14),
  (gen_random_uuid(), tid, ep_e5, 'study',         2026,  5, 0,   5)
ON CONFLICT (employee_id, leave_type, year) DO NOTHING;

-- ── Leave requests (table: leaves) ──────────────────────────
DELETE FROM leaves WHERE id::text LIKE 'b111%';

INSERT INTO leaves (id, tenant_id, employee_id, company_id,
  leave_type, start_date, end_date, days_requested, reason, status, approved_by, approved_at)
VALUES
  ('b1110000-0000-0000-0000-000000000001', tid, ep_e1, cid2,
   'annual', '2026-04-07', '2026-04-11', 5, 'Family vacation to Diani Beach', 'approved',
   uid_mgr, '2026-04-01 09:00:00+03'),

  ('b1110000-0000-0000-0000-000000000002', tid, ep_e2, cid2,
   'sick', '2026-05-02', '2026-05-03', 2, 'Respiratory infection — doctor visit', 'approved',
   uid_mgr, '2026-05-02 08:30:00+03'),

  ('b1110000-0000-0000-0000-000000000003', tid, ep_e3, cid2,
   'annual', '2026-06-02', '2026-06-06', 5, 'School closing ceremony for children', 'pending',
   NULL, NULL),

  ('b1110000-0000-0000-0000-000000000004', tid, ep_e4, cid3,
   'study', '2026-05-20', '2026-05-22', 3, 'AWS certification exam preparation', 'pending',
   NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Payroll runs — Acme Corp ─────────────────────────────────
DELETE FROM payroll_records
WHERE payroll_run_id IN (
  SELECT id
  FROM payroll_runs
  WHERE company_id = cid2
    AND period_year = 2026
    AND period_month IN (2, 3, 4)
);

DELETE FROM payroll_runs
WHERE company_id = cid2
  AND period_year = 2026
  AND period_month IN (2, 3, 4);

INSERT INTO payroll_runs (id, tenant_id, company_id, period_month, period_year,
  status, total_gross, total_deductions, total_net, run_by)
VALUES
  ('c1110000-0000-0000-0000-000000000001', tid, cid2, 2, 2026, 'completed', 445000, 107250, 337750, uid_hr),
  ('c1110000-0000-0000-0000-000000000002', tid, cid2, 3, 2026, 'completed', 445000, 107250, 337750, uid_hr),
  ('c1110000-0000-0000-0000-000000000003', tid, cid2, 4, 2026, 'completed', 445000, 107250, 337750, uid_hr)
ON CONFLICT (id) DO NOTHING;

-- ── Payroll records — Acme employee history (multiple months) ──
INSERT INTO payroll_records (id, tenant_id, payroll_run_id, employee_id,
  gross_salary, paye, nssf, nhif, helb, other_deductions, net_salary,
  payment_method, payment_status, paid_at)
VALUES
  ('d1110000-0000-0000-0000-000000000001', tid, 'c1110000-0000-0000-0000-000000000003', ep_mgr,
   150000, 35655, 1080, 1700, 0, 0, 111565, 'bank', 'paid', '2026-04-25 14:00:00+03'),
  ('d1110000-0000-0000-0000-000000000002', tid, 'c1110000-0000-0000-0000-000000000003', ep_e1,
   120000, 25875, 1080, 1700, 2000, 0, 89345, 'mpesa', 'paid', '2026-04-25 14:00:00+03'),
  ('d1110000-0000-0000-0000-000000000003', tid, 'c1110000-0000-0000-0000-000000000003', ep_e2,
   95000, 16875, 1080, 1700, 0, 0, 75345, 'bank', 'paid', '2026-04-25 14:00:00+03'),
  ('d1110000-0000-0000-0000-000000000004', tid, 'c1110000-0000-0000-0000-000000000003', ep_e3,
    80000, 11505, 1080, 1700, 0, 0, 65715, 'bank', 'paid', '2026-04-25 14:00:00+03'),
    ('d1110000-0000-0000-0000-000000000005', tid, 'c1110000-0000-0000-0000-000000000002', ep_e1,
    120000, 25875, 1080, 1700, 2000, 0, 89345, 'mpesa', 'paid', '2026-03-25 14:00:00+03'),
    ('d1110000-0000-0000-0000-000000000006', tid, 'c1110000-0000-0000-0000-000000000001', ep_e1,
    120000, 25875, 1080, 1700, 2000, 0, 89345, 'mpesa', 'paid', '2026-02-25 14:00:00+03')
ON CONFLICT (id) DO NOTHING;

-- ── Attendance (David — rolling last 5 days) ───────────────────
DELETE FROM attendance WHERE employee_id = ep_e1 AND company_id = cid2;

INSERT INTO attendance (id, tenant_id, employee_id, company_id,
  shift_date, check_in_time, check_out_time,
  check_in_lat, check_in_lng, status, is_late, is_early_departure)
VALUES
  ('aaaa0000-0000-0000-0000-000000000001', tid, ep_e1, cid2,
    current_date - 4, ((current_date - 4)::text || ' 08:02:00+03')::timestamptz, ((current_date - 4)::text || ' 17:10:00+03')::timestamptz, -1.2921, 36.8219, 'present', FALSE, FALSE),
  ('aaaa0000-0000-0000-0000-000000000002', tid, ep_e1, cid2,
    current_date - 3, ((current_date - 3)::text || ' 08:35:00+03')::timestamptz, ((current_date - 3)::text || ' 17:05:00+03')::timestamptz, -1.2921, 36.8219, 'present', TRUE, FALSE),
  ('aaaa0000-0000-0000-0000-000000000003', tid, ep_e1, cid2,
    current_date - 2, ((current_date - 2)::text || ' 07:55:00+03')::timestamptz, ((current_date - 2)::text || ' 17:30:00+03')::timestamptz, -1.2921, 36.8219, 'present', FALSE, FALSE),
  ('aaaa0000-0000-0000-0000-000000000004', tid, ep_e1, cid2,
    current_date - 1, ((current_date - 1)::text || ' 08:10:00+03')::timestamptz, ((current_date - 1)::text || ' 17:00:00+03')::timestamptz, -1.2921, 36.8219, 'present', FALSE, FALSE),
  ('aaaa0000-0000-0000-0000-000000000005', tid, ep_e1, cid2,
    current_date, (current_date::text || ' 08:55:00+03')::timestamptz, NULL, -1.2921, 36.8219, 'present', TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ── KPI Assignments ──────────────────────────────────────────
DELETE FROM kpi_assignments WHERE employee_id IN (ep_e1, ep_e2) AND period_quarter = 1 AND period_year = 2026;

INSERT INTO kpi_assignments (id, tenant_id, employee_id, period_quarter, period_year,
  targets, scores, final_score, submitted_at)
VALUES
  ('e1110000-0000-0000-0000-000000000001', tid, ep_e1, 1, 2026,
   '[{"name":"Story Points","weight":40,"target":80,"unit":"pts"},{"name":"PR Reviews","weight":30,"target":20},{"name":"Bug Resolution","weight":30,"target":"<2 days"}]'::jsonb,
   '[{"name":"Story Points","actual":85,"score":40},{"name":"PR Reviews","actual":22,"score":30},{"name":"Bug Resolution","actual":"1.5 days","score":28}]'::jsonb,
   98, '2026-04-05 11:00:00+03'),

  ('e1110000-0000-0000-0000-000000000002', tid, ep_e2, 1, 2026,
   '[{"name":"Reports Filed","weight":50,"target":12},{"name":"Reconciliation Accuracy","weight":50,"target":"100%"}]'::jsonb,
   '[{"name":"Reports Filed","actual":12,"score":50},{"name":"Reconciliation Accuracy","actual":"98%","score":45}]'::jsonb,
   95, '2026-04-05 14:00:00+03')
ON CONFLICT (id) DO NOTHING;

-- ── Performance Reviews ──────────────────────────────────────
DELETE FROM performance_reviews WHERE id::text LIKE 'f111%';

INSERT INTO performance_reviews (id, tenant_id, employee_id, reviewer_id, period,
  rating, strengths, improvements, promotion_recommended, notes)
VALUES
  ('f1110000-0000-0000-0000-000000000001', tid, ep_e1, uid_mgr, 'Q1 2026', 5,
   'Exceptional code quality. Mentors junior developers. Proactive in sprint planning.',
   'Documentation could be improved. Sometimes takes on too much solo work.',
   TRUE, 'Recommend promotion to Senior Engineer in Q3 2026'),

  ('f1110000-0000-0000-0000-000000000002', tid, ep_e2, uid_mgr, 'Q1 2026', 4,
   'Highly accurate. Meets all deadlines. Good team player.',
   'Could improve communication with external auditors.',
   FALSE, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Training sessions ────────────────────────────────────────
DELETE FROM training_sessions WHERE id::text LIKE 'a211%';

INSERT INTO training_sessions (id, tenant_id, company_id, title, description,
  trainer_name, start_date, end_date, is_mandatory, department)
VALUES
  ('a2110000-0000-0000-0000-000000000001', tid, cid2,
   'Data Protection Act 2019 Compliance',
   'Annual mandatory training on Kenya Data Protection Act requirements and employee obligations.',
   'Jane Muthoni (DPA Expert)', '2026-05-15', '2026-05-15', TRUE, NULL),

  ('a2110000-0000-0000-0000-000000000002', tid, cid2,
   'Advanced Excel for Finance',
   'Pivot tables, VLOOKUP, Power Query for financial reporting.',
   'CPA Samuel Kariuki', '2026-06-10', '2026-06-11', FALSE, 'Finance'),

  ('a2110000-0000-0000-0000-000000000003', tid, cid3,
   'AWS Cloud Practitioner Bootcamp',
   'Intensive 3-day preparation for AWS Cloud Practitioner certification.',
   'Savanna Tech L&D Team', '2026-05-20', '2026-05-22', FALSE, 'Engineering')
ON CONFLICT (id) DO NOTHING;

-- ── Medical records ──────────────────────────────────────────
DELETE FROM medical_records WHERE id::text LIKE 'b211%';

INSERT INTO medical_records (id, tenant_id, employee_id,
  record_type, fitness_status, issued_by, issued_date, expiry_date, notes, file_url)
VALUES
  ('b2110000-0000-0000-0000-000000000001', tid, ep_e1,
   'Annual Medical Examination', 'fit', 'Aga Khan Hospital Nairobi', '2026-01-15', '2027-01-14', NULL, 'https://storage/demo/med_annual_david.pdf'),
  ('b2110000-0000-0000-0000-000000000002', tid, ep_e4,
   'Pre-Employment Medical', 'fit', 'Nairobi Hospital', '2023-05-05', '2024-05-04', 'All markers normal', 'https://storage/demo/med_preEmp_grace.pdf')
ON CONFLICT (id) DO NOTHING;

-- ── Announcements ────────────────────────────────────────────
DELETE FROM announcements WHERE id::text LIKE 'c211%';

INSERT INTO announcements (id, tenant_id, company_id, title, body, priority, created_by, expires_at)
VALUES
  ('c2110000-0000-0000-0000-000000000001', tid, cid2,
   'Public Holiday — Madaraka Day',
   'June 1st is a public holiday. All staff are off. Essential operations staff will receive communication separately.',
    'normal', uid_hr, '2027-06-02'),

  ('c2110000-0000-0000-0000-000000000002', tid, cid2,
   'URGENT: Biometric System Maintenance',
   'The biometric attendance system will be offline on May 14th 7:00–9:00 AM. Please use the HR portal to log attendance manually.',
    'urgent', uid_hr, '2027-05-14'),

  ('c2110000-0000-0000-0000-000000000003', tid, cid3,
   'New Policy: Remote Work Guidelines',
   'Effective June 1st, all remote employees must log attendance via the HR PWA app with GPS verification. Please ensure location permissions are enabled.',
    'normal', uid_admin, NULL),

    ('c2110000-0000-0000-0000-000000000004', tid, cid2,
    'Wellness Friday Check-in',
    'Join a 15-minute virtual wellness stand-up every Friday at 4:00 PM. Attendance is optional but encouraged.',
    'normal', uid_hr, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Job postings ─────────────────────────────────────────────
DELETE FROM job_postings WHERE id::text LIKE 'a111%';

INSERT INTO job_postings (id, tenant_id, company_id, title, department, description,
  required_keywords, nice_to_have_keywords, employment_type, status, auto_reject_threshold, created_by)
VALUES
  ('a1110000-0000-0000-0000-000000000001', tid, cid2,
   'Senior Software Engineer', 'Engineering',
   'We are looking for a Senior Software Engineer with 5+ years of experience in full-stack development.',
   ARRAY['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL'],
   ARRAY['AWS', 'Docker', 'Kubernetes'],
   'white_collar', 'open', 40, uid_hr),

  ('a1110000-0000-0000-0000-000000000002', tid, cid3,
   'DevOps Engineer', 'Engineering',
   'Join our platform team to build and maintain CI/CD pipelines, infrastructure as code, and cloud architecture on AWS.',
   ARRAY['AWS', 'Terraform', 'Docker', 'Kubernetes', 'CI/CD'],
   ARRAY['GCP', 'Helm', 'ArgoCD'],
   'white_collar', 'open', 50, uid_admin)
ON CONFLICT (id) DO NOTHING;

END $$;
