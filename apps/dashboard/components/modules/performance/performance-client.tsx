'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { useStore } from '@/lib/store'
import type { PerformanceReview } from '@hr/shared'
import { Award, Plus, Star, TrendingUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewWithEmployee extends PerformanceReview {
  employee: { employee_number: string; job_title: string; user: { full_name: string; avatar_url: string | null } }
  reviewer: { full_name: string }
}

const reviewSchema = z.object({
  employee_id: z.string().uuid(),
  period: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  promotion_recommended: z.boolean().default(false),
  award_given: z.string().optional(),
  notes: z.string().optional(),
})
type ReviewForm = z.infer<typeof reviewSchema>

const RATING_LABELS = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent']

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          className={cn(
            'text-2xl transition-colors',
            (hover || value) >= n ? 'text-amber-400' : 'text-border'
          )}
        >
          ★
        </button>
      ))}
      {(hover || value) > 0 && (
        <span className="text-sm text-text-muted ml-2 self-center">
          {RATING_LABELS[hover || value]}
        </span>
      )}
    </div>
  )
}

function ReviewModal({ open, companyId, onClose }: { open: boolean; companyId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 3, promotion_recommended: false },
  })

  const { data: empData } = useQuery({
    queryKey: ['employees-list', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/employees?companyId=${companyId}&pageSize=200`)
      return res.json()
    },
    enabled: !!companyId,
  })

  const create = useMutation({
    mutationFn: async (body: ReviewForm) => {
      const res = await fetch('/api/performance/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perf-reviews'] })
      toast.success('Review saved')
      reset()
      onClose()
    },
  })

  const rating = watch('rating')

  return (
    <Modal open={open} onClose={onClose} title="New Performance Review" size="lg">
      <form onSubmit={handleSubmit(v => create.mutateAsync(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-body mb-1.5">Employee *</label>
            <select className="input" {...register('employee_id')}>
              <option value="">Select employee…</option>
              {(empData?.data ?? []).map((e: { id: string; user?: { full_name: string }; employee_number: string }) => (
                <option key={e.id} value={e.id}>{e.user?.full_name} ({e.employee_number})</option>
              ))}
            </select>
            {errors.employee_id && <p className="text-xs text-danger mt-1">{errors.employee_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Review Period *</label>
            <input className="input" placeholder="Q1 2025 / Jan-Mar 2025" {...register('period')} />
            {errors.period && <p className="text-xs text-danger mt-1">{errors.period.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Award Given</label>
            <input className="input" placeholder="Employee of the Month" {...register('award_given')} />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-body mb-2">Rating *</label>
            <StarRating value={rating} onChange={v => setValue('rating', v)} />
            {errors.rating && <p className="text-xs text-danger mt-1">{errors.rating.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Strengths</label>
            <textarea className="input resize-none" rows={3} {...register('strengths')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Areas for Improvement</label>
            <textarea className="input resize-none" rows={3} {...register('improvements')} />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-body mb-1.5">Notes</label>
            <textarea className="input resize-none" rows={2} {...register('notes')} />
          </div>

          <div className="col-span-2 flex items-center gap-3">
            <input type="checkbox" id="promo" {...register('promotion_recommended')} className="w-4 h-4 accent-accent" />
            <label htmlFor="promo" className="text-sm text-text-body">Recommend for promotion</label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Review
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function PerformanceClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [reviewModal, setReviewModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['perf-reviews', activeCompanyId],
    queryFn: async () => {
      const params = activeCompanyId ? `?companyId=${activeCompanyId}` : ''
      const res = await fetch(`/api/performance/reviews/all${params}`)
      if (!res.ok) return { data: [] }
      return res.json() as Promise<{ data: ReviewWithEmployee[] }>
    },
    staleTime: 60 * 1000,
  })

  const reviews = data?.data ?? []
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—'
  const promotions = reviews.filter(r => r.promotion_recommended).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Performance</h1>
          <p className="text-sm text-text-muted mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''} on record</p>
        </div>
        <button onClick={() => setReviewModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Review
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Reviews', value: reviews.length, icon: Award, color: 'text-primary' },
          { label: 'Avg Rating', value: `${avgRating}/5`, icon: Star, color: 'text-amber-600' },
          { label: 'Promotions Rec.', value: promotions, icon: TrendingUp, color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className={cn('text-xl font-bold', color)}>{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Recent Reviews</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Award className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No performance reviews yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {reviews.map((rev) => (
              <div key={rev.id} className="flex items-center gap-4 px-4 py-3">
                <Avatar
                  name={rev.employee?.user?.full_name ?? '?'}
                  src={rev.employee?.user?.avatar_url ?? undefined}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{rev.employee?.user?.full_name}</p>
                  <p className="text-xs text-text-muted">{rev.employee?.job_title} · {rev.period}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={cn('text-sm', n <= rev.rating ? 'text-amber-400' : 'text-border')}>★</span>
                    ))}
                  </div>
                  {rev.promotion_recommended && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">↑ Promo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ReviewModal
        open={reviewModal}
        companyId={activeCompanyId ?? ''}
        onClose={() => setReviewModal(false)}
      />
    </div>
  )
}
