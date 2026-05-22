import { z } from 'zod'

// Background check types
export const backgroundCheckTypeSchema = z.enum([
  'criminal',       // Police Clearance Certificate
  'credit',         // Credit history check
  'employment',     // Previous employment verification
  'education',      // Education/degree verification
  'professional',   // Professional license verification
])

// Background check statuses
export const backgroundCheckStatusSchema = z.enum([
  'pending',        // Check requested, not started
  'in_progress',    // Check is being processed
  'completed',      // Check done, awaiting review
  'passed',         // Cleared - no issues found
  'failed',         // Did not pass - disqualifying issues
  'flagged',        // Passed with concerns (requires HR review)
])

// Create a new background check request
export const createBackgroundCheckSchema = z.object({
  // Subject - either employee or candidate (at least one required)
  employee_id: z.string().uuid().optional().nullable(),
  candidate_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid(),

  // Check details
  check_type: backgroundCheckTypeSchema,

  // Optional initial data
  notes: z.string().optional().nullable(),

  // For manual PCC upload during creation
  document_url: z.string().url().optional().nullable(),
  clearance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
}).refine(
  (data) => data.employee_id || data.candidate_id,
  { message: 'Either employee_id or candidate_id is required' }
)

// Update background check status (for HR review)
export const updateBackgroundCheckSchema = z.object({
  status: backgroundCheckStatusSchema,
  result_summary: z.string().optional().nullable(),
  clearance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  flags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
})

// Upload PCC document
export const uploadBackgroundCheckDocumentSchema = z.object({
  background_check_id: z.string().uuid(),
  document_url: z.string().url(),
})

// Review/complete a background check
export const reviewBackgroundCheckSchema = z.object({
  status: z.enum(['passed', 'failed', 'flagged']),
  result_summary: z.string().min(1, 'Result summary is required'),
  clearance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  flags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
})

// Bulk request background checks
export const bulkBackgroundCheckSchema = z.object({
  company_id: z.string().uuid(),
  check_type: backgroundCheckTypeSchema,
  candidate_ids: z.array(z.string().uuid()).min(1).max(100),
  notes: z.string().optional().nullable(),
})

// Filter schema for listing
export const backgroundCheckFilterSchema = z.object({
  company_id: z.string().uuid().optional(),
  status: backgroundCheckStatusSchema.optional(),
  check_type: backgroundCheckTypeSchema.optional(),
  employee_id: z.string().uuid().optional(),
  candidate_id: z.string().uuid().optional(),
  expiring_within_days: z.number().int().positive().optional(),
})

// Type exports (BackgroundCheckType and BackgroundCheckStatus are exported from types/common.ts)
export type CreateBackgroundCheckInput = z.infer<typeof createBackgroundCheckSchema>
export type UpdateBackgroundCheckInput = z.infer<typeof updateBackgroundCheckSchema>
export type ReviewBackgroundCheckInput = z.infer<typeof reviewBackgroundCheckSchema>
export type BulkBackgroundCheckInput = z.infer<typeof bulkBackgroundCheckSchema>
export type BackgroundCheckFilter = z.infer<typeof backgroundCheckFilterSchema>
