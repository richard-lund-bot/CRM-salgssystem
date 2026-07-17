-- Sosiallogg (tilhørighet-pilaren) — ett innslag per dag med avhukede sosiale
-- blue-zones-valg (møtte noen, ringte en du er glad i, delte et måltid, ble med
-- på noe). Speiler meal_logs/styrke_logs: klient-generert text-id, egen-rad-RLS,
-- LWW på oppdatert, og en denormalisert `antall`-kolonne. Klienten
-- (js/sosialt.js) er kilden til sannhet; synken (js/sync.js) tåler at tabellen
-- ikke finnes ennå via isolert try/catch.
create table if not exists public.sosial_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date,
  antall integer,
  data jsonb not null default '{}'::jsonb,
  oppdatert timestamptz not null default now()
);

alter table public.sosial_logs enable row level security;

create policy "egen sosiallogg les"   on public.sosial_logs for select to authenticated using (auth.uid() = user_id);
create policy "egen sosiallogg skriv"  on public.sosial_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "egen sosiallogg endre"  on public.sosial_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "egen sosiallogg slett"  on public.sosial_logs for delete to authenticated using (auth.uid() = user_id);

create index if not exists sosial_logs_user_dato on public.sosial_logs (user_id, dato);
