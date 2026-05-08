-- Slipstream MVP — Cycle 2: initial schema
-- 5 tables: profiles, deal_rooms, parties, quotes, activities
-- All RLS is added in 0002_rls.sql

-- Enums
do $$ begin
  create type user_role as enum ('broker', 'mga', 'insurer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_room_status as enum ('draft', 'active', 'bound', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type party_role as enum ('mga', 'insurer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quote_status as enum ('submitted', 'won', 'lost');
exception when duplicate_object then null; end $$;

-- profiles: 1-to-1 with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  org_name text,
  role user_role not null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- deal_rooms: created by a broker
create table if not exists public.deal_rooms (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid not null references public.profiles(id) on delete restrict,
  insured_name text not null,
  class_of_business text not null,
  location text,
  coverage_type text not null,
  coverage_amount numeric(14,2),
  notes text,
  status deal_room_status not null default 'draft',
  winning_quote_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deal_rooms_broker_id_idx on public.deal_rooms(broker_id);
create index if not exists deal_rooms_status_idx on public.deal_rooms(status);

-- parties: who is invited to a deal room and in what role
create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references public.deal_rooms(id) on delete cascade,
  party_user_id uuid not null references public.profiles(id) on delete restrict,
  role party_role not null,
  invited_at timestamptz not null default now(),
  unique (deal_room_id, party_user_id)
);

create index if not exists parties_deal_room_id_idx on public.parties(deal_room_id);
create index if not exists parties_party_user_id_idx on public.parties(party_user_id);

-- quotes: submitted by a party against a deal room
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references public.deal_rooms(id) on delete cascade,
  party_id uuid not null references public.parties(id) on delete restrict,
  premium numeric(14,2) not null,
  deductible numeric(14,2),
  coverage_limit numeric(14,2) not null,
  terms text,
  status quote_status not null default 'submitted',
  submitted_at timestamptz not null default now()
);

create index if not exists quotes_deal_room_id_idx on public.quotes(deal_room_id);
create index if not exists quotes_party_id_idx on public.quotes(party_id);

-- deferred FK from deal_rooms.winning_quote_id → quotes (chicken/egg)
do $$ begin
  alter table public.deal_rooms
    add constraint deal_rooms_winning_quote_id_fkey
    foreign key (winning_quote_id) references public.quotes(id) on delete set null;
exception when duplicate_object then null; end $$;

-- activities: append-only event log per deal room
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references public.deal_rooms(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activities_deal_room_id_idx on public.activities(deal_room_id);
create index if not exists activities_created_at_idx on public.activities(created_at desc);

-- updated_at trigger for deal_rooms
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists deal_rooms_set_updated_at on public.deal_rooms;
create trigger deal_rooms_set_updated_at
  before update on public.deal_rooms
  for each row execute function public.set_updated_at();
