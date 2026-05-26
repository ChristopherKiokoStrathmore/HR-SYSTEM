-- ─────────────────────────────────────────────────────────────
-- ENHANCED SEED DATA — Complete dashboard population
-- Fixes gender inconsistency, adds performance, attendance,
-- medical records, training, and comprehensive onboarding data
-- ─────────────────────────────────────────────────────────────
-- Run with: psql $DATABASE_URL -f supabase/seed.enhanced.sql
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  tid  UUID := '11111111-0000-0000-0000-000000000001';
  cid1 UUID := '11111111-0000-0000-0000-000000000001';
  cid2 UUID := '11111111-0000-0000-0000-000000000002';
  cid3 UUID := '11111111-0000-0000-0000-000000000003';

  -- Employee profile UUIDs (from existing seed)
  ep_mgr UUID := 'eeee0000-0000-0000-0000-000000000001';
  ep_e1  UUID := 'eeee0000-0000-0000-0000-000000000002';
  ep_e2  UUID := 'eeee0000-0000-0000-0000-000000000003';
  ep_e3  UUID := 'eeee0000-0000-0000-0000-000000000004';
  ep_e4  UUID := 'eeee0000-0000-0000-0000-000000000005';
  ep_e5  UUID := 'eeee0000-0000-0000-0000-000000000006';

  uid_mgr UUID;
  uid_e1 UUID;
  uid_e2 UUID;
  uid_e3 UUID;
  uid_e4 UUID;
  uid_e5 UUID;
  uid_hr UUID;
  uid_admin UUID;

BEGIN

  -- Capture real user UUIDs
  SELECT id INTO uid_mgr FROM users WHERE email = 'manager@demo.co.ke' LIMIT 1;
  SELECT id INTO uid_e1 FROM users WHERE email = 'david@demo.co.ke' LIMIT 1;
  SELECT id INTO uid_e2 FROM users WHERE email = 'esther@demo.co.ke' LIMIT 1;
  SELECT id INTO uid_e3 FROM users WHERE email = 'felix@demo.co.ke' LIMIT 1;
  SELECT id INTO uid_e4 FROM users WHERE email = 'grace@demo.co.ke' LIMIT 1;
  SELECT id INTO uid_e5 FROM users WHERE email = 'henry@demo.co.ke' LIMIT 1;
  SELECT id INTO uid_hr FROM users WHERE email = 'hr@demo.co.ke' LIMIT 1;
  SELECT id INTO uid_admin FROM users WHERE email = 'admin@demo.co.ke' LIMIT 1;

  -- ─── FIX: Standardize gender (Male/Female only) ─────────────
  UPDATE employee_profiles
  SET gender = CASE 
    WHEN gender IS NULL OR gender = '' THEN 'Unspecified'
    WHEN LOWER(gender) LIKE '%male%' AND LOWER(gender) NOT LIKE '%female%' THEN 'Male'
    WHEN LOWER(gender) LIKE '%female%' THEN 'Female'
    ELSE gender
  END
  WHERE is_deleted = FALSE;

  -- ─── PERFORMANCE: KPI Assignments (Q1, Q2, Q3 2026) ──────────
  DELETE FROM kpi_assignments 
  WHERE period_year = 2026 AND period_quarter IN (1, 2, 3)
  AND employee_id IN (ep_e1, ep_e2, ep_e3, ep_e4, ep_e5);

  INSERT INTO kpi_assignments (id, tenant_id, employee_id, period_quarter, period_year,
    targets, scores, final_score, submitted_at)
  VALUES
    -- Q1 2026
    ('00010001-0001-0001-0001-000000000001', tid, ep_e1, 1, 2026,
     '[{"name":"Story Points","weight":40,"target":80,"unit":"pts"},{"name":"PR Reviews","weight":30,"target":20},{"name":"Bug Resolution","weight":30,"target":"<2 days"}]'::jsonb,
     '[{"name":"Story Points","actual":85,"score":40},{"name":"PR Reviews","actual":22,"score":30},{"name":"Bug Resolution","actual":"1.5 days","score":28}]'::jsonb,
     98, '2026-04-05 11:00:00+03'),
    
    ('00010001-0001-0001-0002-000000000001', tid, ep_e2, 1, 2026,
     '[{"name":"Reports Filed","weight":50,"target":12},{"name":"Reconciliation Accuracy","weight":50,"target":"100%"}]'::jsonb,
     '[{"name":"Reports Filed","actual":12,"score":50},{"name":"Reconciliation Accuracy","actual":"98%","score":45}]'::jsonb,
     95, '2026-04-05 14:00:00+03'),

    ('00010001-0001-0001-0003-000000000001', tid, ep_e3, 1, 2026,
     '[{"name":"Operations Efficiency","weight":60,"target":"95%"},{"name":"Process Improvement","weight":40,"target":"3 initiatives"}]'::jsonb,
     '[{"name":"Operations Efficiency","actual":"96%","score":57},{"name":"Process Improvement","actual":"4 initiatives","score":40}]'::jsonb,
     97, '2026-04-06 10:00:00+03'),

    ('00010001-0001-0001-0004-000000000001', tid, ep_e4, 1, 2026,
     '[{"name":"UI/UX Polish","weight":50,"target":"8 features"},{"name":"Performance Metrics","weight":50,"target":"<1s load"}]'::jsonb,
     '[{"name":"UI/UX Polish","actual":"9 features","score":50},{"name":"Performance Metrics","actual":"0.8s load","score":50}]'::jsonb,
     100, '2026-04-06 15:00:00+03'),

    ('00010001-0001-0001-0005-000000000001', tid, ep_e5, 1, 2026,
     '[{"name":"New Accounts","weight":60,"target":"15"},{"name":"Contract Value","weight":40,"target":"KES 2M"}]'::jsonb,
     '[{"name":"New Accounts","actual":"18","score":60},{"name":"Contract Value","actual":"KES 2.5M","score":40}]'::jsonb,
     100, '2026-04-07 09:00:00+03'),

    -- Q2 2026
    ('00020001-0001-0001-0001-000000000001', tid, ep_e1, 2, 2026,
     '[{"name":"Story Points","weight":40,"target":85,"unit":"pts"},{"name":"PR Reviews","weight":30,"target":22},{"name":"Bug Resolution","weight":30,"target":"<2 days"}]'::jsonb,
     '[{"name":"Story Points","actual":90,"score":40},{"name":"PR Reviews","actual":24,"score":30},{"name":"Bug Resolution","actual":"1.2 days","score":30}]'::jsonb,
     100, '2026-07-05 11:00:00+03'),

    ('00020001-0001-0001-0002-000000000001', tid, ep_e2, 2, 2026,
     '[{"name":"Reports Filed","weight":50,"target":14},{"name":"Reconciliation Accuracy","weight":50,"target":"99%"}]'::jsonb,
     '[{"name":"Reports Filed","actual":15,"score":50},{"name":"Reconciliation Accuracy","actual":"99.2%","score":50}]'::jsonb,
     100, '2026-07-05 14:00:00+03'),

    -- Q3 2026 (partial — ongoing)
    ('00030001-0001-0001-0001-000000000001', tid, ep_e1, 3, 2026,
     '[{"name":"Story Points","weight":40,"target":90,"unit":"pts"},{"name":"Technical Leadership","weight":30,"target":"2 mentees"},{"name":"Innovation","weight":30,"target":"1 POC"}]'::jsonb,
     '[{"name":"Story Points","actual":88,"score":39},{"name":"Technical Leadership","actual":"3 mentees","score":30},{"name":"Innovation","actual":"1 POC","score":30}]'::jsonb,
     99, '2026-09-15 11:00:00+03')
  ON CONFLICT (id) DO NOTHING;

  -- ─── PERFORMANCE: Reviews (360-degree feedback) ───────────────
  DELETE FROM performance_reviews 
  WHERE period IN ('Q1 2026', 'Q2 2026') AND employee_id IN (ep_e1, ep_e2, ep_e3, ep_e4, ep_e5);

  INSERT INTO performance_reviews (id, tenant_id, employee_id, reviewer_id, period,
    rating, strengths, improvements, promotion_recommended, notes)
  VALUES
    ('00110001-0001-0001-0001-000000000001', tid, ep_e1, uid_mgr, 'Q1 2026', 5,
     'Exceptional code quality. Mentors junior developers. Proactive in sprint planning. Leads technical design discussions.',
     'Documentation could be improved. Sometimes takes on too much solo work. Consider delegating more.',
     TRUE, 'Recommend promotion to Senior Engineer in Q3 2026. Excellent trajectory.'),

    ('00110001-0001-0001-0002-000000000001', tid, ep_e2, uid_mgr, 'Q1 2026', 4,
     'Highly accurate in all reports. Meets all deadlines consistently. Good team player. Proactive in suggesting process improvements.',
     'Could improve communication with external auditors. Sometimes hesitant to push back on unrealistic timelines.',
     FALSE, 'Solid performer. Consider for team lead role in 2026 if communication skills improve.'),

    ('00110001-0001-0001-0003-000000000001', tid, ep_e3, uid_mgr, 'Q1 2026', 4,
     'Excellent operational mindset. Process improvements save significant time. Reliable and consistent.',
     'Could be more proactive in identifying bottlenecks before they become issues. More documentation needed.',
     FALSE, 'Strong operations foundation. Good candidate for operations supervisor role.'),

    ('00110001-0001-0001-0004-000000000001', uid_admin, ep_e4, uid_admin, 'Q1 2026', 5,
     'Outstanding UI/UX design sense. Delivers pixel-perfect implementations. Performance-conscious developer.',
     'Communication could be more frequent. Sometimes implements features without full requirements clarity.',
     TRUE, 'Top performer. Ready for lead frontend engineer role. Potential for architecture contributions.'),

    ('00110001-0001-0001-0005-000000000001', uid_admin, ep_e5, uid_admin, 'Q1 2026', 4,
     'Consistently exceeds sales targets. Excellent client relationship management. Proactive in seeking leads.',
     'Could improve proposal documentation. Sometimes aggressive in discounting to close deals.',
     FALSE, 'Strong sales contribution. Monitor margin impact of discounting strategy.'),

    ('00110001-0001-0001-0006-000000000001', tid, ep_e1, uid_mgr, 'Q2 2026', 5,
     'Continued excellence. Led successful architecture redesign. Mentored 3 juniors through challenging sprint.',
     'Same as previous period. Consider formal mentorship program role.',
     TRUE, 'Outstanding contributor. Ready for promotion decision by end of Q3.'),

    ('00110001-0001-0001-0007-000000000001', tid, ep_e2, uid_mgr, 'Q2 2026', 4,
     'Maintained high standards in Q2. Took initiative on audit process improvements.',
     'More leadership initiative would be beneficial. More visibility in team meetings needed.',
     TRUE, 'Ready for team lead trial role. Strong potential for this position.')
  ON CONFLICT (id) DO NOTHING;

  -- ─── ATTENDANCE: Last 30 days data (May 20-21, 2026) ──────────
  DELETE FROM attendance WHERE shift_date >= '2026-04-21'::date;

  -- Generate 30 days of attendance for all employees
  INSERT INTO attendance (id, tenant_id, employee_id, company_id,
    shift_date, check_in_time, check_out_time, status, is_late, is_early_departure)
  SELECT
    gen_random_uuid(),
    tid,
    ep_id,
    CASE WHEN ep_id IN (ep_e1, ep_e2, ep_e3) THEN cid2 ELSE cid3 END,
    shift_date,
    shift_date::timestamp + '08:15:00'::interval + (RANDOM() * interval '30 minutes'),
    shift_date::timestamp + '17:00:00'::interval + (RANDOM() * interval '10 minutes'),
    'present',
    CASE WHEN shift_date::timestamp + '08:15:00'::interval + (RANDOM() * interval '30 minutes') > shift_date::timestamp + '08:30:00'::interval THEN TRUE ELSE FALSE END,
    FALSE
  FROM (
    SELECT gen_random_uuid() as dummy_id, 
           generate_series('2026-04-21'::date, '2026-05-20'::date, '1 day'::interval)::date as shift_date
  ) dates,
  LATERAL (VALUES (ep_e1), (ep_e2), (ep_e3), (ep_e4), (ep_e5)) ep(ep_id)
  WHERE EXTRACT(DOW FROM dates.shift_date) BETWEEN 1 AND 5  -- Weekdays only
  ORDER BY shift_date, ep_id
  ON CONFLICT DO NOTHING;

  -- Add some absences and late arrivals for realism
  INSERT INTO attendance (id, tenant_id, employee_id, company_id,
    shift_date, check_in_time, check_out_time, status, is_late, is_early_departure)
  VALUES
    (gen_random_uuid(), tid, ep_e1, cid2, '2026-04-25'::date, NULL, NULL, 'absent', FALSE, FALSE),
    (gen_random_uuid(), tid, ep_e2, cid2, '2026-05-08'::date, '2026-05-08 10:30:00+03'::timestamptz, '2026-05-08 17:05:00+03'::timestamptz, 'present', TRUE, FALSE),
    (gen_random_uuid(), tid, ep_e3, cid2, '2026-05-01'::date, NULL, NULL, 'absent', FALSE, FALSE),
    (gen_random_uuid(), tid, ep_e4, cid3, '2026-05-15'::date, '2026-05-15 08:45:00+03'::timestamptz, '2026-05-15 12:00:00+03'::timestamptz, 'present', FALSE, TRUE),
    (gen_random_uuid(), tid, ep_e5, cid3, '2026-04-28'::date, NULL, NULL, 'absent', FALSE, FALSE)
  ON CONFLICT DO NOTHING;

  -- ─── MEDICAL RECORDS: All employees ───────────────────────────
  DELETE FROM medical_records WHERE employee_id IN (ep_mgr, ep_e1, ep_e2, ep_e3, ep_e4, ep_e5);

  INSERT INTO medical_records (id, tenant_id, employee_id,
    record_type, fitness_status, issued_by, issued_date, expiry_date, notes, file_url)
  VALUES
    ('00110001-0001-0001-0001-000000000001', tid, ep_mgr,
     'Annual Medical Examination', 'fit', 'Aga Khan Hospital Nairobi', '2026-01-20', '2027-01-19', 'All vitals normal. Good health status.', 'https://storage/demo/med_carol.pdf'),
    ('00110001-0001-0001-0002-000000000001', tid, ep_e1,
     'Annual Medical Examination', 'fit', 'Aga Khan Hospital Nairobi', '2026-01-15', '2027-01-14', NULL, 'https://storage/demo/med_david.pdf'),
    ('00110001-0001-0001-0003-000000000001', tid, ep_e2,
     'Pre-Employment Medical', 'fit', 'Nairobi Hospital', '2022-06-10', '2023-06-09', 'Due for renewal — recommend scheduling Q3 2026.', 'https://storage/demo/med_esther.pdf'),
    ('00110001-0001-0001-0004-000000000001', tid, ep_e3,
     'Annual Medical Examination', 'fit', 'Coptic Hospital', '2025-12-15', '2026-12-14', 'No issues noted. Cleared for duty.', 'https://storage/demo/med_felix.pdf'),
    ('00110001-0001-0001-0005-000000000001', tid, ep_e4,
     'Pre-Employment Medical', 'fit', 'Nairobi Hospital', '2023-05-05', '2024-05-04', 'EXPIRED — please reschedule. All markers normal from last visit.', 'https://storage/demo/med_grace.pdf'),
    ('00110001-0001-0001-0006-000000000001', tid, ep_e5,
     'Annual Medical Examination', 'fit', 'Nairobi Hospital', '2025-11-30', '2026-11-29', 'Good health. No restrictions.', 'https://storage/demo/med_henry.pdf')
  ON CONFLICT (id) DO NOTHING;

  -- ─── TRAINING: Attendees (completed trainings only) ──────────
  DELETE FROM training_attendees WHERE employee_id IN (ep_e1, ep_e2, ep_e3, ep_e4, ep_e5, ep_mgr);

  INSERT INTO training_attendees (id, training_session_id, employee_id, attended)
  VALUES
    ('00120001-0001-0001-0001-000000000001', 'a2110000-0000-0000-0000-000000000001', ep_e1, TRUE),
    ('00120001-0001-0001-0002-000000000001', 'a2110000-0000-0000-0000-000000000001', ep_e2, TRUE),
    ('00120001-0001-0001-0003-000000000001', 'a2110000-0000-0000-0000-000000000001', ep_e3, TRUE),
    ('00120001-0001-0001-0004-000000000001', 'a2110000-0000-0000-0000-000000000001', ep_mgr, TRUE),
    ('00120001-0001-0001-0005-000000000001', 'a2110000-0000-0000-0000-000000000002', ep_e2, FALSE),
    ('00120001-0001-0001-0006-000000000001', 'a2110000-0000-0000-0000-000000000003', ep_e4, FALSE),
    ('00120001-0001-0001-0007-000000000001', 'a2110000-0000-0000-0000-000000000003', ep_e5, FALSE),
    ('00120001-0001-0001-0008-000000000001', 'a2110000-0000-0000-0000-000000000002', ep_e1, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- ─── ONBOARDING: Comprehensive document completion ───────────
  DELETE FROM documents WHERE employee_id IN (ep_mgr, ep_e1, ep_e2, ep_e3, ep_e4, ep_e5);

  -- Manager (Carol) — all documents verified
  INSERT INTO documents (id, tenant_id, employee_id, type, file_url, status, uploaded_at)
  VALUES
    ('00130001-0001-0001-0001-000000000001', tid, ep_mgr, 'id',          'https://storage/demo/id_carol.pdf',           'verified',  '2021-02-15 09:00:00+03'),
    ('00130001-0001-0001-0002-000000000001', tid, ep_mgr, 'nssf',        'https://storage/demo/nssf_carol.pdf',         'verified',  '2021-02-15 09:15:00+03'),
    ('00130001-0001-0001-0003-000000000001', tid, ep_mgr, 'nhif',        'https://storage/demo/nhif_carol.pdf',         'verified',  '2021-02-15 09:30:00+03'),
    ('00130001-0001-0001-0004-000000000001', tid, ep_mgr, 'kra',         'https://storage/demo/kra_carol.pdf',          'verified',  '2021-02-15 09:45:00+03'),
    ('00130001-0001-0001-0005-000000000001', tid, ep_mgr, 'bank_details','https://storage/demo/bank_carol.pdf',         'verified',  '2021-02-15 10:00:00+03'),
    ('00130001-0001-0001-0006-000000000001', tid, ep_mgr, 'contract',    'https://storage/demo/contract_carol.pdf',     'verified',  '2021-02-15 10:15:00+03'),

    -- David (ep_e1) — missing bank_details (INCOMPLETE)
    ('00130001-0001-0001-0007-000000000001', tid, ep_e1, 'id',          'https://storage/demo/id_david.pdf',           'verified',  '2022-01-05 08:00:00+03'),
    ('00130001-0001-0001-0008-000000000001', tid, ep_e1, 'nssf',        'https://storage/demo/nssf_david.pdf',         'verified',  '2022-01-05 08:15:00+03'),
    ('00130001-0001-0001-0009-000000000001', tid, ep_e1, 'nhif',        'https://storage/demo/nhif_david.pdf',         'verified',  '2022-01-05 08:30:00+03'),
    ('00130001-0001-0001-0010-000000000001', tid, ep_e1, 'kra',         'https://storage/demo/kra_david.pdf',          'verified',  '2022-01-05 08:45:00+03'),
    ('00130001-0001-0001-0011-000000000001', tid, ep_e1, 'contract',    'https://storage/demo/contract_david.pdf',     'verified',  '2022-01-05 09:00:00+03'),
    ('00130001-0001-0001-0012-000000000001', tid, ep_e1, 'bank_details','https://storage/demo/bank_david.pdf',         'pending',   '2022-01-10 10:00:00+03'),

    -- Esther (ep_e2) — all complete
    ('00130001-0001-0001-0013-000000000001', tid, ep_e2, 'id',          'https://storage/demo/id_esther.pdf',          'verified',  '2022-06-10 10:00:00+03'),
    ('00130001-0001-0001-0014-000000000001', tid, ep_e2, 'nssf',        'https://storage/demo/nssf_esther.pdf',        'verified',  '2022-06-10 10:15:00+03'),
    ('00130001-0001-0001-0015-000000000001', tid, ep_e2, 'nhif',        'https://storage/demo/nhif_esther.pdf',        'verified',  '2022-06-10 10:30:00+03'),
    ('00130001-0001-0001-0016-000000000001', tid, ep_e2, 'kra',         'https://storage/demo/kra_esther.pdf',         'verified',  '2022-06-10 10:45:00+03'),
    ('00130001-0001-0001-0017-000000000001', tid, ep_e2, 'bank_details','https://storage/demo/bank_esther.pdf',        'verified',  '2022-06-10 11:00:00+03'),
    ('00130001-0001-0001-0018-000000000001', tid, ep_e2, 'contract',    'https://storage/demo/contract_esther.pdf',    'verified',  '2022-06-10 11:15:00+03'),

    -- Felix (ep_e3) — missing KRA (INCOMPLETE)
    ('00130001-0001-0001-0019-000000000001', tid, ep_e3, 'id',          'https://storage/demo/id_felix.pdf',           'verified',  '2023-02-01 08:00:00+03'),
    ('00130001-0001-0001-0020-000000000001', tid, ep_e3, 'nssf',        'https://storage/demo/nssf_felix.pdf',         'verified',  '2023-02-01 08:15:00+03'),
    ('00130001-0001-0001-0021-000000000001', tid, ep_e3, 'nhif',        'https://storage/demo/nhif_felix.pdf',         'verified',  '2023-02-01 08:30:00+03'),
    ('00130001-0001-0001-0022-000000000001', tid, ep_e3, 'bank_details','https://storage/demo/bank_felix.pdf',         'verified',  '2023-02-01 08:45:00+03'),
    ('00130001-0001-0001-0023-000000000001', tid, ep_e3, 'contract',    'https://storage/demo/contract_felix.pdf',     'verified',  '2023-02-01 09:00:00+03'),
    ('00130001-0001-0001-0024-000000000001', tid, ep_e3, 'kra',         'https://storage/demo/kra_felix.pdf',          'pending',   '2023-02-05 10:00:00+03'),

    -- Grace (ep_e4) — missing NSSF and bank (INCOMPLETE)
    ('00130001-0001-0001-0025-000000000001', tid, ep_e4, 'id',          'https://storage/demo/id_grace.pdf',           'verified',  '2023-05-10 09:00:00+03'),
    ('00130001-0001-0001-0026-000000000001', tid, ep_e4, 'nhif',        'https://storage/demo/nhif_grace.pdf',         'verified',  '2023-05-10 09:15:00+03'),
    ('00130001-0001-0001-0027-000000000001', tid, ep_e4, 'kra',         'https://storage/demo/kra_grace.pdf',          'verified',  '2023-05-10 09:30:00+03'),
    ('00130001-0001-0001-0028-000000000001', tid, ep_e4, 'contract',    'https://storage/demo/contract_grace.pdf',     'verified',  '2023-05-10 09:45:00+03'),
    ('00130001-0001-0001-0029-000000000001', tid, ep_e4, 'nssf',        'https://storage/demo/nssf_grace.pdf',         'pending',   '2023-05-15 10:00:00+03'),
    ('00130001-0001-0001-0030-000000000001', tid, ep_e4, 'bank_details','https://storage/demo/bank_grace.pdf',         'pending',   '2023-05-15 10:00:00+03'),

    -- Henry (ep_e5) — all complete
    ('00130001-0001-0001-0031-000000000001', tid, ep_e5, 'id',          'https://storage/demo/id_henry.pdf',           'verified',  '2024-01-15 08:00:00+03'),
    ('00130001-0001-0001-0032-000000000001', tid, ep_e5, 'nssf',        'https://storage/demo/nssf_henry.pdf',         'verified',  '2024-01-15 08:15:00+03'),
    ('00130001-0001-0001-0033-000000000001', tid, ep_e5, 'nhif',        'https://storage/demo/nhif_henry.pdf',         'verified',  '2024-01-15 08:30:00+03'),
    ('00130001-0001-0001-0034-000000000001', tid, ep_e5, 'kra',         'https://storage/demo/kra_henry.pdf',          'verified',  '2024-01-15 08:45:00+03'),
    ('00130001-0001-0001-0035-000000000001', tid, ep_e5, 'bank_details','https://storage/demo/bank_henry.pdf',         'verified',  '2024-01-15 09:00:00+03'),
    ('00130001-0001-0001-0036-000000000001', tid, ep_e5, 'contract',    'https://storage/demo/contract_henry.pdf',     'verified',  '2024-01-15 09:15:00+03')
  ON CONFLICT (id) DO NOTHING;

  -- ─── LEAVE REQUESTS: More variety ────────────────────────────
  DELETE FROM leaves WHERE employee_id IN (ep_e1, ep_e2, ep_e3, ep_e4, ep_e5, ep_mgr);

  INSERT INTO leaves (id, tenant_id, employee_id, company_id,
    leave_type, start_date, end_date, days_requested, reason, status, approved_by, approved_at)
  VALUES
    -- Approved
    ('00140001-0001-0001-0001-000000000001', tid, ep_e1, cid2, 'annual', '2026-04-07', '2026-04-11', 5, 'Family vacation to Diani Beach', 'approved', uid_mgr, '2026-04-01 09:00:00+03'),
    ('00140001-0001-0001-0002-000000000001', tid, ep_e2, cid2, 'sick', '2026-05-02', '2026-05-03', 2, 'Respiratory infection — doctor visit', 'approved', uid_mgr, '2026-05-02 08:30:00+03'),
    ('00140001-0001-0001-0003-000000000001', tid, ep_e4, cid3, 'annual', '2026-06-22', '2026-06-26', 5, 'Beach holiday with family', 'approved', uid_hr, '2026-06-15 10:00:00+03'),
    ('00140001-0001-0001-0004-000000000001', tid, ep_e5, cid3, 'annual', '2026-05-28', '2026-06-01', 5, 'Memorial Day extended weekend travel', 'approved', uid_admin, '2026-05-20 14:00:00+03'),
    
    -- Pending
    ('00140001-0001-0001-0005-000000000001', tid, ep_e3, cid2, 'annual', '2026-06-02', '2026-06-06', 5, 'School closing ceremony for children', 'pending', NULL, NULL),
    ('00140001-0001-0001-0006-000000000001', tid, ep_mgr, cid2, 'annual', '2026-07-01', '2026-07-10', 10, 'Annual leave - vacation', 'pending', NULL, NULL),
    ('00140001-0001-0001-0007-000000000001', tid, ep_e2, cid2, 'study', '2026-06-15', '2026-06-17', 3, 'Professional certification exam preparation', 'pending', NULL, NULL),
    
    -- Rejected
    ('00140001-0001-0001-0008-000000000001', tid, ep_e4, cid3, 'annual', '2026-05-01', '2026-05-05', 5, 'Personal leave request', 'rejected', uid_admin, '2026-04-25 11:00:00+03')
  ON CONFLICT (id) DO NOTHING;

  -- ─── ANNOUNCEMENTS: More variety and dates ───────────────────
  DELETE FROM announcements WHERE company_id IN (cid2, cid3);

  INSERT INTO announcements (id, tenant_id, company_id, title, body, priority, created_by, expires_at)
  VALUES
    ('00150001-0001-0001-0001-000000000001', tid, cid2,
     'Public Holiday — Madaraka Day',
     'June 1st is a public holiday. All staff are off. Essential operations staff will receive communication separately.',
     'normal', uid_hr, '2026-06-02'),

    ('00150001-0001-0001-0002-000000000001', tid, cid2,
     'URGENT: Biometric System Maintenance',
     'The biometric attendance system will be offline on May 14th 7:00–9:00 AM. Please use the HR portal to log attendance manually.',
     'urgent', uid_hr, '2026-05-14'),

    ('00150001-0001-0001-0003-000000000001', tid, cid3,
     'New Policy: Remote Work Guidelines',
     'Effective June 1st, all remote employees must log attendance via the HR PWA app with GPS verification. Please ensure location permissions are enabled.',
     'normal', uid_admin, NULL),

    ('00150001-0001-0001-0004-000000000001', tid, cid2,
     'Wellness Friday Check-in',
     'Join a 15-minute virtual wellness stand-up every Friday at 4:00 PM. Attendance is optional but encouraged. Great opportunity for team bonding.',
     'normal', uid_hr, NULL),

    ('00150001-0001-0001-0005-000000000001', tid, cid2,
     'Q2 Performance Reviews — Schedule Your Session',
     'HR team is conducting Q2 performance reviews. Please check your email for available slots. Sessions will be held May 25-30.',
     'normal', uid_hr, '2026-05-30'),

    ('00150001-0001-0001-0006-000000000001', tid, cid3,
     'IMPORTANT: Health Insurance Renewal Reminder',
     'Your NHIF membership expires June 30, 2026. Please submit renewal documentation by June 20. Contact HR for assistance.',
     'urgent', uid_admin, '2026-06-20'),

    ('00150001-0001-0001-0007-000000000001', tid, cid2,
     'Welcome New Team Member — James Mungal!',
     'Please join us in welcoming James Mungal to the Acme Corp Kenya family! James joins as a Senior Developer in the Engineering team. Lunch with the team on Friday!',
     'normal', uid_mgr, NULL),

    ('00150001-0001-0001-0008-000000000001', tid, cid3,
     'Office Renovation Complete — New Breakroom',
     'Our new modern breakroom is now open! New coffee machine, microwaves, and seating area on the 2nd floor. Come check it out!',
     'normal', uid_admin, NULL)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Enhanced seed complete — performance, attendance, medical, training, onboarding, and announcements fully populated!';

END $$;
