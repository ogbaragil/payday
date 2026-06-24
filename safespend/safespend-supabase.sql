-- ============================================================================
-- SafeSpend — Supabase setup
-- Paste this whole file into the Supabase SQL editor and run it.
-- Safe to re-run: every statement is idempotent.
--
-- Sign-up itself is handled by Supabase Auth (email/OTP/OAuth) — no SQL needed
-- for that. This file provisions the data a signed-in user owns, plus the Row
-- Level Security that keeps each user's rows private to them.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Shared helper: keep updated_at fresh on any row update.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- PART 1 — SIGN UP
-- A profile row per user, created automatically the moment they sign up.
-- Mirrors the app's UserProfile { currency, payFrequency, nextPayday, typicalIncome }.
-- ============================================================================

create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  currency       text not null default 'AUD',
  pay_frequency  text not null default 'fortnightly'
                   check (pay_frequency in ('weekly', 'fortnightly', 'monthly')),
  next_payday    date,
  typical_income numeric(12, 2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile whenever a new auth user is created.
-- security definer lets the trigger insert past RLS during sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- PART 2 — CLOUD BACKUP
-- One row per user holding a full JSON snapshot — exactly the object the app's
-- exportAll() already returns. This is the lowest-friction way to make the
-- existing Export/Import feature sync to the cloud.
--
-- App wiring:
--   Back up:  supabase.from('backups')
--               .upsert({ user_id: user.id, payload: await exportAll() })
--   Restore:  const { data } = await supabase.from('backups')
--               .select('payload').single();
--             await importAll(data.payload)
-- ============================================================================

create table if not exists public.backups (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  payload        jsonb not null,
  schema_version integer not null default 1,
  updated_at     timestamptz not null default now()
);

alter table public.backups enable row level security;

drop policy if exists "backups_select_own" on public.backups;
create policy "backups_select_own"
  on public.backups for select
  using (auth.uid() = user_id);

drop policy if exists "backups_insert_own" on public.backups;
create policy "backups_insert_own"
  on public.backups for insert
  with check (auth.uid() = user_id);

drop policy if exists "backups_update_own" on public.backups;
create policy "backups_update_own"
  on public.backups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists backups_set_updated_at on public.backups;
create trigger backups_set_updated_at
  before update on public.backups
  for each row execute function public.set_updated_at();


-- ============================================================================
-- PART 3 — (OPTIONAL) NORMALIZED SYNC
-- Use this INSTEAD of Part 2 if you want true per-record sync across devices
-- rather than whole-account snapshots. Maps PayCycle and Expense to real rows.
-- Skip this section if you're happy with JSON backups above.
-- ============================================================================

create table if not exists public.pay_cycles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  start_date  date not null,
  next_payday date not null,
  income      numeric(12, 2) not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists pay_cycles_user_id_idx on public.pay_cycles (user_id);

alter table public.pay_cycles enable row level security;

drop policy if exists "pay_cycles_all_own" on public.pay_cycles;
create policy "pay_cycles_all_own"
  on public.pay_cycles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  cycle_id   uuid not null references public.pay_cycles (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  amount     numeric(12, 2) not null default 0,
  due_date   date,
  type       text not null
               check (type in ('bill', 'saving', 'debt', 'spending', 'income')),
  recurring  boolean not null default false,
  notes      text default '',
  created_at timestamptz not null default now()
);

create index if not exists expenses_cycle_id_idx on public.expenses (cycle_id);
create index if not exists expenses_user_id_idx on public.expenses (user_id);

alter table public.expenses enable row level security;

drop policy if exists "expenses_all_own" on public.expenses;
create policy "expenses_all_own"
  on public.expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- Done. Auth → Providers in the dashboard controls which sign-up methods are on.
-- ============================================================================
