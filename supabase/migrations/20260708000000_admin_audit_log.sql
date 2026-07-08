-- Admin audit log: tracks all platform-admin changes to orgs, plans, and users.
-- Every change on the admin side writes a row here with who/what/when/before/after.

create table if not exists admin_audit_log (
  id             uuid        primary key default gen_random_uuid(),
  action         text        not null,
  target_org_id  uuid        references organizations(id) on delete cascade,
  target_user_id uuid        references users(id) on delete set null,
  changed_by_id  uuid        references users(id) on delete set null,
  old_value      text,
  new_value      text,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

alter table admin_audit_log enable row level security;

create policy "platform_admins_can_read_audit_log" on admin_audit_log
  for select using (
    exists (select 1 from users where id = auth.uid() and is_platform_admin = true)
  );

create policy "platform_admins_can_insert_audit_log" on admin_audit_log
  for insert with check (
    exists (select 1 from users where id = auth.uid() and is_platform_admin = true)
  );

-- Index for the most common queries (by org, by date)
create index admin_audit_log_org_idx  on admin_audit_log (target_org_id, created_at desc);
create index admin_audit_log_date_idx on admin_audit_log (created_at desc);
