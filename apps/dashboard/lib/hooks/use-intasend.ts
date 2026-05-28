'use client'

import { useQuery } from '@tanstack/react-query'

export interface IntaSendConfigStatus {
  configured: boolean
  sandbox: boolean
  provider: string
}

export interface IntaSendTransactionStatus {
  success: boolean
  status: 'pending' | 'processing' | 'paid' | 'failed'
  tracking_id: string
  amount?: number
  phone?: string
  reference?: string
  message?: string
}

export interface IntaSendWalletBalance {
  success: boolean
  balance?: number
  currency?: string
  message?: string
}

/**
 * Check if IntaSend is properly configured for M-Pesa B2C payments
 */
export function useIntaSendConfigStatus() {
  return useQuery({
    queryKey: ['intasend-config-status'],
    queryFn: async () => {
      const res = await fetch('/api/intasend/config-status')
      if (!res.ok) throw new Error('Failed to check IntaSend config')
      return res.json() as Promise<{ data: IntaSendConfigStatus }>
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Check status of a specific IntaSend M-Pesa transaction
 */
export function useIntaSendTransactionStatus(trackingId: string | null) {
  return useQuery({
    queryKey: ['intasend-transaction', trackingId],
    queryFn: async () => {
      const res = await fetch(
        `/api/intasend/transaction-status?tracking_id=${trackingId}`
      )
      if (!res.ok) throw new Error('Failed to get transaction status')
      return res.json() as Promise<{ data: IntaSendTransactionStatus }>
    },
    enabled: !!trackingId,
    refetchInterval: (query) => {
      // Stop polling once transaction is complete or failed
      const status = query.state.data?.data?.status
      if (status === 'paid' || status === 'failed') {
        return false
      }
      return 5000 // Poll every 5 seconds while pending/processing
    },
  })
}

/**
 * Get IntaSend wallet balance for disbursements
 */
export function useIntaSendWalletBalance() {
  return useQuery({
    queryKey: ['intasend-wallet-balance'],
    queryFn: async () => {
      const res = await fetch('/api/intasend/wallet-balance')
      if (!res.ok) throw new Error('Failed to get wallet balance')
      return res.json() as Promise<{ data: IntaSendWalletBalance }>
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
  })
}
