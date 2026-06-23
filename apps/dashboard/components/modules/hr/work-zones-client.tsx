'use client'
import { useState } from 'react'
import {
  useWorkZones,
  useCreateWorkZone,
  useUpdateWorkZone,
  useDeleteWorkZone,
  useAssignZoneEmployees,
} from '@/lib/hooks/use-work-zones'
import { SkeletonTable } from '@/components/ui/skeleton'
import { LottieEmpty } from '@/components/ui/lottie-empty'
import { toast } from '@/lib/toast'
import { Plus, Edit, Trash2, Users, X } from 'lucide-react'

export function WorkZonesClient() {
  const { data: zones, isLoading } = useWorkZones()
  const create = useCreateWorkZone()
  const update = useUpdateWorkZone()
  const del = useDeleteWorkZone()
  const assignEmployees = useAssignZoneEmployees()

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    center_lat: 0,
    center_lng: 0,
    radius_m: 100,
    work_start: '09:00',
    work_end: '17:00',
    is_active: true,
  })

  const handleCreate = async () => {
    if (!formData.name || !formData.center_lat || !formData.center_lng) {
      toast.error('Name and location are required')
      return
    }
    try {
      await create.mutateAsync(formData as any)
      setFormData({
        name: '',
        center_lat: 0,
        center_lng: 0,
        radius_m: 100,
        work_start: '09:00',
        work_end: '17:00',
        is_active: true,
      })
      setFormOpen(false)
      toast.success('Work zone created')
    } catch {
      toast.error('Failed to create work zone')
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      await update.mutateAsync({ id, ...formData } as any)
      setEditingId(null)
      setFormData({
        name: '',
        center_lat: 0,
        center_lng: 0,
        radius_m: 100,
        work_start: '09:00',
        work_end: '17:00',
        is_active: true,
      })
      toast.success('Work zone updated')
    } catch {
      toast.error('Failed to update work zone')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this work zone?')) return
    try {
      await del.mutateAsync(id)
      toast.success('Work zone deleted')
    } catch {
      toast.error('Failed to delete work zone')
    }
  }

  if (isLoading) return <SkeletonTable rows={5} />

  return (
    <div className="space-y-4">
      <button
        onClick={() => setFormOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white"
      >
        <Plus className="w-4 h-4" /> New Work Zone
      </button>

      {formOpen && (
        <div className="rounded-lg border border-border p-4 space-y-3 bg-surface">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Create Work Zone</h3>
            <button onClick={() => setFormOpen(false)} className="text-text-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            placeholder="Zone Name"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Center Latitude"
              step="0.0001"
              value={formData.center_lat}
              onChange={e => setFormData({ ...formData, center_lat: parseFloat(e.target.value) })}
              className="px-3 py-2 border border-border rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="Center Longitude"
              step="0.0001"
              value={formData.center_lng}
              onChange={e => setFormData({ ...formData, center_lng: parseFloat(e.target.value) })}
              className="px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <input
            type="number"
            placeholder="Radius (meters)"
            value={formData.radius_m}
            onChange={e => setFormData({ ...formData, radius_m: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="time"
              value={formData.work_start}
              onChange={e => setFormData({ ...formData, work_start: e.target.value })}
              className="px-3 py-2 border border-border rounded-lg text-sm"
            />
            <input
              type="time"
              value={formData.work_end}
              onChange={e => setFormData({ ...formData, work_end: e.target.value })}
              className="px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={create.isPending}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            {create.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      {!zones?.length ? (
        <LottieEmpty title="No work zones yet" />
      ) : (
        <div className="space-y-2">
          {zones.map(zone => (
            <div key={zone.id} className="rounded-lg border border-border p-4 bg-surface">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-text-primary">{zone.name}</h4>
                  <p className="text-xs text-text-muted mt-1">
                    {zone.radius_m}m radius • {zone.work_start} - {zone.work_end}
                  </p>
                  <p className="text-xs text-text-muted">
                    Coordinates: {zone.center_lat.toFixed(4)}, {zone.center_lng.toFixed(4)}
                  </p>
                  <span
                    className={`text-xs mt-2 inline-block px-2 py-1 rounded ${
                      zone.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {zone.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(zone.id)
                      setFormData({
                        name: zone.name,
                        center_lat: zone.center_lat,
                        center_lng: zone.center_lng,
                        radius_m: zone.radius_m,
                        work_start: zone.work_start,
                        work_end: zone.work_end,
                        is_active: zone.is_active,
                      })
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-purple-600 hover:bg-purple-50 rounded">
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(zone.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
