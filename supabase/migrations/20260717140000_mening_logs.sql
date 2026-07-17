-- Mening-pilaren: «Mitt hvorfor» (ikigai/nordstjerner). Ett innslag per
-- erklært hvorfor, klient-generert text-id. Speiler meal_logs/sosial_logs:
-- egen-rad-RLS, LWW på oppdatert, data jsonb. Klienten (js/mening.js) er kilden
-- til sannhet; synken (js/sync.js) tåler at tabellen ikke finnes ennå via
-- isolert try/catch.
create table if not exists public.mening_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  oppdatert timestamptz not null default now()
);

alter table public.mening_logs enable row level security;

create policy "egen mening les"   on public.mening_logs for select to authenticated using (auth.uid() = user_id);
create policy "egen mening skriv"  on public.mening_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "egen mening endre"  on public.mening_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "egen mening slett"  on public.mening_logs for delete to authenticated using (auth.uid() = user_id);

create index if not exists mening_logs_user on public.mening_logs (user_id);
