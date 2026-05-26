'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface PesapalConfigStatus {
  configured: boolean
  has_consumer_key: boolean
  has_consumer_secret: boolean
  has_ipn_id: boolean
  sandbox_mode: boolean
}

export interface IpnRegistration {
  success: boolean
  ipn_id?: string
  url?: string
  error?: string
}

export interface RegisteredIpn {
  ipn_id: string
  url: string
  created_date: string
  ipn_notification_type: string
  ipn_status: string
}

export interface TransactionStatus {
  success: boolean
  order_tracking_id: string
  payment_status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'INVALID' | 'UNKNOWN'
  status_code: string
  amount: number
  currency: string
  payment_method: string
  confirmation_code: string
  payment_account: string
  created_date: string
  message: string
}

/**
 * Check if PesaPal is properly configured
 */
export function usePesapalConfigStatus() {
  return useQuery({
    queryKey: ['pesapal-config-status'],
    queryFn: async () => {
      const res = await fetch('/api/pesapal/config-status')
      if (!res.ok) throw new Error('Failed to check PesaPal config')
      return res.json() as Promise<{ data: PesapalConfigStatus }>
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Register IPN webhook URL with PesaPal
 */
export function useRegisterIpn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (callbackUrl: string) => {
      const res = await fetch('/api/pesapal/register-ipn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_url: callbackUrl }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json() as Promise<{ data: IpnRegistration }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pesapal-ipns'] })
      qc.invalidateQueries({ queryKey: ['pesapal-config-status'] })
    },
  })
}

/**
 * Get list of registered IPN URLs
 */
export function useListIpns() {
  return useQuery({
    queryKey: ['pesapal-ipns'],
    queryFn: async () => {
      const res = await fetch('/api/pesapal/ipns')
      if (!res.ok) throw new Error('Failed to list IPNs')
      return res.json() as Promise<{ data: RegisteredIpn[] }>
    },
  })
}

/**
 * Check status of a specific payment transaction
 */
export function useTransactionStatus(orderTrackingId: string | null) {
  return useQuery({
    queryKey: ['pesapal-transaction', orderTrackingId],
    queryFn: async () => {
      const res = await fetch(
        `/api/pesapal/transaction-status?order_tracking_id=${orderTrackingId}`
      )
      if (!res.ok) throw new Error('Failed to get transaction status')
      return res.json() as Promise<{ data: TransactionStatus }>
    },
    enabled: !!orderTrackingId,
    refetchInterval: (query) => {
      // Stop polling once transaction is complete or failed
      const status = query.state.data?.data?.payment_status
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'INVALID') {
        return false
      }
      return 5000 // Poll every 5 seconds while pending
    },
  })
}
