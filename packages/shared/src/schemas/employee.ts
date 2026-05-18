import { z } from 'zod'

export const createEmployeeSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  employee_number: z.string().min(1, 'Employee number is required'),
  company_id: z.string().uuid(),
  department: z.string().optional(),
  job_title: z.string().min(1, 'Job title is required'),
  employment_type: z.enum(['white_collar', 'casual']),
  employment_status: z
    .enum(['active', 'on_leave', 'suspended', 'terminated', 'resigned'])
    .default('active'),
  manager_id: z.string().uuid().optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  contract_duration_months: z.number().int().positive().optional().nullable(),
  salary: z.number().positive('Salary must be a positive number'),
  payment_method: z.enum(['bank', 'mpesa', 'airtel']),
  bank_name: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
  mpesa_number: z.string().optional().nullable(),
  airtel_number: z.string().optional().nullable(),
  nssf_number: z.string().optional().nullable(),
  nhif_number: z.string().optional().nullable(),
  kra_pin: z.string().optional().nullable(),
  id_number: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  nationality: z.string().optional().nullable(),
  next_of_kin_name: z.string().optional().nullable(),
  next_of_kin_phone: z.string().optional().nullable(),
  next_of_kin_relationship: z.string().optional().nullable(),
  preferred_language: z.enum(['en', 'sw']).default('en'),
})

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  id: z.string().uuid(),
})

export const terminationSchema = z.object({
  employee_id: z.string().uuid(),
  reason: z.enum(['resigned', 'terminated', 'contract_end', 'redundancy', 'misconduct']),
  details: z.string().min(10, 'Please provide a detailed reason'),
  last_working_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exit_interview_notes: z.string().optional(),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
export type TerminationInput = z.infer<typeof terminationSchema>
