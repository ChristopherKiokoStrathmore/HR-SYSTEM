import type {
  UUID,
  UserRole,
  EmploymentType,
  EmploymentStatus,
  PaymentMethod,
  DocumentType,
  DocumentStatus,
  LeaveType,
  LeaveStatus,
  AttendanceStatus,
  PayrollRunStatus,
  PaymentStatus,
  PaymentBatchStatus,
  CandidateStage,
  JobPostingStatus,
  FitnessStatus,
  AnnouncementPriority,
  BackgroundCheckType,
  BackgroundCheckStatus,
} from './common'

export interface BaseRecord {
  id: UUID
  created_at: string
  updated_at: string
  is_deleted: boolean
  tenant_id: UUID
}

export interface Company extends BaseRecord {
  name: string
  logo_url: string | null
  industry: string | null
  country: string
  city: string | null
  primary_color: string | null
  contact_email: string
  is_active: boolean
  // Background check settings
  background_check_required?: boolean
  background_check_blocks_hiring?: boolean
  // Payment account settings
  company_bank_name: string | null
  company_bank_account: string | null
  company_bank_branch: string | null
  mpesa_paybill_number: string | null
  mpesa_till_number: string | null
  mpesa_shortcode_type: 'paybill' | 'till' | null
  airtel_business_number: string | null
  airtel_business_name: string | null
  pesapal_consumer_key: string | null
  pesapal_consumer_secret: string | null
  pesapal_ipn_id: string | null
  payment_accounts_configured: boolean
}

export interface User extends BaseRecord {
  full_name: string
  email: string
  role: UserRole
  company_id: UUID
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  preferred_language: 'en' | 'sw'
  last_login_at: string | null
}

export interface EmployeeProfile extends BaseRecord {
  user_id: UUID
  employee_number: string
  company_id: UUID
  department: string | null
  job_title: string
  employment_type: EmploymentType
  employment_status: EmploymentStatus
  manager_id: UUID | null
  start_date: string
  end_date: string | null
  contract_duration_months: number | null
  salary: number
  payment_method: PaymentMethod
  bank_name: string | null
  bank_account: string | null
  mpesa_number: string | null
  airtel_number: string | null
  nssf_number: string | null
  nhif_number: string | null
  kra_pin: string | null
  id_number: string | null
  date_of_birth: string | null
  gender: string | null
  nationality: string | null
  next_of_kin_name: string | null
  next_of_kin_phone: string | null
  next_of_kin_relationship: string | null
}

export interface Document extends BaseRecord {
  employee_id: UUID
  type: DocumentType
  file_url: string
  status: DocumentStatus
  rejection_reason: string | null
  expiry_date: string | null
  uploaded_at: string
  verified_by: UUID | null
}

export interface JobPosting extends BaseRecord {
  company_id: UUID
  title: string
  department: string | null
  description: string
  required_keywords: string[]
  nice_to_have_keywords: string[]
  employment_type: EmploymentType
  status: JobPostingStatus
  auto_reject_threshold: number
  closing_date: string | null
  created_by: UUID
}

export interface Candidate extends BaseRecord {
  job_posting_id: UUID
  full_name: string
  email: string
  phone: string | null
  cv_url: string
  cv_text: string | null
  ai_score: number | null
  ai_summary: string | null
  ai_extracted_skills: string[]
  ai_experience_years: number | null
  ai_education: string | null
  current_stage: CandidateStage
  rejection_reason: string | null
  notes: string | null
  tracking_token: string | null
  source: 'portal' | 'manual'
}

export interface Attendance extends BaseRecord {
  employee_id: UUID
  company_id: UUID
  check_in_time: string | null
  check_out_time: string | null
  check_in_lat: number | null
  check_in_lng: number | null
  check_out_lat: number | null
  check_out_lng: number | null
  gps_path: GpsPoint[] | null
  distance_covered_km: number | null
  is_late: boolean
  is_early_departure: boolean
  shift_date: string
  status: AttendanceStatus
}

export interface GpsPoint {
  lat: number
  lng: number
  timestamp: string
}

export interface Leave extends BaseRecord {
  employee_id: UUID
  company_id: UUID
  leave_type: LeaveType
  start_date: string
  end_date: string
  days_requested: number
  reason: string
  supporting_doc_url: string | null
  status: LeaveStatus
  approved_by: UUID | null
  approved_at: string | null
  rejection_reason: string | null
}

export interface LeaveBalance extends BaseRecord {
  employee_id: UUID
  leave_type: LeaveType
  year: number
  total_days: number
  used_days: number
  remaining_days: number
}

export interface PayrollRun extends BaseRecord {
  company_id: UUID
  period_month: number
  period_year: number
  status: PayrollRunStatus
  total_gross: number
  total_deductions: number
  total_net: number
  run_by: UUID
  completed_at: string | null
}

export interface PayrollRecord extends BaseRecord {
  payroll_run_id: UUID
  employee_id: UUID
  gross_salary: number
  paye: number
  nssf: number
  nhif: number
  helb: number
  other_deductions: number
  net_salary: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_reference: string | null
  paid_at: string | null
  // Disbursement tracking
  payment_batch_id: UUID | null
  pesapal_transaction_id: string | null
  payment_error: string | null
  retry_count: number
}

export interface PaymentBatch extends BaseRecord {
  payroll_run_id: UUID
  payment_method: PaymentMethod
  status: PaymentBatchStatus
  total_amount: number
  total_records: number
  successful_count: number
  failed_count: number
  pesapal_order_id: string | null
  pesapal_reference: string | null
  pesapal_response: Record<string, unknown> | null
  initiated_by: UUID
  initiated_at: string
  completed_at: string | null
  error_message: string | null
  retry_count: number
}

export interface KpiTarget {
  name: string
  weight: number
  target: string | number
  unit?: string
}

export interface KpiScore {
  name: string
  actual: string | number
  score: number
}

export interface KpiAssignment extends BaseRecord {
  employee_id: UUID
  template_id: UUID | null
  period_quarter: number
  period_year: number
  targets: KpiTarget[]
  scores: KpiScore[]
  final_score: number | null
  reviewed_by: UUID | null
  submitted_at: string | null
}

export interface PerformanceReview extends BaseRecord {
  employee_id: UUID
  reviewer_id: UUID
  period: string
  rating: 1 | 2 | 3 | 4 | 5
  strengths: string | null
  improvements: string | null
  promotion_recommended: boolean
  award_given: string | null
  notes: string | null
}

export interface TrainingSession extends BaseRecord {
  company_id: UUID
  title: string
  description: string | null
  trainer_name: string
  start_date: string
  end_date: string
  is_mandatory: boolean
  department: string | null
}

export interface MedicalRecord extends BaseRecord {
  employee_id: UUID
  record_type: string
  file_url: string
  fitness_status: FitnessStatus
  issued_by: string | null
  issued_date: string
  expiry_date: string | null
  notes: string | null
}

export interface AuditLog {
  id: UUID
  user_id: UUID
  company_id: UUID
  action: string
  entity_type: string
  entity_id: UUID
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  timestamp: string
}

export interface Announcement extends BaseRecord {
  company_id: UUID
  department: string | null
  title: string
  body: string
  priority: AnnouncementPriority
  created_by: UUID
  expires_at: string | null
}

export interface BackgroundCheck extends BaseRecord {
  employee_id: UUID | null
  candidate_id: UUID | null
  company_id: UUID
  check_type: BackgroundCheckType
  status: BackgroundCheckStatus
  requested_by: UUID
  requested_at: string
  document_url: string | null
  document_uploaded_at: string | null
  provider_name: string | null
  provider_reference: string | null
  provider_response: Record<string, unknown> | null
  completed_at: string | null
  reviewed_by: UUID | null
  result_summary: string | null
  clearance_date: string | null
  expiry_date: string | null
  flags: string[]
  notes: string | null
}

// ── Joined / enriched types ──────────────────────────────────────────────────

export interface EmployeeWithUser extends EmployeeProfile {
  user: Pick<User, 'full_name' | 'email' | 'avatar_url' | 'phone' | 'preferred_language'>
  manager?: Pick<User, 'full_name'> | null
  company?: Pick<Company, 'name' | 'logo_url'> | null
}

export interface CandidateWithPosting extends Candidate {
  job_posting: Pick<JobPosting, 'title' | 'department' | 'company_id'>
}

export interface PayrollRecordWithEmployee extends PayrollRecord {
  employee: Pick<EmployeeProfile, 'employee_number'> & {
    user: Pick<User, 'full_name'>
  }
}

export interface BackgroundCheckWithSubject extends BackgroundCheck {
  employee?: Pick<EmployeeProfile, 'employee_number'> & {
    user: Pick<User, 'full_name' | 'email'>
  } | null
  candidate?: Pick<Candidate, 'full_name' | 'email'> | null
  requested_by_user?: Pick<User, 'full_name'> | null
  reviewed_by_user?: Pick<User, 'full_name'> | null
}
