# F1-konvertering — felles spesifikasjon (intern arbeidsspesifikasjon)

Denne spesifikasjonen styrer konverteringen av `docs/treningsapp-v2-bibliotek.md`
til `data/`-filene. Kilde = fasit. Åpenbare skrivefeil kan normaliseres, men alle
avvik/tolkninger SKAL logges (samles i `docs/avvik.md`).

## Exercise-skjema (data/exercises.json — objekter i array)

```json
{
  "id": "push-up",
  "navn": "Push-up",
  "monster": "push-h",
  "modaliteter": ["STY"],
  "niva": 2,
  "type": "reps",
  "unilateral": false,
  "impact": "lav",
  "kjede": "push-h",
  "kjedePos": 4,
  "varianter": [ { "utstyr": ["kv"] } ],
  "tags": [],
  "notat": "variant: KB-håndtak (nøytral)"
}
```

Regler:
- **id**: slug av navn: små bokstaver, æ→ae, ø→o, å→a, é→e, mellomrom og `/`→`-`,
  parenteser og øvrige tegn fjernes, ingen doble bindestreker. Eks: «Diamant/smal push-up»
  → `diamant-smal-push-up`, «Bulgarsk splittknebøy» → `bulgarsk-splittkneboy`.
- **navn**: nøyaktig som i kilden (uten ⚡).
- **monster** (tillatte verdier): `push-h, push-v, pull-v, pull-h, kneboy, hengsel,
  utfall, baering, core-antiekst, core-antirot, core-lat, core-rot, core-flex,
  core-heng, lokomotorisk, hopp, balanse, helkropp, mobilitet, skill, pust, flyt`.
  Normaliseringer fra kilden: `antiekst`→`core-antiekst`, `antirot`→`core-antirot`,
  `core-antiekst/antirot` beholdes, `knebøy`→`kneboy`, `bæring`→`baering`,
  `core` (bare) →`core-flex`. Yoga-posisjoner og pilates-øvelser: `flyt`
  (unntak: balanseposisjoner → `balanse`). Tøying: `flyt`. B2-kondisjonsmaskinøkter:
  `lokomotorisk`.
- **modaliteter**: §2–5 → `["STY"]` · §6 → `["CORE"]` · §7 → `["PLYO"]` ·
  §8 → `["HIIT","MET"]` · §10–11 → `["YOGA"]` · §12 → `["PIL"]` · §13 → `["STR"]` ·
  §14 → `["MOB"]` · §19–21 → `["STY"]` · §22 → som Modalitet-kolonnen (f.eks.
  `["BASE"]`, `["HIIT"]`, `["HIIT","MET"]`; «test» → `["BASE"]` + tag `test`) ·
  §23 → `["PIL"]` · §24 → `["MET","HIIT"]` (tauklatring: `["STY","SKILL"]`) ·
  §25 → styrkepregede → `["STY"]`, hoppetau → `["HIIT"]`, band/mini-band
  rehab/aktivering → `["STY","MOB"]` etter skjønn · §26 → `["BASE","HIIT"]` ·
  §27 → `["REST","MOB"]`.
- **niva**: tallet i Nv-kolonnen (1–5).
- **type**: `reps|tid|hold|dist|pust|flyt`. «reps u» → type `reps` + `unilateral: true`.
  «pust/tid» → `tid`. «reps ⚡» → reps + impact hoy. Yoga «flyt» → `flyt`.
- **unilateral**: true hvis «u» i typen (eller «hold u»/«dist u»).
- **impact**: `hoy` ved ⚡, ellers `lav`.
- **kjede/kjedePos**: kun for øvelser som inngår i en progresjonskjede (§1 + §20).
  Kjede-ID-er: `push-h, push-v, dips, pull-h, pull-v, kneboy, skrimp, hengsel, utfall,
  core-antiekst, hollow, core-heng, handstaende, kb-press, kb-swing, tgu,
  kneboy-stang, markloft, benkpress, press-stang, ol-loft, tau-linja`.
  kjedePos = 1-basert posisjon i kjeden. Øvelser utenfor kjeder: `"kjede": null,
  "kjedePos": null`.
- **varianter**: minst én, med `utstyr` = array av utstyrs-IDer fra
  `docs/treningsapp-v2-utstyr.md` (kv, kb, ringer, matte, band-lang, manualsett, …).
  Kildekoder: KV→`kv`, KB→`kb`, R→`ringer`, M→`matte`, (B)→`band-lang`,
  KB+M→`["kb","matte"]`, R+M→`["ringer","matte"]`. Del 2 bruker ID-ene direkte:
  «manualsett, benk-flat» → `["manualsett","benk-flat"]`.
  Varianter nevnt i notat (f.eks. push-up: KB-håndtak) legges som ekstra variant
  med `navnOverstyr` og ev. `nivaJust`.
- **tags**: `iso` (iso-merkede), `yin`, `test`, `maal-skill` («mål-skill» i notat),
  `skulderhelse`, fokus-tags for yoga (f.eks. `balanse`, `ryggboy`, `hofter`) og
  område-tags for tøying (`nakke`, `rygg`, `hamstrings`, …), `statisk|dyn|pnf`
  for tøying, pilates-prinsipper ikke nødvendig per øvelse.
- **notat**: Notat-kolonnen ordrett (uten variant-info som er strukturert bort), ellers utelat feltet.

## Ekstra felt for spesialtilfeller
- §22 B2: legg `"protokoll"`-tekst i notat (f.eks. «Z2», «4×4»).
- Vektvest er IKKE en øvelse — modifikator, håndteres sentralt (ikke i parts-filene).

## Utstyrs-IDer (gyldige)
kv vegg stol trapp handkle sekk · matte kb manualer band-mini band-lang hoppetau
pullup ringer trx abwheel paralletter glidere vektvest medisinball slamball kasse
sandsekk foamroller massasjeball balansepute · yogablokk yogastropp bolster teppe
pilatesring ball-liten ball-stor · reformer cadillac wundachair barrel · stang
skiver bumper ezstang trapbar rack benk-flat benk-just manualsett kbsett landmine
dipstativ ghd pullup-rigg · kabel latpulldown kabelro beinpress legext legcurl
smith multimaskin maskinpark · tredemolle romaskin spinsykkel assaultbike skierg
stepper ellipse · slede battleropes wallball klatretau · ute tuftepark bakke
benk-ute sykkel

## Leveranseformat per del-fil (data/parts/*.json)

```json
{ "exercises": [ ... ],
  "avvik": [ "beskrivelse av hver normalisering/tolkning/uklarhet" ] }
```

Alle rader i kildens tabeller skal med — ingen utelatelser, ingen påfunnede øvelser.
Tell raden i kilden og oppgi antallet i avvik-listen som «konvertert N rader fra §X».
