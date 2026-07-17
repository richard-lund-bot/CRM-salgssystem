-- Delte handlelister for husstander — den FØRSTE fler-bruker-ressursen i appen.
-- I motsetning til de andre tabellene (én rad per bruker, egen-rad-RLS) deles én
-- liste av flere medlemmer: en liste + en medlemskaps-tabell. Innholdet ligger i
-- `data` (jsonb: {personer, varer:{key:{navn,mengde,enhet,kategori,avkrysset,
-- oppdatert,slettet}}}) og flettes på item-nivå (LWW per vare) av klienten
-- (js/husstand.js). Man blir med via en kort kode gjennom en SECURITY DEFINER-
-- RPC, så koden kan slå opp lista uten at RLS må åpne hele tabellen.
--
-- Denne fila speiler migrasjonen som ble kjørt mot prosjektet
-- (rkvphgbfyfymilzwgmgp) via Supabase-verktøyene; den er idempotent.

create table if not exists public.delte_handlelister (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  navn text not null default 'Husstand',
  data jsonb not null default '{}'::jsonb,
  eier uuid references auth.users(id) on delete set null,
  opprettet timestamptz not null default now(),
  oppdatert timestamptz not null default now()
);

create table if not exists public.handleliste_medlemmer (
  liste_id uuid not null references public.delte_handlelister(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  navn text,
  opprettet timestamptz not null default now(),
  primary key (liste_id, user_id)
);
create index if not exists handleliste_medlemmer_user_idx on public.handleliste_medlemmer(user_id);

alter table public.delte_handlelister enable row level security;
alter table public.handleliste_medlemmer enable row level security;

-- Medlemssjekk som SECURITY DEFINER → unngår RLS-rekursjon på medlem-tabellen.
create or replace function public.er_handleliste_medlem(p_liste uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.handleliste_medlemmer m
    where m.liste_id = p_liste and m.user_id = auth.uid()
  );
$$;

-- RLS: bare medlemmer ser/endrer lista. Ingen direkte INSERT (gjøres via RPC).
drop policy if exists dh_select on public.delte_handlelister;
create policy dh_select on public.delte_handlelister for select
  using (public.er_handleliste_medlem(id));
drop policy if exists dh_update on public.delte_handlelister;
create policy dh_update on public.delte_handlelister for update
  using (public.er_handleliste_medlem(id)) with check (public.er_handleliste_medlem(id));
drop policy if exists dh_delete on public.delte_handlelister;
create policy dh_delete on public.delte_handlelister for delete
  using (eier = auth.uid());

drop policy if exists hm_select on public.handleliste_medlemmer;
create policy hm_select on public.handleliste_medlemmer for select
  using (public.er_handleliste_medlem(liste_id));
drop policy if exists hm_delete on public.handleliste_medlemmer;
create policy hm_delete on public.handleliste_medlemmer for delete
  using (user_id = auth.uid());

-- Opprett en ny delt liste + gjør deg til medlem. Returnerer lista.
create or replace function public.opprett_delt_handleliste(p_navn text, p_medlemsnavn text, p_data jsonb)
returns public.delte_handlelister
language plpgsql security definer set search_path = public as $$
declare v_kode text; v_row public.delte_handlelister;
begin
  if auth.uid() is null then raise exception 'Ikke innlogget'; end if;
  loop
    v_kode := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.delte_handlelister where kode = v_kode);
  end loop;
  insert into public.delte_handlelister (kode, navn, data, eier, oppdatert)
    values (v_kode, coalesce(nullif(btrim(p_navn), ''), 'Husstand'),
            coalesce(p_data, '{}'::jsonb), auth.uid(), now())
    returning * into v_row;
  insert into public.handleliste_medlemmer (liste_id, user_id, navn)
    values (v_row.id, auth.uid(), coalesce(nullif(btrim(p_medlemsnavn), ''), 'Meg'));
  return v_row;
end; $$;

-- Bli med i en liste via kode. Idempotent (oppdaterer navnet ditt).
create or replace function public.bli_med_i_handleliste(p_kode text, p_medlemsnavn text)
returns public.delte_handlelister
language plpgsql security definer set search_path = public as $$
declare v_row public.delte_handlelister;
begin
  if auth.uid() is null then raise exception 'Ikke innlogget'; end if;
  select * into v_row from public.delte_handlelister where kode = upper(btrim(p_kode));
  if v_row.id is null then raise exception 'Fant ingen liste med koden %', p_kode using errcode = 'no_data_found'; end if;
  insert into public.handleliste_medlemmer (liste_id, user_id, navn)
    values (v_row.id, auth.uid(), coalesce(nullif(btrim(p_medlemsnavn), ''), 'Meg'))
    on conflict (liste_id, user_id) do update set navn = excluded.navn;
  return v_row;
end; $$;

-- Medlemmene i en liste (kun hvis du selv er medlem).
create or replace function public.hent_handleliste_medlemmer(p_liste uuid)
returns table(user_id uuid, navn text, opprettet timestamptz)
language sql security definer stable set search_path = public as $$
  select m.user_id, m.navn, m.opprettet
  from public.handleliste_medlemmer m
  where m.liste_id = p_liste and public.er_handleliste_medlem(p_liste)
  order by m.opprettet;
$$;

grant select, update, delete on public.delte_handlelister to authenticated;
grant select, delete on public.handleliste_medlemmer to authenticated;

-- Lås RPC-ene til innloggede brukere (fjern standard PUBLIC/anon EXECUTE).
revoke execute on function public.opprett_delt_handleliste(text, text, jsonb) from public, anon;
revoke execute on function public.bli_med_i_handleliste(text, text) from public, anon;
revoke execute on function public.hent_handleliste_medlemmer(uuid) from public, anon;
revoke execute on function public.er_handleliste_medlem(uuid) from public, anon;
grant execute on function public.opprett_delt_handleliste(text, text, jsonb) to authenticated;
grant execute on function public.bli_med_i_handleliste(text, text) to authenticated;
grant execute on function public.hent_handleliste_medlemmer(uuid) to authenticated;
grant execute on function public.er_handleliste_medlem(uuid) to authenticated;
