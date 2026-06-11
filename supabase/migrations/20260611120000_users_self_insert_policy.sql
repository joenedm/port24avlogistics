-- Allow authenticated users to insert their own row (needed for invite claim flow)
create policy "users_can_insert_own_row" on public.users
  for insert to authenticated
  with check (id = auth.uid());

-- Also allow users to update their own row
drop policy if exists "users_can_update_own_row" on public.users;
create policy "users_can_update_own_row" on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
