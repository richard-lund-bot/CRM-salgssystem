# Ringeliste — CRM-salgssystem

Mobilvennlig ringeliste/CRM for selgerteam. All funksjonalitet ligger i én fil, `index.html`, som serveres via GitHub Pages. Data og innhold ligger i en Supabase-database.

## Slik fungerer det

- **Ingen kommer inn uten team**: første gang appen åpnes må selgeren skrive inn en teamkode (opprettet av admin i backend), deretter velge eller opprette selgerprofilen sin. Alt huskes på enheten etterpå.
- **Felles kundepool**: «Start ringing» reserverer opptil 10 ledige kunder atomisk i databasen (radlåsing), så to selgere aldri får de samme. Reservasjoner utløper etter 30 minutter. Salg eller oppfølgingsdato gjør kunden til selgerens egen; ellers går den tilbake i poolen.
- **Backend-styrt**: dagsmål (samtaler + kroner), salgstips, skattetips og organisasjonsinfo administreres i Supabase — appen er skrivebeskyttet for dette og viser alltid siste versjon.

## Administrasjon (alt gjøres i Supabase SQL Editor)

**Opprette/endre et team:**
```sql
select opprett_team('teamkoden', 'Teamnavn', 20, 10000);
--                   kode         navn        mål:samtaler  mål:kr per dag
```
Kommandoen oppretter teamet (eller oppdaterer navn/mål) og kopierer standard salgs-/skattetips og organisasjoner til teamet første gang.

**Redigere innhold**: radene ligger i `innhold`-tabellen (type `salgstips`, `skattetips` eller `organisasjon`, JSON i `data`-kolonnen). Endringer når alle telefoner innen ~25 sekunder. Sett `slettet = true` for å fjerne noe.

**Kundedata**: `kunder`- og `selgere`-tabellene, hele objektet i `data` (jsonb).

## Oppsett fra bunnen

1. Opprett et gratis Supabase-prosjekt, kjør `supabase-schema.sql` i SQL Editor (idempotent — trygg å kjøre på nytt ved oppgraderinger).
2. Lim inn prosjektets URL og «anon public»-nøkkel i toppen av `index.html` (`SUPABASE_URL` / `SUPABASE_ANON_KEY`).
3. Kjør `select opprett_team('koden-din', 'Teamnavn');`
4. Publiser til GitHub Pages (push til `main`). Selgerne åpner siden, skriver teamkoden, velger navn — ferdig.

Uten Supabase-nøkkel i koden kjører appen i lokal modus (kun localStorage, innebygd standardinnhold) — brukes til utvikling og testing.
