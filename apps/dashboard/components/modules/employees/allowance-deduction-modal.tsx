'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { useEmployees } from '@/lib/hooks/use-employees'
import {
  useAllowanceTypes,
  useDeductionTypes,
  useAllowanceDeductionActions,
} from '@/lib/hooks/use-allowances'

type Kind = 'allowance' | 'deduction'
type Scope = 'employee' | 'department' | 'company'

const NEW_TYPE = '__new__'

export function AllowanceDeductionModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [kind, setKind] = useState<Kind>('allowance')
  const [scope, setScope] = useState<Scope>('employee')
  const [typeId, setTypeId] = useState('')
  const [newTypeName, setNewTypeName] = useState('')
  const [taxable, setTaxable] = useState(true)
  const [amount, setAmount] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [department, setDepartment] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )

  const { data: empResp } = useEmployees({ pageSize: 300 })
  const employees = empResp?.data ?? []
  const departments = useMemo(
    () =>
      Array.from(
        new Set(employees.map((e) => e.department).filter(Boolean))
      ) as string[],
    [employees]
  )

  const allowanceTypes = useAllowanceTypes()
  const deductionTypes = useDeductionTypes()
  const types = kind === 'allowance' ? allowanceTypes.data ?? [] : deductionTypes.data ?? []
  const a = useAllowanceDeductionActions()

  const busy =
    a.addAllowance.isPending ||
    a.addDeduction.isPending ||
    a.assignAllowanceDept.isPending ||
    a.assignDeductionDept.isPending ||
    a.createAllowanceType.isPending ||
    a.createDeductionType.isPending

  async function resolveTypeId(): Promise<string> {
    if (typeId && typeId !== NEW_TYPE) return typeId
    if (!newTypeName.trim()) throw new Error('Choose or name a type')
    if (kind === 'allowance') {
      const t = (await a.createAllowanceType.mutateAsync({
        name: newTypeName.trim(),
        taxable,
      })) as { id: string }
      return t.id
    }
    const t = (await a.createDeductionType.mutateAsync({
      name: newTypeName.trim(),
    })) as { id: string }
    return t.id
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (scope === 'employee' && !employeeId) {
      toast.error('Select an employee')
      return
    }
    if (scope === 'department' && !department) {
      toast.error('Select a department')
      return
    }
    try {
      const tid = await resolveTypeId()
      const base: Record<string, unknown> = {
        amount: Number(amount),
        effective_from: effectiveFrom,
      }
      const dept = scope === 'department' ? department : undefined
      if (kind === 'allowance') {
        if (scope === 'employee') {
          await a.addAllowance.mutateAsync({ ...base, allowance_type: tid, employee_id: employeeId })
        } else {
          await a.assignAllowanceDept.mutateAsync({ ...base, allowance_type: tid, department: dept })
        }
      } else {
        if (scope === 'employee') {
          await a.addDeduction.mutateAsync({ ...base, deduction_type: tid, employee_id: employeeId })
        } else {
          await a.assignDeductionDept.mutateAsync({ ...base, deduction_type: tid, department: dept })
        }
      }
      const who =
        scope === 'employee'
          ? 'the employee'
          : scope === 'department'
            ? `the ${department} department`
            : 'all employees'
      toast.success(
        `${kind === 'allowance' ? 'Allowance' : 'Deduction'} added for ${who} (1 month — renew to extend).`
      )
      setAmount('')
      setNewTypeName('')
      setTypeId('')
      setEmployeeId('')
      setDepartment('')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Allowance / Deduction"
      description="Applies for one month by default — renew it to extend into later months."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Kind toggle */}
        <div className="grid grid-cols-2 gap-2">
          {(['allowance', 'deduction'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k)
                setTypeId('')
              }}
              className={
                'py-2 rounded-xl text-sm font-medium border transition-colors ' +
                (kind === k
                  ? 'bg-accent text-white border-accent'
                  : 'border-border text-text-muted hover:bg-surface-alt')
              }
            >
              {k === 'allowance' ? 'Allowance' : 'Deduction'}
            </button>
          ))}
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {kind === 'allowance' ? 'Allowance' : 'Deduction'} type
          </label>
          <select
            className="input w-full"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          >
            <option value="">Select a type…</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value={NEW_TYPE}>+ New type…</option>
          </select>
        </div>

        {typeId === NEW_TYPE && (
          <div className="space-y-2">
            <input
              className="input w-full"
              placeholder={kind === 'allowance' ? 'e.g. Fuel, Housing, Per diem' : 'e.g. Sacco, Welfare, Loan'}
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
            />
            {kind === 'allowance' && (
              <label className="flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={taxable}
                  onChange={(e) => setTaxable(e.target.checked)}
                />
                Taxable (included in the PAYE base)
              </label>
            )}
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Monthly amount (KES)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Scope */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Apply to</label>
          <div className="grid grid-cols-3 gap-2">
            {(['employee', 'department', 'company'] as Scope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={
                  'py-2 rounded-xl text-xs font-medium border capitalize transition-colors ' +
                  (scope === s
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-text-muted hover:bg-surface-alt')
                }
              >
                {s === 'company' ? 'Whole company' : s}
              </button>
            ))}
          </div>
        </div>

        {scope === 'employee' && (
          <select
            className="input w-full"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Select an employee…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.user?.full_name ?? e.employee_number} ({e.employee_number})
              </option>
            ))}
          </select>
        )}

        {scope === 'department' && (
          <select
            className="input w-full"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Select a department…</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}

        {/* Effective from */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Effective from
          </label>
          <input
            type="date"
            className="input w-full"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
          <p className="text-xs text-text-muted mt-1">
            Auto-expires at the end of this month. Use “Renew” on the line item to extend.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
