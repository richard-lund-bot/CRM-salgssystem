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
| M2 | Supabase-skjema for brukertilstand | ⏳ |
| M3 | Onboarding + generator + kjøre-UI | ✅ |
| M4 | Logging, nivåsystem (base + momentum/decay), gateways, historikk | ✅ |

> M3–M4 kjører helt på localStorage (offline-first). M2/M5 (Supabase-sync av
> brukertilstand på tvers av enheter) er ikke en blokker og tas senere.

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
- **Brukertilstand** (profil, logg, genererte økter) = localStorage nå, Supabase-sync i M2/M5.
- **Offline-first:** localStorage er primærkilden; Supabase er sync. Service-workeren
  cacher app-skall + data, så appen fungerer offline etter første last.

### Sync-strategi (M2/M5)

Supabase brukes kun til brukertilstand (`profiles`, `session_logs`, `generated_sessions`),
med RLS owner-only og e-post magic link. Sync er **last-write-wins per rad** i v1: hver rad
bærer et tidsstempel, og nyeste vinner ved konflikt. localStorage skrives først (appen
blokkerer aldri på nett), og en synkkø tømmes mot Supabase når nett er tilgjengelig.

## Arkiv

Den forrige Ringeliste-CRM-en ligger i branchen `arkiv/crm` (full git-historikk +
`supabase-dump-crm.sql` med skjema og data). Supabase-prosjektet er samme ref som før,
men tømt for CRM-innhold.
