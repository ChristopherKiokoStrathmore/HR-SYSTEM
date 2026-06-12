'use client'

import { useDocuments, useVerifyDocument } from '@/lib/hooks/use-documents'
import { StatusBadge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/ui/skeleton'
import { FileText, CheckCircle, XCircle, Upload, Clock } from 'lucide-react'
import { formatDate, isExpiringSoon, isExpired } from '@hr/shared'
import { toast } from '@/lib/toast'
import type { Document } from '@hr/shared'
import { cn } from '@/lib/utils'

const ALL_TYPES: Document['type'][] = [
  'id', 'nssf', 'nhif', 'kra', 'bank_details', 'photo', 'contract', 'medical', 'pcc',
]

const TYPE_LABELS: Record<Document['type'], string> = {
  id: 'National ID', nssf: 'NSSF Card', nhif: 'NHIF Card', kra: 'KRA PIN',
  bank_details: 'Bank Details', photo: 'Passport Photo', contract: 'Employment Contract',
  medical: 'Medical Certificate', pcc: 'Police Clearance', other: 'Other',
}

export function TabDocuments({ employeeId, tenantId }: { employeeId: string; tenantId: string }) {
  const { data, isLoading } = useDocuments(employeeId)
  const verify = useVerifyDocument()

  const documents = data?.data ?? []
  const uploadedTypes = new Set(documents.map((d) => d.type))
  const verified = documents.filter((d) => d.status === 'verified').length
  const total = ALL_TYPES.length
  const pct = Math.round((verified / total) * 100)

  async function handleAction(doc: Document, action: 'verify' | 'reject') {
    try {
      await verify.mutateAsync({ id: doc.id, action, employeeId })
      toast.success(action === 'verify' ? 'Document verified' : 'Document rejected')
    } catch {
      toast.error('Action failed')
    }
  }

  if (isLoading) return <SkeletonCard />

  return (
    <div className="space-y-5">
      {/* Completion ring */}
      <div className="card flex items-center gap-6">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#E2E8F0" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={pct === 100 ? '#22C55E' : pct > 60 ? '#F47920' : '#EF4444'}
              strokeWidth="8"
              strokeDasharray={`${(pct / 100) * 213.6} 213.6`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-text-primary">
            {pct}%
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">Document Completion</p>
          <p className="text-text-muted text-sm">{verified} of {total} required documents verified</p>
        </div>
      </div>

      {/* Document cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_TYPES.map((type) => {
          const doc = documents.find((d) => d.type === type)
          const expiringSoon = doc?.expiry_date ? isExpiringSoon(doc.expiry_date) : false
          const expired = doc?.expiry_date ? isExpired(doc.expiry_date) : false

          return (
            <div
              key={type}
              className={cn(
                'card border-2 transition-colors',
                !doc ? 'border-dashed border-border'
                : doc.status === 'verified' ? 'border-success/30'
                : doc.status === 'rejected' ? 'border-danger/30'
                : 'border-warning/30'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className={cn('w-5 h-5',
                    !doc ? 'text-text-muted'
                    : doc.status === 'verified' ? 'text-success'
                    : doc.status === 'rejected' ? 'text-danger'
                    : 'text-warning'
                  )} />
                  <span className="text-sm font-medium text-text-primary">{TYPE_LABELS[type]}</span>
                </div>
                {doc && <StatusBadge status={doc.status} />}
              </div>

              {doc ? (
                <>
                  <p className="text-xs text-text-muted">
                    Uploaded {formatDate(doc.uploaded_at)}
                  </p>
                  {doc.expiry_date && (
                    <p className={cn('text-xs mt-1',
                      expired ? 'text-danger font-medium'
                      : expiringSoon ? 'text-warning font-medium'
                      : 'text-text-muted'
                    )}>
                      {expired ? 'Expired' : 'Expires'} {formatDate(doc.expiry_date)}
                    </p>
                  )}
                  {doc.rejection_reason && (
                    <p className="text-xs text-danger mt-1 bg-danger/10 rounded px-2 py-1">
                      {doc.rejection_reason}
                    </p>
                  )}
                  {doc.status === 'uploaded' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAction(doc, 'verify')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Verify
                      </button>
                      <button
                        onClick={() => handleAction(doc, 'reject')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                  {(doc.status === 'verified' || doc.status === 'rejected') && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Document
                    </a>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-text-muted">
                  <Clock className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">Not uploaded</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
