-- ============================================================================
-- SafeSpend — Supabase setup (collision-safe)
-- Paste this whole file into the Supabase SQL editor and run it. Safe to re-run.
--
-- NOTE: an earlier version created a `profiles` table. If your project already
-- has its OWN `profiles` table (from another app), `create table if not exists`
-- silently skipped it and a later policy failed with:
--     ERROR: 42703: column "id" does not exist
-- This version sidesteps that entirely. The snapshot-backup flow the app uses
-- doesn't need a profiles table at all — it stores the whole account as JSON in
-- one table. Everything below is namespaced `safespend_*` so it can't clash
-- with anything else already in your database.
--
-- Sign-up itself is handled by Supabase Auth (no SQL needed). Turn on the
-- methods you want under Authentication -> Providers in the dashboard.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- CLOUD BACKUP — one JSON snapshot per user.
-- payload is exactly what the app's db.exportAll() returns; restore feeds it
-- back through db.importAll(). RLS scopes each row to its owner.
--
-- App wiring (already in src/lib/cloud.js):
--   Back up:  supabase.from('safespend_backups')
--               .upsert({ user_id: user.id, payload: await exportAll() })
--   Restore:  const { data } = await supabase.from('safespend_backups')
--               .select('payload').single();
--             await importAll(data.payload)
-- ----------------------------------------------------------------------------

create table if not exists public.safespend_backups (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  payload        jsonb not null,
  schema_version integer not null default 1,
  updated_at     timestamptz not null default now()
);

alter table public.safespend_backups enable row level security;

drop policy if exists "safespend_backups_select_own" on public.safespend_backups;
create policy "safespend_backups_select_own"
  on public.safespend_backups for select
  using (auth.uid() = user_id);

drop policy if exists "safespend_backups_insert_own" on public.safespend_backups;
create policy "safespend_backups_insert_own"
  on public.safespend_backups for insert
  with check (auth.uid() = user_id);

drop policy if exists "safespend_backups_update_own" on public.safespend_backups;
create policy "safespend_backups_update_own"
  on public.safespend_backups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- keep updated_at fresh on every update
create or replace function public.safespend_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists safespend_backups_set_updated_at on public.safespend_backups;
create trigger safespend_backups_set_updated_at
  before update on public.safespend_backups
  for each row execute function public.safespend_set_updated_at();


-- ============================================================================
-- That's everything the app needs. You can stop here.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- OPTIONAL — per-record sync instead of snapshots.
-- Only use this if you later rewrite src/lib/db.js to read/write individual
-- rows. Still namespaced to avoid collisions. Leave commented out otherwise.
-- ----------------------------------------------------------------------------
--
-- create table if not exists public.safespend_cycles (
--   id          uuid primary key default gen_random_uuid(),
--   user_id     uuid not null references auth.users (id) on delete cascade,
--   start_date  date not null,
--   next_payday date not null,
--   income      numeric(12, 2) not null default 0,
--   created_at  timestamptz not null default now()
-- );
-- create index if not exists safespend_cycles_user_idx on public.safespend_cycles (user_id);
-- alter table public.safespend_cycles enable row level security;
-- drop policy if exists "safespend_cycles_all_own" on public.safespend_cycles;
-- create policy "safespend_cycles_all_own" on public.safespend_cycles for all
--   using (auth.uid() = user_id) with check (auth.uid() = user_id);
--
-- create table if not exists public.safespend_expenses (
--   id         uuid primary key default gen_random_uuid(),
--   cycle_id   uuid not null references public.safespend_cycles (id) on delete cascade,
--   user_id    uuid not null references auth.users (id) on delete cascade,
--   name       text not null,
--   amount     numeric(12, 2) not null default 0,
--   due_date   date,
--   type       text not null check (type in ('bill','saving','debt','spending','income')),
--   recurring  boolean not null default false,
--   notes      text default ''
-- );
-- create index if not exists safespend_expenses_cycle_idx on public.safespend_expenses (cycle_id);
-- alter table public.safespend_expenses enable row level security;
-- drop policy if exists "safespend_expenses_all_own" on public.safespend_expenses;
-- create policy "safespend_expenses_all_own" on public.safespend_expenses for all
--   using (auth.uid() = user_id) with check (auth.uid() = user_id);
