-- ─────────────────────────────────────────────────────────────
-- MIGRATION: Company Payment Account Settings
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- ALTER: companies - Add payment account fields
-- ─────────────────────────────────────────────────────────────

-- Bank account details (for disbursing salaries)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  company_bank_name TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  company_bank_account TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  company_bank_branch TEXT;

-- M-Pesa business account (Paybill or Till)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  mpesa_paybill_number TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  mpesa_till_number TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  mpesa_shortcode_type TEXT CHECK (mpesa_shortcode_type IN ('paybill', 'till'));

-- Airtel Money business account
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  airtel_business_number TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  airtel_business_name TEXT;

-- PesaPal merchant credentials (for API integration)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  pesapal_consumer_key TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  pesapal_consumer_secret TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  pesapal_ipn_id TEXT;

-- Flag to indicate if payment accounts are configured
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  payment_accounts_configured BOOLEAN NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────
-- COMMENT: Document the new fields
-- ─────────────────────────────────────────────────────────────

COMMENT ON COLUMN companies.company_bank_name IS 'Company bank name for salary disbursement';
COMMENT ON COLUMN companies.company_bank_account IS 'Company bank account number';
COMMENT ON COLUMN companies.company_bank_branch IS 'Company bank branch';
COMMENT ON COLUMN companies.mpesa_paybill_number IS 'M-Pesa Paybill number for bulk payments';
COMMENT ON COLUMN companies.mpesa_till_number IS 'M-Pesa Till number for bulk payments';
COMMENT ON COLUMN companies.mpesa_shortcode_type IS 'Whether company uses paybill or till';
COMMENT ON COLUMN companies.airtel_business_number IS 'Airtel Money business account number';
COMMENT ON COLUMN companies.airtel_business_name IS 'Airtel Money registered business name';
COMMENT ON COLUMN companies.pesapal_consumer_key IS 'PesaPal API consumer key (encrypted)';
COMMENT ON COLUMN companies.pesapal_consumer_secret IS 'PesaPal API consumer secret (encrypted)';
COMMENT ON COLUMN companies.pesapal_ipn_id IS 'Pre-registered PesaPal IPN ID';
COMMENT ON COLUMN companies.payment_accounts_configured IS 'Whether payment accounts have been set up';
