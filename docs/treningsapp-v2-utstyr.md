# Treningsapp v2 — Utstyrsbibliotek & bunker

To valgmoduser i appen: **enkeltvalg** (huk av det du har — typisk hjemme) eller **bunke** (velg et forhåndsdefinert sted som utgangspunkt, finjuster etterpå). Begge løses opp til samme ting: en liste utstyrs-IDer lagret som en **lokasjon**. Konverteres til `equipment.json` + `bundles.json` i F1.

---

## 1. Utstyrskatalog (enkeltvalg)

### A. Hverdagsting (antas PÅ som standard, kan skrus av)
| ID | Navn | Notat |
|---|---|---|
| kv | Kroppsvekt | alltid på |
| vegg | Ledig veggplass | HSPU, wall sit, ben opp veggen |
| stol | Stol / sofa / solid benk | step-up, bulgarsk, skrå push-up |
| trapp | Trappetrinn | step-ups, legghev, kondis |
| handkle | Håndkle | dislocates, isometrisk drag, glidere-erstatning |
| sekk | Ryggsekk (kan lastes) | improvisert vekt: bøker/vannflasker |

### B. Hjemme småutstyr
| ID | Navn | Notat |
|---|---|---|
| matte | Treningsmatte | |
| kb | Kettlebell(s) | attributt: antall + vekter |
| manualer | Manualer (hjemme) | attributt: justerbare?, maksvekt |
| band-mini | Miniband | |
| band-lang | Langt motstandsbånd | pallof, assist, rows |
| hoppetau | Hoppetau | |
| pullup | Pull-up-stang (dørkarm/vegg) | |
| ringer | Gymnastikkringer | |
| trx | Slynge/TRX | dekker ringrow-varianter |
| abwheel | Ab-wheel | |
| paralletter | Parallettes | L-sit, dips lav, HS-prep |
| glidere | Sliders | ellers: handkle på parkett |
| vektvest | Vektvest | |
| medisinball | Medisinball | |
| slamball | Slamball | |
| kasse | Plyokasse / solid kasse | |
| sandsekk | Sandsekk | |
| foamroller | Foam roller | restitusjon |
| massasjeball | Massasje-/lacrosseball | |
| balansepute | Balansepute/-brett | |

### C. Yoga- & pilates-småutstyr
| ID | Navn |
|---|---|
| yogablokk | Yogablokk(er) |
| yogastropp | Yogastropp |
| bolster | Bolster / stor pute |
| teppe | Teppe |
| pilatesring | Pilatesring (magic circle) |
| ball-liten | Liten pilatesball (20–25 cm) |
| ball-stor | Stor treningsball (swiss ball) |

### D. Pilates-apparater (studio)
| ID | Navn |
|---|---|
| reformer | Reformer |
| cadillac | Cadillac / tower |
| wundachair | Wunda chair |
| barrel | Ladder barrel / spine corrector |

### E. Frivekter & rigg (gym)
| ID | Navn | Notat |
|---|---|---|
| stang | Olympisk stang | |
| skiver | Vektskiver | |
| bumper | Bumper-skiver | olympiske løft/slipp |
| ezstang | EZ-stang | |
| trapbar | Trap bar | |
| rack | Squat rack / rigg | |
| benk-flat | Flat benk | |
| benk-just | Justerbar benk | |
| manualsett | Fullt manualsett (2,5–50 kg) | |
| kbsett | KB-rekke (flere vekter) | |
| landmine | Landmine | |
| dipstativ | Dip-stativ | |
| ghd | GHD | |
| pullup-rigg | Pull-up-rigg | |

### F. Maskiner & kabler
| ID | Navn |
|---|---|
| kabel | Kabeltårn / kabelkryss |
| latpulldown | Nedtrekk |
| kabelro | Sittende kabelro |
| beinpress | Beinpress |
| legext | Leg extension |
| legcurl | Leg curl |
| smith | Smith-maskin |
| multimaskin | Multimaskin (hotell-typen) |
| maskinpark | Øvrige styrkemaskiner (bryst/skulder/rygg/hofte) |

### G. Kondisjonsmaskiner
| ID | Navn |
|---|---|
| tredemolle | Tredemølle |
| romaskin | Romaskin |
| spinsykkel | Spinningsykkel |
| assaultbike | Assault bike |
| skierg | SkiErg |
| stepper | Trappemaskin/stepper |
| ellipse | Ellipsemaskin |

### H. Conditioning / funksjonelt
| ID | Navn |
|---|---|
| slede | Slede / prowler |
| battleropes | Battle ropes |
| wallball | Wall ball + mål |
| klatretau | Klatretau |

### I. Ute
| ID | Navn | Notat |
|---|---|---|
| ute | Løpe-/gåmulighet | base, intervaller |
| tuftepark | Utendørs bars (tufteparken) | pull-v ute |
| bakke | Motbakke | bakkesprint |
| benk-ute | Parkbenk | step-up, skrå push, dips |
| sykkel | Sykkel (ute) | base |

**~76 enheter.** Attributter der det trengs: `kb: { antall: 2, vekter: [18, 18] }`, `manualer: { justerbare: true, maks: 25 }`.

---

## 2. Bunker (forhåndsdefinerte steder)

Bunke = utgangspunkt, aldri fasit. «Varierer ofte» vises som egne sjekkbokser ved oppsett («Har stedet …?») og huskes per lokasjon.

| ID | Bunke | Inneholder | Varierer ofte |
|---|---|---|---|
| bare-kropp | Bare kroppen | hele A-gruppa | – |
| hjemme-minimal | Hjemme minimal | A + matte, band-lang, band-mini, hoppetau, glidere | pullup |
| hjemme-gym | Hjemmegym | A + matte, kb, ringer, band-lang, paralletter | pullup, manualer, vektvest |
| yogastudio | Yogastudio / hjemmeyoga | matte, yogablokk, yogastropp, bolster, teppe, vegg | – |
| pilates-matte | Pilates mattestudio | matte, pilatesring, ball-liten, ball-stor, band-lang, teppe | manualer (lette) |
| pilates-apparat | Pilates apparatstudio | pilates-matte + reformer, cadillac, wundachair, barrel | – |
| hotellgym | Hotellgym / lite utstyrt | tredemolle, spinsykkel, manualer (maks ~25), multimaskin, benk-just, matte | pullup, kabel, ball-stor, ellipse, romaskin |
| gym-standard | Vanlig treningssenter | manualsett, stang, skiver, ezstang, rack, benk-flat, benk-just, kabel, latpulldown, kabelro, beinpress, legext, legcurl, smith, maskinpark, kbsett, pullup-rigg, tredemolle, romaskin, spinsykkel, matte, band-lang | ringer, dipstativ, assaultbike, landmine, kasse |
| gym-performance | Performance / boks (veldig utstyrt) | gym-standard + bumper, ringer, ghd, slede, battleropes, assaultbike, skierg, kasse, wallball, klatretau, trapbar, landmine, vektvest, paralletter, sandsekk, dipstativ | klatretau |
| ute-park | Ute / park | ute, benk-ute, bakke, sekk | tuftepark, sykkel |

---

## 3. Lokasjoner (brukerens lagrede steder)

```json
"lokasjoner": [
  { "navn": "Hjemme", "bundleId": "hjemme-gym",
    "utstyr": ["kv","vegg","stol","trapp","handkle","sekk","matte","kb","ringer","band-lang"],
    "attributter": { "kb": { "antall": 2, "vekter": [18,18] } } },
  { "navn": "Hytta", "bundleId": "bare-kropp", "utstyr": ["kv","vegg","stol","trapp","handkle","sekk","ute","bakke"] },
  { "navn": "Ute", "bundleId": "ute-park", "utstyr": ["ute","benk-ute","bakke","sekk"] }
],
"aktivLokasjon": "Hjemme"
```

- Onboarding lager første lokasjon («Hjemme»). Flere legges til i innstillinger.
- Generator-input får **lokasjonsvelger** (chips: Hjemme · Hytta · Gym · Ute), husker sist brukte.
- Bytte av bundle på en lokasjon nullstiller ikke manuelle justeringer uten bekreftelse.

---

## 4. Dekningsmatrise (dagens bibliotek ~330 enheter vs. bunke)

| Bunke | Dekning | Gap |
|---|---|---|
| bare-kropp | Høy: KV-styrke, yoga, pilates-matte, tøy, mob, pust | pull-mønstre nesten null → grey-out-regel (v1-arven) |
| hjemme-minimal | + band-øvelser (Pakke E) | pull fortsatt begrenset |
| hjemme-gym | **100 % — biblioteket er bygget for denne** | – |
| yogastudio | Full | – |
| pilates-matte | Full (matteserien + småutstyr via Pakke E) | – |
| pilates-apparat | ✅ Full via Pakke C (34 apparatøvelser) | krever instruksjon |
| hotellgym | ✅ Full via Pakke A1 + multimaskin-varianter (B1) + B2 | – |
| gym-standard | ✅ Full via Pakke A + B | – |
| gym-performance | ✅ Full via Pakke A + B + D | – |
| ute-park | Full: BASE/HIIT/KV + løpedriller (F); pull via tuftepark | – |

Status: alle bunker er nå fullverdige — utvidelsespakkene A–G er bygget ut i biblioteket del 2 (`treningsapp-v2-bibliotek.md` §19–27). Variant-modellen (§5) dekker resten.

---

## 5. Variant-oppgradering av eksisterende øvelser (gratis dekning)

Variant-modellen fra v1 skalerer rett inn her: samme øvelse, ny utstyrsvariant — ingen nye bibliotekoppføringer.
| Øvelse i dag | Nye varianter |
|---|---|
| Goblet squat | manual, manualsett |
| Ringrow | trx, smith-stang, tuftepark |
| Pull-up-familien | pullup, pullup-rigg, tuftepark |
| Face pull | kabel, band-lang |
| Pallof | band-lang, kabel |
| Floor press | benk-flat + manualer (→ benkpress-variant i Pakke A) |
| RDL / swing / clean / press | manualer, kbsett (tyngre) |
| Step-up / boksdrill | kasse, benk-ute |
| Dips | dipstativ, benk-ute (negativ) |
| L-sit / HS-prep | paralletter |
| Assistert pistol/skrimp | trx, stang i rack |

---

## 6. Utvidelsespakker (✅ bygget — se bibliotek del 2, §19–28)

| Pakke | Innhold | Antall |
|---|---|---|
| **A1 Manualer** | press-/row-/iso-utvalg + 12 varianter av eksisterende | 42 |
| **A2 Stang/EZ/trapbar/landmine** | knebøy-, mark-, benk-, press- og OL-linjene + 5 nye kjeder | 44 |
| **B1 Maskiner & kabler** | beinpress→kabel-core + smith/multimaskin-varianter (hotellgym fulldekket) | ~38 |
| **B2 Kondisjonsmaskin-økter** | ferdigkoblede protokoller (Z2, 4×4, 500 m, 30/30 …) | 15 |
| **C Pilates-apparat** | reformer, cadillac, chair, barrel | 34 |
| **D Conditioning** | slede, battle ropes, baller, tauklatring, hoppetau | 23 |
| **E Småutstyr** | bånd, TRX, glidere, swiss ball, sandsekk + vektvest-modifikator | 50 |
| **F Løpedriller & ute** | A/B-skip, strides, bakkesprint, fartlek | 9 |
| **G Rulling & triggerpunkt** | foam roller- og massasjeball-kart | 11 |

Totalt bibliotek etter del 2: **≈ 595 enheter · 22 progresjonskjeder**. Konverteres sammen med resten i F1.

---

## 7. Generator-regler for utstyr

1. Filtrer øvelsesvarianter mot **aktiv lokasjons** oppløste utstyrssett (bundle + justeringer + attributter).
2. «Varierer»-utstyr = AV inntil brukeren bekrefter for lokasjonen.
3. Grey-out-regelen generaliseres: krever en mal-blokk et mønster uten dekning i lokasjonen → tilby mønsterbytte eller merk modaliteten begrenset (aldri stille degradering).
4. Attributter styrer lastforslag: 2×18 kg KB → dobbel-varianter tillatt; `manualer.maks` avgrenser tunge varianter.
5. Lokasjon lagres på økten i loggen → historikk kan vise «hvor du trener» (hjemme vs. gym vs. ute).
