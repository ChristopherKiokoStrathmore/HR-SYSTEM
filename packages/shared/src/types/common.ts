export type UUID = string

export type Language = 'en' | 'sw'

export type UserRole = 'super_admin' | 'hr_admin' | 'manager' | 'employee'

export type EmploymentType = 'white_collar' | 'casual'

export type EmploymentStatus =
  | 'active'
  | 'on_leave'
  | 'suspended'
  | 'terminated'
  | 'resigned'

export type PaymentMethod = 'bank' | 'mpesa' | 'airtel'

export type DocumentType =
  | 'id'
  | 'nssf'
  | 'nhif'
  | 'kra'
  | 'bank_details'
  | 'photo'
  | 'contract'
  | 'medical'
  | 'pcc'
  | 'other'

export type DocumentStatus = 'pending' | 'uploaded' | 'verified' | 'rejected'

export type LeaveType =
  | 'annual'
  | 'sick'
  | 'maternity'
  | 'paternity'
  | 'study'
  | 'compassionate'
  | 'unpaid'
  | 'adoption'
  | 'family'

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type AttendanceStatus = 'present' | 'absent' | 'half_day'

export type PayrollRunStatus = 'draft' | 'processing' | 'completed' | 'failed'

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed'

export type PaymentBatchStatus = 'pending' | 'processing' | 'partial' | 'completed' | 'failed'

export type CandidateStage =
  | 'screened'
  | 'interview_l1'
  | 'interview_l2'
  | 'offer_sent'
  | 'hired'
  | 'rejected'

export type JobPostingStatus = 'open' | 'closed' | 'on_hold'

export type FitnessStatus = 'fit' | 'fit_with_conditions' | 'unfit'

export type AnnouncementPriority = 'normal' | 'urgent'

export type BackgroundCheckType =
  | 'criminal'       // Police Clearance Certificate
  | 'credit'         // Credit history check
  | 'employment'     // Previous employment verification
  | 'education'      // Education/degree verification
  | 'professional'   // Professional license verification

export type BackgroundCheckStatus =
  | 'pending'        // Check requested, not started
  | 'in_progress'    // Check is being processed
  | 'completed'      // Check done, awaiting review
  | 'passed'         // Cleared - no issues found
  | 'failed'         // Did not pass - disqualifying issues
  | 'flagged'        // Passed with concerns (requires HR review)

export type TerminationReason =
  | 'resigned'
  | 'terminated'
  | 'contract_end'
  | 'redundancy'
  | 'misconduct'

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface SelectOption {
  label: string
  value: string
}
