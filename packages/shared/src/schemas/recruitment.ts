import { z } from 'zod'

export const jobPostingSchema = z.object({
  company_id: z.string().uuid(),
  title: z.string().min(2),
  department: z.string().optional().nullable(),
  description: z.string().min(20),
  required_keywords: z.array(z.string()).min(1, 'At least one required keyword'),
  nice_to_have_keywords: z.array(z.string()).default([]),
  employment_type: z.enum(['white_collar', 'casual']),
  auto_reject_threshold: z.number().int().min(0).max(100).default(30),
  closing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export const cvUploadSchema = z.object({
  job_posting_id: z.string().uuid(),
  files: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum([
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]),
        size: z.number().max(10 * 1024 * 1024, 'File must be under 10MB'),
      })
    )
    .min(1)
    .max(50, 'Maximum 50 CVs per upload'),
})

export const candidateStageUpdateSchema = z.object({
  candidate_id: z.string().uuid(),
  stage: z.enum([
    'screened',
    'interview_l1',
    'interview_l2',
    'offer_sent',
    'hired',
    'rejected',
  ]),
  notes: z.string().optional(),
  rejection_reason: z.string().optional(),
})

export type JobPostingInput = z.infer<typeof jobPostingSchema>
export type CvUploadInput = z.infer<typeof cvUploadSchema>
export type CandidateStageUpdateInput = z.infer<typeof candidateStageUpdateSchema>
