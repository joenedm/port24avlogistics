-- company_memberships: many-to-many users <-> organizations
-- Allows a user to belong to multiple companies and switch between them.
-- users.org_id remains the *active* workspace for RLS purposes.

CREATE TABLE IF NOT EXISTS public.company_memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member',
  status     text NOT NULL DEFAULT 'active', -- active | suspended
  joined_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, org_id)
);

ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships; platform admins see all
CREATE POLICY "memberships_select" ON public.company_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_platform_admin());

-- Only platform admins / service role can write (edge functions use service role)
CREATE POLICY "memberships_admin_write" ON public.company_memberships
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Backfill: migrate every existing users.org_id into company_memberships
INSERT INTO public.company_memberships (user_id, org_id, role, status)
SELECT
  u.id,
  u.org_id,
  COALESCE(u.role, 'member'),
  'active'
FROM public.users u
WHERE u.org_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;
