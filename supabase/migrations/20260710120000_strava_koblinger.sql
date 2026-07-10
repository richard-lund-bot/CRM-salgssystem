-- M14 — Strava-broen: kobling per bruker + konfigtabell for Edge Functionen.
-- Tokens leses KUN av Edge Functionen (service role); klienten får bare
-- metadata-kolonner via kolonne-grant.

create table public.strava_koblinger (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlete_id bigint unique not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  athlete_navn text,
  opprettet timestamptz not null default now(),
  oppdatert timestamptz not null default now()
);

alter table public.strava_koblinger enable row level security;

create policy "egen kobling les" on public.strava_koblinger
  for select to authenticated using (auth.uid() = user_id);
create policy "egen kobling slett" on public.strava_koblinger
  for delete to authenticated using (auth.uid() = user_id);

-- Kolonne-herding: klienten skal aldri kunne lese tokens.
revoke select on public.strava_koblinger from authenticated, anon;
grant select (user_id, athlete_id, athlete_navn, opprettet, oppdatert)
  on public.strava_koblinger to authenticated;

-- Konfig/hemmeligheter for Edge Functionen. RLS på uten policies = kun
-- service role. Fallback for env-secrets (STRAVA_CLIENT_ID/SECRET,
-- STRAVA_VERIFY_TOKEN, STATE_SECRET, APP_URL) så oppsettet kan fullføres
-- med SQL alene.
create table public.strava_config (
  nokkel text primary key,
  verdi text not null,
  oppdatert timestamptz not null default now()
);
alter table public.strava_config enable row level security;
revoke all on public.strava_config from authenticated, anon;
