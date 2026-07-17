-- Mening-pilaren: ukens refleksjon (privat meningsdagbok). Én rad per uke
-- (id = ukas mandagsdato). Speiler mening_logs: egen-rad-RLS, LWW på oppdatert,
-- data jsonb + en denormalisert `uke`-kolonne for enkle spørringer.
create table if not exists public.mening_refleksjoner (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  uke text,
  data jsonb not null default '{}'::jsonb,
  oppdatert timestamptz not null default now()
);

alter table public.mening_refleksjoner enable row level security;

create policy "egen refleksjon les"   on public.mening_refleksjoner for select to authenticated using (auth.uid() = user_id);
create policy "egen refleksjon skriv"  on public.mening_refleksjoner for insert to authenticated with check (auth.uid() = user_id);
create policy "egen refleksjon endre"  on public.mening_refleksjoner for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "egen refleksjon slett"  on public.mening_refleksjoner for delete to authenticated using (auth.uid() = user_id);

create index if not exists mening_refleksjoner_user_uke on public.mening_refleksjoner (user_id, uke);
