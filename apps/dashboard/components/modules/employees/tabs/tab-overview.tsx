'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EmployeeWithUser, PaymentMethod } from '@hr/shared'
import { formatKES, formatDate, daysUntil } from '@hr/shared'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { Pencil, Banknote, Smartphone, Loader2, CheckCircle } from 'lucide-react'

// ─── Payment Method Edit Modal ────────────────────────────────────────────────

function PaymentMethodModal({
  open,
  employee,
  onClose,
}: {
  open: boolean
  employee: EmployeeWithUser
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [method, setMethod] = useState<PaymentMethod>(employee.payment_method)
  const [bankName, setBankName] = useState(employee.bank_name ?? '')
  const [bankAccount, setBankAccount] = useState(employee.bank_account ?? '')
  const [mpesaNumber, setMpesaNumber] = useState(employee.mpesa_number ?? '')
  const [airtelNumber, setAirtelNumber] = useState(employee.airtel_number ?? '')

  const update = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: method,
          bank_name: method === 'bank' ? bankName : null,
          bank_account: method === 'bank' ? bankAccount : null,
          mpesa_number: method === 'mpesa' ? mpesaNumber : null,
          airtel_number: method === 'airtel' ? airtelNumber : null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', employee.id] })
      toast.success('Payment method updated')
      onClose()
    },
    onError: (err) => {
      toast.error('Failed to update', err.message)
    },
  })

  const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote; color: string }[] = [
    { value: 'bank', label: 'Bank Transfer', icon: Banknote, color: 'text-primary' },
    { value: 'mpesa', label: 'M-Pesa', icon: Smartphone, color: 'text-green-600' },
    { value: 'airtel', label: 'Airtel Money', icon: Smartphone, color: 'text-red-600' },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Update Payment Method" size="sm">
      <div className="space-y-5">
        {/* Method selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-body">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                  method === value
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/50'
                )}
              >
                <Icon className={cn('w-6 h-6', method === value ? 'text-accent' : color)} />
                <span className={cn(
                  'text-xs font-medium',
                  method === value ? 'text-accent' : 'text-text-muted'
                )}>
                  {label}
                </span>
                {method === value && (
                  <CheckCircle className="w-4 h-4 text-accent absolute top-2 right-2" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bank details */}
        {method === 'bank' && (
          <div className="space-y-3 p-4 bg-surface-alt rounded-lg">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Bank Name</label>
              <input
                className="input"
                placeholder="e.g. Equity Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Account Number</label>
              <input
                className="input font-mono"
                placeholder="0123456789"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* M-Pesa number */}
        {method === 'mpesa' && (
          <div className="p-4 bg-green-50 rounded-lg">
            <label className="block text-xs font-medium text-green-700 mb-1.5">M-Pesa Phone Number</label>
            <input
              className="input font-mono"
              placeholder="+254700000000"
              value={mpesaNumber}
              onChange={(e) => setMpesaNumber(e.target.value)}
            />
            <p className="text-xs text-green-600 mt-1.5">
              Salary will be sent directly to this M-Pesa number
            </p>
          </div>
        )}

        {/* Airtel number */}
        {method === 'airtel' && (
          <div className="p-4 bg-red-50 rounded-lg">
            <label className="block text-xs font-medium text-red-700 mb-1.5">Airtel Money Number</label>
            <input
              className="input font-mono"
              placeholder="+254733000000"
              value={airtelNumber}
              onChange={(e) => setAirtelNumber(e.target.value)}
            />
            <p className="text-xs text-red-600 mt-1.5">
              Salary will be sent directly to this Airtel Money number
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Tab Overview Component ───────────────────────────────────────────────────

export function TabOverview({ employee }: { employee: EmployeeWithUser }) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const contractDaysLeft = employee.end_date ? daysUntil(employee.end_date) : null

  const contractColor =
    contractDaysLeft === null ? 'bg-success'
    : contractDaysLeft > 90 ? 'bg-success'
    : contractDaysLeft > 30 ? 'bg-warning'
    : 'bg-danger'

  const contractPct =
    contractDaysLeft === null ? 100
    : employee.contract_duration_months
    ? Math.max(0, 100 - (contractDaysLeft / (employee.contract_duration_months * 30)) * 100)
    : 100

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Personal info */}
      <div className="lg:col-span-2 space-y-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['Date of Birth', employee.date_of_birth ? formatDate(employee.date_of_birth) : '—'],
              ['Gender', employee.gender ?? '—'],
              ['Nationality', employee.nationality ?? '—'],
              ['ID Number', employee.id_number ? '••••••••' : '—'],
              ['Phone', employee.user?.phone ?? '—'],
              ['Email', employee.user?.email ?? '—'],
              ['Next of Kin', employee.next_of_kin_name ?? '—'],
              ['NOK Phone', employee.next_of_kin_phone ?? '—'],
              ['Relationship', employee.next_of_kin_relationship ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-text-muted text-xs">{label}</p>
                <p className="text-text-primary font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Statutory Numbers</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['NSSF', employee.nssf_number ?? '—'],
              ['NHIF', employee.nhif_number ?? '—'],
              ['KRA PIN', employee.kra_pin ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-text-muted text-xs">{label}</p>
                <p className="text-text-primary font-medium font-mono mt-0.5">
                  {value !== '—' ? '••••••••' : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Contract + Salary cards */}
      <div className="space-y-4">
        {/* Salary card */}
        <div className="card bg-primary text-white relative">
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Edit payment method"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <p className="text-white/60 text-xs mb-1">Gross Salary</p>
          <p className="text-2xl font-bold">{formatKES(employee.salary)}</p>
          <div className="flex items-center gap-1.5 mt-2">
            {employee.payment_method === 'bank' ? (
              <Banknote className="w-4 h-4 text-white/70" />
            ) : (
              <Smartphone className="w-4 h-4 text-white/70" />
            )}
            <p className="text-white/80 text-xs capitalize">
              {employee.payment_method === 'bank'
                ? `Bank · ${employee.bank_name ?? 'Not set'}`
                : employee.payment_method === 'mpesa'
                ? `M-Pesa · ${employee.mpesa_number ?? 'Not set'}`
                : `Airtel · ${employee.airtel_number ?? 'Not set'}`}
            </p>
          </div>
        </div>

        {/* Contract timeline */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Contract</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted text-xs">Start</span>
              <span className="text-text-primary font-medium">{formatDate(employee.start_date)}</span>
            </div>
            {employee.end_date && (
              <div className="flex justify-between">
                <span className="text-text-muted text-xs">End</span>
                <span className="text-text-primary font-medium">{formatDate(employee.end_date)}</span>
              </div>
            )}
            {contractDaysLeft !== null && (
              <div className="flex justify-between">
                <span className="text-text-muted text-xs">Days Left</span>
                <span className={cn('font-bold text-sm',
                  contractDaysLeft > 90 ? 'text-success'
                  : contractDaysLeft > 30 ? 'text-warning'
                  : 'text-danger'
                )}>
                  {contractDaysLeft}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 bg-surface-alt rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', contractColor)}
              style={{ width: `${Math.min(100, contractPct)}%` }}
            />
          </div>
          {employee.contract_duration_months && (
            <p className="text-xs text-text-muted mt-1">
              {employee.contract_duration_months}-month contract
            </p>
          )}
        </div>
      </div>

      {/* Payment Method Edit Modal */}
      <PaymentMethodModal
        open={paymentModalOpen}
        employee={employee}
        onClose={() => setPaymentModalOpen(false)}
      />
    </div>
  )
}
