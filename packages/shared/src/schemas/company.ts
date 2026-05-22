import { z } from 'zod'

export const companyPaymentSettingsSchema = z.object({
  // Bank account details
  company_bank_name: z.string().nullable().optional(),
  company_bank_account: z.string().nullable().optional(),
  company_bank_branch: z.string().nullable().optional(),

  // M-Pesa business account
  mpesa_paybill_number: z
    .string()
    .regex(/^\d{5,6}$/, 'Paybill must be 5-6 digits')
    .nullable()
    .optional(),
  mpesa_till_number: z
    .string()
    .regex(/^\d{5,7}$/, 'Till must be 5-7 digits')
    .nullable()
    .optional(),
  mpesa_shortcode_type: z.enum(['paybill', 'till']).nullable().optional(),

  // Airtel Money business account
  airtel_business_number: z.string().nullable().optional(),
  airtel_business_name: z.string().nullable().optional(),

  // PesaPal API credentials
  pesapal_consumer_key: z.string().nullable().optional(),
  pesapal_consumer_secret: z.string().nullable().optional(),
  pesapal_ipn_id: z.string().nullable().optional(),

  // Flag
  payment_accounts_configured: z.boolean().optional(),
})

export type CompanyPaymentSettingsInput = z.infer<typeof companyPaymentSettingsSchema>
