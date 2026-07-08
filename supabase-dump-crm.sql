-- ============================================================
-- ARKIV: Full dump av Ringeliste-CRM sitt Supabase-prosjekt
-- Prosjekt: rkvphgbfyfymilzwgmgp ("richard-lund-bot's Project")
-- Dumpet: 2026-07-08 via Supabase REST API (anon-nøkkel, RLS select=true)
-- Innhold: komplett skjema (fra supabase-schema.sql) + alle rader.
-- Gjenoppretting: kjør hele filen i SQL Editor i et tomt prosjekt.
-- ============================================================

-- ------------------------------------------------------------
-- DEL 1: SKJEMA (tabeller, indekser, triggere, RLS, funksjoner)
-- ------------------------------------------------------------

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

-- Team må opprettes av admin (via opprett_team nederst i filen) før noen
-- kan koble til — appen har kun leserettigheter på denne tabellen.
create table if not exists public.team (
  kode text primary key,
  navn text not null default '',
  maal_samtaler int not null default 20,
  maal_kroner int not null default 10000,
  sist_endret timestamptz not null default now()
);

-- Kriterier for hvilke firmaer «Hent 10» plukker fra Brønnøysundregisteret.
-- Styres per team herfra — endringer når telefonene innen ~25 sekunder:
--   update public.team set brreg_kriterier = brreg_kriterier
--     || '{"minAnsatte": 0}' where kode = 'teamkoden';
-- Feltene: mvaRegistrert (bool), minAnsatte/maksAnsatte (tall eller null),
-- minAlderAar (tall), orgformer (liste, tom = alle), kunMedTelefon (bool).
alter table public.team add column if not exists brreg_kriterier jsonb not null default
  '{"mvaRegistrert": true, "minAnsatte": 1, "maksAnsatte": 20, "minAlderAar": 1, "orgformer": ["AS", "ENK"], "kunMedTelefon": true}'::jsonb;

-- Backend-styrt innhold: salgstips, skattetips og organisasjonsinfo.
-- Appen leser kun — endringer gjøres her i Supabase (SQL/Table Editor).
-- type: 'organisasjon' | 'salgstips' | 'skattetips'
create table if not exists public.innhold (
  id text primary key,
  team text not null,
  type text not null,
  data jsonb not null,
  slettet boolean not null default false,
  sist_endret timestamptz not null default now()
);

create index if not exists kunder_team_endret_idx on public.kunder (team, sist_endret);
create index if not exists selgere_team_endret_idx on public.selgere (team, sist_endret);
create index if not exists innhold_team_endret_idx on public.innhold (team, sist_endret);

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

drop trigger if exists team_sist_endret on public.team;
create trigger team_sist_endret before insert or update on public.team
  for each row execute function public.sett_sist_endret();

drop trigger if exists innhold_sist_endret on public.innhold;
create trigger innhold_sist_endret before insert or update on public.innhold
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

-- team og innhold: appen kan KUN lese — all administrasjon skjer i Supabase.
alter table public.team enable row level security;
alter table public.innhold enable row level security;

drop policy if exists team_les on public.team;
create policy team_les on public.team for select using (true);
drop policy if exists innhold_les on public.innhold;
create policy innhold_les on public.innhold for select using (true);

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

-- ============================================================
-- Mal-innhold (team '__mal__'): kopieres til nye team av
-- opprett_team. Re-kjøring av filen oppdaterer malen.
-- ============================================================
insert into public.innhold (id, team, type, data) values
('mal:salgstips:01','__mal__','salgstips', jsonb_build_object('innvending','Åpn med et ja-spørsmål','tips','Start med: "Er du den som tar avgjørelser om markedsføring hos [firma]?" Det setter deg rett inn i riktig samtale og sparer tid på feil person.')),
('mal:salgstips:02','__mal__','salgstips', jsonb_build_object('innvending','Bruk firmanavnet aktivt','tips','Si firmanavnet tidlig og knytt det til formålet: "Vi ønsker at [firma] skal stå som en synlig støttespiller for [org] i dette området." Det gjør det konkret og personlig.')),
('mal:salgstips:03','__mal__','salgstips', jsonb_build_object('innvending','Gi en konkret størrelse tidlig','tips','Nevn beløpet og sammenlign det med noe kjent: "Vi snakker om en støtteannonse for [beløp] kr — omtrent det samme som én reklameannonse i lokalsavisa." Det gjør det lett å forholde seg til.')),
('mal:salgstips:04','__mal__','salgstips', jsonb_build_object('innvending','Knytt det til nærmiljøet','tips','"Vi setter sammen en kampanje for [org] i dette distriktet, og leter etter lokale bedrifter som ønsker å bli synlige støttespillere." Lokal tilhørighet treffer mange bedriftseiere.')),
('mal:salgstips:05','__mal__','salgstips', jsonb_build_object('innvending','Trekk frem skattefradraget tidlig','tips','Fortell raskt at dette er fradragsberettiget som markedsføring — ikke gave. Det fjerner en vanlig skepsis og gjør at de ser det som en forretningsbeslutning, ikke veldedighet.')),
('mal:salgstips:06','__mal__','salgstips', jsonb_build_object('innvending','Ha organisasjonen på 20 sekunder klar','tips','Forbered én konkret setning: hva [org] gjør og hvem de hjelper. Tall funker bra: "Røde Kors rykker ut ved over 2 000 redningsaksjoner i Norge hvert år." Det skaper relevans raskt.')),
('mal:salgstips:07','__mal__','salgstips', jsonb_build_object('innvending','Spør om de støtter noe fra før','tips','"Støtter dere allerede noen frivillige organisasjoner?" Svaret gir deg en inngang uansett hva de sier — og viser at du er interessert i dem, ikke bare i salget.')),
('mal:salgstips:08','__mal__','salgstips', jsonb_build_object('innvending','Avslutt alltid med neste steg','tips','Ikke avslutt uten et konkret neste steg: dato for tilbakering, e-post du sender, eller bekreftelse. "Kan jeg ringe deg igjen fredag kl. 10?" er mye sterkere enn "ok, tenk på det".')),
('mal:salgstips:09','__mal__','salgstips', jsonb_build_object('innvending','Bruk "vi" ikke "jeg"','tips','Si "vi jobber med" heller enn "jeg selger". Det signaliserer at du representerer noe større enn deg selv, og gir mer troverdighet i en kald samtale.')),
('mal:salgstips:10','__mal__','salgstips', jsonb_build_object('innvending','Tilpass åpningen til bransjen','tips','En bilverksted-eier tenker HMS og ansvarlig arbeidsliv — koble [org] til det. En restaurant-eier tenker lokalsamfunn og omdømme.')),
('mal:salgstips:11','__mal__','salgstips', jsonb_build_object('innvending','Smil når du ringer','tips','Det høres faktisk i stemmen. Stå gjerne oppreist eller gå litt rundt — det gir mer energi og trygghet i stemmen enn å sitte sammensunket.')),
('mal:salgstips:12','__mal__','salgstips', jsonb_build_object('innvending','Still spørsmål, ikke hold monolog','tips','Den som stiller spørsmål styrer samtalen. La kunden snakke om bedriften sin — folk sier ja til folk som er interessert i dem.')),
('mal:salgstips:13','__mal__','salgstips', jsonb_build_object('innvending','Ring på riktig tidspunkt','tips','Småbedrifter tar oftest telefonen kl. 9–11 og 13–15. Unngå mandag morgen og fredag ettermiddag. Bruk dødtiden til å fylle lista med nye firmaer.')),
('mal:salgstips:14','__mal__','salgstips', jsonb_build_object('innvending','Bekreft avtalen med en gang','tips','Fikk du et ja? Send bekreftelse og faktura samme dag, mens avtalen er fersk. Ventetid gir rom for ombestemmelse.')),
('mal:skattetips:01','__mal__','skattetips', jsonb_build_object('innvending','Hovedregelen — fullt fradrag','tips','Si til kunden: «Dette føres som vanlig markedsføringskostnad og er fullt fradragsberettiget — det er en annonse, ikke en gave.» (Skatteloven § 6-1, ingen øvre grense så lenge prisen er rimelig.)')),
('mal:skattetips:02','__mal__','skattetips', jsonb_build_object('innvending','Ikke gave — gavegrensen gjelder ikke','tips','Gaver til frivillige organisasjoner har en fradragsgrense på 25 000 kr/år (sktl. § 6-50). Men en støtteannonse med reell annonseplass er reklame — den grensen gjelder ikke her. Hele beløpet kan føres.')),
('mal:skattetips:03','__mal__','skattetips', jsonb_build_object('innvending','Slik føres det i regnskapet','tips','Be kunden gi beskjed til regnskapsføreren sin: dette føres som markedsføring/reklamekostnad, ikke som gave. Da går fradraget helt av seg selv.')),
('mal:skattetips:04','__mal__','skattetips', jsonb_build_object('innvending','Kjøp før nyttår-argumentet','tips','Kostnaden reduserer årets skattepliktige resultat. Mot slutten av året: «Kjøper dere nå, får dere fradraget allerede i årets regnskap.» Sterkt argument i november/desember.')),
('mal:skattetips:05','__mal__','skattetips', jsonb_build_object('innvending','Gjelder alle selskapsformer','tips','AS, enkeltpersonforetak og DA — alle får fradrag for markedsføringskostnader. Ingen kunde er «for liten» til at dette lønner seg.')),
('mal:skattetips:06','__mal__','skattetips', jsonb_build_object('innvending','Ved store beløp — vis ro','tips','Spør kunden om mye? Anbefal dem å dobbeltsjekke med regnskapsføreren sin. Det koster deg ingenting, viser seriøsitet, og senker terskelen for et ja.')),
('mal:org:naaf','__mal__','organisasjon', jsonb_build_object(
  'id','org-naaf','navn','Astma- og Allergiforbundet',
  'kortBeskrivelse','Pasient- og interesseorganisasjon for astma, allergi, eksem og kols. Rundt 1,5 millioner nordmenn er rammet av disse diagnosene. Driver blant annet den nasjonale pollenvarslingen, en rådgivningstjeneste og støtter forskning.',
  'hvorfor','Astma og allergi rammer stadig flere barn — annonsen støtter informasjonsarbeid, rådgivning og forskning som hjelper familier direkte.',
  'anbefalteNaeringer', jsonb_build_array('Bygg og anlegg','Bilverksted og bilpleie','Helse- og omsorgstjenester','Industri og produksjon','Personlig tjenesteyting (frisør mm.)'),
  'innvendinger', jsonb_build_array(),
  'fakta', jsonb_build_array(
    jsonb_build_object('id','naaf-f1','tittel','1,5 millioner rammet','tekst','Rundt 1,5 millioner nordmenn lever med astma, allergi, eksem eller kols — og andelen barn med allergi og astma øker. Nesten alle kunder kjenner noen som er rammet.'),
    jsonb_build_object('id','naaf-f2','tittel','Pollenvarslingen','tekst','NAAF driver den nasjonale pollenvarslingen som over en million nordmenn sjekker hver vår. Et konkret, kjent eksempel på hva pengene går til.'),
    jsonb_build_object('id','naaf-f3','tittel','Gratis rådgivning','tekst','NAAF har en gratis rådgivningstjeneste der familier får svar fra sykepleiere og fageksperter om astma, allergi og eksem.'),
    jsonb_build_object('id','naaf-f4','tittel','Lokal tilstedeværelse','tekst','NAAF har regionslag og lokallag over hele landet — støtten er også synlig lokalt der kunden driver sin bedrift.')
  ))),
('mal:org:blakors','__mal__','organisasjon', jsonb_build_object(
  'id','org-blakors','navn','Blå Kors',
  'kortBeskrivelse','Ideell, diakonal organisasjon som arbeider mot rus- og spillavhengighet. Driver behandlingsinstitusjoner, forebygging for barn/unge og oppfølging etter behandling over store deler av Norge.',
  'hvorfor','Rus rammer ikke bare den som sliter, men hele familien — Blå Kors jobber både med forebygging blant unge og behandling/oppfølging i etterkant.',
  'anbefalteNaeringer', jsonb_build_array('Overnatting og servering','Helse- og omsorgstjenester','Varehandel / butikk','Kultur, idrett og fritid','Personlig tjenesteyting (frisør mm.)'),
  'innvendinger', jsonb_build_array(),
  'fakta', jsonb_build_array(
    jsonb_build_object('id','blakors-f1','tittel','Barna det gjelder','tekst','Titusenvis av barn i Norge vokser opp i hjem med rusproblemer. Blå Kors driver blant annet Barnas Stasjon — et tilbud for sårbare småbarnsfamilier i flere byer.'),
    jsonb_build_object('id','blakors-f2','tittel','Hele løpet','tekst','Blå Kors jobber i alle ledd: forebygging blant unge, behandling på egne institusjoner, og oppfølging etterpå. Få organisasjoner dekker hele kjeden.'),
    jsonb_build_object('id','blakors-f3','tittel','Over 100 års erfaring','tekst','Grunnlagt i 1906 — en av Norges eldste og mest etablerte organisasjoner innen rusomsorg. Trygt og seriøst å støtte.'),
    jsonb_build_object('id','blakors-f4','tittel','Rammer flere enn den som drikker','tekst','Rus rammer familie, kolleger og arbeidsplasser. For en bedriftseier er dette også et arbeidsmiljø-argument.')
  ))),
('mal:org:rodekors','__mal__','organisasjon', jsonb_build_object(
  'id','org-rodekors','navn','Røde Kors',
  'kortBeskrivelse','Norges største humanitære organisasjon. Driver blant annet hjelpekorps/redningstjeneste, besøkstjeneste, leksehjelp, flyktningarbeid og internasjonal nødhjelp.',
  'hvorfor','Lokalt og internasjonalt — Røde Kors er ofte først på stedet ved ulykker og kriser, og bygger fellesskap året rundt gjennom lokale aktiviteter.',
  'anbefalteNaeringer', jsonb_build_array('Transport og lager','Bygg og anlegg','Finans og forsikring','Eiendom','Varehandel / butikk'),
  'innvendinger', jsonb_build_array(),
  'fakta', jsonb_build_array(
    jsonb_build_object('id','rk-f1','tittel','Hjelpekorpset redder liv','tekst','Røde Kors Hjelpekorps rykker ut på leteaksjoner og redningsoppdrag over hele landet, hvert år — frivillige som stiller opp når noen ikke kommer hjem.'),
    jsonb_build_object('id','rk-f2','tittel','Besøkstjenesten mot ensomhet','tekst','Frivillige besøker eldre og ensomme ukentlig. Et formål som treffer bredt — alle har en bestemor eller nabo dette angår.'),
    jsonb_build_object('id','rk-f3','tittel','Lokalt til stede','tekst','Røde Kors har rundt 380 lokalforeninger — aktiviteten skjer i kundens eget nærmiljø, ikke bare nasjonalt.'),
    jsonb_build_object('id','rk-f4','tittel','Først på stedet ved kriser','tekst','Ved flom, skred og ulykker er Røde Kors ofte først ute med hjelp. Beredskapen finansieres av nettopp slik støtte.')
  )))
on conflict (id) do update set data = excluded.data, type = excluded.type, slettet = false;

-- ============================================================
-- Adminkommando: opprett (eller oppdater) et team.
-- Eksempel:  select opprett_team('lund-salg', 'Lund Salg', 20, 10000);
-- Kopierer mal-innholdet til teamet hvis teamet ikke har innhold fra før.
-- ============================================================
create or replace function public.opprett_team(p_kode text, p_navn text, p_maal_samtaler int default 20, p_maal_kroner int default 10000)
returns text
language plpgsql
as $$
declare
  v_kode text := lower(trim(p_kode));
begin
  if v_kode = '' or v_kode = '__mal__' then
    return 'Ugyldig teamkode.';
  end if;
  insert into public.team (kode, navn, maal_samtaler, maal_kroner)
  values (v_kode, p_navn, p_maal_samtaler, p_maal_kroner)
  on conflict (kode) do update set navn = excluded.navn, maal_samtaler = excluded.maal_samtaler, maal_kroner = excluded.maal_kroner;
  if not exists (select 1 from public.innhold where team = v_kode) then
    insert into public.innhold (id, team, type, data)
    select replace(id, 'mal:', v_kode || ':'), v_kode, type, data
    from public.innhold where team = '__mal__' and slettet = false;
  end if;
  return 'Team «' || v_kode || '» er klart — teamkoden selgerne skal bruke er: ' || v_kode;
end $$;

-- Fyll speilkolonnene for rader som fantes før oppgraderingen.
update public.kunder set data = data where eier_id is distinct from nullif(data->>'eierId', '');


-- ------------------------------------------------------------
-- DEL 2: DATA
-- ------------------------------------------------------------

-- team: 1 rader
insert into public.team (kode, navn, maal_samtaler, maal_kroner, sist_endret, brreg_kriterier) values ('faktureringsservice', 'Faktureringsservice', 50, 10000, '2026-07-03T04:34:21.135086+00:00', '{"orgformer":["AS","ENK"],"minAnsatte":1,"maksAnsatte":20,"minAlderAar":1,"kunMedTelefon":true,"mvaRegistrert":true}'::jsonb);

-- selgere: 2 rader
insert into public.selgere (id, team, data, slettet, sist_endret) values ('mr3uty9rtlcain', 'faktureringsservice', '{"id":"mr3uty9rtlcain","fornavn":"Richard","etternavn":"Winther","opprettet":"2026-07-02T18:45:17.631Z"}'::jsonb, false, '2026-07-02T22:15:47.040465+00:00');
insert into public.selgere (id, team, data, slettet, sist_endret) values ('mr3uugmg4pebpp', 'faktureringsservice', '{"id":"mr3uugmg4pebpp","fornavn":"Lloyd","etternavn":"Vimme","opprettet":"2026-07-02T18:45:41.416Z"}'::jsonb, false, '2026-07-02T22:15:47.040465+00:00');

-- kunder: 15 rader
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr1kysial7e2m4', 'faktureringsservice', '{"id":"mr1kysial7e2m4","salg":[{"id":"mr4li2f3qhtdzs","dato":"2026-07-03","belop":2500,"selgerId":"mr3uty9rtlcain"}],"epost":"","firma":"BARTOSZ KONDERAK","kilde":"eksisterende","orgnr":"833780972","eierId":"mr3uty9rtlcain","status":"solgt","adresse":"Gjetergata 10, 3015, DRAMMEN","notater":[{"id":"mr4li2f4dc4c2j","dato":"2026-07-03T07:11:52.768Z","tekst":"Solgt for 2 500 kr. Ny kontakt om 6 mnd.","selgerId":"mr3uty9rtlcain"}],"telefon":"004748650593","firmainfo":{"hentet":"2026-07-03T07:07:22.631Z","ansatte":null,"bransje":"Oppføring av bygninger","formaal":"","orgform":"ENK","stiftet":"2024","hjemmeside":""},"oppdatert":"2026-07-03T07:11:52.768Z","opprettet":"2026-07-01T04:33:34.930Z","reservertAv":null,"reservertTil":"2026-07-03T07:37:38.831Z","kontaktperson":"Muhammad Kouja","organisasjonId":"org-naaf","nesteOppfolging":"2027-01-03"}'::jsonb, false, '2026-07-03T07:11:54.240369+00:00', 'mr3uty9rtlcain', null, '2026-07-03T07:37:38.831+00:00');
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr4lrruuqbfgyo', 'faktureringsservice', '{"id":"mr4lrruuqbfgyo","epost":"","firma":"AKTIVFOT AS","kilde":"ny","orgnr":"995002272","eierId":"mr3uty9rtlcain","status":"ring_tilbake","adresse":"Nedre Storgate 13, 3015, DRAMMEN","notater":[{"id":"mr4tq5l2rq7p3s","dato":"2026-07-03T11:02:07.047Z","tekst":"Utfall: Ring tilbake","selgerId":"mr3uty9rtlcain"}],"telefon":"32 83 22 83","firmainfo":{"hentet":"2026-07-03T07:19:25.999Z","ansatte":null,"bransje":"Ortopedi- og fotterapitjenester","formaal":"Biomekanisk behandling og fotterapi. Kurs og opplæring. Salg av sko og produkter. Tillaging av orteser, såler og andre produkter som naturlig faller sammen med dette, herunder å delta i andre selskaper med lignende virksomhet, kjøp og salg av aksjer, eller på annen måte gjøre seg interessert i andre foretagender.","orgform":"AS","stiftet":"2010","hjemmeside":"www.aktivfot.no"},"oppdatert":"2026-07-03T11:02:07.047Z","opprettet":"2026-07-03T07:19:25.638Z","opprettetAv":"mr3uugmg4pebpp","reservertAv":null,"reservertTil":null,"kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":"2026-07-06"}'::jsonb, false, '2026-07-03T11:02:08.388062+00:00', 'mr3uty9rtlcain', null, null);
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr34n1fv25yi8p', 'faktureringsservice', '{"id":"mr34n1fv25yi8p","epost":"","firma":"PAHLJINA","kilde":"ny","orgnr":"932427567","eierId":null,"status":"ikke_interessert","adresse":"Sankt Halvards gate 4B, 3015, DRAMMEN","notater":[{"id":"mr4lr7ozap8gsm","dato":"2026-07-03T07:18:59.507Z","tekst":"Utfall: Ikke interessert","selgerId":"mr3uugmg4pebpp"}],"telefon":"","firmainfo":{"hentet":"2026-07-02T11:41:37.007Z","ansatte":null,"bransje":"Allmennlegetjenester","formaal":"","orgform":"ENK","stiftet":"2023","hjemmeside":""},"oppdatert":"2026-07-03T07:18:59.507Z","opprettet":"2026-07-02T06:32:05.131Z","reservertAv":null,"reservertTil":null,"kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":null}'::jsonb, false, '2026-07-03T07:19:00.780265+00:00', null, null, null);
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr34n1fv6jtds6', 'faktureringsservice', '{"id":"mr34n1fv6jtds6","epost":"","firma":"PATRICK HOCHNOWSKI LEGETJENESTER","kilde":"ny","orgnr":"928019896","status":"feil_nummer","adresse":"c/o Patrick Hochnowski Peter Østbyes gate 8, 3014, DRAMMEN","notater":[{"id":"mr34vl9of0fkpz","dato":"2026-07-02T06:38:44.076Z","tekst":"Utfall: Feil nummer"}],"telefon":"","oppdatert":"2026-07-02T06:38:44.076Z","opprettet":"2026-07-02T06:32:05.131Z","kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":null}'::jsonb, false, '2026-07-02T22:15:47.046075+00:00', null, null, null);
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr34n1fussw0mp', 'faktureringsservice', '{"id":"mr34n1fussw0mp","salg":[{"id":"mr4fzu07y626vi","dato":"2026-07-03","belop":1500,"selgerId":"mr3uty9rtlcain"}],"epost":"","firma":"ORTOPEDISK KIRURGISK KLINIKK Christian Platou","kilde":"eksisterende","orgnr":"971308664","eierId":"mr3uty9rtlcain","status":"solgt","adresse":"Cappelens gate 5, 3016, DRAMMEN","notater":[{"id":"mr4fzu08tfw6u8","dato":"2026-07-03T04:37:43.976Z","tekst":"Solgt for 1 500 kr. Ny kontakt om 6 mnd.","selgerId":"mr3uty9rtlcain"}],"telefon":"32 83 55 40","firmainfo":{"hentet":"2026-07-03T04:36:45.614Z","ansatte":null,"bransje":"Spesialiserte legetjenester, unntatt psykiatriske legetjenester","formaal":"","orgform":"ENK","stiftet":"1995","hjemmeside":""},"oppdatert":"2026-07-03T04:37:43.976Z","opprettet":"2026-07-02T06:32:05.130Z","reservertAv":null,"reservertTil":"2026-07-03T05:06:31.983Z","kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":"2027-01-03"}'::jsonb, false, '2026-07-03T04:37:45.463579+00:00', 'mr3uty9rtlcain', null, '2026-07-03T05:06:31.983+00:00');
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr34n1fuju8m1n', 'faktureringsservice', '{"id":"mr34n1fuju8m1n","epost":"","firma":"ORTOPED JON ERIK ENGEN","kilde":"ny","orgnr":"931593021","eierId":null,"status":"ingen_svar","adresse":"Lammers gate 1, 3014, DRAMMEN","notater":[{"id":"mr4g2n0j9yn0dp","dato":"2026-07-03T04:39:54.883Z","tekst":"Utfall: Ingen svar","selgerId":"mr3uty9rtlcain"}],"telefon":"32211100","firmainfo":{"hentet":"2026-07-03T04:38:39.935Z","ansatte":null,"bransje":"Spesialiserte legetjenester, unntatt psykiatriske legetjenester","formaal":"","orgform":"ENK","stiftet":"2023","hjemmeside":""},"oppdatert":"2026-07-03T04:39:54.883Z","opprettet":"2026-07-02T06:32:05.130Z","reservertAv":null,"reservertTil":null,"kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":"2026-07-04"}'::jsonb, false, '2026-07-03T04:39:56.51268+00:00', null, null, null);
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr4lrruuy82c22', 'faktureringsservice', '{"id":"mr4lrruuy82c22","epost":"","firma":"KLINIKK HAUKELAND AS","kilde":"ny","orgnr":"817552552","eierId":null,"status":"ikke_kontaktet","adresse":"Engene 116, 3012, DRAMMEN","notater":[],"telefon":"32 82 83 01","firmainfo":{"hentet":"2026-07-03T11:02:08.883Z","ansatte":5,"bransje":"Spesialiserte legetjenester, unntatt psykiatriske legetjenester","formaal":"Spesialiserte legetjenester, konsulentbistand, handel samt alt annet som står i naturlig sammenheng med dette.","orgform":"AS","stiftet":"2016","hjemmeside":"www.klinikkhaukeland.no"},"oppdatert":"2026-07-03T11:01:34.389Z","opprettet":"2026-07-03T07:19:25.638Z","opprettetAv":"mr3uugmg4pebpp","reservertAv":"mr3uty9rtlcain","reservertTil":"2026-07-03T11:31:34.389Z","kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":null}'::jsonb, false, '2026-07-03T11:02:10.287036+00:00', null, 'mr3uty9rtlcain', '2026-07-03T11:31:34.389+00:00');
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr34n1fvjqe7po', 'faktureringsservice', '{"id":"mr34n1fvjqe7po","salg":[{"id":"mr3gfgn81h7128","dato":"2026-07-02","belop":2000}],"epost":"","firma":"PALITO HOLDING AS","kilde":"eksisterende","orgnr":"920214266","status":"solgt","adresse":"Havreveien 10, 3039, DRAMMEN","notater":[{"id":"mr3gfgn8y3pspq","dato":"2026-07-02T12:02:06.980Z","tekst":"Solgt for 2 000 kr. Ny kontakt om 6 mnd."}],"telefon":"","firmainfo":{"hentet":"2026-07-02T11:41:06.466Z","ansatte":null,"bransje":"Tannlegetjenester","formaal":"Å drive miljø - og renovasjonsvirksomhet og å eie og delta i andre selskaper og virksomheter som driver miljø - og renovasjonsvirksomhet og alt som naturlig hører sammen med dette.","orgform":"AS","stiftet":"2017","hjemmeside":""},"oppdatert":"2026-07-02T12:02:06.980Z","opprettet":"2026-07-02T06:32:05.131Z","kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":"2027-01-02"}'::jsonb, false, '2026-07-02T22:15:47.046075+00:00', null, null, null);
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr34n1fv6zn3py', 'faktureringsservice', '{"id":"mr34n1fv6zn3py","epost":"","firma":"OTHESA AS","kilde":"ny","orgnr":"923361189","status":"solgt","adresse":"Bolignummer H0101 Malmveien 3B, 3031, DRAMMEN","notater":[{"id":"mr3fu5eo8tpo5m","dato":"2026-07-02T11:45:32.640Z","tekst":"Utfall: Solgt"}],"telefon":"","firmainfo":{"hentet":"2026-07-02T11:41:42.404Z","ansatte":null,"bransje":"Ortopedi- og fotterapitjenester","formaal":"Fotterapeut og dertil naturlig tilhørende virksomhet. Musikalske tjenester. Undervisning. Logopedvirksomhet. Kjøp og salg av fast eiendom. Kjøp og salg av aksjer. Deltakelse i andre foretak.","orgform":"AS","stiftet":"2019","hjemmeside":""},"oppdatert":"2026-07-02T11:45:32.640Z","opprettet":"2026-07-02T06:32:05.131Z","kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":null}'::jsonb, false, '2026-07-02T22:15:47.046075+00:00', null, null, null);
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr34n1fu3ak6b7', 'faktureringsservice', '{"id":"mr34n1fu3ak6b7","epost":"","firma":"OSTEOPAT OG INSTRUKTØR INGVILD SØREIDE","kilde":"ny","orgnr":"986634428","eierId":null,"status":"ikke_interessert","adresse":"Svelvikveien 276, 3037, DRAMMEN","notater":[{"id":"mr4lr9wdxrgotc","dato":"2026-07-03T07:19:02.365Z","tekst":"Utfall: Ikke interessert","selgerId":"mr3uugmg4pebpp"}],"telefon":"","firmainfo":{"hentet":"2026-07-02T11:45:32.898Z","ansatte":null,"bransje":"Aktiviteter innenfor tradisjonell, komplementær og alternativ medisin","formaal":"","orgform":"ENK","stiftet":"2004","hjemmeside":""},"oppdatert":"2026-07-03T07:19:02.365Z","opprettet":"2026-07-02T06:32:05.130Z","reservertAv":null,"reservertTil":null,"kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":null}'::jsonb, false, '2026-07-03T07:19:03.642339+00:00', null, null, null);
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr4lrruuanzbvm', 'faktureringsservice', '{"id":"mr4lrruuanzbvm","epost":"","firma":"MARGIT HAMMERSTAD PLASTIKKIRURGI","kilde":"ny","orgnr":"981785258","eierId":null,"status":"ikke_kontaktet","adresse":"Svelvikveien 4, 3040, DRAMMEN","notater":[],"telefon":"32 81 80 75","firmainfo":{"hentet":null,"ansatte":null,"bransje":"Spesialiserte legetjenester, unntatt psykiatriske legetjenester","formaal":"","orgform":"ENK","stiftet":"2000","hjemmeside":""},"oppdatert":"2026-07-03T11:01:34.389Z","opprettet":"2026-07-03T07:19:25.638Z","opprettetAv":"mr3uugmg4pebpp","reservertAv":"mr3uty9rtlcain","reservertTil":"2026-07-03T11:31:34.389Z","kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":null}'::jsonb, false, '2026-07-03T11:01:34.389991+00:00', null, 'mr3uty9rtlcain', '2026-07-03T11:31:34.389+00:00');
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr4lrruuv1v1ee', 'faktureringsservice', '{"id":"mr4lrruuv1v1ee","epost":"","firma":"LARS HÅVARD HØGVOLL","kilde":"ny","orgnr":"986861211","eierId":null,"status":"ikke_kontaktet","adresse":"Sølvgranveien 3, 3032, DRAMMEN","notater":[],"telefon":"32 73 00 67","firmainfo":{"hentet":null,"ansatte":null,"bransje":"Fysioterapi- og ergoterapitjenester","formaal":"","orgform":"ENK","stiftet":"2004","hjemmeside":""},"oppdatert":"2026-07-03T11:01:34.389Z","opprettet":"2026-07-03T07:19:25.638Z","opprettetAv":"mr3uugmg4pebpp","reservertAv":"mr3uty9rtlcain","reservertTil":"2026-07-03T11:31:34.389Z","kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":null}'::jsonb, false, '2026-07-03T11:01:34.389991+00:00', null, 'mr3uty9rtlcain', '2026-07-03T11:31:34.389+00:00');
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr34n1fuq0munk', 'faktureringsservice', '{"id":"mr34n1fuq0munk","epost":"","firma":"OPPFØLGINGSTILTAKET TERJE HERMANSEN","kilde":"ny","orgnr":"995851075","eierId":null,"status":"ikke_interessert","adresse":"Korpsveien 26C, 3033, DRAMMEN","notater":[{"id":"mr4lrbj62ujeb6","dato":"2026-07-03T07:19:04.482Z","tekst":"Utfall: Ikke interessert","selgerId":"mr3uugmg4pebpp"}],"telefon":"","firmainfo":{"hentet":"2026-07-03T07:07:29.771Z","ansatte":null,"bransje":"Andre helsetjenester ellers","formaal":"","orgform":"ENK","stiftet":"2010","hjemmeside":""},"oppdatert":"2026-07-03T07:19:04.482Z","opprettet":"2026-07-02T06:32:05.130Z","reservertAv":null,"reservertTil":null,"kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":null}'::jsonb, false, '2026-07-03T07:19:05.7559+00:00', null, null, null);
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr34n1fu0w9557', 'faktureringsservice', '{"id":"mr34n1fu0w9557","epost":"","firma":"OPSAHL FYSIOMED","kilde":"ny","orgnr":"986232907","eierId":null,"status":"ikke_interessert","adresse":"Grønland 43B, 3045, DRAMMEN","notater":[{"id":"mr4lrcqtuhsosr","dato":"2026-07-03T07:19:06.053Z","tekst":"Utfall: Ikke interessert","selgerId":"mr3uugmg4pebpp"}],"telefon":"67 16 60 80","firmainfo":{"hentet":"2026-07-03T04:39:55.224Z","ansatte":null,"bransje":"Allmennlegetjenester","formaal":"","orgform":"ENK","stiftet":"2003","hjemmeside":""},"oppdatert":"2026-07-03T07:19:06.053Z","opprettet":"2026-07-02T06:32:05.130Z","reservertAv":null,"reservertTil":null,"kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":null}'::jsonb, false, '2026-07-03T07:19:07.32406+00:00', null, null, null);
insert into public.kunder (id, team, data, slettet, sist_endret, eier_id, reservert_av, reservert_til) values ('mr34n1fuirc8tq', 'faktureringsservice', '{"id":"mr34n1fuirc8tq","epost":"","firma":"ORTOPEDIA AS","kilde":"ny","orgnr":"991238018","eierId":null,"status":"ikke_interessert","adresse":"Kastanjeveien 39, 3026, DRAMMEN","notater":[{"id":"mr4lre03ufdcxo","dato":"2026-07-03T07:19:07.683Z","tekst":"Utfall: Ikke interessert","selgerId":"mr3uugmg4pebpp"}],"telefon":"","firmainfo":{"hentet":"2026-07-03T04:37:44.160Z","ansatte":null,"bransje":"Spesialiserte legetjenester, unntatt psykiatriske legetjenester","formaal":"Verdiforvaltning og medisinskfaglig konsulentarbeid.","orgform":"AS","stiftet":"2007","hjemmeside":""},"oppdatert":"2026-07-03T07:19:07.683Z","opprettet":"2026-07-02T06:32:05.130Z","reservertAv":null,"reservertTil":null,"kontaktperson":"","organisasjonId":"org-naaf","nesteOppfolging":null}'::jsonb, false, '2026-07-03T07:19:08.964513+00:00', null, null, null);

-- innhold: 46 rader
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:01', '__mal__', 'salgstips', '{"tips":"Start med: \"Er du den som tar avgjørelser om markedsføring hos [firma]?\" Det setter deg rett inn i riktig samtale og sparer tid på feil person.","innvending":"Åpn med et ja-spørsmål"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:02', '__mal__', 'salgstips', '{"tips":"Si firmanavnet tidlig og knytt det til formålet: \"Vi ønsker at [firma] skal stå som en synlig støttespiller for [org] i dette området.\" Det gjør det konkret og personlig.","innvending":"Bruk firmanavnet aktivt"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:03', '__mal__', 'salgstips', '{"tips":"Nevn beløpet og sammenlign det med noe kjent: \"Vi snakker om en støtteannonse for [beløp] kr — omtrent det samme som én reklameannonse i lokalsavisa.\" Det gjør det lett å forholde seg til.","innvending":"Gi en konkret størrelse tidlig"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:04', '__mal__', 'salgstips', '{"tips":"\"Vi setter sammen en kampanje for [org] i dette distriktet, og leter etter lokale bedrifter som ønsker å bli synlige støttespillere.\" Lokal tilhørighet treffer mange bedriftseiere.","innvending":"Knytt det til nærmiljøet"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:05', '__mal__', 'salgstips', '{"tips":"Fortell raskt at dette er fradragsberettiget som markedsføring — ikke gave. Det fjerner en vanlig skepsis og gjør at de ser det som en forretningsbeslutning, ikke veldedighet.","innvending":"Trekk frem skattefradraget tidlig"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:06', '__mal__', 'salgstips', '{"tips":"Forbered én konkret setning: hva [org] gjør og hvem de hjelper. Tall funker bra: \"Røde Kors rykker ut ved over 2 000 redningsaksjoner i Norge hvert år.\" Det skaper relevans raskt.","innvending":"Ha organisasjonen på 20 sekunder klar"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:07', '__mal__', 'salgstips', '{"tips":"\"Støtter dere allerede noen frivillige organisasjoner?\" Svaret gir deg en inngang uansett hva de sier — og viser at du er interessert i dem, ikke bare i salget.","innvending":"Spør om de støtter noe fra før"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:08', '__mal__', 'salgstips', '{"tips":"Ikke avslutt uten et konkret neste steg: dato for tilbakering, e-post du sender, eller bekreftelse. \"Kan jeg ringe deg igjen fredag kl. 10?\" er mye sterkere enn \"ok, tenk på det\".","innvending":"Avslutt alltid med neste steg"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:09', '__mal__', 'salgstips', '{"tips":"Si \"vi jobber med\" heller enn \"jeg selger\". Det signaliserer at du representerer noe større enn deg selv, og gir mer troverdighet i en kald samtale.","innvending":"Bruk \"vi\" ikke \"jeg\""}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:10', '__mal__', 'salgstips', '{"tips":"En bilverksted-eier tenker HMS og ansvarlig arbeidsliv — koble [org] til det. En restaurant-eier tenker lokalsamfunn og omdømme.","innvending":"Tilpass åpningen til bransjen"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:11', '__mal__', 'salgstips', '{"tips":"Det høres faktisk i stemmen. Stå gjerne oppreist eller gå litt rundt — det gir mer energi og trygghet i stemmen enn å sitte sammensunket.","innvending":"Smil når du ringer"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:12', '__mal__', 'salgstips', '{"tips":"Den som stiller spørsmål styrer samtalen. La kunden snakke om bedriften sin — folk sier ja til folk som er interessert i dem.","innvending":"Still spørsmål, ikke hold monolog"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:13', '__mal__', 'salgstips', '{"tips":"Småbedrifter tar oftest telefonen kl. 9–11 og 13–15. Unngå mandag morgen og fredag ettermiddag. Bruk dødtiden til å fylle lista med nye firmaer.","innvending":"Ring på riktig tidspunkt"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:salgstips:14', '__mal__', 'salgstips', '{"tips":"Fikk du et ja? Send bekreftelse og faktura samme dag, mens avtalen er fersk. Ventetid gir rom for ombestemmelse.","innvending":"Bekreft avtalen med en gang"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:skattetips:01', '__mal__', 'skattetips', '{"tips":"Si til kunden: «Dette føres som vanlig markedsføringskostnad og er fullt fradragsberettiget — det er en annonse, ikke en gave.» (Skatteloven § 6-1, ingen øvre grense så lenge prisen er rimelig.)","innvending":"Hovedregelen — fullt fradrag"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:skattetips:02', '__mal__', 'skattetips', '{"tips":"Gaver til frivillige organisasjoner har en fradragsgrense på 25 000 kr/år (sktl. § 6-50). Men en støtteannonse med reell annonseplass er reklame — den grensen gjelder ikke her. Hele beløpet kan føres.","innvending":"Ikke gave — gavegrensen gjelder ikke"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:skattetips:03', '__mal__', 'skattetips', '{"tips":"Be kunden gi beskjed til regnskapsføreren sin: dette føres som markedsføring/reklamekostnad, ikke som gave. Da går fradraget helt av seg selv.","innvending":"Slik føres det i regnskapet"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:skattetips:04', '__mal__', 'skattetips', '{"tips":"Kostnaden reduserer årets skattepliktige resultat. Mot slutten av året: «Kjøper dere nå, får dere fradraget allerede i årets regnskap.» Sterkt argument i november/desember.","innvending":"Kjøp før nyttår-argumentet"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:skattetips:05', '__mal__', 'skattetips', '{"tips":"AS, enkeltpersonforetak og DA — alle får fradrag for markedsføringskostnader. Ingen kunde er «for liten» til at dette lønner seg.","innvending":"Gjelder alle selskapsformer"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:skattetips:06', '__mal__', 'skattetips', '{"tips":"Spør kunden om mye? Anbefal dem å dobbeltsjekke med regnskapsføreren sin. Det koster deg ingenting, viser seriøsitet, og senker terskelen for et ja.","innvending":"Ved store beløp — vis ro"}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:org:naaf', '__mal__', 'organisasjon', '{"id":"org-naaf","navn":"Astma- og Allergiforbundet","fakta":[{"id":"naaf-f1","tekst":"Rundt 1,5 millioner nordmenn lever med astma, allergi, eksem eller kols — og andelen barn med allergi og astma øker. Nesten alle kunder kjenner noen som er rammet.","tittel":"1,5 millioner rammet"},{"id":"naaf-f2","tekst":"NAAF driver den nasjonale pollenvarslingen som over en million nordmenn sjekker hver vår. Et konkret, kjent eksempel på hva pengene går til.","tittel":"Pollenvarslingen"},{"id":"naaf-f3","tekst":"NAAF har en gratis rådgivningstjeneste der familier får svar fra sykepleiere og fageksperter om astma, allergi og eksem.","tittel":"Gratis rådgivning"},{"id":"naaf-f4","tekst":"NAAF har regionslag og lokallag over hele landet — støtten er også synlig lokalt der kunden driver sin bedrift.","tittel":"Lokal tilstedeværelse"}],"hvorfor":"Astma og allergi rammer stadig flere barn — annonsen støtter informasjonsarbeid, rådgivning og forskning som hjelper familier direkte.","innvendinger":[],"kortBeskrivelse":"Pasient- og interesseorganisasjon for astma, allergi, eksem og kols. Rundt 1,5 millioner nordmenn er rammet av disse diagnosene. Driver blant annet den nasjonale pollenvarslingen, en rådgivningstjeneste og støtter forskning.","anbefalteNaeringer":["Bygg og anlegg","Bilverksted og bilpleie","Helse- og omsorgstjenester","Industri og produksjon","Personlig tjenesteyting (frisør mm.)"]}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:skattetips:02', 'faktureringsservice', 'skattetips', '{"tips":"Gaver til frivillige organisasjoner har en fradragsgrense på 25 000 kr/år (sktl. § 6-50). Men en støtteannonse med reell annonseplass er reklame — den grensen gjelder ikke her. Hele beløpet kan føres.","innvending":"Ikke gave — gavegrensen gjelder ikke"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:org:blakors', '__mal__', 'organisasjon', '{"id":"org-blakors","navn":"Blå Kors","fakta":[{"id":"blakors-f1","tekst":"Titusenvis av barn i Norge vokser opp i hjem med rusproblemer. Blå Kors driver blant annet Barnas Stasjon — et tilbud for sårbare småbarnsfamilier i flere byer.","tittel":"Barna det gjelder"},{"id":"blakors-f2","tekst":"Blå Kors jobber i alle ledd: forebygging blant unge, behandling på egne institusjoner, og oppfølging etterpå. Få organisasjoner dekker hele kjeden.","tittel":"Hele løpet"},{"id":"blakors-f3","tekst":"Grunnlagt i 1906 — en av Norges eldste og mest etablerte organisasjoner innen rusomsorg. Trygt og seriøst å støtte.","tittel":"Over 100 års erfaring"},{"id":"blakors-f4","tekst":"Rus rammer familie, kolleger og arbeidsplasser. For en bedriftseier er dette også et arbeidsmiljø-argument.","tittel":"Rammer flere enn den som drikker"}],"hvorfor":"Rus rammer ikke bare den som sliter, men hele familien — Blå Kors jobber både med forebygging blant unge og behandling/oppfølging i etterkant.","innvendinger":[],"kortBeskrivelse":"Ideell, diakonal organisasjon som arbeider mot rus- og spillavhengighet. Driver behandlingsinstitusjoner, forebygging for barn/unge og oppfølging etter behandling over store deler av Norge.","anbefalteNaeringer":["Overnatting og servering","Helse- og omsorgstjenester","Varehandel / butikk","Kultur, idrett og fritid","Personlig tjenesteyting (frisør mm.)"]}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('mal:org:rodekors', '__mal__', 'organisasjon', '{"id":"org-rodekors","navn":"Røde Kors","fakta":[{"id":"rk-f1","tekst":"Røde Kors Hjelpekorps rykker ut på leteaksjoner og redningsoppdrag over hele landet, hvert år — frivillige som stiller opp når noen ikke kommer hjem.","tittel":"Hjelpekorpset redder liv"},{"id":"rk-f2","tekst":"Frivillige besøker eldre og ensomme ukentlig. Et formål som treffer bredt — alle har en bestemor eller nabo dette angår.","tittel":"Besøkstjenesten mot ensomhet"},{"id":"rk-f3","tekst":"Røde Kors har rundt 380 lokalforeninger — aktiviteten skjer i kundens eget nærmiljø, ikke bare nasjonalt.","tittel":"Lokalt til stede"},{"id":"rk-f4","tekst":"Ved flom, skred og ulykker er Røde Kors ofte først ute med hjelp. Beredskapen finansieres av nettopp slik støtte.","tittel":"Først på stedet ved kriser"}],"hvorfor":"Lokalt og internasjonalt — Røde Kors er ofte først på stedet ved ulykker og kriser, og bygger fellesskap året rundt gjennom lokale aktiviteter.","innvendinger":[],"kortBeskrivelse":"Norges største humanitære organisasjon. Driver blant annet hjelpekorps/redningstjeneste, besøkstjeneste, leksehjelp, flyktningarbeid og internasjonal nødhjelp.","anbefalteNaeringer":["Transport og lager","Bygg og anlegg","Finans og forsikring","Eiendom","Varehandel / butikk"]}'::jsonb, false, '2026-07-03T04:33:26.786221+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:01', 'faktureringsservice', 'salgstips', '{"tips":"Start med: \"Er du den som tar avgjørelser om markedsføring hos [firma]?\" Det setter deg rett inn i riktig samtale og sparer tid på feil person.","innvending":"Åpn med et ja-spørsmål"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:02', 'faktureringsservice', 'salgstips', '{"tips":"Si firmanavnet tidlig og knytt det til formålet: \"Vi ønsker at [firma] skal stå som en synlig støttespiller for [org] i dette området.\" Det gjør det konkret og personlig.","innvending":"Bruk firmanavnet aktivt"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:03', 'faktureringsservice', 'salgstips', '{"tips":"Nevn beløpet og sammenlign det med noe kjent: \"Vi snakker om en støtteannonse for [beløp] kr — omtrent det samme som én reklameannonse i lokalsavisa.\" Det gjør det lett å forholde seg til.","innvending":"Gi en konkret størrelse tidlig"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:04', 'faktureringsservice', 'salgstips', '{"tips":"\"Vi setter sammen en kampanje for [org] i dette distriktet, og leter etter lokale bedrifter som ønsker å bli synlige støttespillere.\" Lokal tilhørighet treffer mange bedriftseiere.","innvending":"Knytt det til nærmiljøet"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:05', 'faktureringsservice', 'salgstips', '{"tips":"Fortell raskt at dette er fradragsberettiget som markedsføring — ikke gave. Det fjerner en vanlig skepsis og gjør at de ser det som en forretningsbeslutning, ikke veldedighet.","innvending":"Trekk frem skattefradraget tidlig"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:06', 'faktureringsservice', 'salgstips', '{"tips":"Forbered én konkret setning: hva [org] gjør og hvem de hjelper. Tall funker bra: \"Røde Kors rykker ut ved over 2 000 redningsaksjoner i Norge hvert år.\" Det skaper relevans raskt.","innvending":"Ha organisasjonen på 20 sekunder klar"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:07', 'faktureringsservice', 'salgstips', '{"tips":"\"Støtter dere allerede noen frivillige organisasjoner?\" Svaret gir deg en inngang uansett hva de sier — og viser at du er interessert i dem, ikke bare i salget.","innvending":"Spør om de støtter noe fra før"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:08', 'faktureringsservice', 'salgstips', '{"tips":"Ikke avslutt uten et konkret neste steg: dato for tilbakering, e-post du sender, eller bekreftelse. \"Kan jeg ringe deg igjen fredag kl. 10?\" er mye sterkere enn \"ok, tenk på det\".","innvending":"Avslutt alltid med neste steg"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:09', 'faktureringsservice', 'salgstips', '{"tips":"Si \"vi jobber med\" heller enn \"jeg selger\". Det signaliserer at du representerer noe større enn deg selv, og gir mer troverdighet i en kald samtale.","innvending":"Bruk \"vi\" ikke \"jeg\""}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:10', 'faktureringsservice', 'salgstips', '{"tips":"En bilverksted-eier tenker HMS og ansvarlig arbeidsliv — koble [org] til det. En restaurant-eier tenker lokalsamfunn og omdømme.","innvending":"Tilpass åpningen til bransjen"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:11', 'faktureringsservice', 'salgstips', '{"tips":"Det høres faktisk i stemmen. Stå gjerne oppreist eller gå litt rundt — det gir mer energi og trygghet i stemmen enn å sitte sammensunket.","innvending":"Smil når du ringer"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:12', 'faktureringsservice', 'salgstips', '{"tips":"Den som stiller spørsmål styrer samtalen. La kunden snakke om bedriften sin — folk sier ja til folk som er interessert i dem.","innvending":"Still spørsmål, ikke hold monolog"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:13', 'faktureringsservice', 'salgstips', '{"tips":"Småbedrifter tar oftest telefonen kl. 9–11 og 13–15. Unngå mandag morgen og fredag ettermiddag. Bruk dødtiden til å fylle lista med nye firmaer.","innvending":"Ring på riktig tidspunkt"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:salgstips:14', 'faktureringsservice', 'salgstips', '{"tips":"Fikk du et ja? Send bekreftelse og faktura samme dag, mens avtalen er fersk. Ventetid gir rom for ombestemmelse.","innvending":"Bekreft avtalen med en gang"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:skattetips:01', 'faktureringsservice', 'skattetips', '{"tips":"Si til kunden: «Dette føres som vanlig markedsføringskostnad og er fullt fradragsberettiget — det er en annonse, ikke en gave.» (Skatteloven § 6-1, ingen øvre grense så lenge prisen er rimelig.)","innvending":"Hovedregelen — fullt fradrag"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:skattetips:03', 'faktureringsservice', 'skattetips', '{"tips":"Be kunden gi beskjed til regnskapsføreren sin: dette føres som markedsføring/reklamekostnad, ikke som gave. Da går fradraget helt av seg selv.","innvending":"Slik føres det i regnskapet"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:skattetips:04', 'faktureringsservice', 'skattetips', '{"tips":"Kostnaden reduserer årets skattepliktige resultat. Mot slutten av året: «Kjøper dere nå, får dere fradraget allerede i årets regnskap.» Sterkt argument i november/desember.","innvending":"Kjøp før nyttår-argumentet"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:skattetips:05', 'faktureringsservice', 'skattetips', '{"tips":"AS, enkeltpersonforetak og DA — alle får fradrag for markedsføringskostnader. Ingen kunde er «for liten» til at dette lønner seg.","innvending":"Gjelder alle selskapsformer"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:skattetips:06', 'faktureringsservice', 'skattetips', '{"tips":"Spør kunden om mye? Anbefal dem å dobbeltsjekke med regnskapsføreren sin. Det koster deg ingenting, viser seriøsitet, og senker terskelen for et ja.","innvending":"Ved store beløp — vis ro"}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:org:naaf', 'faktureringsservice', 'organisasjon', '{"id":"org-naaf","navn":"Astma- og Allergiforbundet","fakta":[{"id":"naaf-f1","tekst":"Rundt 1,5 millioner nordmenn lever med astma, allergi, eksem eller kols — og andelen barn med allergi og astma øker. Nesten alle kunder kjenner noen som er rammet.","tittel":"1,5 millioner rammet"},{"id":"naaf-f2","tekst":"NAAF driver den nasjonale pollenvarslingen som over en million nordmenn sjekker hver vår. Et konkret, kjent eksempel på hva pengene går til.","tittel":"Pollenvarslingen"},{"id":"naaf-f3","tekst":"NAAF har en gratis rådgivningstjeneste der familier får svar fra sykepleiere og fageksperter om astma, allergi og eksem.","tittel":"Gratis rådgivning"},{"id":"naaf-f4","tekst":"NAAF har regionslag og lokallag over hele landet — støtten er også synlig lokalt der kunden driver sin bedrift.","tittel":"Lokal tilstedeværelse"}],"hvorfor":"Astma og allergi rammer stadig flere barn — annonsen støtter informasjonsarbeid, rådgivning og forskning som hjelper familier direkte.","innvendinger":[],"kortBeskrivelse":"Pasient- og interesseorganisasjon for astma, allergi, eksem og kols. Rundt 1,5 millioner nordmenn er rammet av disse diagnosene. Driver blant annet den nasjonale pollenvarslingen, en rådgivningstjeneste og støtter forskning.","anbefalteNaeringer":["Bygg og anlegg","Bilverksted og bilpleie","Helse- og omsorgstjenester","Industri og produksjon","Personlig tjenesteyting (frisør mm.)"]}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:org:blakors', 'faktureringsservice', 'organisasjon', '{"id":"org-blakors","navn":"Blå Kors","fakta":[{"id":"blakors-f1","tekst":"Titusenvis av barn i Norge vokser opp i hjem med rusproblemer. Blå Kors driver blant annet Barnas Stasjon — et tilbud for sårbare småbarnsfamilier i flere byer.","tittel":"Barna det gjelder"},{"id":"blakors-f2","tekst":"Blå Kors jobber i alle ledd: forebygging blant unge, behandling på egne institusjoner, og oppfølging etterpå. Få organisasjoner dekker hele kjeden.","tittel":"Hele løpet"},{"id":"blakors-f3","tekst":"Grunnlagt i 1906 — en av Norges eldste og mest etablerte organisasjoner innen rusomsorg. Trygt og seriøst å støtte.","tittel":"Over 100 års erfaring"},{"id":"blakors-f4","tekst":"Rus rammer familie, kolleger og arbeidsplasser. For en bedriftseier er dette også et arbeidsmiljø-argument.","tittel":"Rammer flere enn den som drikker"}],"hvorfor":"Rus rammer ikke bare den som sliter, men hele familien — Blå Kors jobber både med forebygging blant unge og behandling/oppfølging i etterkant.","innvendinger":[],"kortBeskrivelse":"Ideell, diakonal organisasjon som arbeider mot rus- og spillavhengighet. Driver behandlingsinstitusjoner, forebygging for barn/unge og oppfølging etter behandling over store deler av Norge.","anbefalteNaeringer":["Overnatting og servering","Helse- og omsorgstjenester","Varehandel / butikk","Kultur, idrett og fritid","Personlig tjenesteyting (frisør mm.)"]}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');
insert into public.innhold (id, team, type, data, slettet, sist_endret) values ('faktureringsservice:org:rodekors', 'faktureringsservice', 'organisasjon', '{"id":"org-rodekors","navn":"Røde Kors","fakta":[{"id":"rk-f1","tekst":"Røde Kors Hjelpekorps rykker ut på leteaksjoner og redningsoppdrag over hele landet, hvert år — frivillige som stiller opp når noen ikke kommer hjem.","tittel":"Hjelpekorpset redder liv"},{"id":"rk-f2","tekst":"Frivillige besøker eldre og ensomme ukentlig. Et formål som treffer bredt — alle har en bestemor eller nabo dette angår.","tittel":"Besøkstjenesten mot ensomhet"},{"id":"rk-f3","tekst":"Røde Kors har rundt 380 lokalforeninger — aktiviteten skjer i kundens eget nærmiljø, ikke bare nasjonalt.","tittel":"Lokalt til stede"},{"id":"rk-f4","tekst":"Ved flom, skred og ulykker er Røde Kors ofte først ute med hjelp. Beredskapen finansieres av nettopp slik støtte.","tittel":"Først på stedet ved kriser"}],"hvorfor":"Lokalt og internasjonalt — Røde Kors er ofte først på stedet ved ulykker og kriser, og bygger fellesskap året rundt gjennom lokale aktiviteter.","innvendinger":[],"kortBeskrivelse":"Norges største humanitære organisasjon. Driver blant annet hjelpekorps/redningstjeneste, besøkstjeneste, leksehjelp, flyktningarbeid og internasjonal nødhjelp.","anbefalteNaeringer":["Transport og lager","Bygg og anlegg","Finans og forsikring","Eiendom","Varehandel / butikk"]}'::jsonb, false, '2026-07-03T04:34:21.135086+00:00');

-- Triggerne overskriver sist_endret ved insert; gjenopprett originale tidsstempler:
update public.team set sist_endret = '2026-07-03T04:34:21.135086+00:00' where kode = 'faktureringsservice';
update public.selgere set sist_endret = '2026-07-02T22:15:47.040465+00:00' where id = 'mr3uty9rtlcain';
update public.selgere set sist_endret = '2026-07-02T22:15:47.040465+00:00' where id = 'mr3uugmg4pebpp';
update public.kunder set sist_endret = '2026-07-03T07:11:54.240369+00:00' where id = 'mr1kysial7e2m4';
update public.kunder set sist_endret = '2026-07-03T11:02:08.388062+00:00' where id = 'mr4lrruuqbfgyo';
update public.kunder set sist_endret = '2026-07-03T07:19:00.780265+00:00' where id = 'mr34n1fv25yi8p';
update public.kunder set sist_endret = '2026-07-02T22:15:47.046075+00:00' where id = 'mr34n1fv6jtds6';
update public.kunder set sist_endret = '2026-07-03T04:37:45.463579+00:00' where id = 'mr34n1fussw0mp';
update public.kunder set sist_endret = '2026-07-03T04:39:56.51268+00:00' where id = 'mr34n1fuju8m1n';
update public.kunder set sist_endret = '2026-07-03T11:02:10.287036+00:00' where id = 'mr4lrruuy82c22';
update public.kunder set sist_endret = '2026-07-02T22:15:47.046075+00:00' where id = 'mr34n1fvjqe7po';
update public.kunder set sist_endret = '2026-07-02T22:15:47.046075+00:00' where id = 'mr34n1fv6zn3py';
update public.kunder set sist_endret = '2026-07-03T07:19:03.642339+00:00' where id = 'mr34n1fu3ak6b7';
update public.kunder set sist_endret = '2026-07-03T11:01:34.389991+00:00' where id = 'mr4lrruuanzbvm';
update public.kunder set sist_endret = '2026-07-03T11:01:34.389991+00:00' where id = 'mr4lrruuv1v1ee';
update public.kunder set sist_endret = '2026-07-03T07:19:05.7559+00:00' where id = 'mr34n1fuq0munk';
update public.kunder set sist_endret = '2026-07-03T07:19:07.32406+00:00' where id = 'mr34n1fu0w9557';
update public.kunder set sist_endret = '2026-07-03T07:19:08.964513+00:00' where id = 'mr34n1fuirc8tq';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:01';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:02';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:03';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:04';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:05';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:06';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:07';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:08';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:09';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:10';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:11';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:12';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:13';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:salgstips:14';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:skattetips:01';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:skattetips:02';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:skattetips:03';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:skattetips:04';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:skattetips:05';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:skattetips:06';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:org:naaf';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:skattetips:02';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:org:blakors';
update public.innhold set sist_endret = '2026-07-03T04:33:26.786221+00:00' where id = 'mal:org:rodekors';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:01';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:02';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:03';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:04';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:05';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:06';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:07';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:08';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:09';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:10';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:11';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:12';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:13';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:salgstips:14';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:skattetips:01';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:skattetips:03';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:skattetips:04';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:skattetips:05';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:skattetips:06';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:org:naaf';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:org:blakors';
update public.innhold set sist_endret = '2026-07-03T04:34:21.135086+00:00' where id = 'faktureringsservice:org:rodekors';
