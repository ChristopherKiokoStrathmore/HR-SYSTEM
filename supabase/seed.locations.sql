-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: location_name, location_lat, location_lng, experience_level
-- Safe to re-run.  Updates existing job_postings by title match.
-- Run AFTER seed.jobs.sql AND after 20260518_job_search_alerts.sql migration.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE tid UUID := '11111111-0000-0000-0000-000000000001';
BEGIN

-- ── Sheer Logic roles (Westlands, Nairobi) ────────────────────────────────
UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='senior'
  WHERE tenant_id=tid AND title='Human Resources Business Partner';

UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='mid'
  WHERE tenant_id=tid AND title='Payroll & Compliance Officer';

UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='mid'
  WHERE tenant_id=tid AND title='Recruitment Consultant';

-- ── Acme Corp Kenya (Industrial Area, Mombasa) ────────────────────────────
UPDATE job_postings SET location_name='Industrial Area, Mombasa', location_lat=-4.0200, location_lng=39.6700, experience_level='executive'
  WHERE tenant_id=tid AND title='Plant Manager';

UPDATE job_postings SET location_name='Industrial Area, Mombasa', location_lat=-4.0200, location_lng=39.6700, experience_level='senior'
  WHERE tenant_id=tid AND title='Safety, Health & Environment Officer';

UPDATE job_postings SET location_name='Industrial Area, Mombasa', location_lat=-4.0200, location_lng=39.6700, experience_level='mid'
  WHERE tenant_id=tid AND title='Quality Assurance Inspector';

UPDATE job_postings SET location_name='Industrial Area, Mombasa', location_lat=-4.0200, location_lng=39.6700, experience_level='mid'
  WHERE tenant_id=tid AND title='Maintenance Technician';

UPDATE job_postings SET location_name='Industrial Area, Mombasa', location_lat=-4.0200, location_lng=39.6700, experience_level='entry'
  WHERE tenant_id=tid AND title='Production Operator';

UPDATE job_postings SET location_name='Mombasa CBD', location_lat=-4.0435, location_lng=39.6682, experience_level='senior'
  WHERE tenant_id=tid AND title='Warehouse & Logistics Supervisor';

UPDATE job_postings SET location_name='Nairobi CBD', location_lat=-1.2864, location_lng=36.8172, experience_level='mid'
  WHERE tenant_id=tid AND title='KYC Analyst';

-- ── Savanna Tech (Westlands / Nairobi CBD) ────────────────────────────────
UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='senior'
  WHERE tenant_id=tid AND title='Senior Software Engineer';

UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='senior'
  WHERE tenant_id=tid AND title='DevOps / Cloud Engineer';

UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='senior'
  WHERE tenant_id=tid AND title='Product Manager';

UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='mid'
  WHERE tenant_id=tid AND title='Data Analyst';

UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='mid'
  WHERE tenant_id=tid AND title='UI/UX Designer';

UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='senior'
  WHERE tenant_id=tid AND title='Business Development Manager';

UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='mid'
  WHERE tenant_id=tid AND title='Customer Success Manager';

UPDATE job_postings SET location_name='Nairobi CBD', location_lat=-1.2864, location_lng=36.8172, experience_level='entry'
  WHERE tenant_id=tid AND title ILIKE '%Direct Sales Executive%';

UPDATE job_postings SET location_name='Nairobi CBD', location_lat=-1.2864, location_lng=36.8172, experience_level='senior'
  WHERE tenant_id=tid AND title='Fraud & Risk Management Executive';

UPDATE job_postings SET location_name='Westlands, Nairobi', location_lat=-1.2676, location_lng=36.8114, experience_level='entry'
  WHERE tenant_id=tid AND title ILIKE '%Graduate Intern%';

RAISE NOTICE 'Location seed complete.';
END $$;
