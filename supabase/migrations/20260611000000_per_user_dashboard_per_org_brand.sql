-- user_dashboards: add missing columns + enforce per-user RLS
alter table public.user_dashboards
  add column if not exists user_role text,
  add column if not exists saved_at timestamptz default now();

drop policy if exists "authenticated_full_access" on public.user_dashboards;

create policy "users_own_dashboard" on public.user_dashboards
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- brand_settings: ensure org_id column exists (already added in prev migration, safe to re-run)
alter table public.brand_settings
  add column if not exists org_id uuid;
