'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useTerminateEmployee } from '@/lib/hooks/use-employees'
import { toast } from '@/lib/toast'

// Form schema (employee_id supplied via prop, not form field)
const formSchema = z.object({
  reason: z.enum(['resigned', 'terminated', 'contract_end', 'redundancy', 'misconduct'], {
    required_error: 'Select a termination reason',
  }),
  details: z.string().min(10, 'Provide at least 10 characters of detail'),
  last_working_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Required'),
  exit_interview_notes: z.string().optional(),
})
type FormValues = z.infer<typeof formSchema>

const REASON_LABELS: Record<FormValues['reason'], string> = {
  resigned: 'Resignation',
  terminated: 'Termination',
  contract_end: 'Contract End',
  redundancy: 'Redundancy',
  misconduct: 'Misconduct',
}

interface Props {
  open: boolean
  employeeId: string
  employeeName: string
  onClose: () => void
  onSuccess?: () => void
}

export function TerminationModal({ open, employeeId, employeeName, onClose, onSuccess }: Props) {
  const terminate = useTerminateEmployee()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  async function onSubmit(values: FormValues) {
    try {
      await terminate.mutateAsync({ employee_id: employeeId, ...values })
      toast.success(`${employeeName} has been terminated`)
      reset()
      onClose()
      onSuccess?.()
    } catch (e) {
      toast.error('Failed to process termination', String(e))
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Terminate Employee"
      description={`This will end ${employeeName}'s employment. This action cannot be undone.`}
      size="md"
    >
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">Irreversible Action</p>
          <p className="text-xs text-red-700 mt-0.5">
            Employee access will be revoked immediately. Payroll stops from the last working date.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">
            Reason <span className="text-danger">*</span>
          </label>
          <select className="input" {...register('reason')}>
            <option value="">Select reason…</option>
            {(Object.keys(REASON_LABELS) as Array<FormValues['reason']>).map(key => (
              <option key={key} value={key}>{REASON_LABELS[key]}</option>
            ))}
          </select>
          {errors.reason && <p className="text-xs text-danger mt-1">{errors.reason.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">
            Details <span className="text-danger">*</span>
          </label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Describe the circumstances leading to this termination…"
            {...register('details')}
          />
          {errors.details && <p className="text-xs text-danger mt-1">{errors.details.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">
            Last Working Date <span className="text-danger">*</span>
          </label>
          <input type="date" className="input" {...register('last_working_date')} />
          {errors.last_working_date && (
            <p className="text-xs text-danger mt-1">{errors.last_working_date.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Exit Interview Notes</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Record exit interview observations or feedback…"
            {...register('exit_interview_notes')}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleClose} className="btn-ghost flex-1">Cancel</button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Termination
          </button>
        </div>
      </form>
    </Modal>
  )
}
