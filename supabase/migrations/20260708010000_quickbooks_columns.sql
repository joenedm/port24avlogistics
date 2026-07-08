-- QuickBooks integration columns
-- Add auth + settings columns to quickbooks_connections, QB tracking to invoices.
-- All columns use IF NOT EXISTS so this is safe to re-run.

ALTER TABLE quickbooks_connections
  ADD COLUMN IF NOT EXISTS realm_id              TEXT,
  ADD COLUMN IF NOT EXISTS access_token          TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token         TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS company_name          TEXT,
  ADD COLUMN IF NOT EXISTS connected_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_status      TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_error       TEXT,
  ADD COLUMN IF NOT EXISTS income_account_equipment    TEXT,
  ADD COLUMN IF NOT EXISTS income_account_labor        TEXT,
  ADD COLUMN IF NOT EXISTS income_account_logistics    TEXT,
  ADD COLUMN IF NOT EXISTS income_account_consumables  TEXT,
  ADD COLUMN IF NOT EXISTS income_account_discounts    TEXT,
  ADD COLUMN IF NOT EXISTS deposit_account             TEXT,
  ADD COLUMN IF NOT EXISTS default_terms               TEXT,
  ADD COLUMN IF NOT EXISTS sales_tax_code              TEXT,
  ADD COLUMN IF NOT EXISTS default_service_item        TEXT,
  ADD COLUMN IF NOT EXISTS auto_sync_on_invoice_send   BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sync_customers              BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sync_invoices               BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sync_payments               BOOLEAN DEFAULT TRUE;

-- Unique constraint: one QB connection per org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quickbooks_connections_org_id_key'
  ) THEN
    ALTER TABLE quickbooks_connections ADD CONSTRAINT quickbooks_connections_org_id_key UNIQUE (org_id);
  END IF;
END $$;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS quickbooks_invoice_id      TEXT,
  ADD COLUMN IF NOT EXISTS quickbooks_invoice_number  TEXT,
  ADD COLUMN IF NOT EXISTS quickbooks_sync_status     TEXT DEFAULT 'not_synced',
  ADD COLUMN IF NOT EXISTS quickbooks_sync_error      TEXT,
  ADD COLUMN IF NOT EXISTS quickbooks_invoice_url     TEXT,
  ADD COLUMN IF NOT EXISTS last_quickbooks_sync_at    TIMESTAMPTZ;
