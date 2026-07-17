# mova — Move for Life.

Bevegelsesapp der **all bevegelse teller**: en gåtur, en kuratert styrkeøkt, en
fotballkamp eller hagearbeid tenner dagens gnist, bygger streaks og låser opp
merker — «prøv noe nytt», milepæler og mye mer. Øktbiblioteket (60 true-and-tested økter)
er én av flere veier inn — ikke hele appen. Vanilla HTML/CSS/JS, ingen byggesteg, installerbar som PWA.
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
| M12 | Min dag-dashbord: hvitt banner m/ ukeskalender, dagsfase-hero, statkort, bevegelsesgrid, mosjonskalender | ✅ |
| M13 | Øktbiblioteket erstatter generatoren: 60 kuraterte økter, review/kjøring, preferanse-først onboarding | ✅ |
| M14 | Strava-broen: Garmin-økter inn i Mova automatisk (webhook → kreditering på enheten) | ✅ |
| M15 | Merker erstatter Min reise: 40 merker (streaks, prøv noe nytt, milepæler …), nivå som boble på profilikonet, felles faneside-design, stor opprydding (figur/reise/generator-rester ut) | ✅ |
| M54 | Streaks i stedet for XP: gnist-motoren (`js/gnist.js`) med dagsterskler per pilar, røde gnist-streaks og blå blue zone-flamme som kjernemåling på Hjem; XP/nivå fjernet overalt, Blå flamme-merker, blå fullskjermsfeiring | ✅ |

> Appen er offline-first: localStorage er alltid primærkilden, og alt fungerer
> uten innlogging. Skysync er opt-in — logg inn med e-post i Innstillinger for å
> dele profil, logg og streaks mellom enheter.
>
> **Kjerneloopen (M54 — streaks i stedet for XP):** åpne appen → gjør dagens
> små valg per pilar → røde gnister tennes → tenner du alle fire samme dag er
> dagen BLÅ → den blå flammen (blue zone-streaken) på Hjem vokser → kom
> tilbake i morgen.
>
> **Gnist-systemet (`js/gnist.js`):** hver pilar har en lav dagsterskel —
> bevegelse 10 min, mat 3 gode valg, ro én rolig økt, sosialt ett godt valg.
> Terskel nådd = rød gnist tent; sammenhengende dager bygger pilarens
> gnist-streak, og dager der ALLE gnistene tennes bygger den blå flammen —
> kjernemålingen på hjemskjermen. Alt avledes av loggene ved lesetid
> (ingenting lagres, ingenting kan «mistes»); nådefristen gjør at dagens gnist
> alltid kan komme før døgnet er omme.
>
> **Tre lag progresjon:** *gnister/blå flamme* (dagsrytmen, `js/gnist.js`),
> *merker* (60 stk utledet av loggene: streaks, blå flamme, «prøv noe nytt»,
> milepæler, tid, døgnet rundt, comeback m.m., `js/merker.js`) og *Momentum*
> (rytme over rullerende 7 dager — aldri en streak som «ryker»,
> `js/bevegelse.js`).

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
css/app.css             stil (Mova-designsystemet, mobil først)
js/
  app.js                inngang, ruter, tab-bar (Hjem/Trening/Profil/Treningsbibliotek/Lær), Min dag (Trening), meny + innstillinger
  feed.js               Hjem-fanen: spillbar lærings-feed i sosial-drakt (gradientkort, 7 minispill, aksjonsrail, varsel-skyveside, kommentarpanel)
  banner.js             det hvite toppbanneret (profil m/ nivåboble, wordmark, ukeskalender) + sidetittel
  bevegelse.js          bevegelseslaget: 12 bevegelsestyper, dags-streak, Momentum, Dagens gnist
  beveg.js              hurtigstart m/ timer, manuell logg, «Du beveget deg»-skjermen (Beveg-fanen er øktbiblioteket)
  merker.js             merkesystemet: 60 merker utledet av loggene + Profil-skjermen
  library.js            laster + indekserer statiske data (offline-first)
  store.js              brukertilstand i localStorage (Spor-mønster)
  onboarding.js         4-skjerms onboarding, preferanse-først (motivasjon, favorittbevegelser, ukemål, navn)
  bibliotek-okter.js    øktbiblioteket: 60 kuraterte true-and-tested økter (bolker per nivå, filter, start)
  kjor.js               øktspilleren: review + kjøre-UI (guide/sekvens/pust/fasetimer), delvis teller
  gnist.js              gnist-motoren: dagsterskler per pilar, røde gnist-streaks, blå flamme
  historikk.js          Aktivitet-skjerm (nås fra Trening-området på Profil): Historikk + Prestasjoner
  kalender.js           Mosjonskalender: ukeliste, planlegg bibliotekøkter på dato
  sync.js               skysync: magic-link-auth + PostgREST + last-write-wins-fletting
  strava.js             Strava-broen: bokfører importerte Garmin-økter (teller mot gnisten) + innstillingskort
  ui.js                 DOM-hjelpere + inline SVG-ikonsett
  animasjon.js          animasjonsverktøykasse: tallOpp, lagRing, lagKonfetti, fyllInn
  config.js             Supabase-URL/nøkkel + app-versjon
data/
  feed.json             lærings-feeden (engelsk): 100 innlegg m/ minispill + 32 fiktive guider (fra Aha-seed, kildelenket)
  feed.nb.json          norsk oversettelse av feeden (standardspråk) — bygd fra samme kilde
  okter.json            øktbiblioteket: 60 kuraterte økter (10 kategorier × 3 skillnivåer × 2 intensiteter)
  exercises.json        ~530 øvelser (øvelsesoppslaget) — bygges av merge-parts.mjs
  equipment.json        utstyrsnavn (for oppslaget)
  chains.json           progresjonskjeder (input til merge-parts)
  sequences.json        yoga-sekvenser + KB-complexer (bygges av merge-parts)
  parts/                mellomsteg fra konverteringen (sporbarhet)
scripts/
  validate.mjs          validerer data/ (referanser + tellinger) — kjør til grønt
  valider-okter.mjs     validerer øktbiblioteket (celler, skjema, kilder) — kjør til grønt
  merge-parts.mjs       bygger exercises.json + sequences.json fra parts/
  gen-icons.mjs         genererer PWA-ikoner
  smoke-bevegelse.mjs   headless test: bevegelsestypene, Momentum, Dagens gnist
  smoke-gnist.mjs       headless test: gnist-motoren (terskler, røde gnister, blå flamme)
  smoke-merker.mjs      headless test: merkemotoren (alle 60 merker + nyeMerker-diffen)
  smoke-sync.mjs        headless test: last-write-wins-fletting (profil + logg per id)
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

- **Statisk biblioteksdata** (økter, øvelser, utstyr) = JSON i repoet.
- **Brukertilstand** (profil + logg) = localStorage primært, Supabase som sync.
- **Offline-first:** localStorage er primærkilden; Supabase er sync. Service-workeren
  cacher app-skall + data, så appen fungerer offline etter første last.

### Sync-strategi (M2/M5) — implementert

Supabase brukes kun til brukertilstand (`profiles`, `session_logs`),
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
