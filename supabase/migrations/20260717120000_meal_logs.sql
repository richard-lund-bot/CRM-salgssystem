-- Måltidslogg (kosthold-pilaren) — ett innslag per dag med avhukede blue-zones-
-- vaner + valgfritt notat. Speiler styrke_logs: klient-generert text-id,
-- egen-rad-RLS, LWW på oppdatert, og en denormalisert `antall`-kolonne (antall
-- gode vaner den dagen) for enkle spørringer. Klienten (js/kosthold.js) er
-- kilden til sannhet; synken (js/sync.js) tåler at tabellen ikke finnes ennå.
create table if not exists public.meal_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date,
  antall integer,
  data jsonb not null default '{}'::jsonb,
  oppdatert timestamptz not null default now()
);

alter table public.meal_logs enable row level security;

create policy "egen matlogg les"   on public.meal_logs for select to authenticated using (auth.uid() = user_id);
create policy "egen matlogg skriv"  on public.meal_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "egen matlogg endre"  on public.meal_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "egen matlogg slett"  on public.meal_logs for delete to authenticated using (auth.uid() = user_id);

create index if not exists meal_logs_user_dato on public.meal_logs (user_id, dato);
