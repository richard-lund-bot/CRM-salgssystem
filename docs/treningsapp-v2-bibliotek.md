# Treningsapp v2 — Øvelsesbibliotek

**Skjema:** `Navn | Mønster | Utstyr | Nivå (1-5) | Type | Notat`
**Utstyrskoder:** KV = kroppsvekt · KB = kettlebell · R = ringer · M = matte · (B) = bånd — mappes til ID-ene i utstyrsbiblioteket (kv, kb, ringer, matte, band-lang) ved F1-konvertering. Nye utstyrsklasser (manualer, stang, maskiner, apparater) dekkes via variant-oppgradering + utvidelsespakkene i `treningsapp-v2-utstyr.md`.
**Type:** reps / tid / hold / dist / pust. «u» = unilateral (per side). «⚡» = høy impact.
Konverteres 1:1 til `exercises.json` i F1 — feltene matcher datamodellen i taksonomi-dokumentet.

---

## 1. Progresjonskjeder (ryggraden i nivåsystemet)

Notasjon: `navn (nivå)` → neste ledd. Generatoren serverer leddet som matcher ulåst nivå.

**PUSH-H (horisontal press)**
vegg-pushup (1) → skrå pushup (1) → kne-pushup (1) → push-up (2) → diamant (3) → dekline (3) → ring push-up (3) → archer (4) → pseudo-planche (4) → ettarms-progresjon (5)

**PUSH-V (vertikal press / HSPU-linja)**
pike push-up (2) → hevet pike (3) → vegg-HSPU eksentrisk (4) → vegg-HSPU (4) → fri HSPU (5)

**DIPS**
støttehold ringer (2) → negativ dips (3) → dips (3) → ring dips (4) → RTO ring dips (5)

**PULL-H (horisontal drag)**
ringrow høy vinkel (1) → ringrow (2) → ringrow føtter hevet (3) → archer row (4) → ettarms row-progresjon (5)

**PULL-V (vertikal drag / MU-linja)**
dead hang (1) → skulderdrag i heng (1) → negativ pull-up (2) → pull-up (3) → chest-to-bar (4) → false grip-heng (4) → MU-transition lave ringer (4) → muscle-up (5)

**KNEBØY**
stol-knebøy (1) → air squat (1) → goblet squat (2) → cossack (2) → box pistol (3) → assistert pistol m/ ringer (3) → pistol (5)
*Sidegren:* skrimp assistert (3) → skrimp (4)

**HENGSEL**
glute bridge (1) → ettbens glute bridge (2) → hip thrust (2) → ettbens hip thrust (3) → KB RDL (2) → ettbens KB RDL (3) → nordic eksentrisk (4) → nordic (5)

**UTFALL**
statisk utfall (1) → utfall bak (2) → gå-utfall (2) → bulgarsk (3) → hopp-utfall (3⚡) → bulgarsk m/ KB (4)

**CORE ANTI-EKSTENSJON**
planke (1) → RKC-planke (2) → planke m/ skulderklapp (2) → body saw (3) → ring-rollout knestående (3) → dragon flag tuck (4) → dragon flag straddle (4) → dragon flag (5)

**HOLLOW-LINJA**
dead bug (1) → hollow tuck (2) → hollow hold (3) → hollow rocks (3) → V-ups (3)

**CORE-HENG**
knee raises (2) → leg raises (3) → toes-to-bar (4) → L-sit tuck (3) → L-sit (4) → windshield wipers i heng (5)

**HÅNDSTÅENDE**
vegg-hold mage inn (3) → vegg-hold rygg inn (3) → toe pulls (4) → fri håndstående (5)

**KB-PRESS**
floor press (2) → strict press (3) → push press (3) → jerk (4) → sots press (5)

**KB-SWING**
tohånds swing (2) → enhånds swing (3) → dobbel swing (3) → snatch (4)

**TGU (turkish get-up)**
TGU til albue (2) → TGU til hånd (3) → halv TGU (3) → full TGU (4)

---

## 2. Styrke — PUSH

| Navn | Mønster | Utstyr | Nv | Type | Notat |
|---|---|---|---|---|---|
| Vegg-pushup | push-h | KV | 1 | reps | |
| Skrå pushup (sofa/benk) | push-h | KV | 1 | reps | |
| Kne-pushup | push-h | KV | 1 | reps | |
| Push-up | push-h | KV | 2 | reps | variant: KB-håndtak (nøytral) |
| Bred push-up | push-h | KV | 2 | reps | |
| T-pushup | push-h | KV | 2 | reps | + rotasjon |
| Diamant/smal push-up | push-h | KV | 3 | reps | |
| Dekline push-up | push-h | KV | 3 | reps | føtter hevet |
| Ring push-up | push-h | R | 3 | reps | RTO-utgang = +1 nv |
| Archer push-up | push-h | KV | 4 | reps u | |
| Pseudo-planche push-up | push-h | KV | 4 | reps | vekt frem over hender |
| Ettarms-progresjon | push-h | KV | 5 | reps u | forhøyet → gulv |
| Pike push-up | push-v | KV | 2 | reps | |
| Hevet pike push-up | push-v | KV | 3 | reps | føtter på stol |
| Vegg-HSPU eksentrisk | push-v | KV | 4 | reps | 3-5 s ned |
| Vegg-HSPU | push-v | KV | 4 | reps | |
| Fri HSPU | push-v | KV | 5 | reps | mål-skill |
| Støttehold ringer | push-v | R | 2 | hold | dips-basen |
| Negativ dips | push-v | R | 3 | reps | |
| Dips | push-v | R | 3 | reps | |
| Ring dips | push-v | R | 4 | reps | |
| RTO ring dips | push-v | R | 5 | reps | |
| KB floor press | push-h | KB+M | 2 | reps | én eller to KB |
| KB strict press | push-v | KB | 3 | reps u | |
| KB push press | push-v | KB | 3 | reps u | |
| KB jerk | push-v | KB | 4 | reps u | |
| KB thruster | push-v | KB | 3 | reps | squat+press |

## 3. Styrke — PULL

| Navn | Mønster | Utstyr | Nv | Type | Notat |
|---|---|---|---|---|---|
| Dead hang | pull-v | R | 1 | hold | grep + skulderhelse |
| Skulderdrag i heng | pull-v | R | 1 | reps | scapula pull-ups |
| Ringrow høy vinkel | pull-h | R | 1 | reps | |
| Ringrow | pull-h | R | 2 | reps | |
| Ringrow føtter hevet | pull-h | R | 3 | reps | |
| Archer row | pull-h | R | 4 | reps u | |
| Ettarms row-progresjon | pull-h | R | 5 | reps u | |
| KB bent-over row | pull-h | KB | 2 | reps u | |
| KB gorilla row | pull-h | KB | 2 | reps | to KB på gulv |
| Renegade row | pull-h | KB | 3 | reps | + anti-rotasjon |
| Negativ pull-up | pull-v | R | 2 | reps | 3-5 s ned |
| Pull-up | pull-v | R | 3 | reps | |
| Chin-up | pull-v | R | 3 | reps | |
| Chest-to-bar | pull-v | R | 4 | reps | |
| False grip-heng | pull-v | R | 4 | hold | MU-nøkkel |
| MU-transition lave ringer | pull-v | R | 4 | reps | |
| Muscle-up | pull-v | R | 5 | reps | mål-skill |
| L-pull-up | pull-v | R | 4 | reps | |
| Face pull | pull-h | R | 2 | reps | skulderhelse |
| Ring bicep curl | pull-h | R | 2 | reps | |
| KB high pull | pull-v | KB | 2 | reps | |

## 4. Styrke — BEIN (knebøy/utfall) & BALANSE

| Navn | Mønster | Utstyr | Nv | Type | Notat |
|---|---|---|---|---|---|
| Stol-knebøy | knebøy | KV | 1 | reps | ned til sete-touch |
| Air squat | knebøy | KV | 1 | reps | |
| Wall sit | knebøy | KV | 1 | hold | |
| Goblet squat | knebøy | KB | 2 | reps | |
| Sumo squat | knebøy | KB | 2 | reps | |
| Cossack squat | knebøy | KV | 2 | reps u | +KB = nv 3 |
| KB front squat (dobbel) | knebøy | KB | 3 | reps | 2×18 |
| Box pistol | knebøy | KV | 3 | reps u | |
| Assistert pistol | knebøy | R | 3 | reps u | hold i ringene |
| Pistol | knebøy | KV | 5 | reps u | mål-skill |
| Skrimp assistert | knebøy | KV | 3 | reps u | |
| Skrimp squat | knebøy | KV | 4 | reps u | |
| Sissy squat assistert | knebøy | KV | 3 | reps | |
| Reverse nordic | knebøy | M | 3 | reps | quads/hofteb. |
| Statisk utfall | utfall | KV | 1 | reps u | |
| Utfall bak | utfall | KV | 2 | reps u | +KB/halo = nv 3 |
| Gå-utfall | utfall | KV | 2 | reps | |
| Sideutfall | utfall | KV | 2 | reps u | |
| Bulgarsk splittknebøy | utfall | KV | 3 | reps u | +KB = nv 4 |
| Step-up | utfall | KV | 2 | reps u | trapp/kasse |
| Ettbens stå | balanse | KV | 1 | hold u | lukkede øyne = nv 2 |
| Hip airplane | balanse | KV | 3 | reps u | |
| Ettbens RDL-touch | balanse | KV | 2 | reps u | |

## 5. Styrke — HENGSEL & BÆRING

| Navn | Mønster | Utstyr | Nv | Type | Notat |
|---|---|---|---|---|---|
| Glute bridge | hengsel | M | 1 | reps | |
| Ettbens glute bridge | hengsel | M | 2 | reps u | |
| Hip thrust (sofa) | hengsel | KV | 2 | reps | +KB = nv 3 |
| Ettbens hip thrust | hengsel | KV | 3 | reps u | |
| KB RDL | hengsel | KB | 2 | reps | |
| Ettbens KB RDL | hengsel | KB | 3 | reps u | |
| KB swing tohånds | hengsel | KB | 2 | reps | |
| KB swing enhånds | hengsel | KB | 3 | reps u | |
| KB swing dobbel | hengsel | KB | 3 | reps | |
| KB dead clean | hengsel | KB | 2 | reps u | |
| KB clean | hengsel | KB | 3 | reps u | |
| KB snatch | hengsel | KB | 4 | reps u | |
| Superman-hold | hengsel | M | 1 | hold | ryggekstensorer |
| Nordic eksentrisk | hengsel | M | 4 | reps | føtter under sofa |
| Nordic curl | hengsel | M | 5 | reps | |
| Suitcase carry | bæring | KB | 2 | dist u | + anti-lateral |
| Rack carry | bæring | KB | 2 | dist | |
| Farmer carry (dobbel) | bæring | KB | 2 | dist | |
| Overhead carry | bæring | KB | 3 | dist u | |
| KB windmill | hengsel | KB | 4 | reps u | mobilitet+styrke |
| Turkish get-up | helkropp | KB | 4 | reps u | deler = nv 2-3 |
| KB halo | mobilitet | KB | 2 | reps | skulder |
| KB around-the-world | core-rot | KB | 2 | reps | |

## 6. CORE-pool (inkl. «ab break»-arven fra v1)

| Navn | Mønster | Utstyr | Nv | Type | Notat |
|---|---|---|---|---|---|
| Dead bug | antiekst | M | 1 | reps | |
| Bird dog | antirot | M | 1 | reps u | |
| Planke | antiekst | M | 1 | hold | |
| RKC-planke | antiekst | M | 2 | hold | maks spenn 10-20 s |
| Planke m/ skulderklapp | antirot | M | 2 | reps | |
| Body saw | antiekst | M | 3 | reps | |
| Ring-rollout knestående | antiekst | R+M | 3 | reps | |
| Sideplanke | core-lat | M | 2 | hold u | m/ dips = reps |
| Sideplanke m/ løft | core-lat | M | 3 | hold u | |
| Copenhagen kort | core-lat | M | 3 | hold u | lang = nv 4 |
| Hollow tuck | antiekst | M | 2 | hold | |
| Hollow hold | antiekst | M | 3 | hold | |
| Hollow rocks | antiekst | M | 3 | reps | |
| Arch rocks | hengsel | M | 2 | reps | |
| V-ups | core-flex | M | 3 | reps | |
| Sit-up | core-flex | M | 1 | reps | |
| Bicycle crunch | core-rot | M | 2 | reps | |
| Russian twist | core-rot | M | 2 | reps | +KB = nv 3 |
| Flutter kicks | core-flex | M | 2 | tid | |
| Seated leg raises | core-flex | M | 2 | reps | v1-klassiker |
| Toe touches | core-flex | M | 2 | reps | |
| Windshield wipers liggende | core-rot | M | 3 | reps | i heng = nv 5 |
| Dragon flag tuck | antiekst | M | 4 | reps | straddle 4, full 5 |
| Knee raises i heng | core-heng | R | 2 | reps | |
| Leg raises i heng | core-heng | R | 3 | reps | |
| Toes-to-bar | core-heng | R | 4 | reps | |
| L-sit tuck | core-heng | KV | 3 | hold | gulv/KB-håndtak |
| L-sit | core-heng | KV | 4 | hold | |
| Pallof-press | antirot | (B) | 2 | reps u | krever bånd |
| Stående KB-rotasjon | core-rot | KB | 2 | reps | |
| Båt (navasana) | core-flex | M | 2 | hold | deles m/ yoga |

## 7. PLYO (⚡ = høy impact, egne pause-regler)

| Navn | Mønster | Utstyr | Nv | Type |
|---|---|---|---|---|
| Squat jump ⚡ | hopp | KV | 2 | reps |
| Tuck jump ⚡ | hopp | KV | 3 | reps |
| Broad jump ⚡ | hopp | KV | 3 | reps |
| Skater jump / lateral bound ⚡ | hopp | KV | 2 | reps |
| Split jump / hopp-utfall ⚡ | hopp | KV | 3 | reps |
| Trappe-/kassehopp ⚡ | hopp | KV | 3 | reps |
| Pogo hops ⚡ | hopp | KV | 2 | tid |
| Clap push-up ⚡ | push-h | KV | 4 | reps |
| Plyo-utfallsbytte ⚡ | hopp | KV | 3 | reps |
| Lateral hopp over KB ⚡ | hopp | KB | 2 | tid |

## 8. Kondisjonspool (HIIT/metcon-moves, lav teknikk-terskel)

| Navn | Mønster | Utstyr | Nv | Type |
|---|---|---|---|---|
| Jumping jacks | lokomotorisk | KV | 1 | tid |
| Seal jacks | lokomotorisk | KV | 1 | tid |
| High knees | lokomotorisk | KV | 1 | tid |
| Butt kicks | lokomotorisk | KV | 1 | tid |
| Fast feet | lokomotorisk | KV | 1 | tid |
| Mountain climbers | antiekst | KV | 2 | tid |
| Cross-body mountain climbers | core-rot | KV | 2 | tid |
| Plank jacks | antiekst | KV | 2 | tid |
| Half burpee (sprawl) | helkropp | KV | 2 | reps |
| Burpee | helkropp | KV | 3 | reps |
| Burpee over KB ⚡ | helkropp | KB | 3 | reps |
| Skater shuffle | lokomotorisk | KV | 2 | tid |
| Bear crawl | lokomotorisk | KV | 2 | dist |
| Crab walk | lokomotorisk | KV | 2 | dist |
| Crab kicks | core | KV | 2 | tid |
| Inchworm m/ push-up | helkropp | KV | 2 | reps |
| Shadow boxing | lokomotorisk | KV | 1 | tid |
| Usynlig hoppetau | lokomotorisk | KV | 1 | tid |
| Step-ups tempo | utfall | KV | 2 | tid |
| Squat pulse | knebøy | KV | 2 | tid |
| Star jump ⚡ | hopp | KV | 2 | reps |
| KB swing (kondisjonsdose) | hengsel | KB | 2 | tid |

## 9. KB-complexer (ferdige sekvenser, format C)

| Navn | Sekvens (per side der u) | Nv |
|---|---|---|
| Enkel flyt | dead clean → press → utfall bak | 2 |
| Klassisk complex | clean → front squat → press | 3 |
| Swing-stigen | 10-15-20 swings m/ 30 s pause | 2 |
| Armor building (lett) | 2 clean → 1 press → 3 front squat (dobbel) | 4 |
| TGU-flyt | halv TGU → windmill → tilbake | 4 |

## 10. YOGA — posisjoner

| Posisjon | Fokus | Nv | Type |
|---|---|---|---|
| Fjellstilling (tadasana) | holdning/pust | 1 | hold |
| Stående foroverbøy | hamstrings/rygg | 1 | hold |
| Halvveis løft | ryggstrekk | 1 | hold |
| Stol | bein/core | 1 | hold |
| Planke → chaturanga | push/core | 2 | flyt |
| Kobra | ryggbøy | 1 | hold |
| Oppovervendt hund | ryggbøy | 2 | hold |
| Nedovervendt hund | helkropp | 1 | hold |
| Lav utfall | hoftebøyere | 1 | hold u |
| Høy utfall | bein/balanse | 2 | hold u |
| Kriger 1 | bein/hofter | 1 | hold u |
| Kriger 2 | bein/hofter | 1 | hold u |
| Kriger 3 | balanse | 2 | hold u |
| Fredfull kriger | sidestrekk | 2 | hold u |
| Triangel | sidestrekk/hamstrings | 2 | hold u |
| Utvidet sidevinkel | hofter/side | 2 | hold u |
| Halvmåne | balanse | 3 | hold u |
| Pyramide | hamstrings | 2 | hold u |
| Rotert triangel | rotasjon/balanse | 3 | hold u |
| Tre | balanse | 1 | hold u |
| Ørn | balanse/skuldre | 2 | hold u |
| Danser | balanse/quad | 3 | hold u |
| Bred foroverbøy | adduktorer | 1 | hold |
| Malasana (dyp knebøy) | hofter/ankler | 2 | hold |
| Kråke | armbalanse | 4 | hold |
| Sidekråke | armbalanse | 5 | hold u |
| Delfin | skuldre (HS-prep!) | 2 | hold |
| Katt–ku | ryggmobilitet | 1 | flyt |
| Barnets stilling | hvile | 1 | hold |
| Due | sete/hofter | 2 | hold u |
| Lav lunge m/ quad-grep | quad/hofteb. | 3 | hold u |
| Sittende foroverbøy | hamstrings | 1 | hold |
| Sommerfugl | adduktorer | 1 | hold |
| Sittende twist | rotasjon | 1 | hold u |
| Bro | ryggbøy/sete | 2 | hold |
| Hjul | ryggbøy | 4 | hold |
| Kamel | ryggbøy | 3 | hold |
| Fisk | bryst | 2 | hold |
| Happy baby | hofter | 1 | hold |
| Liggende twist | rygg | 1 | hold u |
| Ben opp veggen | restitusjon | 1 | hold |
| Savasana | avspenning | 1 | hold |

**Yin-varianter (2-5 min hold):** sommerfugl · halv sommerfugl · dragen (dyp utfall) · svanen (yin-due) · sovende svane · frosken · caterpillar (rund foroverbøy) · sfinxen · selen · bananasana · skolissen · liggende twist · dangling (hengende foroverbøy) · malasana-hold · støttet fisk (pute)

## 11. YOGA — navngitte sekvenser

**Sol-hilsen A (1 runde ≈ 9 pust):** fjell → armer opp → foroverbøy → halvveis løft → planke → chaturanga (kne nv 1) → oppovervendt hund/kobra → nedovervendt hund (5 pust) → gå/hopp frem → halvveis løft → foroverbøy → armer opp → fjell.
**Sol-hilsen B:** som A + stol i start og kriger 1 begge sider fra hunden.
**Morgen 10 min (nv 1):** katt–ku ×8 → nedovervendt hund → lav utfall m/ rotasjon per side → verdenshilsen ×3/side → Sol A ×2 rolig.
**Kveld 10 min (nv 1):** barnets stilling → katt–ku → figur-4/nålens øye per side → knær til bryst → liggende twist per side → happy baby → savasana.
**Yin hofter 25 min:** sommerfugl 3 → dragen 3/side → svanen 3/side → frosken 2 → liggende twist 2/side → savasana 3.
**Yin rygg 20 min:** caterpillar 4 → sfinx 3 → selen 2 → bananasana 2/side → liggende twist 2/side → savasana 3.
**Stående flow-blokk (nv 2):** kriger 2 → fredfull kriger → utvidet sidevinkel → triangel → halvmåne (valgfri) — holdes 3-5 pust hver, begge sider.

## 12. PILATES — matteserie (klassisk rekkefølge, utdrag)

| Øvelse | Nv | Type | Notat |
|---|---|---|---|
| The Hundred | 2 | pust/tid | 100 pumpetakter |
| Roll-up | 2 | reps | |
| Single leg circles | 1 | reps u | |
| Rolling like a ball | 2 | reps | |
| Single leg stretch | 1 | reps | |
| Double leg stretch | 2 | reps | |
| Single straight leg (saks) | 2 | reps | |
| Double straight leg lower-lift | 3 | reps | |
| Criss-cross | 2 | reps | |
| Spine stretch forward | 1 | reps | |
| Open leg rocker | 3 | reps | |
| The Saw | 2 | reps u | |
| Swan | 2 | reps | |
| Single leg kicks | 2 | reps | |
| Double leg kicks | 2 | reps | |
| Shoulder bridge | 2 | reps u | |
| Side kick front/back | 2 | reps u | |
| Side kick up/down | 2 | reps u | |
| Side kick circles | 2 | reps u | |
| Teaser prep | 3 | reps | full teaser = nv 4 |
| Swimming | 2 | tid | |
| Leg pull front | 3 | reps | |
| Leg pull back | 3 | reps | |
| Mermaid | 1 | reps u | |
| Seal | 2 | reps | |

*Prinsipp-tags for guide-modus: pust, presisjon, kontroll, senter («powerhouse»), flyt.*

## 13. TØYING — per område (statisk 2-3×30-45 s, «dyn» = dynamisk, PNF der merket)

| Område | Øvelser |
|---|---|
| Nakke | sidebøy m/ lett drag · rotasjon · levator-strekk (nese mot armhule) |
| Bryst/skulder | dørkarm-/veggstrekk (PNF) · cross-body · triceps overhead · passivt heng i ringer |
| Rygg | barnets stilling · katt–ku (dyn) · liggende twist · kobra (dyn) |
| Hoftebøyere | halvknestående hoftestrekk (PNF) · couch stretch (nv 3) · verdenshilsen (dyn) |
| Hamstrings | stående m/ hæl frem · liggende m/ håndkle (PNF) · sittende foroverbøy |
| Sete | figur-4 liggende · due · sittende figur-4 |
| Adduktorer | sommerfugl · frosken · sideutfall-lene (dyn) |
| Quads | stående quadstrekk · lav lunge m/ quad-grep |
| Legger | veggstrekk strakt kne (gastroc) · bøyd kne (soleus) |
| Håndledd | fleksor-/ekstensorstrekk på alle fire · håndleddsrock (dyn) — **obligatorisk før HS/planche-arbeid** |
| Ankler | knee-to-wall (dyn) · tåballe-sitt |

## 14. MOBILITET — per ledd

| Drill | Ledd | Nv | Type |
|---|---|---|---|
| CARs nakke/skulder/håndledd/hofte/ankel | alle | 1 | reps |
| Katt–ku | rygg | 1 | reps |
| Thorakal rotasjon («åpne boka») | brystrygg | 1 | reps u |
| Thread the needle | brystrygg | 1 | hold u |
| Skulder-dislocates (håndkle/bånd) | skulder | 2 | reps |
| Scapula push-ups | scapula | 2 | reps |
| Scapula pull-ups (ringheng) | scapula | 2 | reps |
| Verdenshilsen (world's greatest) | helkropp | 2 | reps u |
| 90/90-overganger | hofte | 2 | reps |
| 90/90 fremlent hold | hofte | 2 | hold u |
| Hip airplane | hofte | 3 | reps u |
| Dyp knebøy-hold m/ albuepress | hofte/ankel | 2 | hold |
| Ankel-rock | ankel | 1 | reps u |
| Jefferson curl (lett/KV) | bakkjede | 3 | reps |
| Håndleddsserie (rocks + løft) | håndledd | 1 | reps |

## 15. PUST & RESTITUSJON

| Protokoll | Bruk | Type |
|---|---|---|
| Box breathing 4-4-4-4 | fokus, før økt/jobb | pust |
| 4-7-8 | nedregulering, kveld | pust |
| Koherent pust (5,5/min) | daglig ro, 5-10 min | pust |
| Fysiologisk sukk ×5-10 | akutt stressdemping | pust |
| Nesepust-gange | Z1-restitusjon | dist |
| Bodyscan 5-10 min | søvn/avspenning | tid |

## 16. Oppvarmingspool (velges av generator etter dagens mønstre)

jumping jacks/usynlig hoppetau 60 s · armsirkler · hoftesirkler · katt–ku ×8 · verdenshilsen ×3/side · rolige air squats ×10 · skulder-dislocates ×10 · inchworm ×5 · leg swings ×10/side · cossack rocks ×6/side · glute bridge ×10 · dead bug ×10 · KB halo ×5/vei · scapula push-ups ×8 · håndleddsserie (før push/HS)

**Nedtrappingspool:** nesepust-gange 2 min · statiske tøy for dagens hovedmønstre (2-3 stk) · 4-7-8 ×4

## 17. Gateway-testbank (låser opp øvelsesnivåer)

| Gateway | Krav | Låser opp |
|---|---|---|
| Push L3 | 15 strikte push-ups | diamant, dekline, ring push-up, dips-linja |
| Push L4 | 25 push-ups + 10 dips | archer, pseudo-planche, vegg-HSPU |
| Push L5 | 5 vegg-HSPU + 3 RTO ring dips | fri HSPU, ettarms-linja |
| Pull L3 | 12 ringrows føtter frem + 30 s dead hang | pull-up, chin-up |
| Pull L4 | 8 strikte pull-ups | C2B, false grip, transitions |
| Pull L5 (MU-porten) | 12 pull-ups + 12 dips + 20 s false grip-heng | muscle-up |
| Bein L4 | 5 box pistols/side + 10 bulgarske/side | skrimp, pistol-linja, nordic eks. |
| Core L4 | 30 s hollow + 10 leg raises i heng | dragon flag-linja, T2B, L-sit |
| HS-porten | 45 s vegg-håndstående (mage inn) | toe pulls, fri HS-arbeid |
| Kondisjon (verifisering) | 2000 m ro-test, 5 km-test eller 4×4 gjennomført — tiden logges som PR | setter kondisjonsbase + intensitetssoner |

## 18. Kjernebibliotek v0 — tellinger (se §28 for totalt etter utvidelsespakkene)

| Kategori | Antall |
|---|---|
| Styrke (push/pull/bein/hengsel/bæring) | ~95 |
| Core-pool | 31 |
| Plyo | 10 |
| Kondisjonspool | 22 |
| KB-complexer | 5 |
| Yoga-posisjoner + yin | 58 |
| Yoga-sekvenser | 7 |
| Pilates | 25 |
| Tøying | 32 |
| Mobilitet | 15 |
| Pust/restitusjon | 6 |
| Oppvarming/nedtrapping | 18 |
| Progresjonskjeder | 16 |
| Gateway-tester | 9 |
| **Totalt ≈ 330 enheter** | |

---

# DEL 2 — Utvidelsespakkene (gym, apparat, småutstyr, ute)

Utstyr-kolonnen bruker heretter ID-ene fra `treningsapp-v2-utstyr.md` direkte (manualsett, stang, kabel …).
**Iso-regel:** isolasjonsøvelser tagges med nærmeste mønster + tag `iso` — generatoren bruker dem kun i hypertrofi- og finisher-blokker, aldri som hovedmønster.
**Nivå og last:** for frivekter er nivå = *teknisk kompleksitet* (tom stang = 2, standard = 3, olympiske løft = 4–5). Hvor tungt styres av logging/attributter, ikke nivåsystemet.

## 19. Pakke A1 — Manualer

| Navn | Mønster | Utstyr | Nv | Type | Notat |
|---|---|---|---|---|---|
| DB benkpress | push-h | manualsett, benk-flat | 2 | reps | |
| DB skråbenkpress | push-h | manualsett, benk-just | 2 | reps | |
| DB flyes | push-h | manualsett, benk-flat | 2 | reps | iso |
| DB skrå flyes | push-h | manualsett, benk-just | 2 | reps | iso |
| DB pullover | pull-v | manualsett, benk-flat | 2 | reps | lats/bryst |
| DB skulderpress sittende | push-v | manualsett, benk-just | 2 | reps | |
| DB skulderpress stående | push-v | manualsett | 2 | reps | |
| Arnold press | push-v | manualsett | 3 | reps | |
| Lateral raise | push-v | manualsett | 1 | reps | iso |
| Front raise | push-v | manualsett | 1 | reps | iso |
| Reverse fly | pull-h | manualsett | 2 | reps | iso, bakside skulder |
| DB smal press | push-h | manualsett, benk-flat | 2 | reps | triceps-bias |
| Skullcrusher DB | push-h | manualsett, benk-flat | 2 | reps | iso |
| Overhead triceps ext | push-v | manualsett | 2 | reps | iso |
| Triceps kickback | push-h | manualsett | 1 | reps | iso |
| Ettarms DB row | pull-h | manualsett, benk-flat | 2 | reps u | |
| Chest-supported row | pull-h | manualsett, benk-just | 2 | reps | |
| DB upright row | pull-v | manualsett | 2 | reps | |
| DB shrug | pull-v | manualsett | 1 | reps | iso traps |
| DB curl | pull-h | manualsett | 1 | reps | iso |
| Hammer curl | pull-h | manualsett | 1 | reps | iso |
| Skrå curl | pull-h | manualsett, benk-just | 2 | reps | iso |
| Konsentrasjonscurl | pull-h | manualsett | 1 | reps | iso |
| DB RDL | hengsel | manualsett | 2 | reps | |
| DB markløft | hengsel | manualsett | 2 | reps | |
| DB legghev | knebøy | manualsett | 1 | reps | iso legger |
| DB side bend | core-lat | manualsett | 1 | reps u | iso |
| DB clean & press | helkropp | manualsett | 3 | reps u | |
| DB snatch | hengsel | manualsett | 4 | reps u | |
| Devil's press | helkropp | manualsett | 4 | reps | burpee + dobbel snatch |

**+ manual-varianter av eksisterende øvelser (tagges som varianter, ikke nye):** goblet squat, bulgarsk, step-up, utfall, hip thrust, renegade row, suitcase/farmer/rack carry, russian twist, windmill, floor press, thruster, halo — 12 stk.

## 20. Pakke A2 — Stang, EZ, trap bar & landmine

| Navn | Mønster | Utstyr | Nv | Type | Notat |
|---|---|---|---|---|---|
| Back squat | knebøy | stang, skiver, rack | 3 | reps | tom stang = 2 |
| Front squat (stang) | knebøy | stang, skiver, rack | 3 | reps | |
| Box squat | knebøy | stang, skiver, rack, kasse | 2 | reps | |
| Pause squat | knebøy | stang, skiver, rack | 3 | reps | |
| Zercher squat | knebøy | stang, skiver, rack | 3 | reps | |
| Overhead squat | knebøy | stang, skiver | 5 | reps | mobilitetskrav |
| Markløft | hengsel | stang, skiver | 3 | reps | lett = 2 |
| Sumo markløft | hengsel | stang, skiver | 3 | reps | |
| Stang-RDL | hengsel | stang, skiver | 2 | reps | |
| Stivbeint markløft | hengsel | stang, skiver | 3 | reps | |
| Rack pull | hengsel | stang, skiver, rack | 2 | reps | |
| Good morning | hengsel | stang, skiver, rack | 3 | reps | |
| Hip thrust (stang) | hengsel | stang, skiver, benk-flat | 2 | reps | |
| Glute bridge (stang) | hengsel | stang, skiver | 2 | reps | |
| Benkpress | push-h | stang, skiver, benk-flat, rack | 3 | reps | tom stang = 2 |
| Skrå benkpress | push-h | stang, skiver, benk-just, rack | 3 | reps | |
| Smal benkpress | push-h | stang, skiver, benk-flat, rack | 3 | reps | |
| Floor press (stang) | push-h | stang, skiver | 2 | reps | |
| Militærpress (OHP) | push-v | stang, skiver, rack | 3 | reps | tom stang = 2 |
| Push press (stang) | push-v | stang, skiver, rack | 3 | reps | |
| Pendlay row | pull-h | stang, skiver | 3 | reps | |
| Bent-over row (stang) | pull-h | stang, skiver | 2 | reps | |
| Barbell shrug | pull-v | stang, skiver | 1 | reps | iso |
| Barbell utfall | utfall | stang, skiver, rack | 3 | reps u | |
| Barbell split squat | utfall | stang, skiver, rack | 3 | reps u | |
| Barbell calf raise | knebøy | stang, skiver, rack | 1 | reps | iso |
| Power clean | hengsel | stang, bumper | 4 | reps | eksplosiv |
| Hang clean | hengsel | stang, bumper | 4 | reps | |
| Split jerk | push-v | stang, bumper, rack | 4 | reps | |
| Power snatch | hengsel | stang, bumper | 5 | reps | |
| EZ curl | pull-h | ezstang | 1 | reps | iso |
| EZ skullcrusher | push-h | ezstang, benk-flat | 2 | reps | iso |
| Trap bar markløft | hengsel | trapbar, skiver | 2 | reps | ryggvennlig inngang |
| Trap bar carry | bæring | trapbar, skiver | 2 | dist | |
| Trap bar jump | hopp | trapbar, skiver | 4 | reps | ⚡ power |
| Landmine press | push-v | landmine, stang | 2 | reps u | |
| Landmine row | pull-h | landmine, stang | 2 | reps | |
| Landmine squat-press | helkropp | landmine, stang | 2 | reps | |
| Landmine rotasjon | core-rot | landmine, stang | 3 | reps | |

**Nye progresjonskjeder (gym):**
- **KNEBØY-STANG:** goblet (2) → box squat tom stang (2) → back squat (3) → pause/front squat (3) → overhead squat (5)
- **MARKLØFT:** KB RDL (2) → trap bar markløft (2) → stang-RDL (2) → markløft (3) → sumo/tung (3)
- **BENKPRESS:** push-up (2) → DB benkpress (2) → tom stang (2) → benkpress (3) → smal/skrå (3)
- **PRESS-STANG:** DB skulderpress (2) → tom stang OHP (2) → OHP (3) → push press (3) → split jerk (4)
- **OL-LØFT:** KB swing (2) → KB clean (3) → power clean (4) → power snatch (5)
- **TAU-LINJA:** tau-row liggende (2) → fotlås + klatring m/ bein (3) → tauklatring uten bein (5)

## 21. Pakke B1 — Maskiner & kabler

| Navn | Mønster | Utstyr | Nv | Type | Notat |
|---|---|---|---|---|---|
| Beinpress | knebøy | beinpress | 1 | reps | |
| Leg extension | knebøy | legext | 1 | reps | iso |
| Liggende legcurl | hengsel | legcurl | 1 | reps | iso |
| Sittende legcurl | hengsel | legcurl | 1 | reps | iso |
| Latpulldown bred | pull-v | latpulldown | 1 | reps | |
| Latpulldown smal/nøytral | pull-v | latpulldown | 1 | reps | |
| Sittende kabelro | pull-h | kabelro | 1 | reps | |
| Straight-arm pulldown | pull-v | kabel | 2 | reps | |
| Kabelkryss / flyes | push-h | kabel | 2 | reps | iso |
| Triceps pushdown | push-h | kabel | 1 | reps | iso |
| Kabel curl | pull-h | kabel | 1 | reps | iso |
| Kabel lateral raise | push-v | kabel | 2 | reps | iso |
| Kabel pull-through | hengsel | kabel | 2 | reps | |
| Kabel woodchop høy→lav | core-rot | kabel | 2 | reps u | |
| Kabel woodchop lav→høy | core-rot | kabel | 2 | reps u | |
| Assistert pull-up-maskin | pull-v | maskinpark | 1 | reps | fyller gapet i PULL-V-kjeden |
| Assistert dips-maskin | push-v | maskinpark | 1 | reps | fyller gapet i DIPS-kjeden |
| Brystpress-maskin | push-h | maskinpark | 1 | reps | |
| Skulderpress-maskin | push-v | maskinpark | 1 | reps | |
| Row-maskin | pull-h | maskinpark | 1 | reps | |
| Pec deck | push-h | maskinpark | 1 | reps | iso |
| Hip abduction | knebøy | maskinpark | 1 | reps | iso |
| Hip adduction | knebøy | maskinpark | 1 | reps | iso |
| Hip thrust-maskin | hengsel | maskinpark | 1 | reps | |
| Kalvmaskin | knebøy | maskinpark | 1 | reps | iso |
| Mageknekk-maskin | core-flex | maskinpark | 1 | reps | |
| Ryggekstensjon (romersk stol) | hengsel | maskinpark | 2 | reps | |
| GHD back extension | hengsel | ghd | 2 | reps | |
| GHD hip extension | hengsel | ghd | 3 | reps | |
| GHD sit-up | core-flex | ghd | 3 | reps | |

**Smith-maskin:** gir maskinvarianter av knebøy, benkpress, utfall, OHP og row (tagges som varianter, teknisk nivåJust −1).
**Multimaskin (hotell):** dekker brystpress, nedtrekk, row, curl og pushdown som varianter — hotellgym-bunken får dermed full overkroppsdekning.
**Kabel-varianter av eksisterende:** face pull, pallof.

## 22. Pakke B2 — Kondisjonsmaskin-økter

Oppføringer som bærer BASE/HIIT-formatene på maskin (type dist/tid):

| Navn | Modalitet | Utstyr | Nv | Notat |
|---|---|---|---|---|
| Romaskin Z2 | BASE | romaskin | 1 | |
| Romaskin 500 m-gjentak | HIIT | romaskin | 2 | |
| Romaskin cal-EMOM | HIIT/MET | romaskin | 2 | |
| Romaskin 2000 m-test | test | romaskin | 3 | PR + setter kondisjonsbase |
| SkiErg Z2 | BASE | skierg | 1 | |
| SkiErg intervaller | HIIT | skierg | 2 | |
| Assault bike 10/50-sprints | HIIT | assaultbike | 2 | |
| Assault bike cal-EMOM | HIIT/MET | assaultbike | 2 | |
| Tredemølle Z2 | BASE | tredemolle | 1 | |
| Tredemølle 4×4 | HIIT | tredemolle | 3 | |
| Tredemølle bakkeintervall | HIIT | tredemolle | 2 | incline |
| Gange Z2 m/ stigning | BASE | tredemolle | 1 | |
| Spinsykkel Z2 / intervall | BASE/HIIT | spinsykkel | 1 | |
| Stepper Z2 | BASE | stepper | 1 | |
| Ellipse Z2 | BASE | ellipse | 1 | |

## 23. Pakke C — Pilates-apparat (studio; forutsetter instruksjon)

| Øvelse | Apparat | Nv | Notat |
|---|---|---|---|
| Footwork: toes / arches / heels / tendon stretch | reformer | 1 | grunnserien |
| Running | reformer | 1 | |
| Pelvic lift | reformer | 1 | |
| Hundred på reformer | reformer | 2 | |
| Leg circles i stropper | reformer | 1 | |
| Frog | reformer | 1 | |
| Coordination | reformer | 2 | |
| Rowing into the sternum | reformer | 2 | |
| Rowing from the chest | reformer | 2 | |
| Chest expansion | reformer | 1 | |
| Elephant | reformer | 1 | |
| Knee stretches round / arched | reformer | 2 | knees off = 3 |
| Long stretch | reformer | 3 | |
| Stomach massage: round / hands back / reach | reformer | 2 | |
| Short box: round / flat / side / twist | reformer | 2 | |
| Long box: pulling straps | reformer | 2 | |
| Backstroke | reformer | 3 | |
| Teaser på reformer | reformer | 4 | |
| Short spine | reformer | 3 | |
| Side splits | reformer | 2 | |
| Mermaid på reformer | reformer | 2 | |
| Thigh stretch | reformer | 3 | |
| Roll-back m/ bar | cadillac | 1 | |
| Arm springs-serie | cadillac | 1 | |
| Leg springs-serie | cadillac | 2 | |
| Push-through | cadillac | 2 | |
| Monkey | cadillac | 3 | |
| Footwork på chair | wundachair | 1 | |
| Pumping | wundachair | 2 | |
| Swan på chair | wundachair | 3 | |
| Going up front | wundachair | 3 | |
| Swan på barrel | barrel | 2 | |
| Side sit-up | barrel | 3 | |
| Ballet stretch-serie | barrel | 2 | |

## 24. Pakke D — Conditioning (slede, tau, baller)

| Navn | Mønster | Utstyr | Nv | Type | Notat |
|---|---|---|---|---|---|
| Slede-push høy | lokomotorisk | slede | 2 | dist | |
| Slede-push lav (sprint) | lokomotorisk | slede | 3 | dist | ⚡ |
| Slede-drag baklengs | knebøy | slede | 2 | dist | knevennlig |
| Slede-drag m/ tau (row-walk) | pull-h | slede | 2 | dist | |
| Lateral slede-drag | lokomotorisk | slede | 2 | dist | u |
| Battle ropes alternating waves | helkropp | battleropes | 2 | tid | |
| Battle ropes double waves | helkropp | battleropes | 2 | tid | |
| Rope slams | helkropp | battleropes | 3 | tid | |
| Rope-sirkler ut/inn | helkropp | battleropes | 2 | tid | |
| Lateral whips | core-rot | battleropes | 2 | tid | |
| Ropes i utfall/knestående | helkropp | battleropes | 3 | tid | |
| Rope jumping jacks | helkropp | battleropes | 2 | tid | |
| Wall ball shots | helkropp | wallball | 2 | reps | |
| Med ball slam | helkropp | slamball | 2 | reps | |
| Rotasjonskast mot vegg | core-rot | medisinball | 3 | reps u | |
| Chest pass mot vegg | push-h | medisinball | 2 | reps | |
| Overhead-kast | helkropp | medisinball | 3 | reps | |
| Med ball clean | hengsel | medisinball | 2 | reps | |
| Tau-drag liggende (row) | pull-v | klatretau | 2 | reps | |
| Fotlås-teknikk | skill | klatretau | 2 | reps | |
| Tauklatring m/ bein | pull-v | klatretau | 3 | reps | |
| Tauklatring uten bein | pull-v | klatretau | 5 | reps | |
| Tau-heng | pull-v | klatretau | 2 | hold | grep |

## 25. Pakke E — Småutstyr (bånd, baller, hoppetau, sandsekk)

| Navn | Mønster | Utstyr | Nv | Type | Notat |
|---|---|---|---|---|---|
| Band pull-apart | pull-h | band-lang | 1 | reps | skulderhelse |
| Band row (anker) | pull-h | band-lang | 1 | reps | |
| Band press (anker) | push-h | band-lang | 1 | reps | |
| Band OHP | push-v | band-lang | 1 | reps | |
| Band deadlift | hengsel | band-lang | 1 | reps | |
| Band good morning | hengsel | band-lang | 2 | reps | |
| Band pallof | core-antirot | band-lang | 1 | reps u | formaliserer varianten |
| Band woodchop | core-rot | band-lang | 2 | reps u | |
| Band triceps pushdown | push-h | band-lang | 1 | reps | iso |
| Band curl | pull-h | band-lang | 1 | reps | iso |
| Lateral walk | knebøy | band-mini | 1 | dist | sete |
| Monster walk | knebøy | band-mini | 1 | dist | |
| Glute bridge m/ miniband | hengsel | band-mini | 1 | reps | |
| Clamshell | knebøy | band-mini | 1 | reps u | |
| Fire hydrant | knebøy | band-mini | 1 | reps u | |
| Ball rollout | core-antiekst | ball-stor | 2 | reps | |
| Stir the pot | core-antiekst | ball-stor | 3 | tid | |
| Ball hamstring curl | hengsel | ball-stor | 2 | reps | |
| Ball pike | core-antiekst | ball-stor | 3 | reps | |
| Ball veggknebøy | knebøy | ball-stor, vegg | 1 | reps | |
| Ball back extension | hengsel | ball-stor | 1 | reps | |
| Ball pass (V-up m/ ball) | core-flex | ball-stor | 2 | reps | |
| Ring-klem armer | push-h | pilatesring | 1 | reps | iso |
| Ring-klem lår | knebøy | pilatesring | 1 | reps | iso |
| Bekkenløft m/ ballklem | hengsel | ball-liten | 1 | reps | |
| Single unders | lokomotorisk | hoppetau | 1 | tid | |
| Boxer skip | lokomotorisk | hoppetau | 2 | tid | |
| Høy-kne hopp (tau) | lokomotorisk | hoppetau | 2 | tid | |
| Side-til-side (tau) | lokomotorisk | hoppetau | 2 | tid | |
| Criss-cross | lokomotorisk | hoppetau | 4 | tid | |
| Double unders | lokomotorisk | hoppetau | 4 | tid | |
| Bear hug squat | knebøy | sandsekk | 2 | reps | |
| Bear hug carry | bæring | sandsekk | 2 | dist | |
| Sandbag clean / shouldering | hengsel | sandsekk | 3 | reps | |
| Ground-to-shoulder | hengsel | sandsekk | 3 | reps | |
| Sandbag lunge | utfall | sandsekk | 2 | reps u | |

| TRX pike | core-antiekst | trx | 3 | reps | |
| TRX fallout | core-antiekst | trx | 3 | reps | rollout-slektning |
| TRX hamstring curl | hengsel | trx, matte | 3 | reps | |
| TRX atomic push-up | helkropp | trx | 4 | reps | |
| Glider mountain climber | core-antiekst | glidere | 2 | tid | |
| Glider hamstring curl | hengsel | glidere, matte | 2 | reps | |
| Glider pike | core-antiekst | glidere | 3 | reps | |
| Glider reverse lunge | utfall | glidere | 2 | reps u | |

**Band-varianter av eksisterende:** assistert pull-up, dislocates, squat m/ miniband (knær ut-cue) · body saw på glidere · ringrow → TRX · ettbens stå → balansepute.
**Vektvest** = modifikator, ikke øvelse: `nivaJust +1` på KV-øvelser (push-ups, pull-ups, dips, utfall, gange/bakke).

## 26. Pakke F — Løpedriller & ute

| Navn | Mønster | Utstyr | Nv | Type |
|---|---|---|---|---|
| A-skip | lokomotorisk | ute | 2 | dist |
| B-skip | lokomotorisk | ute | 3 | dist |
| Høye kneløft (drill) | lokomotorisk | ute | 1 | dist |
| Hælspark (drill) | lokomotorisk | ute | 1 | dist |
| Ankle pops / skipping | hopp | ute | 1 | dist |
| Stigningsløp (strides) | lokomotorisk | ute | 2 | reps |
| Bakkesprint | lokomotorisk | bakke | 3 | reps ⚡ |
| Trappeløp | lokomotorisk | trapp | 2 | tid |
| Fartlek | BASE/HIIT | ute | 2 | tid |

## 27. Pakke G — Rulling & triggerpunkt (REST/MOB)

| Område | Utstyr | Tid |
|---|---|---|
| Legger | foamroller | 30–60 s/side |
| Hamstrings | foamroller | 30–60 s/side |
| Quads | foamroller | 30–60 s/side |
| Sete | foamroller | 30–60 s/side |
| Øvre rygg / thorakal | foamroller | 60 s |
| Lats | foamroller | 30 s/side |
| Adduktorer | foamroller | 30 s/side |
| Fotsåle | massasjeball | 60 s/side |
| Brystmuskel (mot vegg) | massasjeball | 45 s/side |
| Sete / piriformis | massasjeball | 60 s/side |
| Skulderblad-området | massasjeball | 45 s/side |

## 28. Tellinger etter del 2

| Del | Innhold | Antall |
|---|---|---|
| Del 1 (v0) | hjemme/KV/KB/ringer + yoga, pilates-matte, tøy, mobilitet, pust | ~330 |
| A1 Manualer | 30 nye + 12 varianter | 42 |
| A2 Stang/EZ/trapbar/landmine | 39 nye + 5 kjeder | 44 |
| B1 Maskiner & kabler | 31 nye + smith/multi/kabel-varianter | ~38 |
| B2 Kondisjonsmaskin-økter | 15 | 15 |
| C Pilates-apparat | 34 | 34 |
| D Conditioning | 23 | 23 |
| E Småutstyr | 43 + 6 varianter + vektvest-modifikator | 50 |
| F Løpedriller | 9 | 9 |
| G Rulling | 11 | 11 |
| **Totalt bibliotek** | | **≈ 595 enheter · 22 progresjonskjeder** |
