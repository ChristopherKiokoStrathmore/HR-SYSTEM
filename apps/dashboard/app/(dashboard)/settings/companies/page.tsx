import type { Metadata } from 'next'
import { CompanyList } from '@/components/modules/companies/company-list'

export const metadata: Metadata = { title: 'Companies' }

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Companies</h1>
          <p className="text-sm text-text-muted mt-1">Manage all client companies in the system</p>
        </div>
      </div>
      <CompanyList />
    </div>
  )
}
