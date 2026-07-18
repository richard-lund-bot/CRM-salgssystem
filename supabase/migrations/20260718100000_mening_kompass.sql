-- Mitt kompass (whyProfile): én rad per bruker med hele det godkjente
-- kompasset som jsonb. Fordi tabellen lagrer det som betyr mest for mennesker,
-- er standarden strengere enn for vanlige preferanser: egen-rad-RLS, og
-- klienten lagrer kun kategorier + brukerens godkjente tekst (dataminimering —
-- «barna mine» trenger aldri navn, alder eller kjønn). LWW på oppdatert.
-- Klienten (js/mening.js) er kilden til sannhet; synken (js/sync.js) tåler at
-- tabellen ikke finnes ennå via isolert try/catch.
create table if not exists public.mening_kompass (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  oppdatert timestamptz not null default now()
);

alter table public.mening_kompass enable row level security;

create policy "eget kompass les"   on public.mening_kompass for select to authenticated using (auth.uid() = user_id);
create policy "eget kompass skriv" on public.mening_kompass for insert to authenticated with check (auth.uid() = user_id);
create policy "eget kompass endre" on public.mening_kompass for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eget kompass slett" on public.mening_kompass for delete to authenticated using (auth.uid() = user_id);
