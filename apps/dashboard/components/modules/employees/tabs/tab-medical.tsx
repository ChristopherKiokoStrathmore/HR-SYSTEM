'use client'

import { useQuery } from '@tanstack/react-query'
import { SkeletonTable } from '@/components/ui/skeleton'
import { formatDate, isExpiringSoon, isExpired } from '@hr/shared'
import type { MedicalRecord } from '@hr/shared'
import { AlertTriangle, Heart } from 'lucide-react'

function fitnessColor(status: string) {
  if (status === 'fit') return 'text-green-600 bg-green-50'
  if (status === 'fit_with_conditions') return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

function fitnessLabel(status: string) {
  if (status === 'fit') return 'Fit for Work'
  if (status === 'fit_with_conditions') return 'Fit with Restrictions'
  if (status === 'unfit') return 'Unfit for Work'
  return status
}

export function TabMedical({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['medical-records', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/medical?employeeId=${employeeId}`)
      return res.json() as Promise<{ data: MedicalRecord[] }>
    },
  })

  const records = data?.data ?? []
  const latest = records[0]

  return (
    <div className="space-y-4">
      {/* Latest fitness status */}
      {latest && (
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-2">Current Fitness Status</p>
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${fitnessColor(latest.fitness_status)}`}>
              <Heart className="w-4 h-4" />
              {fitnessLabel(latest.fitness_status)}
            </span>
            {latest.expiry_date && (
              <div className="text-right">
                <p className="text-xs text-text-muted">Expires</p>
                <p className={`text-sm font-medium ${
                  isExpired(latest.expiry_date) ? 'text-red-600' :
                  isExpiringSoon(latest.expiry_date, 30) ? 'text-amber-600' :
                  'text-text-primary'
                }`}>
                  {formatDate(latest.expiry_date)}
                </p>
              </div>
            )}
          </div>
          {latest.expiry_date && isExpired(latest.expiry_date) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Medical certificate expired — please arrange renewal.
            </div>
          )}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Medical Records</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={4} />
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Heart className="w-10 h-10 text-border" />
            <p className="text-text-muted text-sm">No medical records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {records.map((rec) => (
              <div key={rec.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {rec.record_type.replace(/_/g, ' ')}
                    </p>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-text-muted">
                        Issued: {formatDate(rec.issued_date)}
                      </span>
                      {rec.issued_by && (
                        <span className="text-xs text-text-muted">by {rec.issued_by}</span>
                      )}
                      {rec.expiry_date && (
                        <span className={`text-xs ${
                          isExpired(rec.expiry_date) ? 'text-red-600 font-medium' :
                          isExpiringSoon(rec.expiry_date, 30) ? 'text-amber-600 font-medium' :
                          'text-text-muted'
                        }`}>
                          Expires: {formatDate(rec.expiry_date)}
                          {isExpired(rec.expiry_date) ? ' (expired)' : isExpiringSoon(rec.expiry_date, 30) ? ' (expiring soon)' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${fitnessColor(rec.fitness_status)}`}>
                    {fitnessLabel(rec.fitness_status)}
                  </span>
                </div>
                {rec.notes && (
                  <p className="text-xs text-text-muted mt-2 italic">{rec.notes}</p>
                )}
                {rec.file_url && (
                  <a
                    href={rec.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    View Document →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
