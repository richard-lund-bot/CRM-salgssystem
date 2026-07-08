-- Treningsapp v2 — Supabase-skjema for brukertilstand (M2)
-- Kun brukertilstand lagres i Supabase; biblioteksdata er statisk JSON i repoet.
-- Datamodell følger taksonomi §10. RLS er owner-only (auth.uid()) på alt.
-- Sync-strategi: last-write-wins per rad via kolonnen `oppdatert` (se README).
-- Idempotent — trygg å kjøre på nytt.

-- ============================================================
-- Felles: sett `oppdatert` = now() ved insert/update (sync-klokke)
-- ============================================================
create or replace function public.sett_oppdatert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.oppdatert := now();
  return new;
end;
$$;

-- ============================================================
-- profiles — én rad per bruker (user_id = PK)
-- ============================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lokasjoner jsonb not null default '[]'::jsonb,
  aktiv_lokasjon text,
  motivasjon jsonb not null default '{}'::jsonb,   -- { vekter, formatVekter, oppdatert }
  ukemaal int not null default 4,
  ukemiks text,                                    -- mal-ID (ukemiks-profil)
  nivaer jsonb not null default '{}'::jsonb,        -- per modalitet: { base, xp, momentum, sisteOkt, verifisert[], rusten[] }
  pause_til timestamptz,
  innstillinger jsonb not null default '{}'::jsonb,
  opprettet timestamptz not null default now(),
  oppdatert timestamptz not null default now()
);

-- ============================================================
-- session_logs — logg per gjennomført økt
-- ============================================================
create table if not exists public.session_logs (
  id text primary key,                              -- klientgenerert (offline-first)
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date not null,
  modalitet text not null,
  varighet_min int,
  intensitet int,                                   -- 1-5 (§4b)
  xp int,
  lokasjon text,
  blokk_resultat jsonb not null default '[]'::jsonb,
  prs jsonb not null default '[]'::jsonb,
  notat text,
  oppdatert timestamptz not null default now()
);

create index if not exists session_logs_user_dato_idx on public.session_logs (user_id, dato desc);

-- ============================================================
-- generated_sessions — genererte økter (seed-basert)
-- ============================================================
create table if not exists public.generated_sessions (
  id text primary key,                              -- klientgenerert
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  seed text not null,                               -- deterministisk generator-seed
  template_id text,
  lokasjon text,
  dato date,
  blokker jsonb not null default '[]'::jsonb,
  status text not null default 'utkast',            -- utkast | laast | fullfort | forkastet
  oppdatert timestamptz not null default now()
);

create index if not exists generated_sessions_user_status_idx on public.generated_sessions (user_id, status);

-- ============================================================
-- oppdatert-triggere
-- ============================================================
drop trigger if exists profiles_oppdatert on public.profiles;
create trigger profiles_oppdatert before insert or update on public.profiles
  for each row execute function public.sett_oppdatert();

drop trigger if exists session_logs_oppdatert on public.session_logs;
create trigger session_logs_oppdatert before insert or update on public.session_logs
  for each row execute function public.sett_oppdatert();

drop trigger if exists generated_sessions_oppdatert on public.generated_sessions;
create trigger generated_sessions_oppdatert before insert or update on public.generated_sessions
  for each row execute function public.sett_oppdatert();

-- ============================================================
-- RLS — owner-only på alt (auth.uid())
-- ============================================================
alter table public.profiles enable row level security;
alter table public.session_logs enable row level security;
alter table public.generated_sessions enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using ((select auth.uid()) = user_id);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check ((select auth.uid()) = user_id);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete
  using ((select auth.uid()) = user_id);

-- session_logs
drop policy if exists session_logs_select on public.session_logs;
create policy session_logs_select on public.session_logs for select
  using ((select auth.uid()) = user_id);
drop policy if exists session_logs_insert on public.session_logs;
create policy session_logs_insert on public.session_logs for insert
  with check ((select auth.uid()) = user_id);
drop policy if exists session_logs_update on public.session_logs;
create policy session_logs_update on public.session_logs for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists session_logs_delete on public.session_logs;
create policy session_logs_delete on public.session_logs for delete
  using ((select auth.uid()) = user_id);

-- generated_sessions
drop policy if exists generated_sessions_select on public.generated_sessions;
create policy generated_sessions_select on public.generated_sessions for select
  using ((select auth.uid()) = user_id);
drop policy if exists generated_sessions_insert on public.generated_sessions;
create policy generated_sessions_insert on public.generated_sessions for insert
  with check ((select auth.uid()) = user_id);
drop policy if exists generated_sessions_update on public.generated_sessions;
create policy generated_sessions_update on public.generated_sessions for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists generated_sessions_delete on public.generated_sessions;
create policy generated_sessions_delete on public.generated_sessions for delete
  using ((select auth.uid()) = user_id);

-- ============================================================
-- Auto-opprett tom profil ved ny bruker (magic link signup)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
