'use client'

import { useState } from 'react'
import {
  useAnnouncements, useCreateAnnouncement,
  useUpdateAnnouncement, useDeleteAnnouncement,
} from '@/lib/hooks/use-announcements'
import { SkeletonTable } from '@/components/ui/skeleton'
import { LottieEmpty } from '@/components/ui/lottie-empty'
import { toast } from '@/lib/toast'
import { formatDate } from '@hr/shared'
import type { Announcement } from '@hr/shared'
import {
  Plus, Megaphone, AlertCircle, Pencil, Trash2,
  Building2, Users, X, Loader2,
} from 'lucide-react'
import { useStore } from '@/lib/store'

const PRIORITY_STYLES = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function AnnouncementModal({
  open,
  initial,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean
  initial: Partial<Announcement> | null
  onClose: () => void
  onSave: (data: Partial<Announcement>) => void
  isSaving: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [priority, setPriority] = useState<'normal' | 'urgent'>(initial?.priority ?? 'normal')
  const [department, setDepartment] = useState(initial?.department ?? '')

  // Re-populate when initial changes (edit mode)
  useState(() => {
    if (initial) {
      setTitle(initial.title ?? '')
      setBody(initial.body ?? '')
      setPriority(initial.priority ?? 'normal')
      setDepartment(initial.department ?? '')
    }
  })

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    onSave({ title: title.trim(), body: body.trim(), priority, department: department || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {initial?.id ? 'Edit Announcement' : 'New Announcement'}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-body mb-1.5">Title *</label>
            <input
              className="input text-sm"
              placeholder="Announcement title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-body mb-1.5">Message *</label>
            <textarea
              className="input resize-none text-sm"
              rows={4}
              placeholder="What do you want to communicate to your team?"
              value={body}
              onChange={e => setBody(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-body mb-1.5">Priority</label>
              <select
                className="input text-sm"
                value={priority}
                onChange={e => setPriority(e.target.value as 'normal' | 'urgent')}
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-body mb-1.5">
                Department <span className="text-text-muted">(leave blank for all)</span>
              </label>
              <input
                className="input text-sm"
                placeholder="e.g. Engineering"
                value={department}
                onChange={e => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !body.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {initial?.id ? 'Save Changes' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete confirmation ───────────────────────────────────────────────────────

function DeleteModal({
  open,
  title,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  open: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Delete announcement?</h3>
          <p className="text-xs text-text-muted mt-1">
            "<span className="font-medium">{title}</span>" will be removed for all employees. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnnouncementsClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Announcement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  const { data, isLoading } = useAnnouncements()
  const create = useCreateAnnouncement()
  const update = useUpdateAnnouncement()
  const remove = useDeleteAnnouncement()

  const items: Announcement[] = Array.isArray(data) ? data : []
  const urgent = items.filter(a => a.priority === 'urgent').length

  async function handleSave(formData: Partial<Announcement>) {
    try {
      if (editTarget?.id) {
        await update.mutateAsync({ id: editTarget.id, ...formData })
        toast.success('Announcement updated')
      } else {
        await create.mutateAsync({ ...formData, company_id: activeCompanyId! })
        toast.success('Announcement published')
      }
      setModalOpen(false)
      setEditTarget(null)
    } catch {
      toast.error('Failed to save announcement')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      toast.success('Announcement deleted')
    } catch {
      toast.error('Failed to delete announcement')
    } finally {
      setDeleteTarget(null)
    }
  }

  function openEdit(a: Announcement) {
    setEditTarget(a)
    setModalOpen(true)
  }

  function openCreate() {
    setEditTarget(null)
    setModalOpen(true)
  }

  const isSaving = create.isPending || update.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Announcements</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {urgent > 0 ? `${urgent} urgent · ` : ''}{items.length} active announcement{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'All Staff', value: items.filter(a => !a.department).length, icon: Building2, color: 'text-primary' },
          { label: 'Department', value: items.filter(a => !!a.department).length, icon: Users, color: 'text-blue-600' },
          { label: 'Urgent', value: urgent, icon: AlertCircle, color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Active Announcements</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={4} />
        ) : items.length === 0 ? (
          <LottieEmpty
            message="No announcements yet"
            description="Publish your first announcement to notify all staff or a specific department."
          />
        ) : (
          <div className="divide-y divide-border">
            {items.map(a => (
              <div key={a.id} className="flex items-start gap-4 px-4 py-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  a.priority === 'urgent' ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  {a.priority === 'urgent'
                    ? <AlertCircle className="w-4 h-4 text-red-600" />
                    : <Megaphone className="w-4 h-4 text-blue-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary">{a.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[a.priority]}`}>
                      {a.priority}
                    </span>
                    {a.department ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-text-muted border border-border">
                        {a.department}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-text-muted border border-border">
                        All staff
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-body mt-1 leading-relaxed">{a.body}</p>
                  <p className="text-xs text-text-muted mt-1.5">{formatDate(a.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(a)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnnouncementModal
        open={modalOpen}
        initial={editTarget}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <DeleteModal
        open={!!deleteTarget}
        title={deleteTarget?.title ?? ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={remove.isPending}
      />
    </div>
  )
}
