'use client'

import { useState } from 'react'
import { CreditCard, Loader2, CheckCircle, AlertCircle, Banknote, Smartphone } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatKES } from '@hr/shared'
import { cn } from '@/lib/utils'
import type { PaymentSourceType } from '@/lib/store'

interface PayEmployeesModalProps {
  open: boolean
  selectedCount: number
  totalAmount: number
  paymentSource: PaymentSourceType
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function PayEmployeesModal({
  open,
  selectedCount,
  totalAmount,
  paymentSource,
  onClose,
  onConfirm,
}: PayEmployeesModalProps) {
  const [isPending, setIsPending] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const handleConfirm = async () => {
    setIsPending(true)
    try {
      await onConfirm()
      setResult({
        success: true,
        message: `Successfully initiated payment for ${selectedCount} employee${selectedCount !== 1 ? 's' : ''}`,
      })
    } catch (err) {
      setResult({
        success: false,
        message: String(err),
      })
    } finally {
      setIsPending(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    onClose()
  }

  const isMpesa = paymentSource === 'mpesa_wallet'

  // Show result view
  if (result) {
    return (
      <Modal open={open} onClose={handleClose} title="Payment Result" size="sm">
        <div className="space-y-4">
          <div
            className={cn(
              'rounded-lg px-4 py-6 text-center',
              result.success ? 'bg-green-50' : 'bg-red-50'
            )}
          >
            {result.success ? (
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
            ) : (
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-600" />
            )}
            <p
              className={cn(
                'text-sm font-medium',
                result.success ? 'text-green-800' : 'text-red-800'
              )}
            >
              {result.message}
            </p>
          </div>

          <button onClick={handleClose} className="btn-primary w-full">
            Done
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Confirm Payment" size="sm">
      <div className="space-y-5">
        {/* Payment summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-muted">Employees</span>
            <span className="text-sm font-medium text-text-primary">
              {selectedCount}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-muted">Total Amount</span>
            <span className="text-lg font-bold text-text-primary">
              {formatKES(totalAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-muted">Payment Source</span>
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                isMpesa
                  ? 'bg-green-100 text-green-700'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {isMpesa ? (
                <Smartphone className="w-4 h-4" />
              ) : (
                <Banknote className="w-4 h-4" />
              )}
              {isMpesa ? 'M-Pesa Wallet' : 'Bank Wallet'}
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          Please confirm that you want to proceed with this payment. This action
          will initiate transfers to the selected employees.
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isPending}
            className="btn-ghost flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay Now
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
