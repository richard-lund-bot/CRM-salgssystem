# Treningsapp v2 — Taksonomi & arkitektur

**Status:** Fase 0 — kartlegging. Dette dokumentet + øvelsesbiblioteket er grunnmuren alt annet bygges på.
**Forhold til v1 (økt-generator.html):** v1 var én modalitet (HIIT) × ett format (tri-set 40/20) × ~55 øvelser. v2 generaliserer: tri-set blir *ett av mange* formater, HIIT *én av mange* modaliteter. v1s timer-UI, dealer/shuffle-logikk, utstyrsvarianter og Bytt-knapp gjenbrukes.

---

## 1. Arkitektur — fire lag

```
LAG 1  BIBLIOTEK   øvelser, posisjoner, kjeder, formater, økt-maler (ren data, JSON)
LAG 2  GENERATOR   input (tid/modalitet/intensitet/utstyr) → deterministisk økt m/ seed
LAG 3  NIVÅSYSTEM  logg → XP → nivå per modalitet → låser opp øvelsesnivåer (gateways)
LAG 4  HISTORIKK   logg → visninger (streak, volum, PR, fordeling, nivåprogresjon)
```

Dataflyt: Generator leser Bibliotek + Brukerprofil → produserer Økt → Økt kjøres → Logg skrives → Nivåsystem og Historikk leser Logg.

---

## 2. Dimensjon 1: Modaliteter (treningsformer)

| ID | Modalitet | Undertyper | Beskrivelse | Typiske formater |
|---|---|---|---|---|
| STY | Styrke | maksstyrke, hypertrofi, utholdende, eksplosiv | Sett/reps mot motstand (KV/KB/ringer) | straight sets, supersett, tri-set, EMOM, complex |
| HIIT | HIIT / intervall | kort (Tabata), standard (40/20), lang (4×4) | Høy puls, arbeid:hvile-styrt | intervall, sirkel, AMRAP |
| BASE | Base / rolig kondisjon | Z2-gange/løp/sykkel, trappegang | Lav puls, lang varighet, nesepust | distanse/tid i sone |
| MET | Metcon / blandet | AMRAP-økter, for time, chipper | Styrke×kondisjon i klokkeformat | AMRAP, for time, EMOM |
| SKILL | Ferdighet | håndstående, muscle-up, pistol, levers | Teknikk + spesifikk styrke, lav tretthet | GTG, EMOM, hold, straight sets |
| PLYO | Plyometrisk | hopp, spenst, reaktivitet | Eksplosivt, høy impact, lav volum | sett m/ full pause, sirkel |
| YOGA | Yoga | vinyasa/flow, power, yin, restorativ | Pust-styrte sekvenser og hold | flyt, sekvens×N, yin-hold |
| PIL | Pilates | matteserie, core-fokus | Kontroll, presisjon, "powerhouse" | sekvens, reps m/ tempo |
| STR | Tøying | statisk, dynamisk, PNF | Fleksibilitet, per kroppsområde | hold-protokoller |
| MOB | Mobilitet | CARs, leddspesifikk, flows | Aktiv leddkontroll og ROM | reps, hold, flyt |
| CORE | Core-økt | anti-ekst., anti-rot., lateral, rotasjon, heng | Dedikert kjerneøkt (også "ab break"-pool) | sirkel, EMOM, hold |
| REST | Restitusjon | pust, bodyscan, rolig gange, tøy-lett | Nedregulering, søvnkvalitet | pust-protokoller, flyt |
| HYB | Hybrid | styrke+finisher, mob+core, yoga+styrke | Kombinerer blokker fra flere modaliteter | mal-styrt blokkmiks |

---

## 3. Dimensjon 2: Tids- og settformater

Hvert format = { id, parametre, gyldige modaliteter, loggfelt }. Generatoren velger format per *blokk*, ikke per økt.

### A. Rep-baserte (styrke-klassen)
| Format | Struktur | Parametre | Loggfelt |
|---|---|---|---|
| Straight sets | N sett × M reps, pause P | sett, reps, pause, last | reps utført, last, RPE |
| Supersett | 2 øvelser rygg-mot-rygg × N | par, sett, pause | reps per øvelse |
| Tri-set | 3 øvelser × 3 runder (v1-arven) | trio, runder, arbeid/pause | fullført/skalert |
| Giant set | 4+ øvelser × N runder | liste, runder | fullført |
| Pyramide | reps opp/ned per sett (12-10-8) | repsstige, last | reps, last |
| Stige (ladder) | 1-2-3-…-N(-…-1) | topp, øvelse(r) | nådd topp |
| Drop set | til teknisk grense → lettere variant → fortsett | trinnliste | reps per trinn |
| Rest-pause | sett → 15-20 s → minisett ×2-3 | reps, pauser | totalreps |
| Cluster | intra-sett-pauser 10-15 s | klynger | reps |
| Myo-reps | aktiveringssett + 3-5×3-5 m/ 5-10 s | aktivering, minisett | totalreps |
| Tempo | f.eks. 3-1-3-0 per rep | tempo-kode | reps m/ tempo holdt |
| 21s | 7 nedre + 7 øvre + 7 hele | last | fullført |
| GTG | submaks sett spredt utover (skill) | reps, frekvens | sett logget |

### B. Klokke-baserte
| Format | Struktur | Parametre | Loggfelt |
|---|---|---|---|
| Intervall | arbeid/hvile: 40/20, 50/25, 30/30, 45/15 | arbeid, hvile, runder | fullført, skaleringer |
| Tabata | 20/10 × 8 (4 min) | øvelse(r) | runder fullført |
| EMOM | X reps hvert minutt i N min | reps, minutter | min fullført u/ brudd |
| E2MOM / alt-EMOM | annethvert min / A-B-veksling | som EMOM | som EMOM |
| AMRAP | maks runder/reps på T min | tid, runde-innhold | runder + reps |
| For time | fast arbeid, klokka teller (m/ cap) | arbeidsliste, cap | sluttid |
| Density block | maks kvalitetsreps av 1-2 øvelser på T min | tid, øvelser | totalreps |
| Stasjonsrotasjon | 1 min/stasjon × S stasjoner × R runder | stasjoner, runder | fullført |

### C. Runde-baserte
| Format | Struktur | Parametre | Loggfelt |
|---|---|---|---|
| Sirkel | N stasjoner × R runder (tid eller reps) | stasjoner, modus | runder |
| Rounds for quality | uklokket kvalitetssirkel | runder | runder, RPE |
| Complex (KB) | sekvens uten å sette fra seg × N/side | sekvens, runder | runder, last |

### D. Flyt-baserte
| Format | Struktur | Parametre | Loggfelt |
|---|---|---|---|
| Vinyasa | pust-styrt, 1 bevegelse per pust | sekvens | fullført, varighet |
| Sekvens × N | f.eks. Sol-hilsen A × 5 | sekvens, runder | runder |
| Hold-flyt | 3-5 pust per posisjon | posisjoner, pust | fullført |

### E. Hold / isometri
| Format | Struktur | Parametre | Loggfelt |
|---|---|---|---|
| Styrkehold | 3-5 × 20-60 s | tid, sett | lengste hold |
| Yin | 2-5 min per posisjon | posisjoner, tid | fullført |
| Statisk tøy | 2-3 × 30-45 s per side | område, tid | fullført |
| PNF | 5 s spenn / 10 s slipp × 3 | område | fullført |

### F. Distanse / puls
| Format | Struktur | Parametre | Loggfelt |
|---|---|---|---|
| Tid i sone | f.eks. Z2 i 40 min | sone, tid | tid, snittpuls (manuell) |
| Distanse | 5 km gå/løp | distanse | tid, distanse |
| 4×4 | 4 min Z4 / 3 min Z2 × 4 (norsk klassiker) | runder | fullført |

### G. Pust
| Format | Struktur | Parametre | Loggfelt |
|---|---|---|---|
| Box | 4-4-4-4 × N min | tid | fullført |
| 4-7-8 | × 4-8 runder | runder | fullført |
| Koherent | 5,5 pust/min × N min | tid | fullført |

### Matrise: modalitet × formatklasse
| | Reps | Klokke | Runde | Flyt | Hold | Dist | Pust |
|---|---|---|---|---|---|---|---|
| STY | ✓ | EMOM | complex | – | iso | – | – |
| HIIT | – | ✓ | ✓ | – | – | – | – |
| BASE | – | – | – | – | – | ✓ | – |
| MET | ✓ | ✓ | ✓ | – | – | ✓ | – |
| SKILL | GTG | EMOM | – | – | ✓ | – | – |
| PLYO | ✓ | ✓ | ✓ | – | – | – | – |
| YOGA | – | – | – | ✓ | yin | – | ✓ |
| PIL | tempo | – | – | ✓ | – | – | ✓ |
| STR | – | – | – | – | ✓ | – | – |
| MOB | ✓ | – | ✓ | ✓ | ✓ | – | – |
| CORE | ✓ | ✓ | ✓ | – | ✓ | – | – |
| REST | – | – | – | ✓ | ✓ | gange | ✓ |

---

## 4. Dimensjon 3: Nivåmodellen (tre separate nivåbegreper)

Dette er kjernen i «utility levels» — tre ting som ofte blandes, men må holdes adskilt i datamodellen:

### 4a. Øvelsesnivå (1-5) — egenskap på øvelsen
| Nivå | Betyr | Eksempler |
|---|---|---|
| 1 | Alle kan starte her | vegg-pushup, glute bridge, dead bug, fjellstilling |
| 2 | Grunnleggende trent | push-up, ringrow, goblet squat, planke-varianter |
| 3 | Solid base | pull-up, dips, box pistol, hollow hold, kråke-prep |
| 4 | Avansert | archer push-up, C2B, nordic eksentrisk, dragon flag tuck, vegg-HSPU |
| 5 | Elite / mål-skills | muscle-up, pistol, fri HSPU, full dragon flag, ettarms push-up |

Øvelser henger i **progresjonskjeder** (se biblioteket) — nivået = posisjon i kjeden.

### 4b. Øktintensitet (1-5) — egenskap på økten
| Trinn | Navn | RPE | Puls-sone | XP-faktor |
|---|---|---|---|---|
| 1 | Restitusjon | 1-2 | Z1 | 0,5 |
| 2 | Lett | 3-4 | Z2 | 0,8 |
| 3 | Moderat | 5-6 | Z3 | 1,0 |
| 4 | Hard | 7-8 | Z4 | 1,4 |
| 5 | Maks | 9-10 | Z5 | 1,8 |

### 4c. Brukernivå — egenskap på brukeren, per modalitet
**Basenivå** per modalitet settes i onboarding (ankertest, §15), rykker opp med XP + bevis og vedlikeholdes med streak (§12). Globalt nivå = f(total XP). Basenivået **låser opp øvelsesnivåer** i generatoren:

| Øvelsesnivå | Tilgjengelig når |
|---|---|
| 1-2 | Alltid |
| 3 | Modalitetsnivå ≥ 3 **eller** bestått gateway-test |
| 4 | Modalitetsnivå ≥ 5 eller gateway |
| 5 | Modalitetsnivå ≥ 7 eller gateway |

(+ manuell overstyring i innstillinger — appen skal aldri nekte en voksen mann å prøve.)

### 4d. Gateway-tester (opplåsingsøkter)
Korte test-økter som låser opp nivåer direkte — sterk motivasjonsmekanikk. Testbank ligger i biblioteket (del 13). Eksempler: Push L4 = 25 strikte push-ups + 10 dips. Pull L5 (MU-porten) = 12 pull-ups + 12 dips + 20 s false grip-heng.

---

## 5. Dimensjon 4: Varighetsklasser
| Klasse | Min | Passer til |
|---|---|---|
| Mikro | 5-10 | pust, mobilitet, GTG, ab-break solo, tøy ett område |
| Kort | 15-20 | HIIT kort, core, yoga morgen/kveld, skill |
| Standard | 30-40 | alt (v1-sonen) |
| Lang | 45-60 | styrke full, yoga full, base |
| Utvidet | 60+ | base, hybrid, lang yin |

## 6. Dimensjon 5: Utstyr
Fullt utstyrsbibliotek i eget dokument (`treningsapp-v2-utstyr.md`): **~76 enheter i 9 kategorier** (hverdagsting, hjemme-småutstyr, yoga/pilates-småutstyr, pilates-apparater, frivekter/rigg, maskiner, kondisjonsmaskiner, conditioning, ute) + **10 bunker** (bare kroppen → hjemme-gym → yogastudio → pilates matte/apparat → hotellgym → vanlig gym → performance-gym → ute/park).
To valgmoduser: **enkeltvalg** (sjekkbokser) eller **bunke** som utgangspunkt med finjustering. Alt løses opp til **lokasjoner** (Hjemme · Hytta · Gym · Ute) — generatoren filtrerer mot aktiv lokasjon.
Variant-modellen fra v1 videreføres og skalerer: én øvelse → flere utstyrsvarianter (push-up: gulv / ringer / KB-håndtak), generatoren velger variant etter lokasjon + «bruk jern»-preferanse. Dekningsmatrise og utvidelsespakker (manualer/stang, maskiner, pilates-apparat, conditioning) er scopet i utstyrsdokumentet.

## 7. Dimensjon 6: Bevegelsesmønstre
`push-h, push-v, pull-h, pull-v, knebøy, hengsel, utfall, bæring, core-antiekst, core-antirot, core-lat, core-rot, core-heng, lokomotorisk, hopp, balanse, pust, flyt`
Generator-regler: push:pull ≈ 1:1 over rullerende 7 dager; unilateralt pares alltid per side; maks 1 høy-impact-blokk per økt ved intensitet ≤ 3.

## 8. Dimensjon 7: Mål → ukemiks
| Mål | Anbefalt fordeling per uke |
|---|---|
| Fettap + form | 2 STY, 1 HIIT, 1 BASE, 1 REST/MOB |
| Styrke/skills (MU + HSPU) | 3 STY/SKILL, 1 HIIT, 1 MOB |
| Allsidig helse | 2 STY, 1 BASE, 1 YOGA/PIL, 1 valgfri |
| Restitusjonsuke | 1 lett STY, 1 BASE, 2 YOGA/STR, daglig pust |

Generatoren kan foreslå modalitet automatisk = største gap mot valgt ukemiks.

## 9. Øktanatomi (blokk-maler)
Alle økter = sekvens av blokker med rolle:
```
[oppvarming] → [hovedblokk 1] → [hovedblokk 2?] → [finisher?] → [nedtrapping]
```
| Mal (eksempel) | Blokker |
|---|---|
| STY standard 40 | oppv. 5 · hoved A (supersett, 15) · hoved B (tri-set, 12) · finisher (Tabata core, 4) · tøy 4 |
| HIIT kort 20 | oppv. 4 · 2 tri-sets 40/20 m/ ab-break · pust 2 |
| YOGA flow 30 | ankomst/pust 3 · Sol A ×3 · stående sekvens · gulvsekvens · savasana 5 |
| BASE 45 | Z2 gange/løp 40 · tøy legger/hofter 5 |
| SKILL 25 | håndleddsoppv. 5 · HS-hold EMOM 8 · MU-drag GTG 8 · scapula 4 |
| REST 15 | koherent pust 5 · yin 2 posisjoner 8 · bodyscan 2 |

## 10. Datamodell (JSON-skisse)
```json
Exercise   { "id", "navn", "monster", "modaliteter": [], "niva": 1-5,
             "type": "reps|tid|hold|dist|pust", "unilateral": bool,
             "impact": "lav|med|hoy", "kjede": "id?", "kjedePos": n,
             "varianter": [{ "utstyr": ["id"], "navnOverstyr?", "nivaJust?" }], "tags": [] }
Equipment  { "id", "navn", "kategori", "attributter": {} }
Bundle     { "id", "navn", "inkluderer": [], "varierer": [] }
Format     { "id", "navn", "klasse", "parametre": {}, "loggFelt": [] }
Template   { "id", "modalitet", "varighetsklasse",
             "blokker": [{ "rolle", "format", "min", "filter": {} }] }
Session    { "id", "seed", "dato", "templateId", "lokasjon",
             "blokker": [{ "format", "ovelser": [], "parametre": {} }] }
Log        { "id", "dato", "modalitet", "varighetMin", "intensitet",
             "xp", "lokasjon", "blokkResultat": [], "prs": [], "notat" }
Profile    { "lokasjoner": [{ "navn", "bundleId?", "utstyr": [], "attributter": {} }],
             "aktivLokasjon": "navn", "ukemiks": "malId", "ukemaal": 4,
             "motivasjon": { "vekter": {}, "formatVekter": {}, "oppdatert": "dato" },
             "nivaer": { "STY": { "base", "xp", "momentum", "sisteOkt",
                                  "verifisert": [], "rusten": [] }, "...": {} },
             "pauseTil": null, "innstillinger": {} }
```

## 11. Generator-pipeline (skisse)
1. **Input:** tid, modalitet (eller «foreslå» = ukemiks-gap × motivasjonsvekt, §15), intensitet, fokusområde? Utstyr fra profil.
2. **Velg mal:** modalitet × varighetsklasse.
3. **Per blokk:** filtrer bibliotek → (modalitet ∩ utstyrsvariant finnes i aktiv lokasjon ∩ nivå ≤ ulåst ∩ mønsterkrav ∩ impact-regel).
4. **Dealer m/ seed** (v1-logikk): mønsterbalanse, ingen gjentak av samme øvelse siste 3 økter (annet ledd i samme kjede er lov).
5. **Review-skjerm:** Bytt per øvelse (samme filter), regenerer blokk, lås økt.
6. **Kjøring:** v1-timeren for klokkeformater; ny «guide-modus» (neste/forrige, hold-nedtelling, pustetakt) for flyt/hold/reps.

## 12. Nivåsystem 2.0 — base + momentum (alt justerbart)

**Designprinsipp:** Nivået skal bety noe fysisk. Streak beviser *vane*, prestasjon beviser *kapasitet* — derfor to komponenter som vises som ett tall med en pil ved siden av.

### 12a. Basenivå (kapasitet) per modalitet
- **Startnivå** settes i onboarding via ankertest (§15) — konkrete prestasjonsspørsmål, ikke selvvurdering.
- **Opprykk krever begge:** XP-terskel (100 × nivå^1,5) **og** bevis — enten ≥5 loggede økter med fullførte øvelser på nåværende toppnivå, eller bestått gateway. XP alene rykker deg aldri opp; det er dette som gjør nivået logisk.
- Gateway = hurtigspor forbi XP-terskelen.
- Selvrapport i onboarding kan låse opp t.o.m. øvelsesnivå 4; øvelsesnivå 5 krever alltid gateway.
- Verifiserte gateways slettes aldri (se «rusten» under).

### 12b. Momentum (konsistens) per modalitet
| Tilstand | Trigger | Effekt |
|---|---|---|
| Aktiv ↑ | økt i modaliteten siste 10 d | normal + streakbonus |
| Kjølig → | 10–21 d uten økt | mildt varsel; generator foreslår kort vedlikeholdsøkt |
| Comeback ↓ | >21 d uten økt | effektivt nivå −1, comeback-økt, dobbel XP første uke tilbake |

### 12c. Decay (nedlevling) — kalibrert mot faktisk detrening
Fysiologien: kondisjon faller raskt (uker), styrke tregere, ferdighet tregest — og gjenvinnes raskest («muscle memory»). Derfor per modalitet, ved full inaktivitet:

| Modalitet | Grace | Deretter |
|---|---|---|
| HIIT / BASE | 2 uker | −1 base per 3 uker |
| MOB / STR | 2 uker | −1 base per 3 uker |
| STY / YOGA / PIL / CORE | 3 uker | −1 base per 4 uker |
| SKILL | 4 uker | −1 base per 6 uker |

- **Rusten i stedet for slettet:** verifiserte nivåer låses midlertidig ved decay; én re-test gjenoppretter dem umiddelbart. Ingen mister muscle-up-nivået sitt permanent av en ferie.
- **Gulv:** base faller aldri under 1, og aldri mer enn 2 trinn under høyeste beviste punkt uten at re-test tilbys først.
- **Pause-modus** (innstillinger) fryser decay ved ferie/sykdom, maks-varighet TBD.
- Enhver økt i modaliteten nullstiller decay-klokka — også en 10-min mikroøkt. Det gjør vedlikehold billig og retur attraktiv.

### 12d. XP og streak (motoren)
- **XP per økt** = minutter × intensitetsfaktor (tab. 4b), rundet.
- **Bonuser:** PR +20 · ny øvelse +10 · gateway bestått +50 · comeback-uke ×2 · uke på ukemål +10 %.
- **Streak defineres mot personlig ukemål** (fra onboarding), ikke per dag: «uker på rad med ≥ mål». Hviledager knekker aldri streaken; REST-økter teller.
- Streak-effekt: XP-bonus, nullstilt decay-klokke, momentum ↑. Streak alene rykker ikke opp base (12a).
- **Globalt nivå:** samme kurve på total-XP med konstant 250 — ren spill-lag-pynt, gater ingenting.

### 12e. Slik henger det sammen
Opprykk krever kapasitet (bevis) · nedrykk følger detrening (kalibrert decay) · streak beskytter mot nedrykk og akselererer opprykk · comeback straffer aldri retur. Én synlig tall per modalitet (base) + momentum-pil.

## 13. Historikk — visninger
1. Kalender-heatmap m/ streak-teller
2. Ukesvolum (minutter + XP, stolper)
3. Modalitetsfordeling (donut) vs. valgt ukemiks
4. Nivåkort per modalitet m/ progressbar + globalt nivå
5. PR-tavle per øvelse (maks reps / lengste hold / beste tid / tyngste last)
6. Mønsterbalanse push vs. pull siste 30 dager
7. Gateway-status (låst/ulåst-kart — «skill tree»)
8. Øktlogg-liste m/ detaljvisning og notater

## 14. Veikart
| Fase | Innhold |
|---|---|
| F0 | ✅ Dette dokumentet + øvelsesbibliotek |
| F1 | Bibliotek → `exercises.json` + `formats.json` + `templates.json` + `equipment.json` + `bundles.json` (Claude Code) |
| F1.5 | ✅ Bygget: utvidelsespakkene A–G ligger i biblioteket del 2 (~255 nye enheter) — konverteres sammen med resten i F1 |
| F2 | Onboarding (motivasjon + ankertest + ukemål) · generator + review + kjøre-UI (utvid v1-timer, ny guide-modus) |
| F3 | Logging + XP · momentum/decay · gateways · comeback-flyt (localStorage først) |
| F4 | Historikk-visninger |
| F5 | PWA-polish, ev. Supabase-sync (Spor-mønsteret) + widget |

## 15. Onboarding & motivasjonsprofil

**Mål:** < 2 min, 5 skjermer. Alt kan tas på nytt i innstillinger («Ta profilen på nytt» — nullstiller vekter og startnivå-forslag, rører aldri logg/XP).

### Skjerm 1 — «Hva motiverer deg?» (velg inntil 3, ranger → vekt 3/2/1)
| Svar | Modalitetsvekt | Formatvekt | Hjem-skjermen ledes av |
|---|---|---|---|
| Stabil rutine | jevnt fordelt | korte økter, mikro synlig | streak-ring |
| Mestre nye øvelser | SKILL +3, STY +2 | GTG, EMOM, hold | skill tree / gateways |
| Bli sterkere | STY +3 | straight sets, supersett, complex | PR-tavle |
| Bedre kondis | HIIT +2, BASE +2 | intervall, 4×4 | ukesvolum |
| Ro / mindre stress | REST +3, YOGA +2, STR +1 | flyt, yin, pust | kveldskort |
| Fysikk / se resultater | STY +3, HIIT +2 | supersett, myo-reps, density | volumgraf |
| Variasjon / lek | alle +1 | høy shuffle-entropi | «overrask meg»-knapp |

Effekt i generator: foreslått modalitet = argmax(ukemiks-gap × motivasjonsvekt); formatvalg per blokk vektes av formatVekter. Profilen styrer også hvilket toppkort hjem-skjermen viser.

### Skjerm 2 — Ankertest (setter basenivå, §12a)
Konkrete prestasjonsspørsmål — aldri «hvor god er du på en skala»:
| Spørsmål | → base |
|---|---|
| Push-ups på ett sett? | 0–4 → 1 · 5–14 → 2 · 15–24 → 3 · 25+ → 4 |
| Pull-ups? | henger <20 s → 1 · ringrows ok → 2 · 1–7 → 3 · 8+ → 4 |
| Dyp knebøy, hæler i gulvet? → bulgarsk 10/side? → box pistol? | nei → 1 · ja → 2 · +bulgarsk → 3 · +box pistol → 4 |
| Planke 60 s? → hollow 20 s? → leg raises i heng? | trapp 1–4 |
| 20 min rolig løp uten stopp? 4×4 kjent? | setter kondisjonsbase + intensitetsdefault |
| Fingre i gulvet med strake bein? Yogaerfaring? | STR/YOGA-base 1–2 |

Svarene er selvrapport → base er «uverifisert» til første gateway/loggede bevis. Ankertesten kan tas på nytt senere som offisiell re-test (gjenoppretter rustne nivåer).

### Skjerm 3 — Ukemål & tid
Økter per uke (definerer streaken, §12d) + normal øktvarighet (default varighetsklasse).

### Skjerm 4 — Hvor trener du mest?
Velg **bunke** som utgangspunkt (Bare kroppen · Hjemmegym · Yogastudio · Pilates · Hotellgym · Vanlig gym · Performance-gym · Ute — se utstyrsdokumentet) → finjuster med sjekkbokser («varierer»-utstyr merket «har stedet dette?») → lagres som første **lokasjon** («Hjemme»). Forhåndsutfylt for deg: hjemme-gym med 2×18 kg KB, ringer, matte. Flere lokasjoner (Hytta, Gym, Ute) legges til i innstillinger.

### Skjerm 5 — Din startprofil
Nivåkort per modalitet · anbefalt ukemiks · første foreslåtte økt med «Start nå»-knapp.

## 16. Grensesnitt (UI-plan)
- **Hjem (adaptiv):** toppkort styres av motivasjonsprofilen (streak-ring / skill tree / PR-tavle / kveldskort). Under: «Dagens forslag» med én-trykks start + **lokasjonsvelger-chips** (Hjemme · Hytta · Gym · Ute, husker sist brukte), momentum-piler per modalitet, kjølig-varsler formulert som tilbud («15 min vedlikehold?») — aldri skam-språk.
- **Nivå-skjerm:** per modalitet: base + momentum-pil + decay-nedtelling («Styrke: aktiv i 6 d til») · gateway-kart som skill tree med tilstander låst / ulåst / rusten.
- **Comeback-skjerm:** ved retur etter >21 d: «Velkommen tilbake»-økt (eff. nivå −1, dobbel XP). Viser aldri en liste over tapt progresjon — kun veien tilbake.
- **Innstillinger:** ta profilen på nytt · juster vekter manuelt · endre ukemål · **administrer lokasjoner** (legg til/rediger steder og utstyr) · pause-modus · manuell nivåoverstyring · «bruk jern» · full reset.
- **Historikk:** visningene i §13 + «din profil»-kort (motivasjonsvektene visualisert).

## 17. Åpne beslutninger
- localStorage først → Supabase-sync i F5, eller Supabase fra F3? (Spor-erfaringen taler for sync tidlig hvis mobil+annen enhet.)
- Globalt nivå: beholde, eller kun per-modalitet?
- Øvelsesnavn: norsk primært m/ engelsk der det er bransjestandard (valgt i biblioteket) — ev. språk-toggle senere.
- Demo-medier per øvelse (GIF/lenke) — utsatt til etter F2.
- v2 = ny fil med v1-timer som komponent (anbefalt), ikke ombygging av v1.
- Decay-tallene (grace/takt i 12c) er startgjetninger — kalibreres mot faktisk bruk etter F3.
- Pause-modus: maks lengde og om den skal «koste» noe (ellers blir den en decay-off-bryter).
- Varsler: kun in-app i v1, push-varsler vurderes i F5 (PWA-notifications).
- Momentum-terskler (10/21 d) per modalitet eller globale? (Yoga 1×/uke er normalt — kanskje terskel = f(ukemiks).)
- Maskin-granularitet: enkeltmaskiner vs. «maskinpark» samlepost — start grovt, splitt ved Pakke B.
- Vekt-attributter (KB/manualer) i v1, eller først når lastlogging kommer?
