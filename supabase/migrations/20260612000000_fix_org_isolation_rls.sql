-- ============================================================
-- Fix multi-tenant org isolation
--
-- Problem: RLS policies had `OR (org_id IS NULL)` which made
-- all legacy NEDM rows (created before org_id was added)
-- visible to every authenticated user.
--
-- Fix:
--   1. Backfill all NULL org_id rows with NEDM's org_id
--   2. Drop and recreate org_isolation policies WITHOUT the IS NULL hole
-- ============================================================

DO $$
DECLARE
  nedm_org_id uuid := '7da320de-241c-48a2-98ab-acd1fd215386';
  t text;
  tables text[] := ARRAY[
    'additional_equipment_requests', 'alerts', 'asset_movements', 'asset_review_items',
    'assets', 'av_hospital', 'brand_settings', 'categories', 'client_contacts',
    'client_files', 'client_notes', 'client_preferences', 'clients', 'code_settings',
    'container_labels', 'containers', 'crew_bookings', 'crew_members', 'crew_roles',
    'custom_fields', 'document_settings', 'email_field_controls', 'email_templates',
    'fulfillment_calibrations', 'import_templates', 'invoice_settings', 'invoices',
    'kits', 'labor_rates', 'logistics_bank', 'payments', 'post_event_costs',
    'print_templates', 'project_crew', 'quickbooks_connections', 'quotes',
    'roundtable_items', 'roundtable_partners', 'roundtable_subrents', 'show_fulfillments',
    'show_requirements', 'shows', 'stripe_accounts', 'travel_logistics', 'truck_packs',
    'user_dashboards', 'venues', 'workspace_email_settings', 'yearly_asset_reviews'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Backfill NULL org_id → NEDM (all legacy data belongs to NEDM)
    BEGIN
      EXECUTE format(
        'UPDATE public.%I SET org_id = %L WHERE org_id IS NULL',
        t, nedm_org_id
      );
    EXCEPTION WHEN others THEN
      -- Table may not have org_id column; skip silently
      NULL;
    END;

    -- Drop and recreate the policy WITHOUT the IS NULL hole
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS org_isolation ON public.%I', t);
      EXECUTE format(
        $p$
          CREATE POLICY org_isolation ON public.%I
          FOR ALL TO authenticated
          USING (
            is_platform_admin()
            OR org_id = my_org_id()
          )
          WITH CHECK (
            is_platform_admin()
            OR org_id = my_org_id()
          )
        $p$,
        t
      );
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;

-- user_dashboards: org_id may not exist on that table; its isolation is by user_id already
-- Restore per-user isolation on user_dashboards (overrides the loop above if org_isolation was applied)
DROP POLICY IF EXISTS org_isolation ON public.user_dashboards;
DROP POLICY IF EXISTS users_own_dashboard ON public.user_dashboards;
CREATE POLICY users_own_dashboard ON public.user_dashboards
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
