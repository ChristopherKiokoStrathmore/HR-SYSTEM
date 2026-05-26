/**
 * PesaPal API Integration Utilities
 *
 * PesaPal is a payment aggregator that handles:
 * - M-Pesa (Safaricom mobile money)
 * - Airtel Money
 * - Bank EFT/Card payments
 *
 * API Documentation: https://developer.pesapal.com/
 */

// PesaPal API base URLs
export const PESAPAL_URLS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  live: 'https://pay.pesapal.com/v3',
} as const

export type PesaPalEnvironment = 'sandbox' | 'live'

// PesaPal payment status codes
export const PESAPAL_STATUS = {
  PENDING: '0',
  COMPLETED: '1',
  FAILED: '2',
  REVERSED: '3',
} as const

export type PesaPalStatusCode = (typeof PESAPAL_STATUS)[keyof typeof PESAPAL_STATUS]

// Response types
export interface PesaPalAuthResponse {
  token: string
  expiryDate: string
  error?: {
    error_type: string
    code: string
    message: string
  }
  status: string
}

export interface PesaPalIPNRegistrationResponse {
  url: string
  created_date: string
  ipn_id: string
  error?: {
    error_type: string
    code: string
    message: string
  }
  status: string
}

export interface PesaPalOrderRequest {
  id: string
  currency: string
  amount: number
  description: string
  callback_url: string
  notification_id: string
  branch?: string
  billing_address: {
    email_address: string
    phone_number?: string
    country_code?: string
    first_name?: string
    middle_name?: string
    last_name?: string
    line_1?: string
    line_2?: string
    city?: string
    state?: string
    postal_code?: string
    zip_code?: string
  }
}

export interface PesaPalOrderResponse {
  order_tracking_id: string
  merchant_reference: string
  redirect_url: string
  error?: {
    error_type: string
    code: string
    message: string
    call_back_url: string
  }
  status: string
}

export interface PesaPalTransactionStatus {
  payment_method: string
  amount: number
  created_date: string
  confirmation_code: string
  payment_status_description: string
  description: string
  message: string
  payment_account: string
  call_back_url: string
  status_code: PesaPalStatusCode
  merchant_reference: string
  payment_status_code: string
  currency: string
  error?: {
    error_type: string
    code: string
    message: string
  }
  status: string
}

export interface PesaPalIPNPayload {
  OrderTrackingId: string
  OrderMerchantReference: string
  OrderNotificationType: string
}

/**
 * Get PesaPal API base URL based on environment
 */
export function getPesaPalBaseUrl(env: PesaPalEnvironment = 'sandbox'): string {
  return PESAPAL_URLS[env]
}

/**
 * Get authentication token from PesaPal
 */
export async function getPesaPalToken(
  consumerKey: string,
  consumerSecret: string,
  env: PesaPalEnvironment = 'sandbox'
): Promise<PesaPalAuthResponse> {
  const baseUrl = getPesaPalBaseUrl(env)

  const response = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  })

  if (!response.ok) {
    throw new Error(`PesaPal auth failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Register IPN URL with PesaPal
 */
export async function registerPesaPalIPN(
  token: string,
  ipnUrl: string,
  ipnNotificationType: 'GET' | 'POST' = 'POST',
  env: PesaPalEnvironment = 'sandbox'
): Promise<PesaPalIPNRegistrationResponse> {
  const baseUrl = getPesaPalBaseUrl(env)

  const response = await fetch(`${baseUrl}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: ipnNotificationType,
    }),
  })

  if (!response.ok) {
    throw new Error(`PesaPal IPN registration failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Submit an order/payment request to PesaPal
 */
export async function submitPesaPalOrder(
  token: string,
  order: PesaPalOrderRequest,
  env: PesaPalEnvironment = 'sandbox'
): Promise<PesaPalOrderResponse> {
  const baseUrl = getPesaPalBaseUrl(env)

  const response = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(order),
  })

  if (!response.ok) {
    throw new Error(`PesaPal order submission failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get transaction status from PesaPal
 */
export async function getPesaPalTransactionStatus(
  token: string,
  orderTrackingId: string,
  env: PesaPalEnvironment = 'sandbox'
): Promise<PesaPalTransactionStatus> {
  const baseUrl = getPesaPalBaseUrl(env)

  const response = await fetch(
    `${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`PesaPal status check failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Validate IPN callback signature (if using signature validation)
 */
export function validatePesaPalIPN(payload: PesaPalIPNPayload): boolean {
  // Basic validation - ensure required fields are present
  return !!(
    payload.OrderTrackingId &&
    payload.OrderMerchantReference &&
    payload.OrderNotificationType
  )
}

/**
 * Parse PesaPal status code to human-readable status
 */
export function parsePesaPalStatus(statusCode: string): 'pending' | 'paid' | 'failed' {
  switch (statusCode) {
    case PESAPAL_STATUS.COMPLETED:
      return 'paid'
    case PESAPAL_STATUS.FAILED:
    case PESAPAL_STATUS.REVERSED:
      return 'failed'
    case PESAPAL_STATUS.PENDING:
    default:
      return 'pending'
  }
}

/**
 * Generate a unique merchant reference for a payment
 */
export function generateMerchantReference(prefix: string = 'SL'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Map payment method to PesaPal channel hint
 */
export function getPaymentChannelHint(method: 'bank' | 'mpesa' | 'airtel'): string {
  switch (method) {
    case 'mpesa':
      return 'MPESA'
    case 'airtel':
      return 'AIRTEL'
    case 'bank':
    default:
      return 'PESAPAL'  // PesaPal default (allows all methods)
  }
}
