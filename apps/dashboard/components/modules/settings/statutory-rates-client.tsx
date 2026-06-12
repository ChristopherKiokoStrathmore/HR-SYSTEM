'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { Landmark, Pencil, Loader2 } from 'lucide-react'

/**
 * Super-admin statutory rates page (01-Jun session): VAT, PAYE bands, NSSF,
 * SHIF/NHIF, housing levy editable without code changes. Rates are VERSIONED —
 * saving posts a new row effective from the chosen date; history is never
 * mutated, and payroll resolves the rate effective for its period.
 */

const KIND_LABELS: Record<string, string> = {
  paye_bands: 'PAYE Bands',
  nssf: 'NSSF',
  shif: 'SHIF / NHIF',
  housing_levy: 'Housing Levy',
  vat: 'VAT',
  helb_min: 'HELB Minimum',
}

interface CurrentRates {
  [kind: string]: { value: Record<string, unknown>; effective_from: string; id: string }
}

function EditRateModal({ kind, current, onClose }: {
  kind: string | null
  current: Record<string, unknown> | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [json, setJson] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const save = useMutation({
    mutationFn: async () => {
      let value: unknown
      try {
        value = JSON.parse(json)
      } catch {
        throw new Error('Value must be valid JSON')
      }
      const res = await fetch('/api/hr/statutory-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, value, effective_from: effectiveFrom, note }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save rejected (highest-rank role required)')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statutory-rates'] })
      toast.success('New rate version saved')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Seed the editor when the modal opens for a kind
  if (kind && json === '' && current) {
    setJson(JSON.stringify(current, null, 2))
  }

  return (
    <Modal open={!!kind} onClose={() => { setJson(''); onClose() }} title={`Update ${kind ? KIND_LABELS[kind] ?? kind : ''}`} size="md">
      <div className="space-y-4">
        <p className="text-xs text-text-muted">
          Saving creates a <strong>new version</strong> effective from the date below —
          past payroll runs keep the rates that applied to their period.
        </p>
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Rate value (JSON)</label>
          <textarea
            className="input font-mono text-xs min-h-[160px]"
            value={json}
            onChange={e => setJson(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Effective from</label>
            <input type="date" className="input" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Note</label>
            <input className="input" placeholder="e.g. Finance Act 2026" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => { setJson(''); onClose() }} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save New Version
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function StatutoryRatesClient() {
  const [editing, setEditing] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['statutory-rates'],
    queryFn: async () => {
      const res = await fetch('/api/hr/statutory-rates/current')
      if (!res.ok) throw new Error('Failed to load rates')
      return res.json() as Promise<CurrentRates>
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Landmark className="w-6 h-6" /> Statutory Rates
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Versioned Kenyan statutory rates. Update when regulations change — no code deployment needed.
        </p>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(KIND_LABELS).map(([kind, label]) => {
            const rate = data?.[kind]
            return (
              <div key={kind} className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
                  <button onClick={() => setEditing(kind)} className="btn-ghost text-xs flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5" /> Update
                  </button>
                </div>
                {rate ? (
                  <>
                    <pre className="text-xs bg-surface rounded-lg p-3 overflow-x-auto text-text-body">
                      {JSON.stringify(rate.value, null, 2)}
                    </pre>
                    <p className="text-xs text-text-muted">Effective from {rate.effective_from}</p>
                  </>
                ) : (
                  <p className="text-xs text-text-muted">Not configured — run <code>seed_statutory</code> or add a version.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <EditRateModal
        kind={editing}
        current={editing ? (data?.[editing]?.value ?? {}) : null}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
