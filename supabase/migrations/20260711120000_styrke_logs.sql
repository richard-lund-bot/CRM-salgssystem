-- M17 — Styrkelogg: én rad per fullført styrkeøkt, synk per bruker
-- (last-write-wins per id, samme mønster som session_logs).
create table if not exists public.styrke_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date,
  okt_navn text,
  volum integer,
  data jsonb not null default '{}'::jsonb,
  oppdatert timestamptz not null default now()
);

alter table public.styrke_logs enable row level security;

create policy "egen styrkelogg les" on public.styrke_logs
  for select to authenticated using (auth.uid() = user_id);
create policy "egen styrkelogg skriv" on public.styrke_logs
  for insert to authenticated with check (auth.uid() = user_id);
create policy "egen styrkelogg endre" on public.styrke_logs
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "egen styrkelogg slett" on public.styrke_logs
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists styrke_logs_user_dato on public.styrke_logs (user_id, dato);
