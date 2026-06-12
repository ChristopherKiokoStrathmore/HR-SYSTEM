-- ─────────────────────────────────────────────────────────────────────────────
-- JOB POSTINGS SEED  — Diverse, realistic Sheer Logic vacancies
-- Safe to run multiple times.  Clears all existing postings for the tenant
-- then re-inserts 20 varied roles across the three seed companies.
--
-- Run with:
--   psql $DATABASE_URL -f supabase/seed.jobs.sql
--   OR paste into Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tid  UUID := '11111111-0000-0000-0000-000000000001';
  cid1 UUID := '11111111-0000-0000-0000-000000000001';  -- Sheer Logic Mgmt Consultants
  cid2 UUID := '11111111-0000-0000-0000-000000000002';  -- Acme Corp Kenya (Manufacturing)
  cid3 UUID := '11111111-0000-0000-0000-000000000003';  -- Savanna Tech Ltd

  poster UUID;
BEGIN

  SELECT id INTO poster FROM users WHERE tenant_id = tid AND role = 'hr_admin' LIMIT 1;
  IF poster IS NULL THEN
    SELECT id INTO poster FROM users WHERE tenant_id = tid LIMIT 1;
  END IF;

  -- ── Clean slate ───────────────────────────────────────────────────────────
  -- Remove candidates linked to these postings first (FK constraint)
  DELETE FROM candidates
  WHERE job_posting_id IN (SELECT id FROM job_postings WHERE tenant_id = tid);

  DELETE FROM job_postings WHERE tenant_id = tid;

  -- ── INSERT — Sheer Logic Management Consultants (cid1) ───────────────────
  INSERT INTO job_postings (
    id, tenant_id, company_id, title, department, description,
    required_keywords, nice_to_have_keywords,
    employment_type, status, auto_reject_threshold, closing_date, created_by
  ) VALUES

  -- 1. HRBP
  (gen_random_uuid(), tid, cid1,
   'Human Resources Business Partner',
   'Human Resources',
   'Sheer Logic Management Consultants is seeking an experienced HR Business Partner to provide strategic HR support across multiple client accounts in Nairobi.

Key Responsibilities:
- Partner with client business units to align HR strategy with business goals
- Manage end-to-end recruitment for mid to senior-level positions
- Advise on employee relations, disciplinary processes, and grievance handling
- Ensure full compliance with the Kenya Employment Act 2007 and statutory obligations (NSSF, NHIF, PAYE)
- Analyse HR metrics and deliver monthly workforce reports to client leadership

Requirements:
- Bachelor''s degree in Human Resources, Business Administration or related field
- CHRP-K qualification or Higher Diploma in HRM is an advantage
- Minimum 4 years'' experience in an HRBP or Senior HR Generalist role
- Strong knowledge of Kenya labour laws
- Proficiency with HRIS platforms

Package: KES 120,000 – 160,000 per month depending on experience
Location: Nairobi, Kenya',
   ARRAY['HR Management', 'Kenya Labour Laws', 'Employee Relations', 'Talent Acquisition', 'HRIS'],
   ARRAY['CHRP-K', 'SAP HR', 'Organisational Development'],
   'white_collar', 'open', 50,
   CURRENT_DATE + INTERVAL '45 days', poster),

  -- 2. Payroll Officer
  (gen_random_uuid(), tid, cid1,
   'Payroll & Compliance Officer',
   'Finance & HR Operations',
   'We are looking for a detail-oriented Payroll & Compliance Officer to manage end-to-end payroll processing for our outsourced client portfolios across Kenya.

Key Responsibilities:
- Process monthly payroll for 200+ employees across multiple client companies
- Compute and remit statutory deductions: PAYE, NSSF, NHIF, HELB, and NITA levies
- Prepare payroll journals and reconcile payroll accounts monthly
- File KRA returns (P9A, P10) and handle KRA correspondence
- Maintain payroll records and ensure full audit trail compliance
- Liaise with NSSF, NHIF, and KRA on statutory matters

Requirements:
- CPA (K) or Bachelor''s in Finance / Accounting
- Minimum 3 years'' payroll experience in a multi-client environment
- Expertise in Kenya tax law, PAYE, and statutory deductions
- Proficiency in payroll software (Sage, QuickBooks, or similar)
- High accuracy and strong attention to detail

Package: KES 80,000 – 110,000 per month
Location: Nairobi, Kenya',
   ARRAY['Payroll Processing', 'PAYE', 'NSSF', 'NHIF', 'KRA Compliance', 'CPA'],
   ARRAY['Sage Payroll', 'QuickBooks', 'HELB Administration'],
   'white_collar', 'open', 45,
   CURRENT_DATE + INTERVAL '30 days', poster),

  -- 3. Recruitment Consultant
  (gen_random_uuid(), tid, cid1,
   'Recruitment Consultant',
   'Talent Acquisition',
   'Sheer Logic invites applications from energetic Recruitment Consultants to join our Talent Acquisition team and manage end-to-end placements for blue-chip clients across East Africa.

Key Responsibilities:
- Manage the full recruitment lifecycle from job briefing to offer acceptance
- Source candidates via LinkedIn, job boards, headhunting, and referral networks
- Conduct structured competency-based interviews and psychometric assessments
- Build and maintain a strong talent pipeline across multiple sectors
- Achieve monthly and quarterly placement targets
- Maintain candidate and client relationships on our ATS

Requirements:
- Bachelor''s degree in HR, Business, Psychology, or related field
- 2+ years'' experience in a recruitment agency or in-house talent role
- Proven track record of meeting placement targets
- Excellent communication and negotiation skills
- Familiarity with LinkedIn Recruiter and applicant tracking systems

Package: KES 60,000 – 90,000 base + commission structure
Location: Nairobi, Kenya',
   ARRAY['Recruitment', 'Talent Sourcing', 'Interviewing', 'LinkedIn Recruiter', 'ATS'],
   ARRAY['Psychometric Testing', 'Executive Search', 'HRCI Certification'],
   'white_collar', 'open', 40,
   CURRENT_DATE + INTERVAL '21 days', poster),

  -- ── INSERT — Acme Corp Kenya (cid2) Manufacturing / Mombasa ──────────────

  -- 4. Plant Manager
  (gen_random_uuid(), tid, cid2,
   'Plant Manager',
   'Operations',
   'Acme Corp Kenya seeks a seasoned Plant Manager to lead all production operations at our Mombasa manufacturing facility, ensuring output targets, quality standards, and regulatory compliance are consistently met.

Key Responsibilities:
- Oversee daily plant operations, production scheduling, and resource allocation
- Drive lean manufacturing initiatives and continuous improvement (Kaizen)
- Ensure compliance with KEBS quality standards and OSHA regulations
- Manage a team of 80+ production and support staff
- Prepare and control the annual operations budget
- Liaise with the supply chain team to ensure uninterrupted raw material supply
- Submit monthly KPI reports to the Group Managing Director

Requirements:
- Bachelor''s degree in Mechanical / Industrial Engineering or equivalent
- Minimum 8 years'' manufacturing experience, with at least 3 in plant leadership
- Lean / Six Sigma Green Belt or higher
- Solid understanding of Kenya OSHA and KEBS requirements
- Strong leadership and people management skills

Package: KES 250,000 – 350,000 per month
Location: Mombasa, Kenya',
   ARRAY['Manufacturing', 'Production Management', 'Lean Manufacturing', 'ISO 9001', 'Team Leadership'],
   ARRAY['Six Sigma', 'ERP Systems', 'KEBS Standards', 'Kaizen'],
   'white_collar', 'open', 55,
   CURRENT_DATE + INTERVAL '60 days', poster),

  -- 5. SHE Officer
  (gen_random_uuid(), tid, cid2,
   'Safety, Health & Environment Officer',
   'Health, Safety & Environment',
   'We are recruiting a proactive Safety, Health & Environment (SHE) Officer to champion workplace safety culture and regulatory compliance across our Mombasa plant.

Key Responsibilities:
- Conduct daily safety inspections, risk assessments, and hazard analyses
- Develop and implement the annual HSE improvement plan
- Investigate accidents, near-misses, and occupational illnesses; prepare reports
- Train all staff on OSHA requirements, emergency procedures, and PPE use
- Maintain WIBA records and liaise with DOSH on regulatory compliance
- Coordinate environmental monitoring and waste disposal programmes

Requirements:
- Bachelor''s degree or Higher Diploma in Occupational Health & Safety
- Registered with the Institution of Safety Management (ISM Kenya)
- NEBOSH IGC or equivalent international certification
- Minimum 3 years'' HSE experience in a manufacturing environment
- Knowledge of OSHA Cap 514, EMCA, and WIBA regulations

Package: KES 90,000 – 120,000 per month
Location: Mombasa, Kenya',
   ARRAY['OSHA', 'Risk Assessment', 'Safety Audits', 'WIBA', 'NEBOSH', 'Environmental Compliance'],
   ARRAY['ISO 45001', 'Incident Investigation', 'DOSH Registration'],
   'white_collar', 'open', 45,
   CURRENT_DATE + INTERVAL '35 days', poster),

  -- 6. QA Inspector
  (gen_random_uuid(), tid, cid2,
   'Quality Assurance Inspector',
   'Quality Control',
   'Acme Corp Kenya seeks a meticulous Quality Assurance Inspector to maintain product standards and ensure every unit leaving our facility meets KEBS and client specifications.

Key Responsibilities:
- Inspect raw materials, in-process goods, and finished products against specifications
- Document non-conformances and issue corrective action requests (CARs)
- Calibrate and maintain quality inspection equipment
- Support internal and external ISO 9001:2015 audits
- Maintain the product quality database and generate weekly quality reports
- Train production staff on quality standards and defect identification

Requirements:
- Diploma or Bachelor''s in Quality Management, Engineering, or Science
- Minimum 2 years'' quality inspection experience in manufacturing
- Familiarity with ISO 9001:2015 quality management systems
- Attention to detail and strong analytical skills
- Proficiency in MS Excel for data recording and trend analysis

Package: KES 55,000 – 75,000 per month
Location: Mombasa, Kenya',
   ARRAY['Quality Control', 'ISO 9001', 'Product Inspection', 'KEBS Standards', 'Non-Conformance Reporting'],
   ARRAY['Statistical Process Control', 'Metrology', 'Six Sigma Yellow Belt'],
   'white_collar', 'open', 35,
   CURRENT_DATE + INTERVAL '28 days', poster),

  -- 7. Maintenance Technician (Casual)
  (gen_random_uuid(), tid, cid2,
   'Maintenance Technician',
   'Engineering',
   'We are looking for skilled Maintenance Technicians (casual/shift basis) to carry out preventive and corrective maintenance on production machinery at our Mombasa plant.

Key Responsibilities:
- Perform scheduled preventive maintenance on mechanical and electrical equipment
- Diagnose and repair breakdowns promptly to minimise production downtime
- Maintain maintenance records and update the CMMS system
- Assist with installation and commissioning of new equipment
- Observe and enforce all plant safety procedures during maintenance work

Requirements:
- Government Trade Test Grade I/II in Electrical or Mechanical Engineering
- Minimum 2 years'' hands-on experience in a manufacturing environment
- Knowledge of PLC systems and pneumatic/hydraulic systems is an advantage
- Ability to read technical drawings and equipment manuals
- Physically fit and available for rotating shifts including nights

Package: KES 35,000 – 50,000 per month
Location: Mombasa, Kenya',
   ARRAY['Mechanical Maintenance', 'Electrical Systems', 'Preventive Maintenance', 'Fault Diagnosis'],
   ARRAY['PLC Programming', 'CMMS', 'Hydraulics', 'Pneumatics'],
   'casual', 'open', 25,
   CURRENT_DATE + INTERVAL '20 days', poster),

  -- 8. Production Operator (Casual)
  (gen_random_uuid(), tid, cid2,
   'Production Operator',
   'Production',
   'Acme Corp Kenya is recruiting Production Operators on a casual/renewable basis to operate machinery on our manufacturing line in Mombasa.

Key Responsibilities:
- Operate and monitor assigned production machines according to standard operating procedures
- Meet daily and weekly production targets as set by the shift supervisor
- Conduct basic quality checks and report deviations immediately
- Keep work station clean, organised, and free of hazards
- Report equipment faults and near-miss incidents promptly
- Participate in all mandatory safety and quality training

Requirements:
- Kenya Certificate of Secondary Education (KCSE) — minimum Grade C
- Prior experience operating machinery in a manufacturing or FMCG environment is preferred
- Physically fit with good hand-eye coordination
- Reliable, punctual, and willing to work day or night shifts
- Basic reading and writing in English

Package: KES 18,000 – 25,000 per month + shift allowance
Location: Mombasa, Kenya',
   ARRAY['Machine Operation', 'Production Targets', 'Workplace Safety', 'Quality Checks'],
   ARRAY['FMCG Experience', 'Food Safety', 'Forklift License'],
   'casual', 'open', 20,
   CURRENT_DATE + INTERVAL '14 days', poster),

  -- 9. Warehouse Supervisor
  (gen_random_uuid(), tid, cid2,
   'Warehouse & Logistics Supervisor',
   'Supply Chain',
   'We are seeking an experienced Warehouse & Logistics Supervisor to oversee inbound and outbound logistics, inventory management, and warehouse operations at our Mombasa facility.

Key Responsibilities:
- Supervise a team of 15 warehouse staff across day and night shifts
- Manage receipt, storage, and dispatch of raw materials and finished goods
- Maintain 98%+ inventory accuracy using SAP Warehouse Management
- Coordinate with production planning to ensure timely raw material supply
- Oversee fleet management including trucks and forklifts
- Prepare daily, weekly, and monthly inventory and logistics reports

Requirements:
- Bachelor''s degree in Supply Chain Management, Logistics, or Business
- CIPS, KISM membership or equivalent professional qualification is an advantage
- Minimum 4 years'' warehouse/logistics experience, with 2 in a supervisory role
- Proficiency in SAP WM, MS Excel, and inventory management systems
- Strong leadership skills and ability to work under pressure

Package: KES 90,000 – 120,000 per month
Location: Mombasa, Kenya',
   ARRAY['Warehouse Management', 'Inventory Control', 'Supply Chain', 'SAP WM', 'Logistics'],
   ARRAY['CIPS', 'Forklift Certification', 'Fleet Management'],
   'white_collar', 'open', 40,
   CURRENT_DATE + INTERVAL '40 days', poster),

  -- 10. KYC Analyst
  (gen_random_uuid(), tid, cid2,
   'KYC Analyst',
   'Compliance',
   'Acme Corp Kenya (Financial Services Division) is recruiting a KYC Analyst to carry out customer due diligence, onboarding compliance, and AML monitoring in line with CBK requirements.

Key Responsibilities:
- Perform Know Your Customer (KYC) and Customer Due Diligence (CDD) checks on new and existing clients
- Review and verify client identification documents, source of funds, and business activities
- Monitor transactions for suspicious activity and file Suspicious Transaction Reports (STRs) to FCIU
- Maintain and update the AML/CFT risk register
- Keep abreast of CBK, FRC, and FATF regulatory developments
- Assist in preparing for compliance audits and regulatory inspections

Requirements:
- Bachelor''s degree in Law, Finance, Business or a related field
- ICA Certificate in Compliance or AML (ACAMS preferred)
- Minimum 2 years'' KYC/AML experience in a bank, MFI, or financial institution
- Knowledge of CBK Prudential Guidelines and AML/CFT regulations
- Strong investigative and report writing skills

Package: KES 85,000 – 120,000 per month
Location: Nairobi, Kenya',
   ARRAY['KYC', 'AML', 'Customer Due Diligence', 'Compliance', 'CBK Regulations', 'ACAMS'],
   ARRAY['FATF Guidelines', 'Sanctions Screening', 'Transaction Monitoring'],
   'white_collar', 'open', 50,
   CURRENT_DATE + INTERVAL '30 days', poster),

  -- ── INSERT — Savanna Tech Ltd (cid3) Technology / Nairobi ────────────────

  -- 11. Senior Software Engineer
  (gen_random_uuid(), tid, cid3,
   'Senior Software Engineer',
   'Engineering',
   'Savanna Tech Ltd is looking for a Senior Software Engineer to join our product engineering team in Nairobi and help build scalable SaaS products serving businesses across East Africa.

Key Responsibilities:
- Design, develop, and maintain high-performance backend and frontend systems
- Lead technical discussions, code reviews, and architectural decisions
- Mentor junior engineers and contribute to engineering best practices
- Collaborate with product managers and designers on feature delivery
- Participate in on-call rotation and incident response
- Contribute to open-source tooling and internal developer platforms

Requirements:
- Bachelor''s degree in Computer Science, Software Engineering, or equivalent experience
- 5+ years'' professional software development experience
- Expert proficiency in TypeScript / JavaScript (React, Node.js)
- Strong command of PostgreSQL, REST APIs, and cloud services (AWS/GCP)
- Experience with microservices, Docker, and CI/CD pipelines
- Excellent problem-solving and communication skills

Package: KES 200,000 – 280,000 per month
Location: Nairobi, Kenya (Hybrid)',
   ARRAY['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'REST APIs', 'AWS'],
   ARRAY['GraphQL', 'Docker', 'Kubernetes', 'Redis'],
   'white_collar', 'open', 60,
   CURRENT_DATE + INTERVAL '45 days', poster),

  -- 12. DevOps Engineer
  (gen_random_uuid(), tid, cid3,
   'DevOps / Cloud Engineer',
   'Engineering',
   'Join the Savanna Tech platform team to design, build, and maintain the cloud infrastructure that powers our SaaS applications for East African enterprises.

Key Responsibilities:
- Architect and manage cloud infrastructure on AWS using Infrastructure as Code (Terraform)
- Build and maintain CI/CD pipelines using GitHub Actions
- Monitor system performance and reliability; own the on-call runbook
- Implement security best practices, IAM policies, and network segmentation
- Collaborate with engineering teams to reduce deployment friction
- Drive cost optimisation across cloud accounts

Requirements:
- Bachelor''s degree in Computer Science, IT, or equivalent
- 3+ years'' DevOps/SRE experience in a cloud-native environment
- Strong hands-on experience with AWS (EC2, ECS, RDS, S3, CloudFront)
- Proficiency in Terraform and Docker
- Experience with GitHub Actions or GitLab CI
- AWS Solutions Architect Associate or Professional certification preferred

Package: KES 180,000 – 250,000 per month
Location: Nairobi, Kenya (Hybrid)',
   ARRAY['AWS', 'Terraform', 'Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions'],
   ARRAY['GCP', 'ArgoCD', 'Helm', 'Prometheus', 'Grafana'],
   'white_collar', 'open', 55,
   CURRENT_DATE + INTERVAL '45 days', poster),

  -- 13. Product Manager
  (gen_random_uuid(), tid, cid3,
   'Product Manager',
   'Product',
   'Savanna Tech Ltd is seeking a strategic Product Manager to own the roadmap for our flagship HR and payroll SaaS platform, driving growth across the East African market.

Key Responsibilities:
- Define and communicate the product vision, strategy, and roadmap
- Gather customer insights through interviews, surveys, and data analysis
- Write clear product requirements (PRDs) and user stories
- Prioritise the product backlog and align engineering, design, and sales
- Define success metrics, track KPIs, and iterate based on outcomes
- Partner with the go-to-market team on product launches and positioning

Requirements:
- Bachelor''s degree in Business, Computer Science, or related field; MBA is an advantage
- 4+ years'' product management experience with a SaaS product
- Strong data analysis skills (SQL, Mixpanel, or Amplitude)
- Experience working in Agile/Scrum environments
- Excellent communication and stakeholder management skills
- Understanding of the East African market is highly desirable

Package: KES 180,000 – 240,000 per month
Location: Nairobi, Kenya',
   ARRAY['Product Strategy', 'Agile', 'Product Roadmap', 'User Research', 'Data Analysis'],
   ARRAY['SQL', 'Mixpanel', 'Amplitude', 'Figma', 'OKRs'],
   'white_collar', 'open', 50,
   CURRENT_DATE + INTERVAL '50 days', poster),

  -- 14. Data Analyst
  (gen_random_uuid(), tid, cid3,
   'Data Analyst',
   'Analytics',
   'Savanna Tech is hiring a Data Analyst to unlock insights from our platform data and help internal teams and clients make data-driven decisions.

Key Responsibilities:
- Build and maintain dashboards and reports using Power BI and Metabase
- Write complex SQL queries to extract, transform, and analyse large datasets
- Work with the product and engineering teams to instrument events and define metrics
- Deliver weekly business intelligence reports to senior leadership
- Identify trends, anomalies, and opportunities from HR and payroll platform data
- Train client HR teams on self-service analytics features

Requirements:
- Bachelor''s degree in Statistics, Mathematics, Computer Science, or related field
- 2+ years'' experience as a data analyst or business intelligence analyst
- Advanced proficiency in SQL and Microsoft Excel
- Hands-on experience with Power BI, Tableau, or Metabase
- Working knowledge of Python (Pandas) is an advantage
- Strong communication skills — ability to present data to non-technical audiences

Package: KES 110,000 – 150,000 per month
Location: Nairobi, Kenya',
   ARRAY['SQL', 'Power BI', 'Data Analysis', 'Excel', 'Business Intelligence'],
   ARRAY['Python', 'Pandas', 'Metabase', 'dbt', 'Google BigQuery'],
   'white_collar', 'open', 45,
   CURRENT_DATE + INTERVAL '35 days', poster),

  -- 15. UI/UX Designer
  (gen_random_uuid(), tid, cid3,
   'UI/UX Designer',
   'Design',
   'We are looking for a talented UI/UX Designer to craft intuitive, beautiful interfaces for our web and mobile HR platform used by thousands of employees across East Africa.

Key Responsibilities:
- Lead end-to-end design processes: research, wireframing, prototyping, and final UI delivery
- Conduct user interviews and usability tests; translate findings into design improvements
- Build and maintain the company''s design system in Figma
- Collaborate closely with frontend engineers to ensure pixel-perfect implementation
- Design responsive interfaces for both web dashboards and mobile PWA applications
- Ensure accessibility standards (WCAG 2.1 AA) are met across all products

Requirements:
- Bachelor''s degree or Diploma in Design, HCI, or related field
- 3+ years'' UI/UX design experience for web and mobile products
- Expert proficiency in Figma (Auto Layout, Components, Prototyping)
- Strong portfolio demonstrating end-to-end product design work
- Understanding of frontend technologies (HTML/CSS) is an advantage
- Experience with user research methods and usability testing

Package: KES 130,000 – 175,000 per month
Location: Nairobi, Kenya (Hybrid)',
   ARRAY['Figma', 'UI Design', 'UX Research', 'Wireframing', 'Design Systems', 'Prototyping'],
   ARRAY['Framer', 'Lottie Animations', 'WCAG Accessibility', 'HTML/CSS'],
   'white_collar', 'open', 45,
   CURRENT_DATE + INTERVAL '40 days', poster),

  -- 16. Business Development Manager
  (gen_random_uuid(), tid, cid3,
   'Business Development Manager',
   'Sales & Partnerships',
   'Savanna Tech Ltd is seeking an ambitious Business Development Manager to drive new client acquisition and revenue growth for our HR SaaS platform across Kenya and the East African region.

Key Responsibilities:
- Identify and pursue new business opportunities with SMEs and enterprise clients
- Build a robust sales pipeline and manage it using CRM tools
- Deliver product demonstrations and tailored proposals to decision-makers
- Negotiate and close contracts; achieve monthly and quarterly revenue targets
- Represent Savanna Tech at industry events, trade fairs, and networking forums
- Collaborate with the product team to feed market intelligence into the roadmap

Requirements:
- Bachelor''s degree in Business Administration, Sales, or Marketing
- 5+ years'' B2B sales experience, preferably selling SaaS or HR technology
- Proven track record of consistently meeting or exceeding revenue targets
- Strong network within the Kenya corporate and SME ecosystem
- Excellent presentation, negotiation, and relationship-management skills

Package: KES 150,000 – 200,000 base + uncapped commission
Location: Nairobi, Kenya',
   ARRAY['B2B Sales', 'SaaS', 'Client Acquisition', 'CRM', 'Revenue Growth', 'Negotiation'],
   ARRAY['HubSpot', 'Salesforce', 'Partnership Development', 'East Africa Market'],
   'white_collar', 'open', 45,
   CURRENT_DATE + INTERVAL '30 days', poster),

  -- 17. Customer Success Manager
  (gen_random_uuid(), tid, cid3,
   'Customer Success Manager',
   'Customer Success',
   'Savanna Tech is hiring a Customer Success Manager to ensure our HR platform clients achieve maximum value, driving retention, expansion, and advocacy.

Key Responsibilities:
- Own a portfolio of 30–50 enterprise accounts post-onboarding
- Conduct regular business reviews (QBRs) with HR directors and C-suite stakeholders
- Monitor product adoption health scores and proactively address at-risk accounts
- Lead client onboarding, training, and platform configuration sessions
- Gather and relay product feedback to the product management team
- Identify upsell and cross-sell opportunities within the existing client base
- Achieve annual NRR (Net Revenue Retention) targets of 110%+

Requirements:
- Bachelor''s degree in Business, HR, or a related field
- 3+ years'' customer success or account management experience in a SaaS environment
- Strong understanding of HR processes (payroll, leave, performance management)
- Excellent client relationship and communication skills
- Experience with customer success platforms (Gainsight, Totango, or ChurnZero)

Package: KES 130,000 – 170,000 per month
Location: Nairobi, Kenya',
   ARRAY['Customer Success', 'SaaS', 'Account Management', 'Onboarding', 'NRR', 'Client Retention'],
   ARRAY['Gainsight', 'HR Software Knowledge', 'Churn Reduction', 'QBR Facilitation'],
   'white_collar', 'open', 40,
   CURRENT_DATE + INTERVAL '35 days', poster),

  -- 18. Graduate Intern
  (gen_random_uuid(), tid, cid3,
   'Graduate Intern — Software Engineering',
   'Engineering',
   'Savanna Tech offers a 3-month paid Graduate Internship in Software Engineering for recent graduates eager to kick-start their careers in a fast-moving tech company building for Africa.

What You''ll Do:
- Work alongside senior engineers on real product features shipped to thousands of users
- Write clean, tested code in TypeScript/JavaScript (React and Node.js)
- Participate in sprint planning, code reviews, and team stand-ups
- Learn cloud fundamentals on AWS and deployment best practices
- Build at least one end-to-end feature from design to production during your internship

Requirements:
- Bachelor''s degree (or final-year student) in Computer Science, Software Engineering, or IT
- Strong fundamentals in at least one programming language (JavaScript, Python, or Java)
- Familiarity with HTML, CSS, and basic web development concepts
- Active GitHub profile with personal or university projects is a strong advantage
- Curiosity, a growth mindset, and eagerness to learn in a fast-paced environment

Stipend: KES 25,000 – 35,000 per month
Duration: 3 months (renewable based on performance)
Location: Nairobi, Kenya (In-office)',
   ARRAY['JavaScript', 'HTML', 'CSS', 'Git', 'Programming Fundamentals'],
   ARRAY['TypeScript', 'React', 'Node.js', 'Python', 'AWS Basics'],
   'white_collar', 'open', 20,
   CURRENT_DATE + INTERVAL '18 days', poster),

  -- 19. Direct Sales Executive
  (gen_random_uuid(), tid, cid3,
   'Direct Sales Executive — B2B Tech',
   'Sales',
   'Savanna Tech is expanding its field sales team and seeking high-energy Direct Sales Executives to drive SME client acquisition across Nairobi and major towns.

Key Responsibilities:
- Prospect and qualify SME leads through cold calling, LinkedIn, and field visits
- Conduct product demonstrations (in person and via Zoom) for business owners and HR managers
- Convert qualified leads into paying customers and hit monthly subscription targets
- Maintain accurate pipeline records in the CRM system (HubSpot)
- Collect and relay customer feedback and competitor intelligence
- Attend weekly sales reviews and training sessions

Requirements:
- Diploma or Bachelor''s degree in any field
- 1–3 years'' direct sales or field sales experience (tech sales is a major advantage)
- Proven ability to meet and exceed sales targets
- Own smartphone and willingness to travel within Kenya
- Excellent verbal communication and persuasion skills in English and Swahili
- High energy, resilience, and a results-driven mindset

Package: KES 45,000 – 65,000 base + competitive commission
Location: Nairobi, Kenya (Field-based)',
   ARRAY['B2B Sales', 'Cold Calling', 'Field Sales', 'CRM', 'Lead Generation'],
   ARRAY['HubSpot', 'SaaS Sales', 'Swahili', 'Tech Product Knowledge'],
   'white_collar', 'open', 30,
   CURRENT_DATE + INTERVAL '15 days', poster),

  -- 20. Fraud & Risk Executive
  (gen_random_uuid(), tid, cid3,
   'Fraud & Risk Management Executive',
   'Risk & Compliance',
   'Savanna Tech Ltd is looking for a Fraud & Risk Management Executive to protect our fintech-enabled HR payment platform against fraud, financial crime, and cyber threats.

Key Responsibilities:
- Monitor platform transactions in real time for fraud indicators and anomalies
- Investigate reported fraud cases; gather evidence and prepare investigation reports
- Develop and maintain fraud detection rules and risk scoring models
- Collaborate with the engineering team to implement fraud prevention controls
- Prepare monthly risk dashboards for senior leadership and the board
- Liaise with CBK, DCI, and partner banks on fraud-related matters
- Train internal teams on fraud awareness and prevention best practices

Requirements:
- Bachelor''s degree in Finance, IT, Law, or a related field
- CFE (Certified Fraud Examiner) certification is highly desirable
- Minimum 3 years'' fraud investigation or risk management experience
- Knowledge of mobile money fraud vectors (M-Pesa, Airtel Money)
- Strong analytical skills and proficiency in Excel / SQL for data analysis
- Discretion, integrity, and ability to handle sensitive information

Package: KES 130,000 – 170,000 per month
Location: Nairobi, Kenya',
   ARRAY['Fraud Detection', 'Risk Management', 'AML', 'Financial Crime', 'Investigation', 'CFE'],
   ARRAY['SQL', 'Mobile Money Fraud', 'CBK Compliance', 'Cyber Fraud'],
   'white_collar', 'open', 50,
   CURRENT_DATE + INTERVAL '28 days', poster);

  RAISE NOTICE 'Job postings seed complete — 20 diverse roles inserted.';

END $$;
