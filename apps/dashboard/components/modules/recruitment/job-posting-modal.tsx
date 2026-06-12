'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useCreateJobPosting, useUpdateJobPosting } from '@/lib/hooks/use-job-postings'
import { toast } from '@/lib/toast'
import type { JobPosting } from '@hr/shared'

const schema = z.object({
  title: z.string().min(2),
  department: z.string().optional(),
  description: z.string().min(20, 'Please provide at least 20 characters'),
  employment_type: z.enum(['white_collar', 'casual']),
  status: z.enum(['open', 'closed', 'on_hold']),
  closing_date: z.string().optional(),
  auto_reject_threshold: z.coerce.number().int().min(0).max(100),
  required_keywords: z.string(), // comma-separated, split on submit
  nice_to_have_keywords: z.string(),
  company_id: z.string().uuid(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  posting: JobPosting | null
  companyId: string
  onClose: () => void
}

export function JobPostingModal({ open, posting, companyId, onClose }: Props) {
  const create = useCreateJobPosting()
  const update = useUpdateJobPosting()
  const isEditing = !!posting

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employment_type: 'white_collar',
      status: 'open',
      auto_reject_threshold: 60,
      required_keywords: '',
      nice_to_have_keywords: '',
      company_id: companyId,
    },
  })

  useEffect(() => {
    if (posting) {
      reset({
        title: posting.title,
        department: posting.department ?? '',
        description: posting.description,
        employment_type: posting.employment_type,
        status: posting.status,
        closing_date: posting.closing_date ?? '',
        auto_reject_threshold: posting.auto_reject_threshold,
        required_keywords: posting.required_keywords.join(', '),
        nice_to_have_keywords: posting.nice_to_have_keywords.join(', '),
        company_id: posting.company_id,
      })
    } else {
      reset({
        employment_type: 'white_collar',
        status: 'open',
        auto_reject_threshold: 60,
        required_keywords: '',
        nice_to_have_keywords: '',
        company_id: companyId,
      })
    }
  }, [posting, companyId, reset])

  function splitKeywords(raw: string): string[] {
    return raw.split(',').map(k => k.trim()).filter(Boolean)
  }

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      required_keywords: splitKeywords(values.required_keywords),
      nice_to_have_keywords: splitKeywords(values.nice_to_have_keywords),
      closing_date: values.closing_date || null,
    }
    try {
      if (isEditing) {
        await update.mutateAsync({ id: posting.id, ...payload })
        toast.success('Job posting updated')
      } else {
        await create.mutateAsync(payload)
        toast.success('Job posting created')
      }
      onClose()
    } catch (e) {
      toast.error(isEditing ? 'Failed to update' : 'Failed to create', String(e))
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Job Posting' : 'New Job Posting'}
      description="Define the role, requirements, and AI screening threshold"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('company_id')} />

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-body mb-1.5">Job Title *</label>
            <input className="input" placeholder="Senior Software Engineer" {...register('title')} />
            {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
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
            <label className="block text-sm font-medium text-text-body mb-1.5">Status *</label>
            <select className="input" {...register('status')}>
              <option value="open">Open</option>
              <option value="on_hold">On Hold</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Closing Date</label>
            <input type="date" className="input" {...register('closing_date')} />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-body mb-1.5">Description *</label>
            <textarea className="input resize-none" rows={4} {...register('description')} />
            {errors.description && <p className="text-xs text-danger mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Required Keywords</label>
            <input className="input" placeholder="React, TypeScript, Node.js" {...register('required_keywords')} />
            <p className="text-xs text-text-muted mt-1">Comma-separated. Used by AI to score CVs.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Nice-to-Have Keywords</label>
            <input className="input" placeholder="GraphQL, Docker, AWS" {...register('nice_to_have_keywords')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">
              AI Auto-Reject Threshold (%)
            </label>
            <input
              type="number" min="0" max="100"
              className="input"
              {...register('auto_reject_threshold')}
            />
            <p className="text-xs text-text-muted mt-1">CVs scoring below this are auto-rejected.</p>
            {errors.auto_reject_threshold && (
              <p className="text-xs text-danger mt-1">{errors.auto_reject_threshold.message}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Posting'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
