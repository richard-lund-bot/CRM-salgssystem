# mova — Move for Life.

Bevegelsesapp der **all bevegelse teller**: en gåtur, en kuratert styrkeøkt, en
fotballkamp eller hagearbeid gir XP, bygger Momentum og flytter figuren din videre
på reisen. Øktbiblioteket (60 true-and-tested økter) er én av flere veier inn —
ikke hele appen. Vanilla HTML/CSS/JS, ingen byggesteg, installerbar som PWA.
Norsk UI, mobil først. Systemdefinisjon: Mova-spesifikasjonen (idé-dokumentet) —
kjerneprinsipp: *senk dørstokkmila, aldri skam, delvis gjennomføring teller.*

Bygget ved å gjenbruke repoet og Supabase-prosjektet fra en tidligere Ringeliste-CRM
(arkivert i branchen `arkiv/crm` med full SQL-dump).

## Status

| Milepæl | Innhold | Status |
|---|---|---|
| M0 | Riv CRM, arkiver, tøm repo + Supabase | ✅ |
| M1 | PWA-skjelett + datakonvertering (bibliotek → `data/*.json`) | ✅ |
| M2 | Supabase-skjema for brukertilstand (RLS owner-only) | ✅ |
| M3 | Onboarding + generator + kjøre-UI | ✅ |
| M4 | Logging, nivåsystem (base + momentum/decay), gateways, historikk | ✅ |
| M5 | Skysync (magic link + last-write-wins per rad) | ✅ |
| M6 | Belønningsnivå (uendelig), avatarer, temaer, level-up | ✅ |
| M7 | Runna-inspirert redesign: lyst tema, SVG-ikoner, Higgsfield-app-ikon | ✅ |
| M8 | Liquid-glass flytende bunnlinje + Higgsfield avatarer & tier-badges | ✅ |
| M9 | Finpuss: animasjonsverktøykasse (inngang, fyll, konfetti, ring), full emoji→SVG-ikon-opprydning, ekte transparens på avatar/badge-bilder | ✅ |
| M9.1 | IA-omstrukturering: Min dag (ukestripe), Plan-modul (kalender + fyll-kalender), Aktivitet splittet i Historikk/Prestasjoner, ren tab-bar-markør | ✅ |
| M10 | Mova-designsystem: tokens, Fredoka/Inter, Lucide-ikoner, rebrand | ✅ |
| M11 | Mova-systemet: bevegelseslag (12 typer, alt teller), Dagens gnist, Beveg (energi-først), hurtigstart + manuell logg, Momentum (aldri streak), Min reise med figur/miljøer/sti, Tilpass figur, varme titler, spec-XP-formel, kapasitetssystem demotert til valgfri Progresjon | ✅ |

> Appen er offline-first: localStorage er alltid primærkilden, og alt fungerer
> uten innlogging. Skysync er opt-in — logg inn med e-post i Innstillinger for å
> dele profil, logg og nivå mellom enheter.
>
> **Kjerneloopen (Mova-spec §2):** åpne appen → kjenn etter (energi) → velg eller
> generer bevegelse → beveg deg → få XP → bygg Momentum → figuren går videre →
> lås opp belønninger → kom tilbake i morgen.
>
> **Tre lag progresjon:** *belønningsnivå* (hyppig, uten tak — gir plagg, miljø,
> tema, tittel eller øvelse hvert nivå, `js/belonninger.js`), *Momentum* (rytme
> over rullerende 7 dager — aldri en streak som «ryker», `js/bevegelse.js`) og
> *kapasitet* per treningsform (valgfritt, avansert — styrer bare generatorens
> øvelsesnivåer, skjermen «Progresjon» under Meny, `js/niva.js`).
>
> **XP-formelen (spec §8):** `minutter × bevegelsesfaktor (0,8–1,4) ×
> intensitetsfaktor (0,8–1,25)`, minst 5 XP — rolig bevegelse er aldri verdiløs.
> Comeback etter pause gir dobbel XP og egen belønning.

## Kjøre lokalt

Ren statisk side — server rota med hvilken som helst webserver (ES-moduler krever HTTP,
ikke `file://`):

```sh
python3 -m http.server 8000
# åpne http://localhost:8000
```

## Struktur

```
index.html              app-skall
css/app.css             stil (mørkt tema, mobil først)
js/
  app.js                inngang, ruter, tab-bar (Min dag/Beveg/Min reise/Aktivitet/Meny), Min dag m/ Dagens gnist
  bevegelse.js          bevegelseslaget: 12 bevegelsestyper, spec-XP-formel, Momentum, Dagens gnist
  beveg.js              hurtigstart m/ timer, manuell logg, «Du beveget deg»-skjermen (Beveg-fanen er øktbiblioteket)
  reise.js              Min reise: miljøscene m/ gående figur, XP/nivå, Momentum-rytme, milepælssti
  figur.js              figuren (lagdelt SVG, poser), miljøer, skjermen «Tilpass figur»
  library.js            laster + indekserer statiske data (offline-first)
  store.js              brukertilstand i localStorage (Spor-mønster) + profiloppslag
  onboarding.js         4-skjerms onboarding, preferanse-først (motivasjon, favorittbevegelser, ukemål, navn)
  bibliotek-okter.js    øktbiblioteket: 60 kuraterte true-and-tested økter (bolker per nivå, filter, start)
  kjor.js               øktspilleren: review + kjøre-UI (guide/sekvens/pust/fasetimer), delvis teller
  niva.js               motor: XP (spec-formel), registrerBevegelse, globalt nivå
  historikk.js          Aktivitet-skjerm: Historikk (heatmap/volum/donut/balanse/logg) + Prestasjoner
  kalender.js           Mosjonskalender: ukeliste, planlegg bibliotekøkter på dato
  sync.js               skysync: magic-link-auth + PostgREST + last-write-wins-fletting
  strava.js             Strava-broen: krediterer importerte Garmin-økter (XP på enheten) + innstillingskort
  belonninger.js        belønningsnivå (uendelig kurve) + stige: gjenstander/miljøer/temaer/varme titler/øvelser
  rng.js                seeded PRNG (mulberry32) + stokk/trekk — ingen Math.random()
  ui.js                 DOM-hjelpere + inline SVG-ikonsett
  animasjon.js          animasjonsverktøykasse: tallOpp, lagRing, lagKonfetti, fyllInn
  config.js             Supabase-URL/nøkkel + app-versjon
data/
  okter.json            øktbiblioteket: 60 kuraterte økter (10 kategorier × 3 skillnivåer × 2 intensiteter)
  exercises.json        ~530 øvelser (øvelsesoppslaget)
  equipment.json        utstyrsnavn (for oppslaget)
  (øvrige datafiler fra generator-æraen ligger igjen som inert arkiv)
  parts/                mellomsteg fra konverteringen (sporbarhet)
scripts/
  validate.mjs          validerer data/ (referanser + tellinger) — kjør til grønt
  valider-okter.mjs     validerer øktbiblioteket (celler, skjema, kilder) — kjør til grønt
  merge-parts.mjs       bygger exercises.json + sequences.json fra parts/
  gen-icons.mjs         genererer PWA-ikoner
  smoke-niva.mjs        headless test: XP, opprykk gated på bevis, momentum/decay/PR/gateway
  smoke-bevegelse.mjs   headless test: XP-formelen, fri bevegelse, Momentum, Dagens gnist, opplåsinger
  smoke-sync.mjs        headless test: last-write-wins-fletting (profil + logg per id)
  smoke-belonninger.mjs headless test: uendelig kurve, Mova-stigen, varme titler, gjenstandsopplåsing
  smoke-strava.mjs      headless test: Strava-broen (mapping, kreditering, dedupe, sletting, plan)
  strava-abonner.mjs    engangs: opprett/list/slett Stravas webhook-abonnement
supabase/
  functions/strava/     Edge Function: Strava OAuth + webhook → session_logs (se docs/strava-integrasjon.md)
  migrations/           SQL: strava_koblinger + strava_config
docs/                   kildedokumenter + avvikslogg + strava-integrasjon.md
manifest.webmanifest    PWA-manifest
sw.js                   service worker (offline-first)
```

## Data-pipeline

Kildedokumentene i `docs/` (`treningsapp-v2-bibliotek.md` m.fl.) er konvertert til
`data/parts/*.json`, slått sammen av `scripts/merge-parts.mjs`, og validert av
`scripts/validate.mjs`. Alle normaliseringer og tolkninger er logget i `docs/avvik.md` —
ingen stille fiksing.

```sh
node scripts/merge-parts.mjs   # parts/ → exercises.json + sequences.json
node scripts/validate.mjs      # sjekk referanser + tellinger (exit 0 = grønt)
```

## Data-arkitektur

- **Statisk biblioteksdata** (øvelser, formater, maler, utstyr, bunker) = JSON i repoet.
- **Brukertilstand** (profil, logg, genererte økter) = localStorage primært, Supabase som sync.
- **Offline-first:** localStorage er primærkilden; Supabase er sync. Service-workeren
  cacher app-skall + data, så appen fungerer offline etter første last.

### Sync-strategi (M2/M5) — implementert

Supabase brukes kun til brukertilstand (`profiles`, `session_logs`, `generated_sessions`),
med **RLS owner-only** (`auth.uid() = user_id` på all CRUD) og **e-post magic link**. Hver
rad har en `data jsonb`-kolonne (hele klientobjektet — framtidssikkert mot skjemaendringer)
og et `oppdatert`-stempel. Sync er **last-write-wins per rad**: klienten *henter* fjernrader,
fletter (nyeste `oppdatert` vinner) inn i localStorage, og *skyver* den flettede tilstanden
opp igjen. localStorage skrives alltid først — appen blokkerer aldri på nett, og alt fungerer
uten innlogging. `js/sync.js` snakker direkte med GoTrue + PostgREST via `fetch` (ingen SDK,
ingen byggesteg). Flett-logikken er ren og testet i `scripts/smoke-sync.mjs`.

**Ta i bruk skysync (engangsoppsett i Supabase-dashbordet):**

1. **Authentication → URL Configuration → Redirect URLs:** legg til GitHub Pages-URL-en
   (f.eks. `https://<bruker>.github.io/CRM-salgssystem/`) og `http://localhost:8000` for lokal
   testing. Magic-link-lenka returnerer hit med tokens i URL-fragmentet.
2. **Authentication → Email:** standard Supabase-e-post fungerer for lav volum; sett opp egen
   SMTP for produksjon. E-postbekreftelse må være på (magic link).
3. I appen: **Innstillinger → Skysync** → skriv e-post → klikk lenka i innboksen. Samme e-post
   på en annen enhet gir delt tilstand.

Skjemaet (kolonner, RLS-policyer, `data`-payload) ligger som migrasjoner i Supabase-prosjektet
(ref `rkvphgbfyfymilzwgmgp`).

## Arkiv

Den forrige Ringeliste-CRM-en ligger i branchen `arkiv/crm` (full git-historikk +
`supabase-dump-crm.sql` med skjema og data). Supabase-prosjektet er samme ref som før,
men tømt for CRM-innhold.
