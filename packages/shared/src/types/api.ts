import type { UUID } from './common'

// ── CV Screening ─────────────────────────────────────────────────────────────

export interface CvScreeningRequest {
  jobPostingId: UUID
  fileName: string
  fileBase64: string
  mimeType: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

export interface AiCvResult {
  name: string
  email: string
  phone: string
  skills: string[]
  experience_years: number
  education: string
  match_score: number
  summary: string
  strengths: string[]
  gaps: string[]
}

// ── Payments ─────────────────────────────────────────────────────────────────

export interface MpesaRequest {
  phone: string
  amount: number
  reference: string
  description: string
}

export interface MpesaResponse {
  CheckoutRequestID: string
  ResponseCode: string
  CustomerMessage: string
}

export interface EftRequest {
  account: string
  bank_code: string
  amount: number
  reference: string
}

export interface EftResponse {
  transaction_id: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  estimated_clearance: string
}

export interface AirtelRequest {
  phone: string
  amount: number
  reference: string
}

export interface AirtelResponse {
  transaction_id: string
  status: 'SUCCESS' | 'FAILED'
  message: string
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export interface PayrollCalculationInput {
  gross_salary: number
  helb?: number
  other_deductions?: number
}

export interface PayrollCalculationResult {
  gross_salary: number
  paye: number
  nssf: number
  nhif: number
  helb: number
  other_deductions: number
  net_salary: number
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthSession {
  userId: UUID
  email: string
  role: string
  companyId: UUID
  fullName: string
  avatarUrl: string | null
}
