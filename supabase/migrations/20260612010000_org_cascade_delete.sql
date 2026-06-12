-- Convert all org_id foreign keys to ON DELETE CASCADE
-- so that deleting an organization automatically removes all its data.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tc.constraint_name, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.key_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'organizations'
      AND ccu.column_name = 'id'
  LOOP
    -- Drop the existing FK constraint
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      r.table_name, r.constraint_name
    );
    -- Re-add it with ON DELETE CASCADE
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.organizations(id) ON DELETE CASCADE',
      r.table_name, r.constraint_name, r.column_name
    );
  END LOOP;
END $$;
