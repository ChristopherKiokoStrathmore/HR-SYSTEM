-- ─────────────────────────────────────────────────────────────
-- MIGRATION: Payroll Disbursement with PesaPal Integration
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- ENUM: Payment batch status (different from individual payment_status)
-- ─────────────────────────────────────────────────────────────

CREATE TYPE payment_batch_status AS ENUM (
  'pending',          -- Batch created, not yet submitted
  'processing',       -- Submitted to PesaPal, awaiting results
  'partial',          -- Some payments succeeded, some failed
  'completed',        -- All payments processed successfully
  'failed'            -- Batch failed entirely
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: payment_batches
-- Groups payments by payroll run and payment method
-- ─────────────────────────────────────────────────────────────

CREATE TABLE payment_batches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id             UUID NOT NULL,

  -- Link to payroll run
  payroll_run_id        UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  payment_method        payment_method NOT NULL,  -- 'bank', 'mpesa', 'airtel'

  -- Status tracking
  status                payment_batch_status NOT NULL DEFAULT 'pending',

  -- Totals
  total_amount          DECIMAL(15, 2) NOT NULL,
  total_records         INT NOT NULL,
  successful_count      INT NOT NULL DEFAULT 0,
  failed_count          INT NOT NULL DEFAULT 0,

  -- PesaPal integration
  pesapal_order_id      TEXT,               -- PesaPal order tracking ID
  pesapal_reference     TEXT,               -- PesaPal merchant reference
  pesapal_response      JSONB,              -- Full response from PesaPal

  -- Audit
  initiated_by          UUID NOT NULL REFERENCES users(id),
  initiated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,

  -- Error tracking
  error_message         TEXT,
  retry_count           INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_payment_batches_payroll_run ON payment_batches(payroll_run_id);
CREATE INDEX idx_payment_batches_status ON payment_batches(status);
CREATE INDEX idx_payment_batches_pesapal ON payment_batches(pesapal_order_id) WHERE pesapal_order_id IS NOT NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON payment_batches
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- ALTER: payroll_records - Add disbursement tracking
-- ─────────────────────────────────────────────────────────────

-- Link to payment batch
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS
  payment_batch_id UUID REFERENCES payment_batches(id);

-- PesaPal transaction tracking
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS
  pesapal_transaction_id TEXT;

-- Error tracking for individual payments
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS
  payment_error TEXT;

-- Retry tracking
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS
  retry_count INT NOT NULL DEFAULT 0;

CREATE INDEX idx_payroll_records_batch ON payroll_records(payment_batch_id) WHERE payment_batch_id IS NOT NULL;
CREATE INDEX idx_payroll_records_pesapal ON payroll_records(pesapal_transaction_id) WHERE pesapal_transaction_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- TABLE: pesapal_ipn_logs
-- Audit log for all PesaPal IPN callbacks
-- ─────────────────────────────────────────────────────────────

CREATE TABLE pesapal_ipn_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- IPN data from PesaPal
  order_tracking_id     TEXT NOT NULL,
  order_merchant_reference TEXT,
  order_notification_type TEXT,

  -- Status from PesaPal
  payment_status_code   TEXT,
  payment_status_description TEXT,

  -- Raw payload
  raw_payload           JSONB NOT NULL,

  -- Processing
  processed             BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at          TIMESTAMPTZ,
  processing_error      TEXT
);

CREATE INDEX idx_pesapal_ipn_order ON pesapal_ipn_logs(order_tracking_id);
CREATE INDEX idx_pesapal_ipn_unprocessed ON pesapal_ipn_logs(processed) WHERE processed = FALSE;

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE payment_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_batches_super_admin" ON payment_batches
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY "payment_batches_hr_admin" ON payment_batches
  FOR ALL USING (
    current_user_role() = 'hr_admin' AND
    payroll_run_id IN (
      SELECT id FROM payroll_runs WHERE company_id = current_user_company_id()
    )
  );

-- IPN logs - only super admins can view
ALTER TABLE pesapal_ipn_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pesapal_ipn_super_admin" ON pesapal_ipn_logs
  FOR ALL USING (current_user_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────
-- FUNCTION: Update batch status based on record results
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_payment_batch_status()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_id UUID;
  v_total INT;
  v_paid INT;
  v_failed INT;
  v_pending INT;
BEGIN
  v_batch_id := COALESCE(NEW.payment_batch_id, OLD.payment_batch_id);

  IF v_batch_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count payment statuses for this batch
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE payment_status = 'paid'),
    COUNT(*) FILTER (WHERE payment_status = 'failed'),
    COUNT(*) FILTER (WHERE payment_status IN ('pending', 'processing'))
  INTO v_total, v_paid, v_failed, v_pending
  FROM payroll_records
  WHERE payment_batch_id = v_batch_id AND is_deleted = FALSE;

  -- Update batch counts
  UPDATE payment_batches SET
    successful_count = v_paid,
    failed_count = v_failed,
    status = CASE
      WHEN v_pending > 0 THEN 'processing'::payment_batch_status
      WHEN v_failed = v_total THEN 'failed'::payment_batch_status
      WHEN v_failed > 0 THEN 'partial'::payment_batch_status
      ELSE 'completed'::payment_batch_status
    END,
    completed_at = CASE
      WHEN v_pending = 0 THEN NOW()
      ELSE NULL
    END
  WHERE id = v_batch_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update batch status when a record payment status changes
CREATE TRIGGER update_batch_on_record_change
  AFTER UPDATE OF payment_status ON payroll_records
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION update_payment_batch_status();
