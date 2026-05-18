'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useCreateCompany, useUpdateCompany } from '@/lib/hooks/use-companies'
import { toast } from '@/lib/toast'
import type { Company } from '@hr/shared'
import { useEffect } from 'react'

const schema = z.object({
  name: z.string().min(2),
  industry: z.string().optional(),
  country: z.string().min(2),
  city: z.string().optional(),
  contact_email: z.string().email(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_active: z.boolean().default(true),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  company: Company | null
  onClose: () => void
}

export function CompanyModal({ open, company, onClose }: Props) {
  const create = useCreateCompany()
  const update = useUpdateCompany()
  const isEditing = !!company

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'Kenya', is_active: true },
  })

  useEffect(() => {
    if (company) {
      reset({
        name: company.name,
        industry: company.industry ?? '',
        country: company.country,
        city: company.city ?? '',
        contact_email: company.contact_email,
        primary_color: company.primary_color ?? '#1A2E5A',
        is_active: company.is_active,
      })
    } else {
      reset({ country: 'Kenya', is_active: true, primary_color: '#1A2E5A' })
    }
  }, [company, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing) {
        await update.mutateAsync({ id: company.id, ...values })
        toast.success('Company updated')
      } else {
        await create.mutateAsync(values)
        toast.success('Company created')
      }
      onClose()
    } catch (e) {
      toast.error(isEditing ? 'Failed to update' : 'Failed to create', String(e))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Company' : 'Add Company'}
      description="Company details and branding"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-body mb-1.5">Company Name *</label>
            <input className="input" placeholder="Acme Corp Kenya" {...register('name')} />
            {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Industry</label>
            <input className="input" placeholder="Manufacturing" {...register('industry')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Country *</label>
            <input className="input" placeholder="Kenya" {...register('country')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">City</label>
            <input className="input" placeholder="Nairobi" {...register('city')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Contact Email *</label>
            <input className="input" type="email" placeholder="hr@company.co.ke" {...register('contact_email')} />
            {errors.contact_email && <p className="text-xs text-danger mt-1">{errors.contact_email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Brand Color</label>
            <div className="flex gap-2">
              <input type="color" {...register('primary_color')} className="h-9 w-14 rounded border border-border cursor-pointer" />
              <input className="input flex-1" placeholder="#1A2E5A" {...register('primary_color')} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_active" {...register('is_active')} className="w-4 h-4 accent-accent" />
            <label htmlFor="is_active" className="text-sm text-text-body">Active</label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Company'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
