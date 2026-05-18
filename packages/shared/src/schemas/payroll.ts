import { z } from 'zod'

export const payrollRunSchema = z.object({
  company_id: z.string().uuid(),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2020).max(2099),
})

export const payrollRecordEditSchema = z.object({
  id: z.string().uuid(),
  gross_salary: z.number().positive(),
  helb: z.number().min(0).default(0),
  other_deductions: z.number().min(0).default(0),
})

export type PayrollRunInput = z.infer<typeof payrollRunSchema>
export type PayrollRecordEditInput = z.infer<typeof payrollRecordEditSchema>
