-- ─────────────────────────────────────────────────────────────
-- STORED FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Auto-create user profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- User row is created by the app after setting company/role
  -- This trigger updates last_login_at on sign in
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update last_login_at on each successful session
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_login_at = NOW() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate leave balance remaining_days on insert/update of leaves
CREATE OR REPLACE FUNCTION sync_leave_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM NEW.start_date);
  UPDATE leave_balances
  SET
    used_days = (
      SELECT COALESCE(SUM(days_requested), 0)
      FROM leaves
      WHERE employee_id = NEW.employee_id
        AND leave_type  = NEW.leave_type
        AND EXTRACT(YEAR FROM start_date) = v_year
        AND status = 'approved'
        AND is_deleted = FALSE
    ),
    remaining_days = total_days - (
      SELECT COALESCE(SUM(days_requested), 0)
      FROM leaves
      WHERE employee_id = NEW.employee_id
        AND leave_type  = NEW.leave_type
        AND EXTRACT(YEAR FROM start_date) = v_year
        AND status = 'approved'
        AND is_deleted = FALSE
    ),
    updated_at = NOW()
  WHERE employee_id = NEW.employee_id
    AND leave_type  = NEW.leave_type
    AND year        = v_year;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_leave_balance_on_change
  AFTER INSERT OR UPDATE ON leaves
  FOR EACH ROW EXECUTE FUNCTION sync_leave_balance();

-- Soft-delete cascade: when employee_profile is soft-deleted
-- mark user as inactive
CREATE OR REPLACE FUNCTION on_employee_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
    UPDATE users SET is_active = FALSE WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER employee_soft_delete_cascade
  AFTER UPDATE ON employee_profiles
  FOR EACH ROW EXECUTE FUNCTION on_employee_soft_delete();

-- Audit log writer — call from app layer via RPC
CREATE OR REPLACE FUNCTION write_audit_log(
  p_action      TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_old_values  JSONB DEFAULT NULL,
  p_new_values  JSONB DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM users WHERE id = auth.uid();
  INSERT INTO audit_logs (user_id, company_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), v_company_id, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
