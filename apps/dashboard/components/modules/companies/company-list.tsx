'use client'

import { useState } from 'react'
import { Plus, Search, Building2, Globe, Mail, Pencil, Trash2 } from 'lucide-react'
import { useCompanies, useDeleteCompany } from '@/lib/hooks/use-companies'
import { CompanyModal } from './company-modal'
import { Badge } from '@/components/ui/badge'
import { SkeletonTable } from '@/components/ui/skeleton'
import { toast } from '@/lib/toast'
import type { Company } from '@hr/shared'

export function CompanyList() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useCompanies({ search, page: String(page) })
  const deleteCompany = useDeleteCompany()

  function handleEdit(c: Company) {
    setEditing(c)
    setModalOpen(true)
  }

  async function handleDelete(c: Company) {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return
    try {
      await deleteCompany.mutateAsync(c.id)
      toast.success('Company deleted')
    } catch {
      toast.error('Failed to delete company')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search companies…"
            className="input pl-9 h-9 text-sm"
          />
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true) }}
          className="btn-primary flex items-center gap-2 h-9 text-sm px-4"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.data.map((company) => (
            <div key={company.id} className="card hover:shadow-card-hover transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: company.primary_color ?? '#1A2E5A' }}
                  >
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary text-sm">{company.name}</h3>
                    {company.industry && (
                      <p className="text-xs text-text-muted">{company.industry}</p>
                    )}
                  </div>
                </div>
                <Badge variant={company.is_active ? 'success' : 'muted'}>
                  {company.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" />
                  {company.city ? `${company.city}, ` : ''}{company.country}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  {company.contact_email}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(company)}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(company)}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}

          {data?.data.length === 0 && (
            <div className="col-span-full text-center py-12 text-text-muted">
              No companies found. Add your first client company.
            </div>
          )}
        </div>
      )}

      <CompanyModal
        open={modalOpen}
        company={editing}
        onClose={() => { setModalOpen(false); setEditing(null) }}
      />
    </div>
  )
}
