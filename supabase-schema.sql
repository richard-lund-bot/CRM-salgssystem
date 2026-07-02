-- Ringeliste: skjema for skysynkronisering
-- Kjør hele filen i Supabase-dashbordet: SQL Editor → New query → lim inn → Run.
-- Filen er idempotent — trygg å kjøre på nytt ved oppgraderinger.

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

-- Kolonner som speiler feltene inne i data-jsonb, slik at databasen kan
-- spørre og radlåse på eierskap/reservasjon (brukes av reserver_pool).
alter table public.kunder add column if not exists eier_id text;
alter table public.kunder add column if not exists reservert_av text;
alter table public.kunder add column if not exists reservert_til timestamptz;

create index if not exists kunder_pool_idx on public.kunder (team, eier_id, reservert_til) where slettet = false;

-- Sørger for at sist_endret alltid settes av databasen, så alle telefoner
-- kan sammenligne mot samme klokke — og speiler eier/reservasjon fra data.
create or replace function public.sett_sist_endret()
returns trigger language plpgsql as $$
begin
  new.sist_endret := now();
  if tg_table_name = 'kunder' then
    new.eier_id := nullif(new.data->>'eierId', '');
    new.reservert_av := nullif(new.data->>'reservertAv', '');
    begin
      new.reservert_til := (new.data->>'reservertTil')::timestamptz;
    exception when others then
      new.reservert_til := null;
    end;
  end if;
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

-- ============================================================
-- Atomisk «hent 10»: reserverer ledige pool-kunder i én
-- transaksjon med radlåsing, slik at to selgere som trykker
-- samtidig aldri får de samme kundene. Reservasjonen utløper
-- automatisk etter 30 minutter.
-- ============================================================
create or replace function public.reserver_pool(p_team text, p_selger text, p_antall int, p_idag text)
returns setof public.kunder
language plpgsql
as $$
declare
  -- Samme ISO-format som JavaScript sin toISOString(), så tidsstempler
  -- kan sammenlignes leksikografisk på tvers av klient og database.
  naa_iso text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  til_iso text := to_char((now() + interval '30 minutes') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  return query
  with valgte as (
    select k.id
    from public.kunder k
    where k.team = p_team
      and k.slettet = false
      and k.eier_id is null
      and (k.reservert_av is null or k.reservert_av = p_selger
           or k.reservert_til is null or k.reservert_til < now())
      and (
        ((k.data->>'nesteOppfolging') is not null and (k.data->>'nesteOppfolging') <= p_idag)
        or ((k.data->>'nesteOppfolging') is null
            and coalesce(k.data->>'status', 'ikke_kontaktet') in ('ikke_kontaktet', 'ingen_svar'))
      )
    order by
      case when (k.data->>'nesteOppfolging') is not null then 0
           when coalesce(k.data->>'status', 'ikke_kontaktet') = 'ikke_kontaktet' then 1
           else 2 end,
      (k.data->>'nesteOppfolging') asc nulls last,
      k.sist_endret asc
    limit greatest(p_antall, 0)
    for update skip locked
  )
  update public.kunder k
  set data = k.data
    || jsonb_build_object('reservertAv', p_selger, 'reservertTil', til_iso, 'oppdatert', naa_iso)
  from valgte v
  where k.id = v.id
  returning k.*;
end $$;

-- Setter inn nye firmaer (fra Brønnøysundregisteret) med sentral
-- duplikatkontroll på org.nr innen teamet, ferdig reservert til selgeren.
create or replace function public.importer_firmaer(p_team text, p_selger text, p_firmaer jsonb)
returns setof public.kunder
language plpgsql
as $$
declare
  til_iso text := to_char((now() + interval '30 minutes') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  return query
  insert into public.kunder (id, team, data, slettet)
  select f->>'id', p_team,
    f || jsonb_build_object('reservertAv', p_selger, 'reservertTil', til_iso),
    false
  from jsonb_array_elements(p_firmaer) as f
  where (f->>'id') is not null
    and (
      coalesce(f->>'orgnr', '') = ''
      or not exists (
        select 1 from public.kunder k2
        where k2.team = p_team and k2.slettet = false and k2.data->>'orgnr' = f->>'orgnr'
      )
    )
  on conflict (id) do nothing
  returning *;
end $$;

-- Lagring med konfliktvern: raden med nyeste oppdatert-tidsstempel vinner,
-- så en treg klient ikke kan overskrive ferskere endringer (f.eks. en
-- reservasjon satt av reserver_pool). Sletting vinner alltid.
create or replace function public.lagre_kunder(p_rader jsonb)
returns void
language plpgsql
as $$
begin
  insert into public.kunder (id, team, data, slettet)
  select r->>'id', r->>'team', r->'data', coalesce((r->>'slettet')::boolean, false)
  from jsonb_array_elements(p_rader) as r
  where (r->>'id') is not null
  on conflict (id) do update set
    data = case when excluded.slettet
                  or coalesce(excluded.data->>'oppdatert', '') >= coalesce(kunder.data->>'oppdatert', '')
                then excluded.data else kunder.data end,
    slettet = case when excluded.slettet
                  or coalesce(excluded.data->>'oppdatert', '') >= coalesce(kunder.data->>'oppdatert', '')
                then excluded.slettet else kunder.slettet end;
end $$;

create or replace function public.lagre_selgere(p_rader jsonb)
returns void
language plpgsql
as $$
begin
  insert into public.selgere (id, team, data, slettet)
  select r->>'id', r->>'team', r->'data', coalesce((r->>'slettet')::boolean, false)
  from jsonb_array_elements(p_rader) as r
  where (r->>'id') is not null
  on conflict (id) do update set
    data = case when excluded.slettet
                  or coalesce(excluded.data->>'oppdatert', excluded.data->>'opprettet', '') >= coalesce(selgere.data->>'oppdatert', selgere.data->>'opprettet', '')
                then excluded.data else selgere.data end,
    slettet = case when excluded.slettet
                  or coalesce(excluded.data->>'oppdatert', excluded.data->>'opprettet', '') >= coalesce(selgere.data->>'oppdatert', selgere.data->>'opprettet', '')
                then excluded.slettet else selgere.slettet end;
end $$;

-- Fyll speilkolonnene for rader som fantes før oppgraderingen.
update public.kunder set data = data where eier_id is distinct from nullif(data->>'eierId', '');
