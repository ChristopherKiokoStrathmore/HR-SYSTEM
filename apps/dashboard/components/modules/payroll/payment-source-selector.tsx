'use client'

import { Banknote, Smartphone, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore, PAYMENT_SOURCES, type PaymentMethodType } from '@/lib/store'

const ICON_MAP = {
  banknote: Banknote,
  smartphone: Smartphone,
  phone: Phone,
}

export function PaymentSourceSelector() {
  const paymentMethod = useStore((s) => s.paymentMethod)
  const setPaymentMethod = useStore((s) => s.setPaymentMethod)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-surface-alt rounded-xl border border-border">
      <span className="text-sm font-medium text-text-body whitespace-nowrap">
        Default Payment Source:
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {PAYMENT_SOURCES.map((source) => {
          const Icon = ICON_MAP[source.icon]
          const isSelected = paymentMethod === source.method

          return (
            <button
              key={source.id}
              type="button"
              onClick={() => setPaymentMethod(source.method)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                isSelected
                  ? source.color === 'green'
                    ? 'bg-green-600 text-white border-green-600'
                    : source.color === 'red'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-primary text-white border-primary'
                  : 'bg-white text-text-muted border-border hover:border-gray-400'
              )}
            >
              <Icon className="w-4 h-4" />
              {source.name}
            </button>
          )
        })}
      </div>

      {/* Current selection indicator */}
      <div className="flex-1" />
      <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            paymentMethod === 'mpesa'
              ? 'bg-green-500'
              : paymentMethod === 'airtel'
              ? 'bg-red-500'
              : 'bg-primary'
          )}
        />
        Payments via {paymentMethod === 'mpesa' ? 'IntaSend M-Pesa' : paymentMethod === 'bank' ? 'PesaPal Bank EFT' : 'PesaPal Airtel Money'}
      </div>
    </div>
  )
}
