'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, FileText, X, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  cover_note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

type CvPayload =
  | { mode: 'pdf'; fileBase64: string; mimeType: 'application/pdf'; fileName: string }
  | { mode: 'text'; cvText: string; fileName: string }

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

const MINI_STAGES = ['Applied', 'Under Review', 'Interview I', 'Interview II', 'Offer', 'Hired']

interface Props {
  jobId: string
  jobTitle: string
}

export function ApplyForm({ jobId, jobTitle }: Props) {
  const [cvPayload, setCvPayload]       = useState<CvPayload | null>(null)
  const [submitState, setSubmitState]   = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg]         = useState('')
  const [trackingToken, setTracking]    = useState<string | null>(null)
  const [submittedEmail, setSubEmail]   = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return

    if (file.type === 'application/pdf') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const bytes = new Uint8Array(ev.target?.result as ArrayBuffer)
        let binary = ''
        bytes.forEach((b) => { binary += String.fromCharCode(b) })
        setCvPayload({ mode: 'pdf', fileBase64: btoa(binary), mimeType: 'application/pdf', fileName: file.name })
      }
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => setCvPayload({ mode: 'text', cvText: ev.target?.result as string, fileName: file.name })
      reader.readAsText(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'], 'text/markdown': ['.md'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  async function onSubmit(values: FormValues) {
    setSubmitState('submitting')
    setErrorMsg('')
    try {
      const body = {
        ...values,
        ...(cvPayload?.mode === 'pdf'
          ? { fileBase64: cvPayload.fileBase64, mimeType: cvPayload.mimeType }
          : cvPayload?.mode === 'text'
          ? { cvText: cvPayload.cvText }
          : {}),
      }

      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setSubmitState('error')
        return
      }
      if (data.tracking_token) {
        setTracking(data.tracking_token)
        sessionStorage.setItem('sl_tracker_token', data.tracking_token)
        window.dispatchEvent(new Event('sl-tracker-saved'))
      }
      setSubEmail(values.email)
      setSubmitState('success')
    } catch {
      setErrorMsg('Network error. Check your connection and try again.')
      setSubmitState('error')
    }
  }

  if (submitState === 'success') {
    const trackUrl = trackingToken ? `/track/${trackingToken}` : null
    return (
      <div className="card p-10 space-y-7" id="apply">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-text-primary">Application received!</h3>
          <p className="text-text-muted max-w-sm mx-auto text-sm">
            Thank you for applying for <strong className="text-text-body">{jobTitle}</strong>.
          </p>
        </div>

        {/* Mini pipeline tracker */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest text-center">Your application status</p>
          <div className="flex items-center gap-0">
            {MINI_STAGES.map((stage, i) => {
              const isDone    = i === 0
              const isCurrent = i === 1
              return (
                <div key={stage} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0 gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-accent text-white ring-2 ring-accent/30' : 'bg-surface-alt text-text-muted border border-border'}`}>
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-[9px] font-semibold text-center leading-none px-0.5 ${isDone ? 'text-green-600' : isCurrent ? 'text-accent' : 'text-text-muted'}`}>
                      {stage}
                    </span>
                  </div>
                  {i < MINI_STAGES.length - 1 && (
                    <div className={`h-px flex-1 mx-0.5 mb-4 ${isDone ? 'bg-green-300' : 'bg-border'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-text-muted text-center">
            Our team is reviewing your application. If shortlisted, we'll contact you within 5–7 business days.
          </p>
        </div>

        {/* Tracking link */}
        {trackUrl && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 space-y-3 text-center">
            <p className="text-sm font-semibold text-text-primary">Track your application</p>
            <p className="text-xs text-text-muted">Bookmark this link to check your status at any time.</p>
            <a
              href={trackUrl}
              className="inline-flex items-center gap-2 btn-primary px-6 py-2.5 text-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open application tracker
            </a>
            {submittedEmail && (
              <p className="text-[11px] text-text-muted">
                We've also sent this link to <strong>{submittedEmail}</strong>
              </p>
            )}
          </div>
        )}

        <div className="text-center">
          <a href="/jobs" className="text-sm text-accent hover:underline">
            ← Browse other positions
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-8 space-y-6" id="apply">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">Apply for this position</h2>
        <p className="text-sm text-text-muted">
          Fill in your details below. Uploading a PDF CV helps us review your application faster.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: personal details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">
                Full name <span className="text-danger">*</span>
              </label>
              <input className="input" placeholder="Jane Wanjiku" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-danger mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">
                Email address <span className="text-danger">*</span>
              </label>
              <input type="email" className="input" placeholder="jane@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Phone number</label>
              <input className="input" placeholder="+254 7XX XXX XXX" {...register('phone')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Cover note</label>
              <textarea
                className="input resize-none"
                rows={5}
                placeholder="Tell us why you're a great fit for this role…"
                {...register('cover_note')}
              />
            </div>
          </div>

          {/* Right: CV upload */}
          <div className="flex flex-col gap-3">
            <label className="block text-sm font-medium text-text-body">Your CV</label>

            {cvPayload ? (
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-accent/5 border border-accent/30 rounded-xl px-4 py-3.5">
                  <FileText className="w-5 h-5 text-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{cvPayload.fileName}</p>
                    <p className="text-xs text-text-muted">
                      {cvPayload.mode === 'pdf' ? 'PDF — AI-assisted review' : 'Text file'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setCvPayload(null)} className="text-text-muted hover:text-danger transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-text-muted text-center">
                  Your CV is private and only visible to our hiring team.
                </p>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`flex-1 min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors text-center gap-3 ${
                  isDragActive
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/50 hover:bg-surface-alt'
                }`}
              >
                <input {...getInputProps()} />
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDragActive ? 'bg-accent/10' : 'bg-surface-alt'}`}>
                  <Upload className={`w-7 h-7 ${isDragActive ? 'text-accent' : 'text-text-muted'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {isDragActive ? 'Drop your CV here' : 'Upload your CV'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">PDF, .txt or .md · Max 10 MB</p>
                </div>
                <span className="text-xs font-medium text-accent border border-accent/30 rounded-lg px-3 py-1.5 hover:bg-accent/5 transition-colors">
                  Browse files
                </span>
              </div>
            )}
          </div>
        </div>

        {submitState === 'error' && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={submitState === 'submitting'}
          className="w-full btn-primary py-3 text-base"
        >
          {submitState === 'submitting' && <Loader2 className="w-5 h-5 animate-spin" />}
          {submitState === 'submitting' ? 'Submitting your application…' : 'Submit application'}
        </button>

        <p className="text-xs text-text-muted text-center">
          By applying, you agree to us processing your data for recruitment purposes.
        </p>
      </form>
    </div>
  )
}
