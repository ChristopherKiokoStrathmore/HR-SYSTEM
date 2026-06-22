'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { Share2, Loader2, Mail, MessageCircle, Phone } from 'lucide-react'

type Channel = 'email' | 'whatsapp' | 'sms'

export function ShareButton({ module, objectId, title }: {
  module: string
  objectId: string
  title?: string
}) {
  const [open, setOpen]                     = useState(false)
  const [channel, setChannel]               = useState<Channel>('email')
  const [recipients, setRecipients]         = useState('')
  const [phoneRecipients, setPhoneRec]      = useState('')
  const [format, setFormat]                 = useState<'pdf' | 'excel'>('pdf')
  const [message, setMessage]               = useState('Please find the attached document.')

  const share = useMutation({
    mutationFn: async () => {
      const emails  = channel === 'email'
        ? recipients.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
        : []
      const phones  = channel !== 'email'
        ? phoneRecipients.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
        : []

      if (emails.length === 0 && phones.length === 0)
        throw new Error('Add at least one recipient')

      const res = await fetch('/api/hr/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module,
          object_id:        objectId,
          format:           channel === 'email' ? format : 'pdf',
          recipients:       emails,
          phone_recipients: phones,
          channels:         [channel],
          message,
          document_title:   title,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Share failed')
      return res.json()
    },
    onSuccess: (data: { sent: Array<{ recipient: string; status: string; channel: string }> }) => {
      const ok = data.sent.filter(s => s.status === 'sent').length
      toast.success(`Shared with ${ok}/${data.sent.length} recipient${data.sent.length !== 1 ? 's' : ''}`)
      setOpen(false)
      setRecipients('')
      setPhoneRec('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const TABS: { id: Channel; label: string; Icon: React.ElementType }[] = [
    { id: 'email',     label: 'Email',     Icon: Mail            },
    { id: 'whatsapp',  label: 'WhatsApp',  Icon: MessageCircle   },
    { id: 'sms',       label: 'SMS',       Icon: Phone           },
  ]

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost flex items-center gap-2">
        <Share2 className="w-4 h-4" /> Share
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Share — ${title ?? module}`} size="sm">
        <div className="space-y-4">

          {/* Channel tabs */}
          <div className="flex gap-1 p-1 bg-surface-alt rounded-lg">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setChannel(id)}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all',
                  channel === id
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-body',
                ].join(' ')}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Email fields */}
          {channel === 'email' && (
            <>
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
            </>
          )}

          {/* WhatsApp / SMS fields */}
          {channel !== 'email' && (
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">
                Phone numbers (E.164) *
              </label>
              <input
                className="input"
                placeholder="+254712345678, +254798765432"
                value={phoneRecipients}
                onChange={e => setPhoneRec(e.target.value)}
              />
              <p className="text-xs text-text-muted mt-1">
                {channel === 'whatsapp'
                  ? 'Sends a WhatsApp message with a portal download link.'
                  : 'Sends an SMS with a portal download link.'}
                {' '}File attachments are not supported over this channel.
              </p>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Message</label>
            <textarea
              className="input min-h-[60px]"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          <button
            onClick={() => share.mutate()}
            disabled={share.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {share.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {channel === 'email'
              ? 'Generate & Send'
              : channel === 'whatsapp'
                ? 'Send via WhatsApp'
                : 'Send via SMS'}
          </button>
        </div>
      </Modal>
    </>
  )
}
