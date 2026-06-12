'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { Share2, Loader2 } from 'lucide-react'

/**
 * Share button (01-Jun session): auto-generates the PDF/Excel server-side and
 * emails it pre-templated — zero manual download/upload. Drop into any tab:
 *   <ShareButton module="payroll" objectId={run.id} title="June payroll" />
 */
export function ShareButton({ module, objectId, title }: {
  module: string
  objectId: string
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const [recipients, setRecipients] = useState('')
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf')
  const [message, setMessage] = useState('Please find the attached document.')

  const share = useMutation({
    mutationFn: async () => {
      const emails = recipients.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
      if (emails.length === 0) throw new Error('Add at least one recipient email')
      const res = await fetch('/api/hr/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module,
          object_id: objectId,
          format,
          recipients: emails,
          message,
          document_title: title,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Share failed')
      return res.json()
    },
    onSuccess: (data: { sent: Array<{ recipient: string; status: string }> }) => {
      const ok = data.sent.filter(s => s.status === 'sent').length
      toast.success(`Shared with ${ok}/${data.sent.length} recipient${data.sent.length !== 1 ? 's' : ''}`)
      setOpen(false)
      setRecipients('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost flex items-center gap-2">
        <Share2 className="w-4 h-4" /> Share
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Share ${title ?? module}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Recipients (emails) *</label>
            <input
              className="input"
              placeholder="finance@company.co.ke, ceo@company.co.ke"
              value={recipients}
              onChange={e => setRecipients(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Format</label>
            <div className="flex gap-2">
              {(['pdf', 'excel'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={format === f ? 'btn-primary flex-1' : 'btn-ghost flex-1 border border-border'}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Message</label>
            <textarea className="input min-h-[60px]" value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <button
            onClick={() => share.mutate()}
            disabled={share.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {share.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Generate &amp; Send
          </button>
        </div>
      </Modal>
    </>
  )
}
