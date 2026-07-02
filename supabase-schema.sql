-- Ringeliste: skjema for skysynkronisering
-- Kjør denne én gang i Supabase-dashbordet: SQL Editor → New query → lim inn → Run.

create table if not exists public.kunder (
  id text primary key,
  team text not null,
  data jsonb not null,
  slettet boolean not null default false,
  sist_endret timestamptz not null default now()
);

create table if not exists public.selgere (
  id text primary key,
  team text not null,
  data jsonb not null,
  slettet boolean not null default false,
  sist_endret timestamptz not null default now()
);

create index if not exists kunder_team_endret_idx on public.kunder (team, sist_endret);
create index if not exists selgere_team_endret_idx on public.selgere (team, sist_endret);

-- Sørger for at sist_endret alltid settes av databasen, så alle telefoner
-- kan sammenligne mot samme klokke.
create or replace function public.sett_sist_endret()
returns trigger language plpgsql as $$
begin
  new.sist_endret := now();
  return new;
end $$;

drop trigger if exists kunder_sist_endret on public.kunder;
create trigger kunder_sist_endret before insert or update on public.kunder
  for each row execute function public.sett_sist_endret();

drop trigger if exists selgere_sist_endret on public.selgere;
create trigger selgere_sist_endret before insert or update on public.selgere
  for each row execute function public.sett_sist_endret();

-- Appen har ingen innlogging; tilgang styres av teamkoden i appen.
-- RLS er på med åpne les/skriv-regler for anon-nøkkelen (ingen delete —
-- appen bruker kun soft-delete via slettet-kolonnen).
alter table public.kunder enable row level security;
alter table public.selgere enable row level security;

drop policy if exists kunder_les on public.kunder;
create policy kunder_les on public.kunder for select using (true);
drop policy if exists kunder_ny on public.kunder;
create policy kunder_ny on public.kunder for insert with check (true);
drop policy if exists kunder_endre on public.kunder;
create policy kunder_endre on public.kunder for update using (true);

drop policy if exists selgere_les on public.selgere;
create policy selgere_les on public.selgere for select using (true);
drop policy if exists selgere_ny on public.selgere;
create policy selgere_ny on public.selgere for insert with check (true);
drop policy if exists selgere_endre on public.selgere;
create policy selgere_endre on public.selgere for update using (true);
