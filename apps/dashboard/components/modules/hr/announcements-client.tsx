'use client'
import { useState } from 'react'
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from '@/lib/hooks/use-announcements'
import { SkeletonTable } from '@/components/ui/skeleton'
import { LottieEmpty } from '@/components/ui/lottie-empty'
import { toast } from '@/lib/toast'
import { formatDate } from '@hr/shared'
import type { Announcement } from '@hr/shared'
import { Plus, Edit, Trash2, X } from 'lucide-react'

export function AnnouncementsClient() {
  const { data: announcements, isLoading } = useAnnouncements()
  const create = useCreateAnnouncement()
  const update = useUpdateAnnouncement()
  const del = useDeleteAnnouncement()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    department: '',
    posted_by: '',
  })

  const handleCreate = async () => {
    if (!formData.title || !formData.body) {
      toast.error('Title and body are required')
      return
    }
    try {
      await create.mutateAsync({
        title: formData.title,
        body: formData.body,
        department: formData.department || null,
        posted_by: formData.posted_by,
      } as any)
      setFormData({ title: '', body: '', department: '', posted_by: '' })
      setFormOpen(false)
      toast.success('Announcement created')
    } catch {
      toast.error('Failed to create announcement')
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      await update.mutateAsync({
        id,
        title: formData.title,
        body: formData.body,
        department: formData.department || null,
        posted_by: formData.posted_by,
      } as any)
      setEditingId(null)
      setFormData({ title: '', body: '', department: '', posted_by: '' })
      toast.success('Announcement updated')
    } catch {
      toast.error('Failed to update announcement')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await del.mutateAsync(id)
      toast.success('Announcement deleted')
    } catch {
      toast.error('Failed to delete announcement')
    }
  }

  if (isLoading) return <SkeletonTable rows={5} />
  if (!announcements?.length) return <LottieEmpty message="No announcements" />

  return (
    <div className="space-y-4">
      <button
        onClick={() => setFormOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white"
      >
        <Plus className="w-4 h-4" /> New Announcement
      </button>

      {formOpen && (
        <div className="rounded-lg border border-border p-4 space-y-3 bg-surface">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Create Announcement</h3>
            <button onClick={() => setFormOpen(false)} className="text-text-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            placeholder="Title"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          />
          <textarea
            placeholder="Body"
            value={formData.body}
            onChange={e => setFormData({ ...formData, body: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm h-24"
          />
          <input
            placeholder="Department (optional)"
            value={formData.department}
            onChange={e => setFormData({ ...formData, department: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          />
          <input
            placeholder="Posted By (name)"
            value={formData.posted_by}
            onChange={e => setFormData({ ...formData, posted_by: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={create.isPending}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            {create.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {announcements.map(ann => (
          <div key={ann.id} className="rounded-lg border border-border p-4 bg-surface">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-text-primary">{ann.title}</h4>
                <p className="text-sm text-text-body mt-1">{ann.body}</p>
                <div className="flex gap-4 mt-2 text-xs text-text-muted">
                  {ann.department && <span>Dept: {ann.department}</span>}
                  <span>{formatDate(ann.created_at)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(ann.id)
                    setFormData({
                      title: ann.title,
                      body: ann.body,
                      department: ann.department || '',
                      posted_by: '',
                    })
                  }}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {editingId === ann.id && (
              <div className="mt-3 space-y-2 pt-3 border-t border-border">
                <input
                  placeholder="Title"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
                <textarea
                  placeholder="Body"
                  value={formData.body}
                  onChange={e => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm h-20"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(ann.id)}
                    disabled={update.isPending}
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
                  >
                    {update.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setFormData({ title: '', body: '', department: '', posted_by: '' })
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
    </div>
  )
}
