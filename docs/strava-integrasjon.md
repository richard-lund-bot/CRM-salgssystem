# Strava-broen (M14) — Garmin-økter inn i Mova automatisk

## Hvorfor Strava?

Garmins offisielle utviklerprogram tar ikke imot nye søknader (pauset våren
2026), så direkteintegrasjon mot Garmin er blokkert inntil videre. Garmin
Connect har derimot innebygd auto-videresending til Strava, og Stravas API er
åpent for personlige apper. Ruta blir:

```
Garmin-klokke → Garmin Connect → (auto-synk) → Strava
   → webhook → Supabase Edge Function `strava`
   → rad i session_logs (data.xp = null)
   → appen fletter inn ved neste synk, gir XP på enheten,
     huker av ev. planlagt økt samme dag
```

Kun retningen **inn** i v1. Push av økter til klokka krever Garmins
Training API — vi står i kø til programmet gjenåpner
(connect-support@developer.garmin.com).

## Arkitektur

- **Edge Function `strava`** (`supabase/functions/strava/`) deployes med
  `verify_jwt: false` — Strava kaller uten Supabase-JWT. Ruter:
  `GET /koble` (Bearer → OAuth-URL), `GET /callback` (kode → tokens →
  kobling + 30 dagers backfill), `GET|POST /webhook` (handshake + hendelser,
  200 innen 2 s, jobben kjører i `EdgeRuntime.waitUntil`),
  `POST /frakoble` (deauthorize + slett kobling).
- **`strava_koblinger`** (migrasjon i `supabase/migrations/`): tokens per
  bruker. RLS: klienten kan bare lese metadata-kolonner (kolonne-grant) og
  slette egen rad — tokens leses kun med service role.
- **`strava_config`**: nøkkel/verdi-fallback for secrets (RLS uten policies
  = kun service role). Env-secrets i dashboardet vinner om de finnes.
- **XP kun på enheten.** Profilen synkes som hel blob (last-write-wins);
  serveren rører den aldri. Webhooken skriver rader med `data.xp = null`;
  `js/strava.js → krediterNye()` kjører mellom pull og push i hver
  synk-runde (`sync.settEtterPull`), gir XP via `registrerBevegelse`, og
  fører hovedboka `profil.stravaKreditert` (siste 200 id-er) — hovedbok og
  XP bor i samme LWW-objekt og kan aldri sprike, så to enheter
  dobbelkrediterer ikke.
- **Sletting er soft**: flettingen i appen er union-only, så webhooken
  setter `data.slettet = true` i stedet for å slette raden; appen rydder
  lokalt. XP reverseres ikke i v1.
- **Datoer**: Stravas `start_date_local` har falsk Z-suffiks. Radens
  `data.dato` bruker `start_date` (ekte UTC); `dato`-kolonnen bruker den
  lokale dagen.
- **Mapping** (`supabase/functions/strava/mapping.js`, delt med
  smoke-testen): Run/TrailRun/VirtualRun→run · Walk/Hike/Snowshoe→walk ·
  Ride-varianter→bike · WeightTraining/Crossfit→strength · Yoga/Pilates→yoga
  · HIIT→hiit · ball/racket/ski/padling/svømming→sport (med tittel) ·
  Workout/Elliptical/StairStepper/ukjent→custom. Intensitet fra snittpuls:
  <110→2, 110–139→3, 140–159→4, ≥160→5 (ellers 3). Varighet =
  `max(1, round(moving_time/60))`.

## Oppsett (én gang)

### Richards del

1. **Strava-abonnement** kreves for å lage en API-app. Gå til
   strava.com → Settings → **My API Application**:
   - Authorization Callback Domain: `rkvphgbfyfymilzwgmgp.supabase.co`
   - Noter **Client ID** og **Client Secret**.
2. Gi Client ID + Secret videre (settes som secrets, se under).
3. **Garmin Connect-appen** → Innstillinger → Tilkoblede apper → **Strava**
   → koble til, med automatisk opplasting på.
4. **Mova** → Innstillinger → logg inn med skysync om nødvendig →
   **«Koble til Strava»** → godkjenn hos Strava (single-player-app: kun din
   konto kan koble til).
5. Test: registrer en kort aktivitet på klokka — den skal dukke opp i Mova
   like etter at Garmin har lastet den opp til Strava.

### Server-oppsettet (kjøres med Supabase-tilgang)

1. Kjør migrasjonen `supabase/migrations/20260710120000_strava_koblinger.sql`
   (MCP `apply_migration` eller SQL-editoren).
2. Sett secrets — enten som Edge Function-secrets i dashboardet, eller som
   rader i `strava_config` (samme nøkkelnavn):
   `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`,
   `STRAVA_VERIFY_TOKEN` (valgfri streng), `STATE_SECRET` (32 tilfeldige
   byte), `APP_URL` (`https://richard-lund-bot.github.io/CRM-salgssystem/`).
3. Deploy funksjonen: filene i `supabase/functions/strava/` med
   `verify_jwt: false`.
4. Verifiser med curl:
   - `GET …/functions/v1/strava/webhook?hub.verify_token=<riktig>&hub.challenge=abc`
     → `{"hub.challenge":"abc"}`; feil token → 403.
   - `POST …/webhook` med `{"object_type":"activity","aspect_type":"create","object_id":1,"owner_id":999}`
     → 200 (ukjent athlete = stille no-op).
   - `GET …/koble` uten Authorization → 401.
5. Opprett webhook-abonnementet (én per app, ETTER deploy):
   `STRAVA_CLIENT_ID=… STRAVA_CLIENT_SECRET=… STRAVA_VERIFY_TOKEN=… node scripts/strava-abonner.mjs`
   (`--list` viser, `--slett <id>` fjerner).

## Testing

- `node scripts/smoke-strava.mjs` — mapping, kreditering, hovedbok-dedupe,
  soft delete og plan-avhuking (ingen DOM/nett).
- Seedet E2E: sett inn en rad i `session_logs` med id `strava-test-…`,
  `data.xp = null`, `kilde:'strava'` for en ekte bruker → åpne appen, synk →
  XP krediteres, raden vises i Aktivitet med «Importert fra Strava
  (Garmin).», og en matchende plan samme dag hukes av. Sett så
  `data.slettet = true` → raden forsvinner ved neste synk.

## Kjente avgrensninger (v1)

- XP reverseres ikke om en aktivitet slettes i Strava etter kreditering.
- Backfill ved tilkobling er bevisst begrenset til siste 30 dager (maks 50).
- Aktiviteter som Garmin/Strava markerer som private følger
  `activity:read_all`-scopet og importeres.
- Sport/annet-import gir XP med bevegelsesfaktor for `sport`/`custom` —
  detaljer (sett/reps) importeres ikke.
