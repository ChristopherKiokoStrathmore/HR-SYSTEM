'use client'

import { Banknote, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore, type PaymentSourceType } from '@/lib/store'

export function PaymentSourceSelector() {
  const paymentSource = useStore((s) => s.paymentSource)
  const setPaymentSource = useStore((s) => s.setPaymentSource)

  const isMpesa = paymentSource === 'mpesa_wallet'

  return (
    <div className="flex items-center gap-4 p-4 bg-surface-alt rounded-xl border border-border">
      <span className="text-sm font-medium text-text-body">Payment Source:</span>

      <div className="flex items-center gap-3">
        {/* Bank option */}
        <button
          type="button"
          onClick={() => setPaymentSource('bank_wallet')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
            !isMpesa
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-text-muted border-border hover:border-primary/50'
          )}
        >
          <Banknote className="w-4 h-4" />
          Bank Wallet
        </button>

        {/* M-Pesa option */}
        <button
          type="button"
          onClick={() => setPaymentSource('mpesa_wallet')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
            isMpesa
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-text-muted border-border hover:border-green-500/50'
          )}
        >
          <Smartphone className="w-4 h-4" />
          M-Pesa Wallet
        </button>
      </div>

      {/* Current selection indicator */}
      <div className="flex-1" />
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isMpesa ? 'bg-green-500' : 'bg-primary'
          )}
        />
        Payments will be made from {isMpesa ? 'M-Pesa' : 'Bank'} account
      </div>
    </div>
  )
}
