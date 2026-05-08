-- Slipstream MVP — Cycle 2: Row-Level Security
-- Enforces the critical invariants from CLAUDE.md:
--   1. Quote confidentiality (competing parties never see each other's quotes)
--   2. Broker is the gate
--   3. Activity log is append-only
--   4. RLS on every table — default deny, explicit allow

-- Enable RLS
alter table public.profiles    enable row level security;
alter table public.deal_rooms  enable row level security;
alter table public.parties     enable row level security;
alter table public.quotes      enable row level security;
alter table public.activities  enable row level security;

-- Drop any pre-existing policies (idempotent re-run)
drop policy if exists profiles_select_self_or_shared on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;

drop policy if exists deal_rooms_select_visible on public.deal_rooms;
drop policy if exists deal_rooms_insert_broker on public.deal_rooms;
drop policy if exists deal_rooms_update_broker on public.deal_rooms;
drop policy if exists deal_rooms_delete_broker on public.deal_rooms;

drop policy if exists parties_select_visible on public.parties;
drop policy if exists parties_insert_broker on public.parties;
drop policy if exists parties_delete_broker on public.parties;

drop policy if exists quotes_select_broker_or_submitter on public.quotes;
drop policy if exists quotes_insert_party on public.quotes;
drop policy if exists quotes_update_broker_or_submitter on public.quotes;

drop policy if exists activities_select_visible on public.activities;
drop policy if exists activities_insert_authenticated on public.activities;

------------------------------------------------------------------------------
-- profiles
-- A user can SELECT their own row + rows of users they share a deal_room with.
------------------------------------------------------------------------------
create policy profiles_select_self_or_shared on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or exists (
      -- shared as broker → party
      select 1 from public.parties p
      join public.deal_rooms dr on dr.id = p.deal_room_id
      where (dr.broker_id = auth.uid() and p.party_user_id = profiles.id)
         or (p.party_user_id = auth.uid() and dr.broker_id = profiles.id)
    )
  );

-- Profile INSERT/UPDATE handled by trigger + admin; restrict explicitly.
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

------------------------------------------------------------------------------
-- deal_rooms
-- Broker sees own (broker_id = auth.uid()).
-- MGA / insurer see only deal rooms where they are in `parties`.
-- Only brokers can insert / update / delete (their own rooms).
------------------------------------------------------------------------------
create policy deal_rooms_select_visible on public.deal_rooms
  for select to authenticated using (
    broker_id = auth.uid()
    or exists (
      select 1 from public.parties p
      where p.deal_room_id = deal_rooms.id and p.party_user_id = auth.uid()
    )
  );

create policy deal_rooms_insert_broker on public.deal_rooms
  for insert to authenticated with check (
    broker_id = auth.uid()
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'broker'
    )
  );

create policy deal_rooms_update_broker on public.deal_rooms
  for update to authenticated
  using (broker_id = auth.uid())
  with check (broker_id = auth.uid());

create policy deal_rooms_delete_broker on public.deal_rooms
  for delete to authenticated using (broker_id = auth.uid());

------------------------------------------------------------------------------
-- parties
-- Visible to broker who owns the deal_room + the party themselves.
-- Only the broker (room owner) can insert / delete.
------------------------------------------------------------------------------
create policy parties_select_visible on public.parties
  for select to authenticated using (
    party_user_id = auth.uid()
    or exists (
      select 1 from public.deal_rooms dr
      where dr.id = parties.deal_room_id and dr.broker_id = auth.uid()
    )
  );

create policy parties_insert_broker on public.parties
  for insert to authenticated with check (
    exists (
      select 1 from public.deal_rooms dr
      where dr.id = parties.deal_room_id and dr.broker_id = auth.uid()
    )
  );

create policy parties_delete_broker on public.parties
  for delete to authenticated using (
    exists (
      select 1 from public.deal_rooms dr
      where dr.id = parties.deal_room_id and dr.broker_id = auth.uid()
    )
  );

------------------------------------------------------------------------------
-- quotes
-- INVARIANT #1: visible only to broker who owns the deal_room + the submitting party.
-- Competing parties NEVER see each other's quotes.
------------------------------------------------------------------------------
create policy quotes_select_broker_or_submitter on public.quotes
  for select to authenticated using (
    exists (
      select 1 from public.deal_rooms dr
      where dr.id = quotes.deal_room_id and dr.broker_id = auth.uid()
    )
    or exists (
      select 1 from public.parties p
      where p.id = quotes.party_id and p.party_user_id = auth.uid()
    )
  );

-- Only the party themselves can insert a quote, only against a deal room they're in.
create policy quotes_insert_party on public.quotes
  for insert to authenticated with check (
    exists (
      select 1 from public.parties p
      where p.id = quotes.party_id
        and p.deal_room_id = quotes.deal_room_id
        and p.party_user_id = auth.uid()
    )
  );

-- Broker can update status (won/lost on bind); submitter can update their own quote.
create policy quotes_update_broker_or_submitter on public.quotes
  for update to authenticated
  using (
    exists (
      select 1 from public.deal_rooms dr
      where dr.id = quotes.deal_room_id and dr.broker_id = auth.uid()
    )
    or exists (
      select 1 from public.parties p
      where p.id = quotes.party_id and p.party_user_id = auth.uid()
    )
  );

------------------------------------------------------------------------------
-- activities
-- INVARIANT #3: append-only. Same visibility as deal_rooms. INSERT only.
-- No UPDATE / DELETE policies → blocked by default-deny.
------------------------------------------------------------------------------
create policy activities_select_visible on public.activities
  for select to authenticated using (
    exists (
      select 1 from public.deal_rooms dr
      where dr.id = activities.deal_room_id
        and (
          dr.broker_id = auth.uid()
          or exists (
            select 1 from public.parties p
            where p.deal_room_id = dr.id and p.party_user_id = auth.uid()
          )
        )
    )
  );

create policy activities_insert_authenticated on public.activities
  for insert to authenticated with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.deal_rooms dr
      where dr.id = activities.deal_room_id
        and (
          dr.broker_id = auth.uid()
          or exists (
            select 1 from public.parties p
            where p.deal_room_id = dr.id and p.party_user_id = auth.uid()
          )
        )
    )
  );
