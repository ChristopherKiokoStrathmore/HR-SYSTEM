'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react'

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

interface Props {
  jobId: string
  jobTitle: string
}

export function ApplyForm({ jobId, jobTitle }: Props) {
  const [cvPayload, setCvPayload] = useState<CvPayload | null>(null)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return

    if (file.type === 'application/pdf') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const arrayBuffer = ev.target?.result as ArrayBuffer
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        bytes.forEach((b) => { binary += String.fromCharCode(b) })
        setCvPayload({ mode: 'pdf', fileBase64: btoa(binary), mimeType: 'application/pdf', fileName: file.name })
      }
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setCvPayload({ mode: 'text', cvText: ev.target?.result as string, fileName: file.name })
      }
      reader.readAsText(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'], 'text/markdown': ['.md'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10 MB
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

      const res = await fetch(`/api/public/jobs/${jobId}/apply`, {
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
      setSubmitState('success')
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setSubmitState('error')
    }
  }

  if (submitState === 'success') {
    return (
      <div className="bg-surface border border-green-200 rounded-2xl p-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-text-primary">Application received!</h3>
        <p className="text-text-muted max-w-sm mx-auto">
          Thank you for applying for <strong>{jobTitle}</strong>. We&apos;ll review your application and be in touch soon.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-surface border border-border rounded-2xl p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Apply for this position</h2>
        <p className="text-sm text-text-muted mt-1">Fill in your details below. Your CV helps us understand your background.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal details */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">
              Full name <span className="text-danger">*</span>
            </label>
            <input
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-text-body placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              placeholder="Jane Wanjiku"
              {...register('full_name')}
            />
            {errors.full_name && <p className="text-xs text-danger mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">
              Email address <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-text-body placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              placeholder="jane@example.com"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Phone number</label>
            <input
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-text-body placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              placeholder="+254 7XX XXX XXX"
              {...register('phone')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Cover note</label>
            <textarea
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-text-body placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition resize-none"
              rows={4}
              placeholder="Tell us why you're a great fit for this role…"
              {...register('cover_note')}
            />
          </div>
        </div>

        {/* CV upload */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-text-body mb-1.5">Your CV</label>

          {cvPayload ? (
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-accent/5 border border-accent/30 rounded-xl px-4 py-3">
                <FileText className="w-5 h-5 text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{cvPayload.fileName}</p>
                  <p className="text-xs text-text-muted">{cvPayload.mode === 'pdf' ? 'PDF — will be read by AI' : 'Text file'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCvPayload(null)}
                  className="text-text-muted hover:text-danger transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-text-muted text-center">
                Your CV will be reviewed by our team.
              </p>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors text-center gap-3 ${
                isDragActive ? 'border-accent bg-accent/5 text-accent' : 'border-border hover:border-accent/50 hover:bg-surface-alt'
              }`}
            >
              <input {...getInputProps()} />
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDragActive ? 'bg-accent/10' : 'bg-surface-alt'}`}>
                <Upload className={`w-6 h-6 ${isDragActive ? 'text-accent' : 'text-text-muted'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {isDragActive ? 'Drop your CV here' : 'Drag & drop your CV'}
                </p>
                <p className="text-xs text-text-muted mt-1">PDF, .txt or .md · Max 10 MB</p>
              </div>
              <p className="text-xs text-accent font-medium">or click to browse</p>
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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #F47920 0%, #E8650A 100%)', boxShadow: '0 4px 12px rgba(244,121,32,0.3)' }}
      >
        {submitState === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitState === 'submitting' ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  )
}
