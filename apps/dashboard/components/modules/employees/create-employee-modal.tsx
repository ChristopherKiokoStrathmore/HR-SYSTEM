'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useCreateEmployee } from '@/lib/hooks/use-employees'
import { useCompanies } from '@/lib/hooks/use-companies'
import { createEmployeeSchema, type CreateEmployeeInput } from '@hr/shared'
import { toast } from '@/lib/toast'
import { useState } from 'react'

const STEPS = ['Personal', 'Employment', 'Compensation', 'Statutory'] as const

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateEmployeeModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0)
  const create = useCreateEmployee()
  const { data: companies } = useCompanies()

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      employment_status: 'active',
      employment_type: 'white_collar',
      payment_method: 'bank',
      preferred_language: 'en',
    },
  })

  const stepFields: Record<number, (keyof CreateEmployeeInput)[]> = {
    0: ['full_name', 'email', 'phone', 'date_of_birth', 'gender', 'nationality', 'id_number'],
    1: ['company_id', 'employee_number', 'job_title', 'department', 'employment_type', 'employment_status', 'start_date', 'contract_duration_months'],
    2: ['salary', 'payment_method', 'bank_name', 'bank_account', 'mpesa_number', 'airtel_number'],
    3: ['nssf_number', 'nhif_number', 'kra_pin', 'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship'],
  }

  async function handleNext() {
    const valid = await trigger(stepFields[step])
    if (valid) setStep((s) => s + 1)
  }

  async function onSubmit(values: CreateEmployeeInput) {
    try {
      await create.mutateAsync(values)
      toast.success('Employee created', 'An invitation email has been sent.')
      onClose()
      setStep(0)
    } catch (e) {
      toast.error('Failed to create employee', String(e))
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Employee" size="lg">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
              i < step ? 'bg-success text-white' : i === step ? 'bg-accent text-white' : 'bg-surface-alt text-text-muted'
            }`}>{i + 1}</div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-text-primary font-medium' : 'text-text-muted'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-success' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Personal */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-body mb-1.5">Full Name *</label>
              <input className="input" placeholder="Jane Doe" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-danger mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Email *</label>
              <input className="input" type="email" placeholder="jane@email.com" {...register('email')} />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Phone</label>
              <input className="input" placeholder="+254700000000" {...register('phone')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Date of Birth</label>
              <input className="input" type="date" {...register('date_of_birth')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Gender</label>
              <select className="input" {...register('gender')}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Nationality</label>
              <input className="input" placeholder="Kenyan" {...register('nationality')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">ID Number</label>
              <input className="input" placeholder="12345678" {...register('id_number')} />
            </div>
          </div>
        )}

        {/* Step 1: Employment */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-body mb-1.5">Company *</label>
              <select className="input" {...register('company_id')}>
                <option value="">Select company…</option>
                {companies?.data.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.company_id && <p className="text-xs text-danger mt-1">{errors.company_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Employee Number *</label>
              <input className="input" placeholder="EMP-0001" {...register('employee_number')} />
              {errors.employee_number && <p className="text-xs text-danger mt-1">{errors.employee_number.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Job Title *</label>
              <input className="input" placeholder="Software Engineer" {...register('job_title')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Department</label>
              <input className="input" placeholder="Engineering" {...register('department')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Employment Type *</label>
              <select className="input" {...register('employment_type')}>
                <option value="white_collar">White Collar</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Start Date *</label>
              <input className="input" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-xs text-danger mt-1">{errors.start_date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Contract Duration (months)</label>
              <input
                className="input"
                type="number"
                placeholder="12"
                {...register('contract_duration_months', {
                  setValueAs: (value) => value === '' ? undefined : Number(value),
                })}
              />
            </div>
          </div>
        )}

        {/* Step 2: Compensation */}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Gross Salary (KES) *</label>
              <input className="input" type="number" placeholder="50000" {...register('salary', { valueAsNumber: true })} />
              {errors.salary && <p className="text-xs text-danger mt-1">{errors.salary.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Payment Method *</label>
              <select className="input" {...register('payment_method')}>
                <option value="bank">Bank Transfer</option>
                <option value="mpesa">M-Pesa</option>
                <option value="airtel">Airtel Money</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Bank Name</label>
              <input className="input" placeholder="Equity Bank" {...register('bank_name')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Bank Account</label>
              <input className="input" placeholder="0123456789" {...register('bank_account')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">M-Pesa Number</label>
              <input className="input" placeholder="+254700000000" {...register('mpesa_number')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Airtel Money Number</label>
              <input className="input" placeholder="+254733000000" {...register('airtel_number')} />
            </div>
          </div>
        )}

        {/* Step 3: Statutory + Next of Kin */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">NSSF Number</label>
              <input className="input" placeholder="NSSF/12345" {...register('nssf_number')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">NHIF Number</label>
              <input className="input" placeholder="NHIF/12345" {...register('nhif_number')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">KRA PIN</label>
              <input className="input" placeholder="A123456789Z" {...register('kra_pin')} />
            </div>
            <div className="col-span-2 border-t border-border pt-4 mt-2">
              <p className="text-sm font-semibold text-text-primary mb-3">Next of Kin</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Full Name</label>
              <input className="input" placeholder="John Doe" {...register('next_of_kin_name')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Phone</label>
              <input className="input" placeholder="+254700000000" {...register('next_of_kin_phone')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Relationship</label>
              <input className="input" placeholder="Spouse" {...register('next_of_kin_relationship')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Preferred Language</label>
              <select className="input" {...register('preferred_language')}>
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-ghost flex-1">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={handleNext} className="btn-primary flex-1">
              Next
            </button>
          ) : (
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Employee
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
