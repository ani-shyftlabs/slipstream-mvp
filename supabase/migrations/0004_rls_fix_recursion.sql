-- Slipstream MVP — Cycle 2: RLS recursion fix
-- Postgres cannot plan policies that cross-reference RLS-protected tables
-- (deal_rooms.SELECT inspects parties → parties.SELECT inspects deal_rooms → ∞).
-- Fix: route cross-table membership checks through SECURITY DEFINER helpers
-- that internally bypass RLS, then use them in policy USING clauses.

-- ---------- helpers ----------
create or replace function public.is_deal_room_broker(room_id uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.deal_rooms dr
    where dr.id = room_id and dr.broker_id = uid
  );
$$;

create or replace function public.is_deal_room_party(room_id uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.parties p
    where p.deal_room_id = room_id and p.party_user_id = uid
  );
$$;

create or replace function public.user_has_role(uid uuid, want user_role)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role = want);
$$;

create or replace function public.users_share_deal_room(uid_a uuid, uid_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  -- a is broker of a room where b is a party
  select exists (
    select 1
    from public.deal_rooms dr
    join public.parties p on p.deal_room_id = dr.id
    where (dr.broker_id = uid_a and p.party_user_id = uid_b)
       or (dr.broker_id = uid_b and p.party_user_id = uid_a)
  );
$$;

grant execute on function public.is_deal_room_broker(uuid, uuid) to authenticated;
grant execute on function public.is_deal_room_party(uuid, uuid)  to authenticated;
grant execute on function public.user_has_role(uuid, user_role)  to authenticated;
grant execute on function public.users_share_deal_room(uuid, uuid) to authenticated;

-- ---------- profiles ----------
drop policy if exists profiles_select_self_or_shared on public.profiles;
create policy profiles_select_self_or_shared on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or public.users_share_deal_room(auth.uid(), profiles.id)
  );

-- ---------- deal_rooms ----------
drop policy if exists deal_rooms_select_visible on public.deal_rooms;
create policy deal_rooms_select_visible on public.deal_rooms
  for select to authenticated using (
    broker_id = auth.uid()
    or public.is_deal_room_party(deal_rooms.id, auth.uid())
  );

drop policy if exists deal_rooms_insert_broker on public.deal_rooms;
create policy deal_rooms_insert_broker on public.deal_rooms
  for insert to authenticated with check (
    broker_id = auth.uid()
    and public.user_has_role(auth.uid(), 'broker')
  );

-- ---------- parties ----------
drop policy if exists parties_select_visible on public.parties;
create policy parties_select_visible on public.parties
  for select to authenticated using (
    party_user_id = auth.uid()
    or public.is_deal_room_broker(parties.deal_room_id, auth.uid())
  );

drop policy if exists parties_insert_broker on public.parties;
create policy parties_insert_broker on public.parties
  for insert to authenticated with check (
    public.is_deal_room_broker(parties.deal_room_id, auth.uid())
  );

drop policy if exists parties_delete_broker on public.parties;
create policy parties_delete_broker on public.parties
  for delete to authenticated using (
    public.is_deal_room_broker(parties.deal_room_id, auth.uid())
  );

-- ---------- quotes ----------
drop policy if exists quotes_select_broker_or_submitter on public.quotes;
create policy quotes_select_broker_or_submitter on public.quotes
  for select to authenticated using (
    public.is_deal_room_broker(quotes.deal_room_id, auth.uid())
    or exists (
      select 1 from public.parties p
      where p.id = quotes.party_id and p.party_user_id = auth.uid()
    )
  );

drop policy if exists quotes_insert_party on public.quotes;
create policy quotes_insert_party on public.quotes
  for insert to authenticated with check (
    exists (
      select 1 from public.parties p
      where p.id = quotes.party_id
        and p.deal_room_id = quotes.deal_room_id
        and p.party_user_id = auth.uid()
    )
  );

drop policy if exists quotes_update_broker_or_submitter on public.quotes;
create policy quotes_update_broker_or_submitter on public.quotes
  for update to authenticated
  using (
    public.is_deal_room_broker(quotes.deal_room_id, auth.uid())
    or exists (
      select 1 from public.parties p
      where p.id = quotes.party_id and p.party_user_id = auth.uid()
    )
  );

-- ---------- activities ----------
drop policy if exists activities_select_visible on public.activities;
create policy activities_select_visible on public.activities
  for select to authenticated using (
    public.is_deal_room_broker(activities.deal_room_id, auth.uid())
    or public.is_deal_room_party(activities.deal_room_id, auth.uid())
  );

drop policy if exists activities_insert_authenticated on public.activities;
create policy activities_insert_authenticated on public.activities
  for insert to authenticated with check (
    actor_id = auth.uid()
    and (
      public.is_deal_room_broker(activities.deal_room_id, auth.uid())
      or public.is_deal_room_party(activities.deal_room_id, auth.uid())
    )
  );
