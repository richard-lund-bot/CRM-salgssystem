# Treningsapp v2

Personlig treningsapp: genererer økter fra et bibliotek på ~530 øvelser, holder styr på
nivå per treningsform, og logger historikk. Vanilla HTML/CSS/JS, ingen byggesteg,
installerbar som PWA. Norsk UI, mobil først.

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

> Appen er offline-first: localStorage er alltid primærkilden, og alt fungerer
> uten innlogging. Skysync er opt-in — logg inn med e-post i Innstillinger for å
> dele profil, logg og nivå mellom enheter.
>
> **To nivåsystemer:** *kapasitet* per modalitet (base — tregt, meningsfylt, krever
> bevis) og *belønningsnivå* (hyppig, uten tak — gir en ny øvelse, avatar, tema
> eller tittel hvert nivå). Se `js/belonninger.js`.

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
  app.js                inngang, ruter, skjermer, onboarding-gate, adaptiv hjem
  library.js            laster + indekserer statiske data (offline-first)
  store.js              brukertilstand i localStorage (Spor-mønster) + profiloppslag
  onboarding.js         5-skjerms onboarding (motivasjon, ankertest, ukemål, sted)
  generator.js          deterministisk øktgenerator (mal → filtrerte, seedede blokker)
  kjor.js               generator-input, review, kjøre-UI, resultat-logging + XP-skjerm
  niva.js               nivåmotor: XP, opprykk (XP+bevis), momentum/decay, streak, PR, gateway
  niva-ui.js            Nivå-skjerm (base + momentum + decay) + gateway skill-tree/test
  historikk.js          §13-visninger: heatmap, ukesvolum, donut, PR-tavle, balanse, øktlogg
  sync.js               skysync: magic-link-auth + PostgREST + last-write-wins-fletting
  belonninger.js        belønningsnivå (uendelig kurve) + stige: øvelser/avatarer/temaer/titler
  rng.js                seeded PRNG (mulberry32) + stokk/trekk — ingen Math.random()
  ui.js                 DOM-hjelpere
  config.js             Supabase-URL/nøkkel + app-versjon
data/
  exercises.json        ~530 øvelser (mønster, modalitet, nivå, type, kjede, varianter …)
  chains.json           22 progresjonskjeder
  formats.json          tids-/settformater
  templates.json        øktmaler (blokk-anatomi)
  equipment.json        76 utstyrsenheter
  bundles.json          10 utstyrsbunker (steder)
  gateways.json         gateway-tester (opplåsing)
  sequences.json        yoga-sekvenser + KB-complexer
  warmups.json          oppvarming/nedtrapping
  protocols.json        pust/restitusjon
  parts/                mellomsteg fra konverteringen (sporbarhet)
scripts/
  validate.mjs          validerer data/ (referanser + tellinger) — kjør til grønt
  merge-parts.mjs       bygger exercises.json + sequences.json fra parts/
  gen-icons.mjs         genererer PWA-ikoner
  smoke-generator.mjs   headless test: determinisme + dekning + ikke-tomme blokker
  smoke-niva.mjs        headless test: XP, opprykk gated på bevis, momentum/decay/streak/PR/gateway
  smoke-sync.mjs        headless test: last-write-wins-fletting (profil + logg per id)
  smoke-belonninger.mjs headless test: hyppig uendelig kurve + belønning hvert nivå
docs/                   kildedokumenter + avvikslogg
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
