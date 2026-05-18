'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, Sparkles, CheckCircle, XCircle, AlertTriangle, FileText, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useScreenCV } from '@/lib/hooks/use-candidates'
import { toast } from '@/lib/toast'
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

type CvPayload =
  | { mode: 'text'; cvText: string }
  | { mode: 'pdf'; fileBase64: string; mimeType: 'application/pdf'; fileName: string }

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
  const [cvPayload, setCvPayload] = useState<CvPayload | null>(null)
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

    if (file.type === 'application/pdf') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const arrayBuffer = ev.target?.result as ArrayBuffer
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        bytes.forEach((b) => { binary += String.fromCharCode(b) })
        const base64 = btoa(binary)
        setCvPayload({ mode: 'pdf', fileBase64: base64, mimeType: 'application/pdf', fileName: file.name })
        setCvText('')
      }
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        setCvText(text)
        setCvPayload({ mode: 'text', cvText: text })
      }
      reader.readAsText(file)
    }
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  function handleTextChange(text: string) {
    setCvText(text)
    setCvPayload(text.trim() ? { mode: 'text', cvText: text } : null)
  }

  function clearFile() {
    setCvPayload(null)
    setCvText('')
  }

  async function handleScreen() {
    const payload = cvPayload ?? (cvText.trim() ? { mode: 'text' as const, cvText } : null)
    if (!payload) {
      toast.error('Please paste, upload a .txt file, or upload a PDF first')
      return
    }
    setScreening(true)
    try {
      const res = payload.mode === 'pdf'
        ? await screenCV.mutateAsync({ jobPostingId, fileBase64: payload.fileBase64, mimeType: payload.mimeType })
        : await screenCV.mutateAsync({ jobPostingId, cvText: payload.cvText })
      setResult(res)
    } catch (e) {
      toast.error('AI screening failed', String(e))
    } finally {
      setScreening(false)
    }
  }

  async function onSubmit(values: FormValues) {
    const textToSave = cvPayload?.mode === 'text' ? cvPayload.cvText : cvText
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          job_posting_id: jobPostingId,
          cv_url: values.cv_url || '',
          cv_text: textToSave || null,
          tenant_id: tenantId,
          ai_score: result?.result.match_score ?? null,
          ai_summary: result?.result.summary ?? null,
          ai_extracted_skills: result?.result.skills ?? [],
          ai_experience_years: result?.result.experience_years ?? null,
          ai_education: result?.result.education ?? null,
          current_stage: result?.autoRejected ? 'rejected' : (result ? 'screened' : 'screened'),
          rejection_reason: result?.autoRejected
            ? `Auto-rejected: score ${result.result.match_score}% below threshold ${result.threshold}%`
            : null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Candidate added')
      handleClose()
    } catch (e) {
      toast.error('Failed to save candidate', String(e))
    }
  }

  function handleClose() {
    reset()
    setCvPayload(null)
    setCvText('')
    setResult(null)
    onClose()
  }

  const hasCv = !!cvPayload || cvText.trim().length > 0

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
            <label className="block text-sm font-medium text-text-body mb-1.5">CV</label>

            {/* PDF chip */}
            {cvPayload?.mode === 'pdf' ? (
              <div className="flex items-center gap-2 border border-accent/40 bg-accent/5 rounded-lg px-3 py-2.5 mb-2">
                <FileText className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-xs text-text-body truncate flex-1">{cvPayload.fileName}</span>
                <button type="button" onClick={clearFile} className="text-text-muted hover:text-danger transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <textarea
                className="input resize-none text-xs font-mono"
                rows={8}
                placeholder="Paste CV text here…"
                value={cvText}
                onChange={(e) => handleTextChange(e.target.value)}
              />
            )}

            <div className="flex items-center gap-2 mt-2">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary border border-border rounded px-3 py-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload PDF / .txt
              </button>
              <button
                type="button"
                onClick={handleScreen}
                disabled={screening || !hasCv}
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
              <p className="text-sm text-text-muted">Upload a PDF or paste CV text,<br />then click &quot;Screen with AI&quot;</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                {result.result.strengths.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Strengths</p>
                    <ul className="text-xs text-text-body space-y-0.5">
                      {result.result.strengths.map(s => <li key={s}>• {s}</li>)}
                    </ul>
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
