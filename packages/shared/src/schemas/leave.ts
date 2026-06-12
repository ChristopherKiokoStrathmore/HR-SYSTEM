import { z } from 'zod'

export const leaveRequestSchema = z.object({
  employee_id: z.string().uuid(),
  company_id: z.string().uuid(),
  leave_type: z.enum([
    'annual',
    'sick',
    'maternity',
    'paternity',
    'study',
    'compassionate',
    'unpaid',
    'adoption',
    'family',
  ]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(10, 'Please provide a reason'),
  supporting_doc_url: z.string().url().optional().nullable(),
})

export const leaveApprovalSchema = z.object({
  leave_id: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().optional(),
})

export const leaveBalanceUpdateSchema = z.object({
  employee_id: z.string().uuid(),
  leave_type: z.enum([
    'annual',
    'sick',
    'maternity',
    'paternity',
    'study',
    'compassionate',
    'unpaid',
    'adoption',
    'family',
  ]),
  year: z.number().int().min(2020).max(2099),
  total_days: z.number().int().min(0).max(365),
})

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>
export type LeaveApprovalInput = z.infer<typeof leaveApprovalSchema>
export type LeaveBalanceUpdateInput = z.infer<typeof leaveBalanceUpdateSchema>
