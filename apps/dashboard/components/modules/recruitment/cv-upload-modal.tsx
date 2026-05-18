'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, Sparkles, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useScreenCV } from '@/lib/hooks/use-candidates'
import { toast } from '@/lib/toast'
import { formatKES } from '@hr/shared'
import type { AiCvResult } from '@hr/shared'

const schema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  cv_url: z.string().url().optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  jobPostingId: string
  jobTitle: string
  tenantId: string
  onClose: () => void
}

function ScoreBar({ score, threshold }: { score: number; threshold: number }) {
  const color = score >= 75 ? 'bg-green-500' : score >= threshold ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-text-muted">Match Score</span>
        <span className={`font-bold ${score >= 75 ? 'text-green-600' : score >= threshold ? 'text-amber-600' : 'text-red-600'}`}>
          {score}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <div className="flex justify-between text-xs text-text-muted">
        <span>0</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-border inline-block" />
          Threshold: {threshold}%
        </span>
        <span>100</span>
      </div>
    </div>
  )
}

export function CvUploadModal({ open, jobPostingId, jobTitle, tenantId, onClose }: Props) {
  const [cvText, setCvText] = useState('')
  const [screening, setScreening] = useState(false)
  const [result, setResult] = useState<{ result: AiCvResult; autoRejected: boolean; threshold: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const screenCV = useScreenCV()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCvText(ev.target?.result as string)
    reader.readAsText(file)
  }

  async function handleScreen() {
    if (!cvText.trim()) {
      toast.error('Please paste or upload a CV first')
      return
    }
    setScreening(true)
    try {
      const res = await screenCV.mutateAsync({ jobPostingId, cvText })
      setResult(res)
    } catch (e) {
      toast.error('AI screening failed', String(e))
    } finally {
      setScreening(false)
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          job_posting_id: jobPostingId,
          cv_url: values.cv_url || '',
          cv_text: cvText,
          tenant_id: tenantId,
          ai_score: result?.result.match_score ?? null,
          ai_summary: result?.result.summary ?? null,
          ai_extracted_skills: result?.result.skills ?? [],
          ai_experience_years: result?.result.experience_years ?? null,
          ai_education: result?.result.education ?? null,
          current_stage: result?.autoRejected ? 'rejected' : 'screened',
          rejection_reason: result?.autoRejected
            ? `Auto-rejected: score ${result.result.match_score}% below threshold ${result.threshold}%`
            : null,
        }),
      })
      toast.success('Candidate added')
      reset()
      setCvText('')
      setResult(null)
      onClose()
    } catch (e) {
      toast.error('Failed to save candidate', String(e))
    }
  }

  function handleClose() {
    reset()
    setCvText('')
    setResult(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Candidate" description={`For: ${jobTitle}`} size="xl">
      <div className="grid grid-cols-2 gap-6">
        {/* Left — candidate details + CV input */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-primary">Candidate Details</h4>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Full Name *</label>
            <input className="input" placeholder="Jane Wanjiku" {...register('full_name')} />
            {errors.full_name && <p className="text-xs text-danger mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Email *</label>
            <input type="email" className="input" placeholder="jane@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Phone</label>
            <input className="input" placeholder="+254 7XX XXX XXX" {...register('phone')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">CV URL</label>
            <input className="input" placeholder="https://..." {...register('cv_url')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">CV Text</label>
            <div className="relative">
              <textarea
                className="input resize-none text-xs font-mono"
                rows={8}
                placeholder="Paste CV text here, or upload a .txt file below…"
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary border border-border rounded px-3 py-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload .txt file
              </button>
              <button
                type="button"
                onClick={handleScreen}
                disabled={screening || !cvText.trim()}
                className="flex items-center gap-1.5 text-xs bg-accent text-white rounded px-3 py-1.5 hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {screening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {screening ? 'Screening…' : 'Screen with AI'}
              </button>
            </div>
          </div>
        </div>

        {/* Right — AI result */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-primary">AI Screening Result</h4>

          {!result ? (
            <div className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center py-16 text-center gap-3">
              <Sparkles className="w-10 h-10 text-border" />
              <p className="text-sm text-text-muted">Paste CV text and click<br />"Screen with AI" to analyse</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Auto-reject banner */}
              {result.autoRejected ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Auto-Rejected</p>
                    <p className="text-xs text-red-700">Score below threshold of {result.threshold}%</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-green-800">Passed Screening</p>
                </div>
              )}

              <ScoreBar score={result.result.match_score} threshold={result.threshold} />

              <div className="card bg-surface p-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-text-muted mb-1">Summary</p>
                  <p className="text-text-body">{result.result.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-text-muted">Experience</p>
                    <p className="font-medium">{result.result.experience_years} yrs</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Education</p>
                    <p className="font-medium">{result.result.education || '—'}</p>
                  </div>
                </div>
                {result.result.skills.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.result.skills.map(s => (
                        <span key={s} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.result.gaps.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" /> Gaps
                    </p>
                    <ul className="text-xs text-text-body space-y-0.5">
                      {result.result.gaps.map(g => <li key={g}>• {g}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        <div className="flex gap-3">
          <button type="button" onClick={handleClose} className="btn-ghost flex-1">Cancel</button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Candidate
          </button>
        </div>
      </form>
    </Modal>
  )
}
