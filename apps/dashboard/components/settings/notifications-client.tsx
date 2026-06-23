'use client'
import { useState } from 'react'
import {
  useNotificationTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from '@/lib/hooks/use-notifications'
import { SkeletonTable } from '@/components/ui/skeleton'
import { LottieEmpty } from '@/components/ui/lottie-empty'
import { toast } from '@/lib/toast'
import { Plus, Edit, Trash2, X } from 'lucide-react'

const CHANNELS = ['email', 'sms', 'whatsapp'] as const
const EVENTS = [
  'attendance.checked_in',
  'attendance.checked_out',
  'overtime.approved',
  'overtime.rejected',
  'reimbursement.approved',
  'reimbursement.paid',
  'leave_recall.created',
  'leave_recall.approved',
  'compliance_alert.created',
]

export function NotificationSettingsClient() {
  const { data: templates, isLoading } = useNotificationTemplates()
  const create = useCreateTemplate()
  const update = useUpdateTemplate()
  const del = useDeleteTemplate()

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    event: '',
    channel: 'email' as 'email' | 'sms' | 'whatsapp',
    subject: '',
    body: '',
    is_active: true,
  })

  const handleCreate = async () => {
    if (!formData.event || !formData.body) {
      toast.error('Event and body are required')
      return
    }
    try {
      await create.mutateAsync({
        event: formData.event,
        channel: formData.channel,
        subject: formData.subject || null,
        body: formData.body,
        is_active: formData.is_active,
      } as any)
      setFormData({
        event: '',
        channel: 'email',
        subject: '',
        body: '',
        is_active: true,
      })
      setFormOpen(false)
      toast.success('Template created')
    } catch {
      toast.error('Failed to create template')
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      await update.mutateAsync({
        id,
        event: formData.event,
        channel: formData.channel,
        subject: formData.subject || null,
        body: formData.body,
        is_active: formData.is_active,
      } as any)
      setEditingId(null)
      setFormData({
        event: '',
        channel: 'email',
        subject: '',
        body: '',
        is_active: true,
      })
      toast.success('Template updated')
    } catch {
      toast.error('Failed to update template')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    try {
      await del.mutateAsync(id)
      toast.success('Template deleted')
    } catch {
      toast.error('Failed to delete template')
    }
  }

  if (isLoading) return <SkeletonTable rows={5} />

  return (
    <div className="space-y-4">
      <button
        onClick={() => setFormOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white"
      >
        <Plus className="w-4 h-4" /> New Template
      </button>

      {formOpen && (
        <div className="rounded-lg border border-border p-4 space-y-3 bg-surface">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Create Notification Template</h3>
            <button onClick={() => setFormOpen(false)} className="text-text-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={formData.event}
              onChange={e => setFormData({ ...formData, event: e.target.value })}
              className="px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="">Select event...</option>
              {EVENTS.map(e => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <select
              value={formData.channel}
              onChange={e => setFormData({ ...formData, channel: e.target.value as any })}
              className="px-3 py-2 border border-border rounded-lg text-sm"
            >
              {CHANNELS.map(c => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {formData.channel === 'email' && (
            <input
              placeholder="Subject"
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          )}
          <textarea
            placeholder="Message body"
            value={formData.body}
            onChange={e => setFormData({ ...formData, body: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm h-24"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <span>Active</span>
          </label>
          <button
            onClick={handleCreate}
            disabled={create.isPending}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            {create.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      {!templates?.length ? (
        <LottieEmpty message="No notification templates" />
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="rounded-lg border border-border p-4 bg-surface">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-text-primary">{t.event}</h4>
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      {t.channel}
                    </span>
                    {!t.is_active && (
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  {t.subject && (
                    <p className="text-sm text-text-body mt-1">
                      <strong>Subject:</strong> {t.subject}
                    </p>
                  )}
                  <p className="text-sm text-text-body mt-1 line-clamp-2">{t.body}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(t.id)
                      setFormData({
                        event: t.event,
                        channel: t.channel,
                        subject: t.subject || '',
                        body: t.body,
                        is_active: t.is_active,
                      })
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {editingId === t.id && (
                <div className="mt-3 space-y-2 pt-3 border-t border-border">
                  <select
                    value={formData.channel}
                    onChange={e => setFormData({ ...formData, channel: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  >
                    {CHANNELS.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {formData.channel === 'email' && (
                    <input
                      placeholder="Subject"
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                    />
                  )}
                  <textarea
                    placeholder="Message body"
                    value={formData.body}
                    onChange={e => setFormData({ ...formData, body: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm h-20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(t.id)}
                      disabled={update.isPending}
                      className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
                    >
                      {update.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setFormData({
                          event: '',
                          channel: 'email',
                          subject: '',
                          body: '',
                          is_active: true,
                        })
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-border text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
