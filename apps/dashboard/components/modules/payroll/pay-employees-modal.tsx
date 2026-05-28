'use client'

import { useState } from 'react'
import {
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  Banknote,
  Smartphone,
  Phone,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatKES } from '@hr/shared'
import { cn } from '@/lib/utils'
import {
  useStore,
  PAYMENT_SOURCES,
  type PaymentMethodType,
} from '@/lib/store'

interface PayEmployeesModalProps {
  open: boolean
  selectedCount: number
  totalAmount: number
  onClose: () => void
  onConfirm: (paymentMethod: PaymentMethodType) => Promise<void>
}

const ICON_MAP = {
  banknote: Banknote,
  smartphone: Smartphone,
  phone: Phone,
}

export function PayEmployeesModal({
  open,
  selectedCount,
  totalAmount,
  onClose,
  onConfirm,
}: PayEmployeesModalProps) {
  const [isPending, setIsPending] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Get payment method from store
  const paymentMethod = useStore((s) => s.paymentMethod)
  const setPaymentMethod = useStore((s) => s.setPaymentMethod)

  // Local state for modal selection (allows changing before confirm)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>(paymentMethod)

  const handleConfirm = async () => {
    setIsPending(true)
    try {
      // Update store with selected method
      setPaymentMethod(selectedMethod)
      await onConfirm(selectedMethod)
      setResult({
        success: true,
        message: `Successfully initiated payment for ${selectedCount} employee${selectedCount !== 1 ? 's' : ''} via ${PAYMENT_SOURCES.find(s => s.method === selectedMethod)?.name || selectedMethod}`,
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
    setSelectedMethod(paymentMethod) // Reset to store value
    onClose()
  }

  const currentSource = PAYMENT_SOURCES.find((s) => s.method === selectedMethod)

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
    <Modal open={open} onClose={handleClose} title="Confirm Payment" size="md">
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
        </div>

        {/* Payment Source Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-primary">
            Select Payment Source
          </label>
          <div className="grid grid-cols-1 gap-3">
            {PAYMENT_SOURCES.map((source) => {
              const Icon = ICON_MAP[source.icon]
              const isSelected = selectedMethod === source.method

              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setSelectedMethod(source.method)}
                  disabled={isPending}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                    isSelected
                      ? source.color === 'green'
                        ? 'border-green-500 bg-green-50'
                        : source.color === 'red'
                        ? 'border-red-500 bg-red-50'
                        : 'border-primary bg-primary/5'
                      : 'border-border bg-white hover:border-gray-300',
                    isPending && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-lg',
                      isSelected
                        ? source.color === 'green'
                          ? 'bg-green-500 text-white'
                          : source.color === 'red'
                          ? 'bg-red-500 text-white'
                          : 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p
                      className={cn(
                        'font-medium',
                        isSelected ? 'text-text-primary' : 'text-text-muted'
                      )}
                    >
                      {source.name}
                    </p>
                    <p className="text-xs text-text-muted">{source.description}</p>
                  </div>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      isSelected
                        ? source.color === 'green'
                          ? 'border-green-500 bg-green-500'
                          : source.color === 'red'
                          ? 'border-red-500 bg-red-500'
                          : 'border-primary bg-primary'
                        : 'border-gray-300'
                    )}
                  >
                    {isSelected && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected method info */}
        {currentSource && (
          <div
            className={cn(
              'rounded-lg px-4 py-3 text-xs',
              currentSource.color === 'green'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : currentSource.color === 'red'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-primary/5 text-primary border border-primary/20'
            )}
          >
            <p className="font-medium mb-1">
              Payment via {currentSource.name}
            </p>
            <p className="opacity-80">
              Funds will be disbursed through{' '}
              {currentSource.method === 'mpesa'
                ? 'IntaSend M-Pesa B2C'
                : currentSource.method === 'bank'
                ? 'PesaPal Bank EFT'
                : 'PesaPal Airtel Money'}{' '}
              to {selectedCount} employee{selectedCount !== 1 ? 's' : ''}.
            </p>
          </div>
        )}

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
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
              currentSource?.color === 'green'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : currentSource?.color === 'red'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary hover:bg-primary/90 text-white',
              isPending && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay {formatKES(totalAmount)}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
