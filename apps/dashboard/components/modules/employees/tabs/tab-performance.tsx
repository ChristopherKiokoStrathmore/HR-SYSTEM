'use client'

import { useQuery } from '@tanstack/react-query'
import { SkeletonTable } from '@/components/ui/skeleton'
import type { KpiAssignment, PerformanceReview } from '@hr/shared'

interface ReviewWithReviewer extends PerformanceReview {
  reviewer?: { full_name: string }
}

function ScoreRing({ score }: { score: number }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text-primary">
        {score}
      </span>
    </div>
  )
}

const STAR_LABELS: Record<number, string> = { 1: 'Poor', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent' }

export function TabPerformance({ employeeId }: { employeeId: string }) {
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['kpi-assignments', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/performance/kpis?employeeId=${employeeId}`)
      return res.json() as Promise<{ data: KpiAssignment[] }>
    },
  })

  const { data: reviewData, isLoading: reviewLoading } = useQuery({
    queryKey: ['performance-reviews', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/performance/reviews?employeeId=${employeeId}`)
      return res.json() as Promise<{ data: ReviewWithReviewer[] }>
    },
  })

  const kpis = kpiData?.data ?? []
  const reviews = reviewData?.data ?? []

  return (
    <div className="space-y-4">
      {/* KPI Assignments */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">KPI Assignments</h3>
        </div>
        {kpiLoading ? (
          <SkeletonTable rows={4} />
        ) : kpis.length === 0 ? (
          <p className="text-text-muted text-sm p-6 text-center">No KPI assignments found.</p>
        ) : (
          <div className="divide-y divide-border">
            {kpis.map((kpi) => (
              <div key={kpi.id} className="flex items-center gap-4 px-4 py-3">
                {kpi.final_score !== null ? (
                  <ScoreRing score={kpi.final_score} />
                ) : (
                  <div className="w-16 h-16 flex-shrink-0 rounded-full border-4 border-border flex items-center justify-center">
                    <span className="text-xs text-text-muted">—</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    Q{kpi.period_quarter} {kpi.period_year}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {kpi.targets.length} target{kpi.targets.length !== 1 ? 's' : ''}
                    {kpi.submitted_at ? ' · Submitted' : ' · Pending'}
                  </p>
                  {kpi.targets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {kpi.targets.slice(0, 3).map((t, i) => (
                        <span key={i} className="text-xs bg-surface px-2 py-0.5 rounded-full text-text-muted">
                          {t.name} ({t.weight}%)
                        </span>
                      ))}
                      {kpi.targets.length > 3 && (
                        <span className="text-xs text-text-muted">+{kpi.targets.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
                {kpi.final_score !== null && (
                  <span className={`text-sm font-bold ${kpi.final_score >= 75 ? 'text-green-600' : kpi.final_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {kpi.final_score}%
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Reviews */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Performance Reviews</h3>
        </div>
        {reviewLoading ? (
          <SkeletonTable rows={3} />
        ) : reviews.length === 0 ? (
          <p className="text-text-muted text-sm p-6 text-center">No performance reviews on record.</p>
        ) : (
          <div className="divide-y divide-border">
            {reviews.map((rev) => (
              <div key={rev.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{rev.period}</p>
                    {rev.reviewer?.full_name && (
                      <p className="text-xs text-text-muted mt-0.5">Reviewed by {rev.reviewer.full_name}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-lg ${i < rev.rating ? 'text-amber-400' : 'text-border'}`}>★</span>
                      ))}
                      <span className="text-xs text-text-muted ml-1">{STAR_LABELS[rev.rating]}</span>
                    </div>
                  </div>
                  {rev.promotion_recommended && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      Promotion Recommended
                    </span>
                  )}
                </div>
                {rev.strengths && (
                  <p className="text-xs text-text-body mt-2">
                    <span className="font-medium text-green-700">Strengths:</span> {rev.strengths}
                  </p>
                )}
                {rev.improvements && (
                  <p className="text-xs text-text-body mt-1">
                    <span className="font-medium text-amber-700">Improvements:</span> {rev.improvements}
                  </p>
                )}
                {rev.notes && (
                  <p className="text-xs text-text-muted mt-1 italic">"{rev.notes}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
