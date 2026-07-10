# Mova øktbibliotek — 60 true-and-tested økter

Dette dokumentet er den lesbare utgaven av øktbiblioteket i `data/okter.json`: 10 kategorier × 6 økter,
alle basert på etablerte, dokumenterte programmer, protokoller og tradisjoner med navngitt opphav og
minst to uavhengige kilder per økt. Biblioteket erstatter øktgeneratoren i neste milepæl — brukeren
velger en ferdig økt i stedet for å få en generert.

## Taksonomi

**Skill = teknikk/kompleksitet/forkunnskap — aldri kondis eller form.**

| Nivå | Guidede kategorier (styrke, kroppsvekt, yoga, tøying, mobilitet) | Timer-kategorier (gåtur, løp, sykkel, HIIT, restitusjon) |
|---|---|---|
| **Lav** | Hver bevegelse kan forklares på én linje; trygt på første forsøk alene | Ingen pacing-krav: gå, tråkk jevnt, følg pipet |
| **Medium** | Grunnleggende bevegelsesvokabular (knebøy-form, Solhilsen A, planke) | Kan holde en sone på følelse («snakketempo»); jevne intervaller |
| **Høy** | Krever lært teknikk/forutsetninger (stang/KB, PNF, CARs, håndstående-prep) | Pacing-/teknikkdisiplin (jevne 4×4-drag, 30/15-watt, staver, pulstak) |

| Intensitet | Definisjon |
|---|---|
| **Lett** | RPE 2–4; Z1–Z2, snakketempo hele veien; styrke med RIR ≥ 4. Funker som restitusjonsdag. |
| **Intens** | RPE 7–9; Z3–Z5-intervaller; styrke RIR 1–3; du blir andpusten. |
| **Unntak** | For tøying/restitusjon betyr «intens» dypere/lengre/mer krevende protokoll (PNF, lange yin-hold, yoga nidra) — ikke høy puls. |

**Varighet:** 8–45 min, mål ~20–30. Lette økter kan være lengre, intense kortere.

## Kildekrav

Hver økt har navngitt opphav (person/institusjon/år/tradisjon) og minst to uavhengige, offentlige
kilder — fagfellevurderte studier, offisielle programsider eller retningslinjeorganer
(Helsedirektoratet, WHO, ACSM, NHS) er foretrukket, og norskdokumenterte protokoller (NTNU 4×4,
Rønnestad 30/15, Seiler-tradisjonen) prioritert der de finnes. Proprietære programmer er aldri
gjengitt ordrett: kun generisk struktur er adaptert, opphavet kreditert og tilpasningene notert.

## Datamodell (kort)

`data/okter.json` er en array med 60 objekter: `id` (= `kategori-skill-intensitet`), `kategori`,
`skill`, `intensitet`, `navn`, `beskrivelse`, `varighetMin`, `utstyr[]`, `kilde{navn,type,ref,notat}`
og `blokker[]`. Blokkene gjenbruker øktspillerens fire eksisterende typer (`ovelser`, `sekvens`,
`pust`, `kondisjon`); eneste nyhet er den generiske intervallformen `parametre.{runder, faser[]}` som
neste milepæl kobler inn i `fasePlan()`. Valideres med `node scripts/valider-okter.mjs`.

---

## Gåtur

Gåturbiblioteket dekker alt fra den enkle helsemyndighet-halvtimen til teknikkrevende stavgang og militærinspirerte ruck-intervaller. Alle øktene er bygget på navngitte, dokumenterte protokoller og styres med sone- og pustefølelse i stedet for målere. Intensiteten spenner fra rolig snakketempo (Z1–Z2) til tydelig andpusten motbakke- og marsjarbeid (Z3–Z4).

| Skill | Lett | Intens |
|---|---|---|
| Lav | Helsedirektoratets halvtime (35 min) | 12-3-30 motbakke (30 min) |
| Medium | Snakketest-turen (40 min) | Japansk intervallgange (IWT) (40 min) |
| Høy | Stavgang teknikkøkt (INWA) (35 min) | Ruck-intervaller (34 min) |

### Helsedirektoratets halvtime (lav · lett · 35 min)

Den klassiske halvtimen med moderat gange som helsemyndighetene anbefaler. Ingen krav, ingen teknikk — bare kom deg ut døra og gå i et tempo som kjennes godt. Dette er selve grunnmuren i de nasjonale aktivitetsrådene: moderat gange der pusten går litt raskere enn vanlig, men du kan prate hele veien.

**Struktur:** 5 min rolig gange med ledige skuldre (Z1) → 25 min jevn gange i behagelig moderat tempo (Z1–Z2, RPE 3–4, snakketempo) → 5 min rolig gange der tempoet senkes gradvis (Z1).

**Kilder:**
- Helsedirektoratet — Voksne: 150–300 minutter per uke — https://www.helsedirektoratet.no/faglige-rad/fysisk-aktivitet-i-forebygging-og-behandling/voksne-og-eldre/voksne-rad-anbefaling-fysisk-aktivitet-150-300-minutter-per-uke
- WHO — Physical activity fact sheet — https://www.who.int/news-room/fact-sheets/detail/physical-activity
- Helsenorge — Råd om fysisk aktivitet — https://www.helsenorge.no/trening-og-fysisk-aktivitet/rad-om-fysisk-aktivitet/

**Tilpasning:** Ukesanbefalingen (150 min moderat aktivitet) er operasjonalisert som én daglig 30-min moderat økt (vanlig tolkning hos Helsedirektoratet/WHO); eksplisitt oppvarmings- og nedtrappingsfase er lagt til for timerformatet.

### 12-3-30 motbakke (lav · intens · 30 min)

Den virale motbakke-halvtimen i norsk utendørsversjon. Bakken gjør jobben for deg — hold ett bestemt tempo oppover og kjenn at pulsen og pusten svarer. Skill er lav fordi bakken styrer intensiteten; ingen pacing-ferdighet kreves.

**Struktur:** 5 min rolig gange på flat mark (Z1) → 20 min sammenhengende gange i jevn, tydelig motbakke i bestemt, uendret tempo (Z3–Z4, RPE 7–8, tydelig andpusten — svar med korte setninger) → 5 min rolig gange på flat mark for å få pusten ned (Z1).

**Kilder:**
- Good Morning America — What to know about the TikTok-famous 12-3-30 treadmill workout — https://www.goodmorningamerica.com/gma/story/tiktok-famous-12-30-treadmill-workout-82600185
- TODAY — What Is 12-3-30? — https://www.today.com/health/diet-fitness/12-3-30-workout-rcna155871

**Tilpasning:** Oversatt fra tredemølle (12 % stigning / 3 mph) til utendørs jevn motbakke, siden appen er utendørsrettet; arbeidsfasen er kortet fra 30 til 20 min og rammet inn med oppvarming og nedtrapping.

### Snakketest-turen (medium · lett · 40 min)

En rask tur der pusten er kompasset ditt. Finn tempoet der du fortsatt kan prate i hele setninger — der ligger den gode, lette sonen som bygger utholdenhet uten å slite deg ut. Skill er medium fordi du må holde en sone på følelse.

**Struktur:** 5 min rolig gange, så lett at du kunne sunget (Z1) → 3 runder med 8 min rask gange i snakketempo (Z2, RPE 3–4 — hele setninger, men ikke sang; juster farten etter pusten) + 2 min rolig gange med helt ledig pust (Z1) → 5 min rolig gange (Z1).

**Kilder:**
- ACE — Validating the Talk Test as a Measure of Exercise Intensity — https://www.acefitness.org/certifiednewsarticle/888/ace-sponsored-research-validating-the-talk-test-as-a-measure-of-exercise-intensity/
- The talk test as a useful tool to monitor aerobic exercise (J Exerc Rehabil) — https://e-jer.org/upload/jer-19-3-163.pdf
- CNN/CDC — Track exercise intensity with the talk test — https://www.cnn.com/2022/04/26/health/talk-test-exercise-intensity-cdc-wellness

**Tilpasning:** Talk-testen (Foster/Persinger, UW–La Crosse) er en intensitetsmetode, ikke en ferdig økt; her er den strukturert som 3×8 min soneholding med korte pusterom — intervallene gir naturlige sjekkpunkter for å kalibrere snakketempoet.

### Japansk intervallgange (IWT) (medium · intens · 40 min)

Den japanske intervallmetoden som ga eldre mosjonister sterkere bein og lavere blodtrykk enn vanlig gange. Tre minutter på, tre minutter av — enkelt, tøft og godt dokumentert i store studier fra Shinshu University.

**Struktur:** 5 min rolig gange (Z1) → 5 runder med 3 min rask gange (Z3–Z4, RPE 7, tydelig andpusten — lange steg og aktive armer) + 3 min rolig gange der du henter deg helt inn (Z1) → 5 min rolig gange (Z1).

**Kilder:**
- Nemoto et al., Mayo Clinic Proceedings 2007 — Effects of High-Intensity Interval Walking Training — https://www.mayoclinicproceedings.org/article/S0025-6196(11)61303-7/abstract
- Masuki/Nose, Mayo Clinic Proceedings 2019 — High-Intensity Walking Time Is a Key Determinant — https://www.mayoclinicproceedings.org/article/S0025-6196(19)30473-2/pdf
- TODAY — What Is the Japanese Walking Method? — https://www.today.com/health/diet-fitness/japanese-walking-trend-rcna224252

**Tilpasning:** Kjerneprotokollen (5×3/3) er uendret fra studien; eksplisitt 5 min oppvarming og nedtrapping er lagt til (studien angir kun intervalldelen). «70 %/40 % av VO2peak» er oversatt til RPE/sone-følelse siden appen ikke måler VO2.

### Stavgang teknikkøkt (INWA) (høy · lett · 35 min)

Lær den finske stavgangteknikken steg for steg i rolig tempo. Når stavene sitter, aktiverer du hele overkroppen — uten at pulsen trenger å ta av. Utstyr: staver. Skill er høy på grunn av teknikk-koordinasjonen, ikke kondisjonskravet.

**Struktur:** 5 min vanlig gange med hengende staver — la dem dra etter deg og finn naturlig diagonal armsving (Z1) → 10 min teknikkfase: rolig gange med bevisst stavisett — plant staven skrått bakover når hånden passerer hoften, åpne hånden bak (Z1–Z2, fullt snakketempo) → 15 min flytende stavgang med aktivt fraspark gjennom staven og rotasjon i overkroppen (Z2, RPE 3–4, snakketempo) → 5 min rolig gange der du løser opp skuldre og nakke (Z1).

**Kilder:**
- INWA — What is Nordic Walking — https://www.inwa-nordicwalking.com/nordicwalking
- British Nordic Walking — The INWA 10 Step Method — https://britishnordicwalking.org.uk/pages/the-inwa-10-step-method
- Bristol Nordic Walking — How to Nordic walk — https://bristolnordicwalking.co.uk/blog/how-nordic-walk/

**Tilpasning:** INWAs 10-stegs pensum (normalt instruktørledet over flere økter) er komprimert til de tre første grunnstegene (holdning, drag, plant) i én selvgått timerøkt; de dynamiske stegene er utelatt for å holde intensiteten lett.

### Ruck-intervaller (høy · intens · 34 min)

Militærinspirert marsj med vekt på ryggen. Sekken gjør vanlig gange til styrke- og kondisjonstrening i ett — start med rundt 10 % av kroppsvekten og kjenn at hele kroppen jobber. Utstyr: sekk med vekt. Skill er høy på grunn av lastbæring, sekkjustering og tempodisiplin.

**Struktur:** 5 min rolig gange med sekken på — kjenn at den sitter høyt og stramt (Z1–Z2) → 4 runder med 4 min hurtig marsjgange med sekk (Z3–Z4, RPE 7–8, andpusten — press tempoet, korte raske steg i motbakke) + 2 min rolig gange der du ruller skuldrene og senker pulsen (Z1–Z2) → 5 min rolig gange, gjerne siste del uten sekk (Z1).

**Kilder:**
- GORUCK — How To Train for Army Ruck Marches — https://www.goruck.com/blogs/news-stories/ruck-march-standards
- Cleveland Clinic — Should You Add Rucking to Your Workouts? — https://health.clevelandclinic.org/what-is-rucking
- Military.com — How to Train for Ruck Marches — https://www.military.com/military-fitness/army-workouts/training-for-ruck-marches

**Tilpasning:** Militær kontinuerlig langmarsj (2–3 timer) er kortet til 4×4 min tempointervaller med pauser for timerformat og sivil målgruppe; lasten er redusert fra militære ~16 kg til ~10 % av kroppsvekt (GORUCK/Cleveland Clinic-anbefaling for nybegynnere).

## Løp

Løpekategorien spenner fra pipetone-styrt løp/gå for helt ferske løpere til forskningsdokumenterte intervalløkter. Alle økter er rene fasetimere (kondisjon-blokker) uten utstyrskrav; puls- eller sonebeskrivelser ligger i fasenavn og sonetekster. Skill-aksen følger pacingkravet: lav = timeren styrer alt, medium = én sone/følelse må holdes, høy = streng puls- eller pacingdisiplin.

| Id | Navn | Skill | Intensitet | Varighet | Protokoll-opphav |
|---|---|---|---|---|---|
| lop-lav-lett | Løp/gå-start (Couch to 5K) | lav | lett | 30 min | Josh Clark 1996 / NHS |
| lop-lav-intens | 10-20-30 (København-intervaller) | lav | intens | 29 min | Gunnarsson & Bangsbo 2012 |
| lop-medium-lett | Rolig sone 2-løp (snakketempo) | medium | lett | 30 min | Seiler & Tønnessen 2009 |
| lop-medium-intens | Mona-fartlek | medium | intens | 30 min | Wardlaw/Moneghetti 1983 |
| lop-hoy-lett | MAF lavpuls-løp (Maffetone 180) | hoy | lett | 35 min | Phil Maffetone, 1980-tallet |
| lop-hoy-intens | Norsk 4×4 | hoy | intens | 40 min | Helgerud/Hoff, CERG/NTNU 2007 |

### Løp/gå-start (Couch to 5K) — lop-lav-lett

Den klassiske starten på løpeeventyret: du jogger bare når pipetonen sier fra, og går resten. Millioner har begynt akkurat her — alt du trenger er å følge timeren.

**Struktur:** 5 min rask gange (oppvarming) → 8 × [60 s lett jogg (RPE 3–4) + 90 s rolig gange] → 5 min rolig gange (nedtrapping). Totalt 30 min.

**Kilder:**
- Couch to 5K running plan — NHS Better Health: https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/
- C25K Plan (c25k.com): https://c25k.com/c25k_plan/
- How Josh Clark Invented Couch to 5K (Big Medium): https://bigmedium.com/ideas/bbc-how-josh-clark-invented-couch-to-5k.html

**Tilpasning:** Uke 1-økten er brukt uendret — 5/20/5-strukturen er identisk hos NHS og c25k.com. Kun fase-tekstene er omskrevet til norsk; ingen proprietær coaching-tekst er gjenbrukt.

### 10-20-30 (København-intervaller) — lop-lav-intens

Dansk forskerfavoritt: 30 sekunder rolig, 20 litt fortere, 10 alt du har — om og om igjen. Ingen klokkemattematikk, bare følg pipet og gi jernet i ti sekunder om gangen.

**Struktur:** 5 min rolig jogg (oppvarming) → 3 × [5-min serie: 5 × (30 s rolig jogg + 20 s moderat løp + 10 s maks spurt) + 2 min rolig jogg-pause] → 5 min rolig jogg (nedtrapping). Seriene og pausene ligger som faser i én hovedblokk (runder = 3); spilleren dropper den siste pausen automatisk, så hoveddelen blir 19 min og totalen 29 min.

**Kilder:**
- The 10-20-30 training concept improves performance and health profile in moderately trained runners (J Appl Physiol 2012): https://journals.physiology.org/doi/full/10.1152/japplphysiol.00334.2012
- 10-20-30 exercise training improves fitness and health (Bangsbo 2024, Eur J Sport Sci): https://onlinelibrary.wiley.com/doi/10.1002/ejsc.12163
- PubMed-oppføring: https://pubmed.ncbi.nlm.nih.gov/22556401/

**Tilpasning:** Studien brukte 3–4 blokker à 5 min; 3 er valgt for å treffe ~30 min totalt. Én-blokk-varianten (pauser som egne faser) ble valgt fremfor separate serieblokker fordi den spilles sømløst og holder økten innenfor blokkgrensen. Plassert som lav skill fordi ingen soneholding kreves: 10-sekundersspurten er «alt ut», resten styres av pipetonen. Intensiteten topper på RPE 9.

### Rolig sone 2-løp (snakketempo) — lop-medium-lett

Grunnmuren i all utholdenhetstrening: et jevnt, behagelig løp der du hele tiden kan prate. Føles «for lett» — og det er nettopp poenget. Slik bygger proffene motoren sin.

**Struktur:** 5 min lett jogg med gradvis opptrapping → 20 min jevnt løp i sone 1–2 (snakketempo: hele setninger skal gå, RPE 3–4) → 5 min svært rolig jogg eller gange (nedtrapping). Totalt 30 min.

**Kilder:**
- Intervals, Thresholds, and Long Slow Distance (Seiler & Tønnessen 2009, Sportscience): https://sportsci.org/2009/ss.htm
- ACE-Sponsored Research: Validating the Talk Test (Foster & Porcari): https://www.acefitness.org/certifiednewsarticle/888/ace-sponsored-research-validating-the-talk-test-as-a-measure-of-exercise-intensity/
- Training intensity distribution among well-trained and elite endurance athletes (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC4621419/

**Tilpasning:** En kontinuerlig økt rammet inn som tre timerfaser (opptrapping/hoveddel/nedtrapping). Medium skill: krever å holde én sone på følelse med snakketesten som verktøy, men ingen intervallpacing.

### Mona-fartlek — lop-medium-intens

Verdens mest kjente fartlek: dragene blir kortere og kvassere mens pausene krymper i takt. Moneghetti løp den hver uke i hele karrieren — 20 minutter som gir alt.

**Struktur:** 5 min rolig jogg (oppvarming) → fire hovedblokker etter hverandre: 2 × [90 s hardt + 90 s flytjogg] → 4 × [60 s hardt + 60 s flytjogg] → 4 × [30 s hardt + 30 s flytjogg] → 4 × [15 s nesten maks + 15 s flytjogg] → 5 min rolig nedjogging (bakt inn som siste fase i 15/15-blokken). Totalt 30 min.

**Kilder:**
- The Mona Fartlek Interval Set (Mind Over Matter Endurance): https://www.mindovermatterendurance.com/coaches-classroom/2024/12/11/the-mona-fartlek-interval-set-for-performance-improvement
- Mona Fartlek (runbkrun): https://www.runbkrun.com/2016/09/27/mona-fartlek-one-of-my-favourite-sessions-for-some-serious-pain-box-time/
- Fartlek — Wikipedia (Holmér-opphav): https://en.wikipedia.org/wiki/Fartlek

**Tilpasning:** Den originale 20-minuttersstrukturen er beholdt eksakt; oppvarming er lagt til som egen blokk, og nedjoggingen ligger som avsluttende fase i siste hovedblokk for å holde økten innenfor fem blokker. Medium skill: «hardt» og «flyt» styres på følelse uten eksakte fartskrav — mellom ren pipetone-løping og disiplinert sonepacing. RPE 7–9. Fartlek-arven fra Gösta Holmér (1930-tallet) er kreditert i kildenavnet.

### MAF lavpuls-løp (Maffetone 180) — lop-hoy-lett

Kunsten å løpe sakte nok: du holder pulsen under et strengt tak og lar den aerobe motoren gjøre jobben. Krever disiplin — men det er slik du blir raskere på samme puls.

**Struktur:** 10 min gradvis opptrapping fra gange til jogg, opp mot MAF-pulsen (180 − alder) → 20 min jevnt løp på eller like under MAF-pulsen — aldri over, gå om nødvendig (RPE 2–4) → 5 min rolig nedjogging. Totalt 35 min.

**Kilder:**
- The MAF 180 Formula (Dr. Phil Maffetone, offisiell side): https://philmaffetone.com/180-formula/
- MAF Method: How It Works (Marathon Handbook): https://marathonhandbook.com/maf-method-maffetone-method/
- Focusing on heart rate, not pace, with MAF training (Canadian Running): https://runningmagazine.ca/sections/training/focusing-on-heart-rate-not-pace-with-maf-training/

**Tilpasning:** Maffetones anbefalte 12–15 min opptrapping er komprimert til 10 min for app-formatet. Høy skill tross lett intensitet: krever pulsbelte/-klokke og aktiv tilbakeholdenhet for å holde pulsen under taket i motbakker — klassisk pacingdisiplin. Brukeren bør regne ut 180 − alder før start (lagt i beskrivelsen).

### Norsk 4×4 — lop-hoy-intens

Norges mest dokumenterte økt: fire ganger fire minutter der du puster tungt, men holder jevnt tempo hele veien. NTNU-forskning viser at få økter løfter kondisen raskere.

**Struktur:** 10 min rolig jogg, gradvis opp mot 60–70 % av makspuls (oppvarming) → 4 × [4 min hardt og jevnt løp på 85–95 % av makspuls (RPE 8) + 3 min aktiv pause i rolig jogg] → 5 min rolig nedjogging. Siste pause droppes av spilleren, så hoveddelen blir 25 min og totalen 40 min.

**Kilder:**
- Aerobic high-intensity intervals improve VO2max more than moderate training (Helgerud m.fl. 2007, PubMed): https://pubmed.ncbi.nlm.nih.gov/17414804/
- Exercise advice — CERG, NTNU: https://www.ntnu.edu/cerg/advice
- 4×4 interval training — popular and controversial (Norwegian SciTech News/NTNU): https://norwegianscitechnews.com/2024/05/4x4-interval-training-popular-and-controversial/

**Tilpasning:** CERGs offisielle oppsett (10 min oppvarming, 4×4 på 85–95 %, 3 min pauser, 5 min ned) er brukt uendret. Høy skill per taksonomien: krever jevn pacing gjennom hele 4-minuttersdraget uten å sprekke — ikke start for hardt.

## Yoga

Yoga-kategorien spenner fra trygg stol-yoga til kraftfull Ashtanga-inspirert vinyasa. De lette øktene bruker lange, passive hold (yin) eller rolige sittende bevegelser; de intense bygger varme gjennom solhilsen-flyter i pustetempo. Alle flyter er lagt som sekvens-blokker med posisjonsliste og runder, mens yin- og holdarbeid ligger som øvelsesblokker med holdetider. Doser og rekkefølger er kildeverifisert mot Ashtanga-, yin- og stol-yoga-tradisjonene (se kilder per økt).

| Id | Navn | Skill | Intensitet | Varighet | Utstyr |
|---|---|---|---|---|---|
| yoga-lav-lett | Stol-yoga – mykt og mobilt | lav | lett | 20 min | stol |
| yoga-lav-intens | Halv solhilsen-runder | lav | intens | 20 min | matte |
| yoga-medium-lett | Yin yoga – hofter | medium | lett | 25 min | matte |
| yoga-medium-intens | Solhilsen A + stående flyt | medium | intens | 27 min | matte |
| yoga-hoy-lett | Yin dyp med props – rygg og forside | hoy | lett | 30 min | matte, pute, teppe |
| yoga-hoy-intens | Solhilsen B med kriger-overganger | hoy | intens | 30 min | matte |

### Stol-yoga – mykt og mobilt (yoga-lav-lett)

Rolig stol-yoga etter «Sit 'N' Fit Chair Yoga»-formatet (Kristine Lee), som i RCT hos eldre med artrose (Park et al. 2017) ga bedre mobilitet og mindre smerte. Alt gjøres sittende – ingen gulvøvelser.

**Struktur:** Oppvarming 5 min (sittende fjellstilling 10 pust, nakkebevegelser, skulderruller, sittende katt–ku) → rygg/sider 5 min (sidebøy og twist, 5 pust per side) → stol-solhilsen 4 min (3 runder: armer opp – foroverbøy over lårene – halvveis løft – opp) → hofter/ankler 4 min (kneløft, ankelsirkler, figur-4, sittende foroverbøy) → 2 min rolige pust med lukkede øyne.

**Kilder:** Park et al. 2017 – Chair Yoga RCT (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC5357158/ + YogaUOnline: Chair Yoga Sequence for Arthritis: https://yogauonline.com/yoga-and-healthy-aging/yoga-for-arthritis/a-chair-yoga-sequence-for-arthritis-increase-mobility-and-decrease-pain/

**Tilpasning:** Studiens 45 min er kortet til 20 min med samme øvelsesutvalg og rekkefølge-logikk. Stopp ved smerte; hopp over twist ved vond rygg. Mer utfordring: hold hver stilling 2–3 pust lenger, eller reis deg mellom rundene.

### Halv solhilsen-runder (yoga-lav-intens)

Ardha Surya Namaskar – kun den stående delen av solhilsenen fra vinyasa-/Ashtanga-tradisjonen (Krishnamacharya-linjen). Enkle bevegelser i friskt pustetempo gir intensitet uten teknisk kompleksitet.

**Struktur:** Oppvarming 3 min: 2 helt rolige runder (3–4 pust per stilling). Hoveddel 12 min: 20 runder i pustetempo (4 blokker à 5 runder, 30–45 sek pause i fjellstilling mellom blokkene): fjell → armer opp (inn) → foroverbøy (ut) → halvveis løft (inn) → foroverbøy (ut) → armer opp m/ strak rygg (inn) → fjell (ut). Nedtrapping 5 min: stående sidebøy 3 pust/side, rolig foroverbøy 5 pust, savasana/sittende ro 2 min.

**Kilder:** Tummee: Ardha Surya Namaskar A: https://www.tummee.com/yoga-poses/ardha-surya-namaskar-a + Marie Page Yoga: The Half Sun Salutation Sequence: https://www.mariepageyoga.com/half-sun-salutation/

**Tilpasning:** Full solhilsen krever chaturanga/hund (medium skill) – derfor halv variant her; intensiteten kommer fra tempo og runder. Bøy knærne i foroverbøy; hendene på leggene i halvveis løft. Lettere: færre runder. Tyngre: 6 blokker eller hælhev i fjellstilling.

### Yin yoga – hofter (yoga-medium-lett)

Grunn-yin etter Paul Grilley og Sarah Powers (videreført av Bernie Clark): lange passive hold på 2–3 minutter i kjerneposisjonene sommerfugl, dragen og svanen. Pusten gjør jobben, ikke musklene.

**Struktur:** Hoveddel 18 min (30–60 sek hvile på rygg mellom stillingene): sommerfugl 3 min → dragen 3 min/side → svanen (sovende due) 3 min/side → frosken 2 min. Nedtrapping 7 min: liggende twist 2 min/side → savasana 3 min.

**Kilder:** Bernie Clark: Three Beginning Flows (yinyoga.com): https://yinyoga.com/yinsights/three-beginning-flows/ + Paul Grilley: The Five Yin Archetypes (PDF): https://paulgrilley.com/assets/documents/the-five-yin-archetypes.pdf

**Tilpasning:** Pute under kne/hofte i svanen; dragen med hendene på klosser eller innerside av foten. Aldri skarp smerte – finn 60–70 % av maks og bli der. Kortere hold (90 sek) for nybegynnere.

### Solhilsen A + stående flyt (yoga-medium-intens)

Klassisk vinyasa bygd på Surya Namaskara A (9 vinyasas) fra Ashtanga-tradisjonen (K. Pattabhi Jois, etter Krishnamacharya) – tradisjonelt 5 runder som åpning – etterfulgt av standard stående kriger-blokk med 5 pust per stilling.

**Struktur:** Oppvarming 4 min: katt–ku ×8, nedovervendt hund 5 pust. Hoveddel 1, 10 min: Solhilsen A ×5 i pustetempo (fjell → armer opp → foroverbøy → halvveis løft → planke/chaturanga → opp-hund → ned-hund 5 pust → frem → tilbake til fjell). Hoveddel 2, 8 min: stående blokk ×2 per side (kriger 2 → fredfull kriger → utvidet sidevinkel → triangel). Nedtrapping 5 min: stående foroverbøy, liggende twist, savasana 2 min.

**Kilder:** AshtangaYoga.info: Surya Namaskara A: https://www.ashtangayoga.info/ashtanga-yoga/surya-namaskara-a-sun-salutation/ + Practicing Ashtanga: Surya Namaskara A: https://practicingashtanga.com/surya-namaskara-a/

**Tilpasning:** Chaturanga på knær, kobra i stedet for opp-hund; kortere steg i kriger-stillingene. Tyngre: 6–8 runder Sol A og 5 pust i alle overganger. Varighet er beregnet fra pustetempo (ca. 4–5 sek per pust), ikke hentet ordrett fra kildene.

### Yin dyp med props – rygg og forside (yoga-hoy-lett)

Avansert yin (Grilley/Powers-tradisjonen): sadelen, selen og sneglen er blant de mest krevende yin-posisjonene og settes opp med props (pute/teppe) slik Bernie Clark og Sarah Powers dokumenterer i sfinx–sel–sadel-sekvensene. Ryggsøylen bøyes begge veier.

**Struktur:** Hoveddel 1, 11 min (30–60 sek stille hvile mellom): caterpillar 4 min → sadelen m/ pute langs ryggen 4 min → barnets stilling 1 min. Hoveddel 2, 11 min: sfinxen 3 min → selen 2 min → sneglen m/ brettet teppe under skuldrene 3 min → barnets stilling 1 min. Nedtrapping 8 min: liggende twist 2 min/side → savasana 5 min.

**Kilder:** Bernie Clark: Using Props in Yin Yoga: https://yinyoga.com/using-props-in-yin-yoga/ + Yoga International: A Prop-Supported Yin Sequence: https://yogainternational.com/article/view/yin-yoga-with-props/

**Tilpasning:** Sadelen krever friske knær – halv sadel eller sfinx som erstatning. Sneglen aldri ved nakkeproblemer (bytt til liggende knær-til-bryst). Mer pute/teppe = mildere; mindre = dypere. Utstyrskravet «kun matte» fravikes bevisst fordi avansert yin med props per taksonomien er en hoy-økt.

### Solhilsen B med kriger-overganger (yoga-hoy-intens)

Surya Namaskara B (17 vinyasas) fra Ashtanga-tradisjonen (K. Pattabhi Jois): Sol A pluss stol (utkatasana) og kriger 1 med full chaturanga-overgang per side, tradisjonelt 3–5 runder etter Sol A. Holdblokken følger Ashtanga-prinsippet 5 pust per stilling.

**Struktur:** Oppvarming 5 min: Solhilsen A ×3 rolig. Hoveddel 1, 11 min: Solhilsen B ×5 i pustetempo (fjell → stol → foroverbøy → chaturanga → opp-hund → ned-hund → kriger 1 h → vinyasa → kriger 1 v → vinyasa → ned-hund 5 pust → frem → stol → fjell). Hoveddel 2, 8 min holdblokk: stol 8 pust, kriger 1 5 pust/side, sideplanke 5 pust/side, kråke-forberedelse 3×5 s. Nedtrapping 6 min: barnets stilling, liggende twist, savasana 3 min.

**Kilder:** AshtangaYoga.info: Surya Namaskara B: https://www.ashtangayoga.info/ashtanga-yoga/surya-namaskara-b-sun-salutation-b/ + Practicing Ashtanga: Surya Namaskara B: https://practicingashtanga.com/surya-namaskara-b/

**Tilpasning:** Chaturanga på knær og kobra ved behov; 3 runder B i stedet for 5. Dropp kråke-prep ved håndledds-plager (hold planke 5 pust i stedet). Tyngre: full kråke og 5 pust i hver ned-hund. Varighet beregnet fra 17 vinyasas ≈ 2 min per runde.

## Styrke

Seks styrkeøkter som dekker hele matrisen fra nybegynner med manualer til klassisk stangtrening. Alle økter bygger på navngitte, veldokumenterte protokoller (Dan John, DeLorme, ACSM, StrongFirst-strukturen, Reg Park) og styres med RIR (reps i reserve): lett-øktene holder RIR ≥ 4, intens-øktene går til RIR 1–3. Fem av seks økter klarer seg med manualer/kettlebell og matte hjemme; kun 5×5-økta krever stang.

| Id | Navn | Skill | Intensitet | Varighet | Utstyr |
|---|---|---|---|---|---|
| styrke-lav-lett | Goblet-grunnøkta | lav | lett | 25 min | manualer, matte |
| styrke-lav-intens | DeLorme 3×10 | lav | intens | 30 min | manualer, matte |
| styrke-medium-lett | ACSM helkropp – teknikk og hengsel | medium | lett | 30 min | manualer, matte |
| styrke-medium-intens | ACSM helkropp – tung | medium | intens | 35 min | manualer, matte |
| styrke-hoy-lett | Sving & oppreisning | hoy | lett | 30 min | kettlebell, matte |
| styrke-hoy-intens | 5×5 klassisk med stang | hoy | intens | 40 min | stang, benk, matte |

### Goblet-grunnøkta (styrke-lav-lett)

Dan Johns goblet-baserte grunnmønster «squat, push, pull, carry»: en trygg helkroppsøkt der goblet-knebøyen (utviklet av Dan John for å lære utøvere å sitte riktig i knebøy) er navet. Lette vekter, stor margin og teknikkfokus.

**Struktur:** Oppvarming 5 min (gange 2 min, katt–ku ×8, hofterotasjoner ×10, knebøy uten vekt 2×5, armsvinger ×10) → Hoveddel 17 min, RIR ≥ 4: goblet-knebøy 3×8 (pause 90 s), enarms manualroing 3×10/side, gulvpress med manualer 3×10, gårdsbæring 3×30 s (pause 60 s) → Nedtrapping 3 min (hoftebøyer- og brysttøyning 30 s, rolig pust 1 min).

**Kilder:** «Goblet Squats 101» – Dan John, T Nation: https://www.t-nation.com/training/goblet-squats-101/ + «The History of the Goblet Squat» – Physical Culture Study: https://physicalculturestudy.com/2018/06/15/the-history-of-the-goblet-squat/

**Tilpasning:** Dan Johns mal er et prinsipp (knebøy/press/trekk/bæring), ikke et fast program; dosene er satt konservativt (RIR 4–5) for lett-intensitet. Gårdsbæringen kan byttes til stående hold ved liten plass, og manual kan byttes til kettlebell.

### DeLorme 3×10 (styrke-lav-intens)

Thomas DeLormes «Progressive Resistance Exercise» (1948) – opphavet til hele sett×reps-systemet. Tre stigende sett per øvelse der bare det siste er tungt: 50 % → 75 % → ~100 % av 10RM. Du varmer opp i selve øvelsen og gir alt på slutten.

**Struktur:** Oppvarming 5 min (lett kondis 3 min, knebøy ×10, utfall bakover ×8, skulderrotasjoner ×10) → Hoveddel 22 min, DeLorme-rampe med stopp på RIR 1–2 på siste sett: goblet-knebøy 3×10 (50/75/100 % av 10RM, pause 120 s), gulvpress 3×10 (120 s), enarms manualroing 3×10/side (90 s), bicepscurl 3×10 (60 s) → Nedtrapping 3 min (lår-, bryst- og underarmstøyning 30 s per posisjon).

**Kilder:** «Thomas L. DeLorme and the science of progressive resistance exercise» – J Strength Cond Res 2012: https://pubmed.ncbi.nlm.nih.gov/22592167/ + «The DeLorme and Oxford Strength Training Principles» – Physiopedia: https://www.physio-pedia.com/The_DeLorme_and_Oxford_Strength_Training_Principles

**Tilpasning:** DeLormes originale sistesett er til 10RM (RIR 0); i appen stoppes det på RIR 1–2 fordi brukerne trener alene hjemme uten spotter. 50/75/100 %-rampen er bevart. Originalen var apparat-/rehab-basert; her overført til enkle manualøvelser (lav skill).

### ACSM helkropp – teknikk og hengsel (styrke-medium-lett)

Rolig helkroppsøkt etter ACSMs retningslinjer (alle store muskelgrupper, 8–12 reps), med hoftehengsel og press i fokus. Lette vekter og full kontroll – teknikkbyggeren som forbereder tunge løft.

**Struktur:** Oppvarming 5 min (rolig kondis 3 min, hoftehengsler ×10, katt–ku ×8, skulderpress uten vekt ×10, knebøy ×5) → Hoveddel 21 min som straight-sets 2×10 med 90 s pause, RIR 4–5 (RPE 3–4): rumensk markløft, stående skulderpress, goblet-knebøy, foroverbøyd roing (alle 2×10) og utfall bakover 2×8/side → Nedtrapping 4 min (hamstring- og 90/90-hoftetøyning 45 s/side, skulderrulling).

**Kilder:** ACSM Position Stand «Progression Models in Resistance Training for Healthy Adults» (2009, fulltekst-PDF): https://tourniquets.org/wp-content/uploads/PDFs/ACSM-Progression-models-in-resistance-training-for-healthy-adults-2009.pdf + ACSM Position Stand 2026 «Resistance Training Prescription … Overview of Reviews» (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/

**Tilpasning:** ACSM angir 8–12 reps «til viljestyrt utmattelse» for effekt; lett-varianten bruker samme øvelsesutvalg og repspenn, men bevisst RIR ≥ 4 i tråd med posisjonsdokumentets novise-/teknikkdosering.

### ACSM helkropp – tung (styrke-medium-intens)

ACSM-oppskriften slik den er ment for progresjon: 2–4 sett × 8–12 reps på 60–80 % av 1RM nær utmattelse, med skikkelige pauser og flerledsøvelser først. Fire store øvelser dekker hele kroppen.

**Struktur:** Oppvarming 6 min (rolig kondis 3 min, hoftehengsler ×10, katt–ku ×8, pluss ett lett tilvenningssett à 10 på de to første øvelsene) → Hoveddel 26 min som straight-sets 3×8 med 120 s pause, RIR 1–3 (RPE 7–9): rumensk markløft 3×8, manualbenkpress (benk eller gulv) 3×8, utfall 3×8/side, foroverbøyd roing 3×10 (pause 90 s) → Nedtrapping 3 min (hamstring- og brysttøyning, rolig pust).

**Kilder:** ACSM Position Stand «Progression Models in Resistance Training» (2009, fulltekst-PDF): https://tourniquets.org/wp-content/uploads/PDFs/ACSM-Progression-models-in-resistance-training-for-healthy-adults-2009.pdf + ACSM Position Stand 2026 (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/

**Tilpasning:** «Volitional fatigue» i retningslinjene er oversatt til RIR 1–3 for trygg soloøkt; pausene følger ACSMs 2–3 min-anbefaling for flerledsøvelser, nedjustert mot 2 min for å holde varigheten på 35 min. Benk er valgfri – gulvpress fungerer like godt hjemme.

### Sving & oppreisning (styrke-hoy-lett)

Strukturen fra Pavel Tsatsoulines «Kettlebell Simple & Sinister» (StrongFirst): kraftfulle ettarmssvinger og rolige tyrkiske oppreisninger, aldri til utmattelse. To teknisk krevende øvelser som bygger hofteeksplosivitet, grep og skulderstabilitet – og du går uthvilt derfra.

**Struktur:** Oppvarming 6 min, S&S-inspirert (kettlebell-halo 2×5/retning, «prying» goblet-knebøy 2×5, hoftebro 2×5, hoftehengsler ×5) → Hoveddel 20 min på lett klokke, RIR ≥ 4 og bestått snakketest: ettarms kettlebellsving 10×10 (bytt arm hvert sett, nytt sett hvert 90–120 s) og tyrkisk oppreisning 5×1/side i rolig tempo → Nedtrapping 4 min (90/90-hofte 45 s/side, QL-/sidestrekk 30 s/side, hamstring).

**Kilder:** «The Simply Sinister Training Plan» – StrongFirst: https://www.strongfirst.com/simply-sinister/ + Lake & Lauder, «Kettlebell Swing Training Improves Maximal and Explosive Strength», J Strength Cond Res 2012: https://journals.lww.com/nsca-jscr/fulltext/2012/08000/kettlebell_swing_training_improves_maximal_and.28.aspx

**Tilpasning:** Kun generisk svinger+oppreisning-struktur med kreditering; bokens vektprogresjon og teststandardene «Simple»/«Sinister» er utelatt som proprietære. Pavel foreskriver selv trening langt fra utmattelse – derfor er dette en lett-økt tross høyt teknikk-krav (skill hoy).

### 5×5 klassisk med stang (styrke-hoy-intens)

Reg Parks 5×5 fra «Strength & Bulk Training for Weight Lifters and Body Builders» (1960), med røtter hos Mark Berry og senere popularisert av StrongLifts. Tre store stangløft, fem tunge femmere med lange pauser – tidløs styrkebygging.

**Struktur:** Oppvarming 6 min (rolig kondis 3 min, hoftehengsler ×10, dype knebøy ×8, skulderrotasjoner med tom stang ×10) → Hoveddel 31 min etter Parks original: per løft 2 stigende oppvarmingssett (ca. 60/80 % av arbeidsvekt) + 3 arbeidssett på lik vekt, RIR 1–3 (RPE 7–9), pause 180 s: knebøy 5×5, benkpress 5×5, markløft 3×5 (1 oppvarming + 2 arbeidssett) → Nedtrapping 3 min (hoftebøyer- og hamstringtøyning 45 s/side).

**Kilder:** «Reg Park's 5x5 Program» – T Nation: https://www.t-nation.com/training/reg-parks-5x5-program/ + «History of The 5×5 Workout» – StrongLifts: https://stronglifts.com/stronglifts-5x5/history/

**Tilpasning:** Generisk 5×5-struktur kreditert Reg Park – ikke StrongLifts-programmet med dets faste progresjon og app-regler. Park frarådet trening til failure, så arbeidssettene ligger på RIR 1–3. Markløft er redusert til 3×5 for å holde økta innenfor 40 min. Dette er bibliotekets eneste økt som krever stang og benk.

## Tøying

Tøyingskategorien spenner fra milde, statiske etter-trening-hold til aktive metoder som AIS og PNF. De seks øktene dekker tre tradisjoner: klassisk statisk tøying (NHS/ACSM-dosert), yin yoga med lange passive hold (Grilley/Clark), og aktive protokoller der muskelarbeid brukes til å åpne bevegelsesutslag (Mattes' AIS og Kabat/Knotts PNF). Skill-aksen styrer teknisk kompleksitet, intensitets-aksen styrer hvor dypt og krevende strekken er.

| Økt | Skill | Intensitet | Varighet | Utstyr | Protokoll |
|---|---|---|---|---|---|
| Rolig helkroppstøying | lav | lett | 15 min | matte | Statisk 30 s (NHS/ACSM) |
| Yin-basis: lange hold | lav | intens | 20 min | matte | Yin 2–3 min (Grilley/Clark) |
| Hofte- og brystryggåpner | medium | lett | 20 min | matte | Statisk 30–45 s (90/90, ACSM) |
| Yin side- og skulderserie | medium | intens | 25 min | matte | Yin 2–3 min (Grilley/Clark) |
| Aktiv isolert tøying (AIS) | hoy | lett | 18 min | matte, strikk | AIS 10×2 s (Mattes) |
| PNF kontraher–slapp av mot splitt | hoy | intens | 28 min | matte | PNF hold-relax + splitt |

### Rolig helkroppstøying (toying-lav-lett)

En rolig runde gjennom hele kroppen med milde, statiske hold i NHS-tradisjonen etter Bob Andersons «Stretching» (1980), dosert etter ACSM-retningslinjene (statisk 15–30 s, 2–4 reps per muskelgruppe). Perfekt etter trening eller en lang dag.

**Struktur:** Underkropp — statiske hold 30 s (9 min: legg mot vegg, hamstring stående, sittende fremoverbøy, lyske sittende — 2×30 s hver, per side der det gjelder) → Overkropp og nakke (6 min: bryst i døråpning 2×30 s, skulder kryssdrag og nakke sidebøy 1×30 s per side).

**Kilder:** «How to stretch after exercising» (NHS) — https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/ · «ACSM Guidelines» (UNM/Kravitz) — https://www.unm.edu/~lkravitz/Article%20folder/ACSMGuidelinesUNM.pdf

**Tilpasning:** Kortere hold (15–20 s) ved stram muskulatur; bøy knærne lett i fremoverbøy; stol som støtte for balanse.

### Yin-basis: lange hold (toying-lav-intens)

Yin yoga slik Paul Grilley formet den (via Paulie Zink, navnet fra Sarah Powers): enkle gulvposisjoner holdt passivt i 2–3 minutter. Teknisk enkelt, men dypt og krevende – tyngdekraften gjør jobben, ikke muskelkraft.

**Struktur:** Yin-hold 2–3 min (16 min: sommerfuglen 3 min, larven 3 min, sfinksen 2 min, liggende vridning 2 min per side) → Utgang: beina opp langs vegg (4 min: 1×3 min).

**Kilder:** «Three Beginning Flows» (yinyoga.com/Bernie Clark) — https://yinyoga.com/yinsights/three-beginning-flows/ · «Yin Yoga with Paul Grilley» (Yoga Journal) — https://www.yogajournal.com/lifestyle/balance/yin-yoga-with-paul-grilley/

**Tilpasning:** Pute under knær/hofter; start med 90 s hold og bygg opp; gå ut av posisjonen ved nummenhet.

### Hofte- og brystryggåpner (toying-medium-lett)

Mild, systematisk åpning av hofter og brystrygg – områdene som stivner mest av stillesitting. Posisjonene kommer fra moderne mobilitets-/fysiotradisjon (90/90 fra Functional Range-miljøet, duebein fra yoga), dosert etter ACSM: statisk 30–45 s, 2 reps. Litt mer oppsett per posisjon enn lav-økta, derav medium skill.

**Struktur:** Hofter — statiske hold 30–45 s (13 min: 90/90-hoftestrekk, duebein, figur-4 liggende, knestående hoftebøyerstrekk, quadriceps stående m/ balanse — 2 reps per side) → Brystrygg og avslutning (6 min: åpen bok 2×30 s per side, barnets stilling m/ sidebøy 1×30 s per side).

**Kilder:** «The 90/90 Stretch & How It Helps Hip Mobility» (Cleveland Clinic) — https://health.clevelandclinic.org/90-90-stretch · «ACSM Guidelines» (UNM/Kravitz) — https://www.unm.edu/~lkravitz/Article%20folder/ACSMGuidelinesUNM.pdf

**Tilpasning:** Pute under hoften i duebein; hold i stol under quadstrekk; mindre rotasjonsutslag i åpen bok.

### Yin side- og skulderserie (toying-medium-intens)

En stille yin-reise for kroppens sidelinjer, skuldre og bryst med 2–3 minutters passive hold. *Merk (godkjent synteseendring):* researchens opprinnelige «Yin hofteserie» (drage, svane, skolisse, øyenstikker) er vinklet om til en side-/skulder-/brystserie for å unngå duplikat mot yoga-kategoriens yin-hofteøkt. Posisjonene – bananasana (liggende banan), smeltende hjerte (anahatasana), sidefold over bredt bein og twisted roots (liggende vridning med bøyde, flettede knær) – er alle dokumenterte yin-posisjoner i samme kilder (Grilley/yinyoga.com/Bernie Clark), med samme holdetider.

**Struktur:** Yin-hold 2–3 min (18 min: smeltende hjerte 1×3 min, bananasana 1×2 min per side, sidefold over bredt bein 1×2 min per side) → Utgang: twisted roots (7 min: 1×3 min per side).

**Kilder:** «Yin Yoga Poses: An Introduction» (yinyoga.com/Bernie Clark) — https://yinyoga.com/yinsights/asanas/ · «Yin Yoga with Paul Grilley» (Yoga Journal) — https://www.yogajournal.com/lifestyle/balance/yin-yoga-with-paul-grilley/

**Tilpasning:** Pute/blokk under hofte og hender; kortere hold (90 s) første ukene; mindre sidebøy-utslag ved ryggplager.

### Aktiv isolert tøying (AIS) (toying-hoy-lett)

Aaron Mattes' Active Isolated Stretching (fra 1970-tallet): aktiver antagonisten, løft lemmen aktivt inn i strekken, assister lett med strikk/tau siste centimeter, hold bare 2 sekunder – og gjenta 10 ganger. De korte holdene unngår strekkerefleksen. Teknisk presist (høy skill), men følelsen er mild (lett intensitet).

**Struktur:** AIS underkropp — løft aktivt, lett drahjelp, hold 2 s (13 min: hamstring liggende m/ strikk, legg m/ strikk, adduktor liggende m/ strikk, hoftebøyer sideliggende — 10×2 s per side) → AIS bryst (4 min: brystsving liggende 10×2 s per side).

**Kilder:** «Aaron Mattes' Active Isolated Stretching» (Stretching USA) — https://www.stretchingusa.com/product/aaron-mattes-active-isolated-stretching/ · «Active Isolated Stretching» (Abbott Center) — https://abbottcenter.com/active-isolated-stretching/

**Tilpasning:** Håndkle i stedet for strikk; færre reps (6) per øvelse; mindre bevegelsesutslag ved hofteprotese/skade.

### PNF kontraher–slapp av mot splitt (toying-hoy-intens)

Den tyngste økta i kategorien, bygget på PNF/hold-relax etter Herman Kabat og Margaret Knott (1940–50-tallet) i moderne selvadministrert form: passiv strekk 10 s → isometrisk kontraksjon MOT strekken 6 s (ca. 50 % kraft) → slipp 3 s → dypere statisk strekk 30 s. Avsluttes med splittprogresjon fra klassisk splitt-tradisjon (GMB). Varm opp først, og pust jevnt gjennom kontraksjonene.

**Struktur:** PNF-syklus: strekk 10 s → press mot 6 s (50 %) → slipp 3 s → dypere strekk 30 s (20 min: hamstring liggende 3 sykluser per side, hoftebøyer i dyp utfall 3 per side, adduktor sittende v/ vegg 3, legg mot vegg 2 per side) → Splittfinish (7 min: halv splitt 1×45 s per side, splittprogresjon m/ støtte 1×30 s per side).

**Kilder:** «PNF Stretching» (Healthline) — https://www.healthline.com/health/fitness-exercise/pnf-stretching · «Stretching» (Physiopedia) — https://www.physio-pedia.com/Stretching

**Tilpasning:** Dropp splittfinishen og gjør kun PNF-delen; 2 sykluser i stedet for 3; svakere kontraksjon (30 %) for nybegynnere.

## Sykkel

Sykkeløktene spenner fra rolige sone 2-turer i Seiler-tradisjonen til norske forskningsforankrede intervallprotokoller (NTNU 4×4 og Rønnestad 30/15), pluss original-Tabata og teknisk kadensarbeid. Alle økter er rene kondisjonsblokker styrt på tid, sone/RPE og kadens, og krever kun sykkel (ute eller på rulle).

| Økt | Skill | Intensitet | Varighet | Protokoll |
|---|---|---|---|---|
| Seiler rolig sone 2-tur | lav | lett | 30 min | Seiler 80/20 polarisert |
| Tabata på sykkel (8×20/10) | lav | intens | 20 min | Tabata 1996 |
| Coggan sone 2-blokker (3×8) | medium | lett | 40 min | Coggan/Allen L2 Endurance |
| Norsk 4×4 | medium | intens | 39 min | Helgerud/Hoff, NTNU |
| Kadens-driller med spin-ups | hoy | lett | 27 min | CTS/TrainingPeaks kadenstradisjon |
| Rønnestad 30/15 | hoy | intens | 38 min | Rønnestad 2020 |

### Seiler rolig sone 2-tur (lav-lett, 30 min)

Den rolige grunnturen bak den polariserte 80/20-modellen: rundt 80 % av treningen til utholdenhetseliten ligger i sone 1–2. Jobben er å holde snakketempo hele veien — kjennes det for lett, gjør du det riktig.

**Struktur:** 5 min rolig oppvarming (Z1, fri kadens) → 22 min jevn Z2 (RPE 3–4, snakketempo, kadens 85–95) → 3 min nedtrapping i Z1.

**Kilder:** Seiler & Kjerland 2006, Scand J Med Sci Sports — https://pubmed.ncbi.nlm.nih.gov/16430681/ + Stephen Seiler 80/20 Polarised Training, Roadman Cycling — https://roadmancycling.com/blog/stephen-seiler-80-20-polarised-training-cyclists

**Tilpasning:** Originalstudien fulgte langrennsløpere, men Seiler (UiA) har selv generalisert modellen til sykkel. Enklere: kort Z2-blokken til 15 min. Tøffere: forleng Z2 til 35 min (45 min totalt) — aldri hardere, bare lenger.

### Tabata på sykkel (8×20/10) (lav-intens, 20 min)

Selve originalprotokollen fra 1996 ble utført på sykkelergometer: 8 × 20 s all-out (~170 % av VO2max) med 10 s pause. Fire minutter som føles som en evighet — men du trenger bare å følge pipet og gi alt.

**Struktur:** 10 min gradvis oppvarming (Z1→Z2, fri kadens) → 8 × (20 s alt du har, høy kadens 100+ / 10 s soft-pedal) → 6 min nedspinning i Z1.

**Kilder:** Tabata et al. 1996, Med Sci Sports Exerc (fulltekst) — https://deliberateperformance.ca/wp-content/uploads/2011/01/effects-of-moderate-intensity-endurance-and-high-intensity-intermittent-training-on-anaerobic-capacity-and-e280a2vo2max.pdf + Tabata 2019, J Physiol Sci — https://link.springer.com/article/10.1007/s12576-019-00676-7

**Tilpasning:** Oppvarming/nedspinning er dimensjonert etter lab-praksis i 1996-studien; økten er per definisjon kort. Nybegynner: 6 runder og «veldig hardt» i stedet for all-out. Erfaren: to sett med 5 min rolig mellom (ca. 30 min totalt).

### Coggan sone 2-blokker (3×8) (medium-lett, 40 min)

Strukturert grunntrening fra det klassiske 7-sonesystemet i «Training and Racing with a Power Meter»: Level 2 Endurance (56–75 % FTP). Rolig, men med disiplin — jobben er å holde sonen stabil, verken snike den opp i bakker eller slippe den ned.

**Struktur:** 5 min oppvarming (Z1) → 3 × (8 min jevn Z2 @ 56–75 % FTP / RPE 3–4, kadens 85–95 / 2 min rolig tråkk Z1) → 5 min nedtrapping i Z1.

**Kilder:** Cycling Power Zones Explained (Coggan), TrainingPeaks — https://www.trainingpeaks.com/blog/power-training-levels/ + FTP Training Zones: The 7-Zone Coggan Model, Roadman Cycling — https://roadmancycling.com/blog/ftp-training-zones-cycling-complete-guide

**Tilpasning:** Wattstyring er oversatt til følelse/RPE for de uten måler. Enklere: 3×6 min mot nedre del av Z2. Tøffere: 3×10 min i øvre Z2 (73–75 % FTP) — fortsatt snakketempo.

### Norsk 4×4 (medium-intens, 39 min)

Norges mest kjente intervalløkt, utviklet av Helgerud og Hoff ved NTNU: 4 × 4 min ved 90–95 % av makspuls øker VO2max mer enn moderat trening. Kunsten er å disponere — like sterk på fjerde drag som på første.

**Struktur:** 10 min gradvis oppvarming (Z1→Z2, siste minutt mot Z3) → 4 × (4 min hardt drag @ 90–95 % makspuls, Z4 / RPE 8 / 3 min aktiv pause, lett tråkk Z1–Z2) → 4 min nedspinning i Z1 (siste pause går over i nedtrappingen).

**Kilder:** Helgerud et al. 2007, Med Sci Sports Exerc — https://pubmed.ncbi.nlm.nih.gov/17414804/ + 4x4 interval training — popular and controversial, NTNU Norwegian SciTech News — https://norwegianscitechnews.com/2024/05/4x4-interval-training-popular-and-controversial/

**Tilpasning:** 2007-studien var løpsbasert, men 4×4 er dokumentert brukt og anbefalt på sykkel av NTNU-miljøet selv; pulsstyringen er identisk. Enklere: 3×4 min ved 85–90 % makspuls. Tøffere: hold 93–95 % og tråkk pausene aktivt i Z2.

### Kadens-driller med spin-ups (hoy-lett, 27 min)

Teknikkøkt fra bane- og landeveistradisjonen, systematisert av CTS/Carmichael og TrainingPeaks: lav watt, høy presisjon. Målet er silkemykt tråkk på 110+ rpm med helt rolig overkropp — nevromuskulær effektivitet, ikke slit.

**Struktur:** 5 min oppvarming (Z1 @ 90 rpm) → 6 × (30 s spin-up fra 90 til maks kontrollert 110–120+ rpm i lett gir / 90 s rolig @ 85–90 rpm) → 3 × (1 min jevnt @ 105–110 rpm, Z2 / 1 min @ 85 rpm) → 4 min nedspinning med fri kadens.

**Kilder:** 3 High-Cadence Cycling Workouts for Base Training, TrainingPeaks — https://www.trainingpeaks.com/blog/3-high-cadence-cycling-workouts-base-training/ + Cycling Cadence: Economy, Efficiency and How to Train It, CTS — https://trainright.com/science-of-cycling-cadence-training/

**Tilpasning:** Stopp spin-up-økningen om du begynner å hoppe i setet. Enklere: 4 spin-ups og tak på 105 rpm. Tøffere: 8 spin-ups, eller legg inn ettbeinstråkk 2×(1 min per bein) på rulle.

### Rønnestad 30/15 (hoy-intens, 38 min)

Den norske intervallfavoritten fra Høgskolen i Innlandet: Rønnestad et al. 2020 viste at 3×13×(30/15) ga større fremgang hos elitesyklister enn effort-matchede 4×5 min. Presisjonen ligger i å treffe samme watt i drag etter drag.

**Struktur:** 10 min gradvis oppvarming (Z1→Z2, avslutt med 3×(30 s Z4 / 30 s rolig)) → serie 1: 13 × (30 s hardt @ ~110–120 % FTP, kadens 95–105 / 15 s soft-pedal @ ~50 % av dragwatten) → 3 min rolig Z1 seriepause → serie 2: 13 × (30/15 som over) → 5 min nedspinning i Z1.

**Kilder:** Rønnestad et al. 2020, Scand J Med Sci Sports — https://onlinelibrary.wiley.com/doi/10.1111/sms.13627 + Rønnestad 30/15 Intervals, TrainingPeaks — https://www.trainingpeaks.com/blog/ronnestad-30-15-intervals/

**Tilpasning:** Redusert fra studiens 3×13 til 2×13 serier for å holde økten på 38 min. Enklere: 2×10 drag og RPE 8. Original/tøffere: full studieprotokoll 3×13 drag (ca. 50 min totalt) for erfarne.

## Kroppsvekt

Kroppsvektkategorien spenner fra trygg nybegynnerstyrke via klassiske militær- og forskningsprotokoller til turninspirert ferdighetstrening. Alle øktene klarer seg med kroppen, en matte eller en stol – ingen treningsapparater. Lette økter styres av RIR ≥ 4 (alltid minst fire reps igjen i tanken); intense økter jobber på RPE 7–9 med klokka som motor.

| Økt | Skill | Intensitet | Varighet | Utstyr | Kilde |
|---|---|---|---|---|---|
| Rolig styrke for nybegynnere | lav | lett | 20 min | stol | NHS/HSE |
| 5BX Kondiskvarteret | lav | intens | 17 min | matte | RCAF 5BX, Chart 1 (1961) |
| Hundre armhevinger – teknikkøkt | medium | lett | 20 min | matte | Speirs 2009 + GTG |
| 7-minutteren ×2 (HICT) | medium | intens | 25 min | matte | Klika & Jordan, ACSM 2013 |
| Hollow body & håndståendeforberedelse | hoy | lett | 25 min | matte | Turntradisjon (GMB/Nerd Fitness) |
| Gymnastisk EMOM 16 | hoy | intens | 25 min | matte | CrossFit-EMOM + gymnastic strength |

### Rolig styrke for nybegynnere (lav-lett)

En trygg og rolig start på styrketrening basert på den britiske helsetjenestens anbefalte styrkeøvelser for nybegynnere og eldre. Bare kroppen og en stol – fokus på å bygge vanen og kjenne mestring, med rolig tempo og god margin (RIR ≥ 4).

**Struktur:** Oppvarming 3 min (marsj på stedet 2 min, 10 skulderrull, 10 armsirkler hver vei) → hoveddel 14 min med 60 s pause mellom sett: armhevinger mot vegg 3×8, sitt-til-stå fra stol 3×6 (3 s ned), knebøy med stolstøtte 2×8, tåhev 2×10, rolig marsj 2×60 s → nedtrapping 3 min (rolig gange, leggtøy og brysttøy 2×20 s).

**Kilder:** «Strength exercises — NHS» — https://www.nhs.uk/live-well/exercise/strength-exercises/ · «Strength exercises — HSE» — https://www2.hse.ie/living-well/exercise/exercise-at-home/strength-exercises/

**Tilpasning:** Lettere: gjør sitt-til-stå med hendene som støtte og halver repsene. Tyngre: slipp stolstøtten på knebøy og øk til 10 reps per sett.

### 5BX Kondiskvarteret (lav-intens)

Det legendariske 11-minuttersprogrammet fra Royal Canadian Air Force, utviklet av Dr. Bill Orban på 1950-tallet. Fem enkle øvelser gjort kontinuerlig – du samler så mange kontrollerte reps som mulig i hver blokk (RPE 7–8) og rykker opp et nivå når målene nås uten å bli helt utkjørt.

**Struktur:** Oppvarming 3 min (lett jogg 2 min, armsirkler, hoftesirkler) → hoveddel: 5BX Chart 1 som fasetimer, 11 min kontinuerlig: stående tåberøring 2 min (mål 12–20), situps med bøyde knær 1 min (mål 10–18), ryggløft på magen 1 min (mål 8–16), armhevinger 1 min (mål 6–12), løp på stedet 6 min (~200–400 steg med 10 hoppende utfall hvert 75. steg) → nedtrapping 3 min (rolig gange, lår- og leggtøy 20 s per side).

**Kilder:** «Royal Canadian Air Force Exercise Plans — Wikipedia» — https://en.wikipedia.org/wiki/Royal_Canadian_Air_Force_Exercise_Plans · «5BX: The Cold War Military Workout — Art of Manliness» — https://www.artofmanliness.com/health-fitness/5bx-the-cold-war-military-workout-for-getting-fit-in-11-minutes-a-day/

**Tilpasning:** Lettere: bytt løp til rask marsj og armhevinger til veggvariant. Tyngre: sikt mot øvre repsmål eller rykk opp et chart-nivå. (Originalen er et daglig 11-min program; her rammet inn med oppvarming/nedtrapping. Tidsfordelingen 2/1/1/1/6 min er fra sekundærkilder.)

### Hundre armhevinger – teknikkøkt (medium-lett)

Steve Speirs' klassiske 5-settsstruktur mot hundre armhevinger – men uten å kjøre deg tom: hvert sett stopper med minst fire reps igjen i tanken (RIR ≥ 4), et prinsipp lånt fra Pavel Tsatsoulines «Grease the Groove». En kort teknikkblokk med utfall og planke runder av.

**Struktur:** Oppvarming 4 min (marsj/lett jogg 60 s, armsirkler, 8 scapula-armhevinger, 5 armhevinger på kne) → armhevingsblokk 9 min à la Speirs uke 1: 5 sett med 60–90 s pause, reps etter starttest (6–10 på test: 6-6-4-4-5; 11–20: 10-10-8-6-7) → teknikkblokk 4 min: utfall 2×6 per side (3 s ned), planke 2×20–30 s → nedtrapping 3 min (brysttøy på gulv, barnestilling, rolig pust).

**Kilder:** «Hundred Pushups Training Program» — https://hundredpushups.com/ · «Get Stronger by Greasing the Groove — Art of Manliness» — https://www.artofmanliness.com/health-fitness/fitness/get-stronger-by-greasing-the-groove/

**Tilpasning:** Lettere: gjør alle sett på kne eller mot benk. Tyngre: velg neste kolonne/uke i programmet – men behold RIR ≥ 4-regelen. (Speirs' siste «max reps»-sett er byttet til RIR-stopp; utfall/planke-blokken er et tillegg utover originalprogrammet.)

### 7-minutteren ×2 (HICT) (medium-intens)

Den forskningsbaserte «7-Minute Workout» fra Klika & Jordan (ACSM 2013): 12 øvelser à 30 s arbeid / 10 s pause – her i to runder med 2 min pause imellom for å fylle en hel økt. Høy intensitet (RPE 7–9), kondis og styrke i samme pakke.

**Struktur:** Oppvarming 4 min (marsj, lett jogg, rolige knebøy, armsirkler, 20 rolige jumping jacks, utfall) → hoveddel 18 min: 2 runder à 12 øvelser (30/10 s): jumping jacks, veggsitt, armhevinger, magekrøll, knebøyhopp, knebøy, smale triceps-armhevinger, planke, høye kneløft, vekslende utfall, armheving med rotasjon, sideplanke (bytt side halvveis); 2 min pause mellom rundene → nedtrapping 4 min (rolig gange, tøy lår/bryst/hofte 20–30 s).

**Kilder:** «HICT Using Body Weight — ACSM's Health & Fitness Journal» — https://journals.lww.com/acsm-healthfitness/fulltext/2013/05000/high_intensity_circuit_training_using_body_weight_.5.aspx · «Coach's Corner: The 7-Minute Workout — AMSSM» — https://www.amssm.org/coachs-corner:-the-7minute-workout-va-29.html

**Tilpasning:** Lettere: én runde, og bytt hopp til raske steg. Tyngre: tre runder eller 40 s arbeid / 10 s pause. (For å slippe stol er step-ups byttet til knebøyhopp og dips til smale triceps-armhevinger; veggsitt er beholdt.)

### Hollow body & håndståendeforberedelse (hoy-lett)

Turntradisjonens grunnposisjon – den stramme, hule kroppslinjen – pluss standard veggdriller mot håndstående. Ren teknikkøkt med rolige holdetider, god margin (RIR ≥ 4) og kvalitet foran alt.

**Struktur:** Oppvarming 4 min (håndleddssirkler/-vipp 2 min, katt–kamel ×8, skulderåpner mot vegg 60 s, scapula-armhevinger 2×8) → holdeblokk 10 min: hollow hold 4×15–20 s (start med bøyde knær, korsryggen i gulvet), vegg-planke/halv veggklatring 3×15–30 s med magen mot veggen → kontrollblokk 7 min: rolige hollow rocks 2×8, skulderklapp i planke 2×6 per side, valgfritt 3–5 rolige oppspark mot vegg → nedtrapping 4 min (håndleddstøy, barnestilling, kobra, rolig pust).

**Kilder:** «Hollow Body Holds – Full Tutorial — GMB Fitness» — https://gmb.io/hollow-body/ · «A Beginner's Guide to Handstands — Nerd Fitness» — https://www.nerdfitness.com/blog/a-beginners-guide-to-handstands/

**Tilpasning:** Lettere: hold knærne bøyd i hollow og dropp oppsparkene. Tyngre: strake ben og armer over hodet i hollow, veggholdetider opp mot 45 s. (Strukturen er felleseie i turntradisjonen; ingen proprietær programtekst er gjengitt.)

### Gymnastisk EMOM 16 (hoy-intens)

EMOM-formatet fra CrossFit-tradisjonen («every minute on the minute») fylt med etablerte gymnastic strength-progresjoner og burpees. Start hvert minutt, jobb unna repsene – resten av minuttet er pausen din. Skaler reps så du alltid har minst 15 s pause (RPE 7–9).

**Struktur:** Oppvarming 4 min (jogg, knebøy, armhevinger, hollow hold 20 s, utfall, håndleddssirkler) → hoveddel: EMOM 16 min = 4 runder à 4 minutter: min 1: 6–10 pike-armhevinger; min 2: 4–6 pistolknebøy per bein (bokspistol ok); min 3: 12–16 hollow rocks; min 4: 8–12 burpees → nedtrapping 4 min (rolig gange, håndleddstøy, due/hoftetøy, skuldertøy).

**Kilder:** «The Definitive Guide to Burpees — CrossFit.com» — https://www.crossfit.com/essentials/burpees-and-workouts · «How to Get Your First Pistol Squat — TrainHeroic» — https://www.trainheroic.com/blog/how-to-get-your-first-pistol-squat/

**Tilpasning:** Lettere: EMOM 12 (3 runder), knestående pike-armhevinger og pistol til høy boks. Tyngre: EMOM 20, negative håndstående-armhevinger mot vegg og frie pistolknebøy. (Syntese av burpee-EMOM-klassikeren og turnprogresjoner – ikke ett navngitt program; ren burpee-EMOM er medium skill i taksonomien.)

## Mobilitet

Mobilitetskategorien dekker aktiv leddkontroll: fra myke utviklingsbevegelser og daglig leddsmøring til krevende end-range-arbeid med isometriske hold. Intensitet tolkes her som muskulær innsats (isometrier og ytterstillingsarbeid), ikke puls. Alle øktene klarer seg med ingenting, matte eller strikk.

| Økt | Skill | Intensitet | Varighet | Utstyr | Protokoll |
|---|---|---|---|---|---|
| Original Strength-resets | lav | lett | 12 min | matte | Pressing Reset (Anderson & Neupert, 2013) |
| McGill Big 3 | lav | intens | 15 min | matte | McGill Big 3 (Dr. Stuart McGill) |
| Verdens beste tøyning | medium | lett | 12 min | matte | Movement Prep / WGS (Verstegen, 2004) |
| 90/90 hofteverksted | medium | intens | 18 min | matte | 90/90 med lift-offs (FRC/rehab-tradisjon) |
| Daglige ledd-CARs | hoy | lett | 15 min | — | CARs (FRC, Dr. Andreo Spina) |
| Endrange-kontroll | hoy | intens | 22 min | matte, strikk | Sammensatte kontrolldriller |

### Original Strength-resets (lav-lett, 12 min)

Myke bevegelser fra babyens utviklingsrepertoar — pust, hodenikk, rulling, vugging og kryssmarsj — som skånsom «reset» av nervesystem og bevegelighet.

**Struktur:** Magepust ×10 (2 min) → resets: hodenikk 10 + 8 rotasjoner, rulling 4 per side, vugging 2×15, kryssmarsj ×20 (8 min) → krabbeposisjon-hold 2×20 s (2 min).

**Kilder:** Original Strength blog — https://originalstrength.net/blog/2021/01/11/do-this-to-be-the-best-you/ + BuiltLean, Tim Anderson-intervju — https://www.builtlean.com/mobility-child-tim-anderson/

**Tilpasning:** Rulling med lett beinhjelp er lov; vugging med bredere knær ved trange hofter; hodenikk med mindre utslag ved svimmelhet.

### McGill Big 3 (lav-intens, 15 min)

Den klassiske kjernetrioen for ryggstabilitet: curl-up, sideplanke og fuglehund i McGills pyramideoppsett med 10-sekunders hold. Katt-ku først, slik McGill selv anbefaler.

**Struktur:** Katt-ku ×6 (3 min) → curl-up 5-3-1 à 10 s, sideplanke 4-3-1 per side à 10 s, fuglehund 5-3-1 per side à 10 s (10 min) → rolig katt-ku ×4 + magepust (2 min).

**Kilder:** Squat University — https://squatuniversity.com/2018/06/21/the-mcgill-big-3-for-core-stability/ + BackFitPro (McGills eget nettsted) — https://www.backfitpro.com/mastering-the-mcgill-big-three-progressions-variations-and-common-pitfalls/

**Tilpasning:** Sideplanke fra knær er standard start; curl-up uten løft (bare spenn) ved akutt rygg; kortere hold (8 s) for nybegynnere.

### Verdens beste tøyning (medium-lett, 12 min)

Rolig flyt rundt «World's Greatest Stretch» fra Verstegens Movement Prep: dyp utfall, albue mot gulv, rotasjon mot taket og hamstring-strekk i én sammenhengende bevegelse.

**Struktur:** Hoftesirkler 5 per retning per side + katt-ku ×6 (3 min) → WGS 4 langsomme reps per side + 90/90-vipp ×6 (7 min) → dyp knebøy-hold med vektskift 2×30 s (2 min).

**Kilder:** Men's Journal — https://www.mensjournal.com/fitness/how-do-worlds-greatest-stretch + Roy Pumphrey (Verstegen-attribusjon) — https://www.roypumphrey.com/worlds-greatest-stretch/

**Tilpasning:** Bakre kne i gulvet gjør utfallet lettere; hopp over rotasjonen ved skuldersmerte; hendene på en kloss/bok i stedet for gulvet.

### 90/90 hofteverksted (medium-intens, 18 min)

Hoftene jobbes gjennom inn- og utadrotasjon med end-range lift-offs — isometriske løft i ytterstilling som er tunge for muskulaturen rundt hofta. To runder gjennom hoveddelen.

**Struktur:** 90/90-switches ×10 (3 min) → 2 runder: fremoverlening 5×5 s per side, lift-off innadrotasjon 5×5 s per side, lift-off utadrotasjon 4×5 s per side (12 min) → pigeon push-up 2×6 per side (3 min).

**Kilder:** [P]rehab — https://library.theprehabguys.com/vimeo-video/90-90-hip-lift-off/ + Rehab Hero — https://www.rehabhero.ca/exercise/9090-hip-switch

**Tilpasning:** Hendene bak deg som støtte i overgangene; kortere hold (3 s) og én runde ved kneirritasjon; pute under setet om hofta er trang.

### Daglige ledd-CARs (hoy-lett, 15 min)

Controlled Articular Rotations fra Functional Range Conditioning: hvert ledd roteres aktivt gjennom hele sitt ytre bevegelsesutslag med lav spenning (~30 %) mens resten av kroppen holdes stille. Ingen utstyr.

**Struktur:** Nakke-CARs 3 per retning (2 min) → skulder 3 per retning per arm, albue/håndledd 3 per retning, ryggrad ×4 bølger, hofte 3 per retning per side, kne/ankel 3 per retning per side (13 min).

**Kilder:** ACE Fitness — https://www.acefitness.org/continuing-education/certified/october-2024/8725/controlled-articular-rotations-shifting-mobility-into-high-gear/ + Move With Purpose — https://www.movewithpurpose.com/controlled-articular-rotations-guide

**Tilpasning:** Mindre sirkler ved klikking eller klemfornemmelse; skulder-CARs på alle fire gir mer stabilitet; hofte-CARs med hånd på vegg for balanse.

### Endrange-kontroll (hoy-intens, 22 min)

Sammensatt flyt av dokumenterte kontrolldriller med hver sin etablerte tradisjon: skulderdislokater (gymnastikk), cossack squat (østeuropeisk styrketradisjon), hip airplane (popularisert av McGill) og knestående-til-stående-overganger. Muskelkraft gjennom store bevegelsesbaner.

**Struktur:** Skulderdislokater med strikk 2×10 (4 min) → dyp knebøy med rotasjonsrekk 6 per side + cossack squat 3×6 per side (9 min) → hip airplane 2×5 rotasjoner per side + knestående→stående uten hender 5 per side (8 min).

**Kilder:** Squat University, hip airplane — https://squatuniversity.com/2018/05/06/the-hip-airplane/ + BarBend, cossack squat — https://barbend.com/cossack-squat/

**Tilpasning:** Bredere grep eller løsere strikk gjør dislokater lettere; cossack med hælen løftet eller hold i dørkarm; hip airplane med full veggstøtte først.

## HIIT

HIIT-biblioteket dekker seks økter langs to akser: skill (lav/medium/hoy) og intensitet (lett/intens). Alle øktene bygger på navngitte, dokumenterte protokoller — fra japansk intervallmarsj og Gibalas «ettminutts-økt» til Tabata, 10-20-30 og EMOM. Original-klokkene (3/3, 60/75, 30/30, 20/10, 30-20-10, 60/60) er beholdt eksakt; øvelsesinnholdet er omsatt til marsj- og kroppsvektarbeid på stedet, siden løpe- og sykkelintervaller ligger i egne kategorier. Alle økter bruker kun kondisjon-blokker med øvelsene i fasenavnene.

| Økt | Skill | Intensitet | Varighet | Protokoll | Utstyr |
|---|---|---|---|---|---|
| Japansk intervallmarsj | lav | lett | 24 min | Interval Walking Training (Nose & Masuki, 1999) | – |
| Ettminutts-økta (Gibala) | lav | intens | 23 min | Little et al. 2010, McMaster | – |
| Leeds-sirkelen – rolig | medium | lett | 22 min | Morgan & Adamson, Leeds 1953 | matte |
| Dobbel Tabata | medium | intens | 17 min | Tabata et al. 1996 | matte |
| 30-20-10 i tre gir – lett | hoy | lett | 25 min | Gunnarsson & Bangsbo 2012 | – |
| EMOM-kvarteret | hoy | intens | 23 min | EMOM (vektløfting/CrossFit) | matte |

### Japansk intervallmarsj (hiit-lav-lett)

Japans mest studerte intervallform — Interval Walking Training fra Shinshu University, validert på 246 deltakere i Nemoto et al. 2007 — flyttet inn i stua som marsj på stedet. Tre rolige runder med veksling mellom raskere og roligere marsj; snill mot leddene og helt uten hopp.

**Struktur:** Oppvarming 3 min rolig marsj + armsirkler → 3 runder × [3 min rask marsj med aktive armer og lette kneløft (RPE 4–5) / 3 min rolig marsj (RPE 2–3)] → nedtrapping 3 min rolig marsj + stående tøyninger. Totalt 24 min.

**Kilder:** Nemoto et al. 2007, Mayo Clinic Proceedings — https://www.mayoclinicproceedings.org/article/S0025-6196(11)61303-7/abstract + The Conversation: «Japanese walking» — https://theconversation.com/japanese-walking-the-benefits-of-this-fitness-trend-257302

**Tilpasning:** Lettere: sitt på stolkant og marsjér med armene aktivt. Tyngre: legg inn lave step-ups på trappetrinn i arbeidsfasene, eller øk til 4 runder (30 min). Originalen er 5 runder gange ute med rask fase på ~70 % VO2max; her dempet til Z2–Z3 med 3/3-klokken beholdt.

### Ettminutts-økta (Gibala) (hiit-lav-intens)

Gibala og Littles «practical model» fra McMaster University — populært kjent som «the one-minute workout»-tilnærmingen. Åtte ærlige hardkjør på 60 sekunder med 75 sekunders aktiv pause, med enkle kroppsvektøvelser i stedet for ergometersykkel. Alle 8 rundene er skrevet ut med hver sin øvelse.

**Struktur:** Oppvarming 3 min rolig marsj i stigende tempo → 8 × [60 s arbeid (RPE 7–8, Z4) / 75 s rolig marsj]. Øvelsesrekkefølge: høye kneløft, raske knebøy, jumping jacks, rask marsj med armpress, høye kneløft, raske knebøy, jumping jacks, valgfri favoritt → nedtrapping 2 min rolig marsj + pust. Totalt 23 min.

**Kilder:** Little et al. 2010, J Physiol (PMC) — https://pmc.ncbi.nlm.nih.gov/articles/PMC2849965/ + The Physiological Society: «HIT to get fit» — https://www.physoc.org/magazine-articles/hit-to-get-fit-metabolic-adaptations-to-low-volume-high-intensity-interval-training/

**Tilpasning:** Nybegynner: 6 runder og RPE 6–7. Sterkere: 10–12 runder (originalens spenn) eller kort pausen til 60 s. Originalen brukte 8–12 intervaller på sykkel; 8 runder er valgt for å treffe 20–25 min, 60/75-klokken er beholdt eksakt.

### Leeds-sirkelen – rolig (hiit-medium-lett)

Sirkeltreningens opphav — Morgan og Adamsons format fra University of Leeds i 1953 — i dempet søndagsutgave. Åtte stasjoner for hele kroppen med halvminutt på og halvminutt av, uten at pulsen tar helt av. Dempingen følger dokumentert lavterskel-HIIT-praksis (Harvard Health).

**Struktur:** Oppvarming 3 min marsj + rolige knebøy → 2 runder × [8 stasjoner × (30 s arbeid RPE 4–5 / 30 s rolig marsj)] med 60 s seriepause mellom rundene. Stasjoner: knebøy i rolig tempo, push-ups mot vegg, step-touch med armløft, utfall bakover, stående roing med skulderklem, seteløft (bro), tåhev, rolig marsj med diagonale armstrekk → nedtrapping 2 min rolig marsj + tøyning. Totalt 22 min.

**Kilder:** Circuit training — Wikipedia — https://en.wikipedia.org/wiki/Circuit_training + Harvard Health: «HIIT workouts for older adults» — https://www.health.harvard.edu/exercise-and-fitness/hiit-workouts-for-older-adults-a-guide-to-safe-and-effective-high-intensity-interval-training

**Tilpasning:** Lettere: gjør annenhver stasjon sittende. Tyngre: 40/20-klokke eller tre runder (28 min).

### Dobbel Tabata (hiit-medium-intens)

Den originale 20/10-protokollen fra Izumi Tabata (1996) — fire minutter som føles som førti — her som to blokker med to vekslende kroppsvektøvelser i hver. Originalen var 170 % VO2max på ergometersykkel, umulig med kroppsvekt; intensiteten angis derfor som RPE 8–9, i tråd med etablert helkroppspraksis.

**Struktur:** Oppvarming 4 min (marsj → kneløft → rolige knebøy → lette hopp) → Tabata 1: 8 × [20 s arbeid / 10 s pause], vekslende mountain climbers og jumping jacks → seriepause 60 s rolig marsj → Tabata 2: 8 × [20 s / 10 s], vekslende burpees uten hopp og høye kneløft i maks tempo → nedtrapping 3 min rolig marsj + tøyning. Totalt 17 min.

**Kilder:** Tabata et al. 1996 — PubMed — https://pubmed.ncbi.nlm.nih.gov/8897392/ + Tabata training review 2019, J Physiol Sci (Springer) — https://link.springer.com/article/10.1007/s12576-019-00676-7

**Tilpasning:** Nybegynner: én blokk (12 min totalt) og bytt burpees mot knebøy. Erfaren: tre blokker (22 min) eller burpees med hopp.

### 30-20-10 i tre gir – lett (hiit-hoy-lett)

Københavner-protokollen (10-20-30) fra Gunnarsson og Bangsbo i mykt gir: 30 rolige, 20 friskere og 10 kvikke sekunder, om og om igjen i 5-minuttersblokker. Kunsten — og hoy-skill-elementet — er å treffe hvert gir presist, ikke å ta i hardt. Toppgiret er dempet til RPE 5 (intervall-lett); tempovekslingen er beholdt eksakt.

**Struktur:** Oppvarming 3 min rolig marsj + dynamiske armdrag → 3 blokker × [5 sykluser × (30 s rolig marsj RPE 3 / 20 s rask marsj med armer RPE 4 / 10 s lette kneløft i friskt, kontrollert tempo RPE 5)] à 5 min, med 2 min blokkpause (rolig marsj) etter blokk 1 og 2 → nedtrapping 3 min rolig marsj + tøyning. Totalt 25 min.

**Kilder:** Gunnarsson & Bangsbo 2012, J Appl Physiol — https://journals.physiology.org/doi/full/10.1152/japplphysiol.00334.2012 + Bangsbo 2024, Eur J Sport Sci: «10-20-30 exercise training improves fitness and health» — https://onlinelibrary.wiley.com/doi/10.1002/ejsc.12163

**Tilpasning:** Lettere: 2 blokker (18 min). Nær originalen: slipp gir 3 opp mot RPE 7–8 — da er du i praksis i intens-varianten (originalen er løping med sprint i 10-sekundersgiret).

### EMOM-kvarteret (hiit-hoy-intens)

Every Minute On the Minute — etablert format fra vektløftertradisjonen, systematisert gjennom CrossFit. Nytt oppdrag starter på hvert minuttslag; resten av minuttet er pause du selv tjener. Pacing under tretthet er selve ferdigheten. Ikke én enkeltstudie bak — kildene er etablerte fagartikler.

**Struktur:** Oppvarming 4 min (marsj → kneløft → knebøy → 2–3 rolige burpees) → EMOM 16 min = 4 runder × 4 minutter (mål RPE 7–9, Z4–Z5): minutt 1: 8 burpees, minutt 2: 12 knebøyhopp, minutt 3: 30 mountain climbers totalt, minutt 4: 10 utfallshopp med vekslende ben → nedtrapping 3 min rolig marsj + tøyning. Totalt 23 min.

**Kilder:** BarBend: «What Is EMOM Training?» — https://barbend.com/what-is-emom-training/ + SmartWOD: «CrossFit Knowledge: What is an EMOM?» — https://www.smartwod.app/post/crossfit-knowledge-what-is-an-emom

**Tilpasning:** Skaler reps ned (6/10/24/8) hvis du ikke får minst 15 s pause per minutt. Tøffere: 20 min EMOM eller burpees med hopp over matta.

## Restitusjon

Restitusjonskategorien samler dokumenterte protokoller for nedregulering av nervesystemet: pusteteknikker med og uten hold, restitutive stillinger og guidede dyp hvile-praksiser. «Skill» går fra telle-frie teknikker (lav) til rytmepresisjon og oppmerksomhetskrevende praksis (høy); «intens» handler her om varighet og krav til stillhet/oppmerksomhet, ikke fysisk belastning.

| Økt | Skill | Intensitet | Varighet | Format | Utstyr |
|---|---|---|---|---|---|
| Syklisk sukk | lav | lett | 8 min | Pust + etterhvile | — |
| Beina opp veggen | lav | intens | 25 min | Stillinger (hold) | matte |
| Boks-pust 4-4-4-4 | medium | lett | 10 min | Pust | — |
| Kroppsskann | medium | intens | 25 min | 8 faser | matte |
| Koherent pust 5,5/min | hoy | lett | 12 min | Pust | — |
| Dyp hvile — yoga nidra | hoy | intens | 30 min | 7 faser | matte |

### Syklisk sukk (lav-lett, 8 min)

Kroppens egen ro-knapp: dobbel innpust gjennom nesen (rolig innpust + kort topp-innpust for å fylle helt), deretter langt, langsomt sukk ut gjennom munnen. Dokumentert i en RCT der 5 min daglig syklisk sukking bedret humør og senket respirasjonsfrekvens mer enn mindfulness-meditasjon. Ingen pusteholder — trygg for de fleste; stopp ved svimmelhet.

**Struktur:** Pust-blokk 5 min med veiledende takt 3 s inn (dobbel innpust) / 6 s ut, ingen hold — originalen er bevisst telle-fri, så takten er en rettesnor. Deretter 3 min etterhvile med helt naturlig pust.

**Kilder:** Balban m.fl. 2023, Cell Reports Medicine — https://pubmed.ncbi.nlm.nih.gov/36630953/ + https://www.cell.com/cell-reports-medicine/fulltext/S2666-3791(22)00474-8

**Tilpasning:** Enklere: 3 min sukk + 2 min hvile. Dypere: forleng utpusten ytterligere, eller gjenta økten morgen og kveld.

### Beina opp veggen (lav-intens, 25 min)

Restitutiv stillingsserie fra Iyengar-tradisjonen (Viparita Karani m.fl.), popularisert som restorativ yoga av Judith Hanson Lasater. Veggen og gulvet gjør jobben; «intens» ligger i varighet og stillhet, ikke teknikk. Rolig nesepust hele veien. Kom langsomt ut ved svimmelhet; unngå inversjonen ved ukontrollert høyt blodtrykk eller glaukom.

**Struktur:** Hoveddel 19 min med lange hold — Viparita Karani (beina opp veggen) 10 min, Supta Baddha Konasana (fotsålene samlet) 5 min, Barnets stilling 4 min. Nedtrapping 6 min — Savasana 5 min og rolig overgang ut 1 min.

**Kilder:** Cleveland Clinic — https://health.clevelandclinic.org/benefits-of-legs-up-the-wall + Yoga Journal — https://www.yogajournal.com/poses/legs-up-the-wall-pose-2/

**Tilpasning:** Enklere: 5 min per stilling, knær lett bøyd mot veggen. Dypere: 15 min Viparita Karani med pute under korsryggen, totalt opp mot 35 min.

### Boks-pust 4-4-4-4 (medium-lett, 10 min)

«Box breathing» popularisert av tidligere Navy SEAL-kommandør Mark Divine, brukt i militær- og nødetater og testet som egen arm i Balban m.fl. 2023. Sitt med rak rygg, tøm lungene helt først, all pust gjennom nesen. Sikkerhet: milde pusteholder — aldri i vann eller bak rattet; blir du svimmel, slipp holdene og pust normalt.

**Struktur:** Én pust-blokk på 10 min sammenhengende (ca. 37 runder) med takt 4 s inn / 4 s hold / 4 s ut / 4 s hold.

**Kilder:** TIME — https://time.com/4316151/breathing-technique-navy-seal-calm-focused/ + Balban m.fl. 2023 (boks-pust-arm) — https://pubmed.ncbi.nlm.nih.gov/36630953/

**Tilpasning:** Enklere: 3-3-3-3-takt eller 5 min total. Dypere: 5-5-5-5 når 4-takten kjennes uanstrengt.

### Kroppsskann (medium-intens, 25 min)

Body scan slik Jon Kabat-Zinn systematiserte den i MBSR (UMass Medical School, 1979). En stille, liggende reise fra tær til hode der du bare legger merke til det som er der. Vandrer tankene: registrer det vennlig og vend tilbake til kroppsdelen. Naturlig pust hele veien. Generisk fasestruktur — ikke ordrett gjengivelse av skript.

**Struktur:** Én fasetimer med 8 faser (25 min): Landing 3 min · Venstre ben 4 min · Høyre ben 4 min · Bekken/mage/korsrygg 3 min · Bryst/øvre rygg/skuldre 3 min · Armer og hender 3 min · Nakke/ansikt/hode 3 min · Hele kroppen + avslutning 2 min.

**Kilder:** The Body Scan Meditation, Jon Kabat-Zinn (Palouse Mindfulness) — https://palousemindfulness.com/docs/bodyscan.pdf + Greater Good in Action (Berkeley) — https://ggia.berkeley.edu/practice/body_scan_meditation

**Tilpasning:** Enklere: 15-min versjon med større kroppssoner. Dypere: full 40-min MBSR-lengde med finere inndeling (tå for tå).

### Koherent pust 5,5/min (hoy-lett, 12 min)

«Coherent breathing» fra psykiaterne Richard Brown og Patricia Gerbarg, bygget på resonansfrekvens-forskningen til Lehrer/Gevirtz (~0,1 Hz gir maksimal hjerteratevariabilitet via barorefleksen). Ferdigheten ligger i å holde en jevn, sømløs rytme uten pauser — la innpust gli over i utpust. Myk nesepust, ingen pusteholder; trygg for de fleste.

**Struktur:** Én pust-blokk på 12 min med takt 5,5 s inn / 5,5 s ut (≈ 5,5 pust/min, ca. 66 pust), ingen hold.

**Kilder:** BBC Science Focus (Brown & Gerbarg) — https://www.sciencefocus.com/the-human-body/small-changes-way-you-breathe-transform-health + Steffen m.fl. 2017 (PubMed) — https://pubmed.ncbi.nlm.nih.gov/28890890/

**Tilpasning:** Enklere: 6/min (5 s inn / 5 s ut) eller 8 min total. Dypere: forleng mot 20 min.

### Dyp hvile — yoga nidra (hoy-intens, 30 min)

Yoga nidra systematisert av Swami Satyananda Saraswati (Bihar School of Yoga, 1960-tallet), modernisert som NSDR av Andrew Huberman. En halvtime i grenselandet mellom våken og søvn — krevende for oppmerksomheten, ikke kroppen. Det er greit å sovne, men målet er våken dyp hvile. Generisk fasestruktur, ingen gjengivelse av beskyttede skript.

**Struktur:** Én fasetimer med 7 faser (30 min), liggende i savasana: Innstilling 3 min · Intensjon (sankalpa) 2 min · Rotasjon av oppmerksomheten gjennom kroppen 12 min · Pustebevissthet (tell utpust baklengs fra 27) 6 min · Motsetninger (tyngde/letthet, varme/kjølighet) 3 min · Stille hvile 2 min · Retur 2 min.

**Kilder:** Yoga nidra (Satyananda-strukturen), Wikipedia — https://en.wikipedia.org/wiki/Yoga_nidra + NSDR.co — https://nsdr.co/post/yoga-nidra-what-it-is-how-it-works-and-the-science

**Tilpasning:** Enklere: 20-min versjon uten motsetnings-fasen. Dypere: 40–45 min med to runder kroppsrotasjon og lengre stillhet.

---

## Appendiks

### Kryssende protokoller

Enkelte protokoller finnes i flere kategorier — bevisst, som ulike konkrete økter:
- **Norsk 4×4 (Helgerud/Hoff, NTNU)**: løp (høy/intens) og sykkel (medium/intens) — pulsstyringen er identisk, ferdighetskravet ulikt per underlag.
- **Tabata 1996**: sykkel (lav/intens — originalens hjemmebane) og HIIT (medium/intens, dobbel kroppsvektvariant).
- **IWT / japansk intervallgange (Nose/Masuki)**: gåtur (medium/intens, utendørs original) og HIIT (lav/lett, dempet marsj-på-stedet-variant).
- **10-20-30 (Gunnarsson & Bangsbo)**: løp (lav/intens, original) og HIIT (høy/lett, dempet tregirsvariant).
- **Yin (Grilley/Powers)**: yoga (hofter og props-serier) og tøying (grunnhold og side/skulder-serie) — ulike posisjonsutvalg per kategori for å unngå duplikater.

### Åpne spørsmål til ombyggingsmilepælen

1. **Kategori → bevegelse-mapping for logging/XP**: bibliotekets `kategori` må mappes til `BEVEGELSER`-nøklene i js/bevegelse.js (gatur→walk, lop→run, sykkel→bike, styrke→strength, kroppsvekt→bodyweight, yoga→yoga, toying→stretch, mobilitet→mobility, hiit→hiit, restitusjon→recovery) så XP-faktorene og tellerne fortsetter å virke.
2. **`varighetsklasse` i plan/kalender**: planlagte økter lagrer i dag `{modalitet, varighetsklasse}`; med biblioteket kan de peke på en økt-id i stedet. Avgjør om varighetsklasse-begrepet pensjoneres.
3. **`fasePlan()`-grenen**: den generiske `{runder, faser[]}`-formen krever ~6 nye linjer øverst i fasePlan() (js/kjor.js) som ekspanderer runder × faser og dropper siste hvilefase.
4. **Filtrering i bibliotek-UI**: skill/intensitet som to enkle valg (chips) per kategori — seks kort per kategori er lite nok til å vise alt.
5. **PR-logging**: `ovelseId`-lenkene er utelatt i v1 (ingen økter refererer exercises.json); vurder å legge dem på styrke-øktene hvis PR-sporing skal overleve ombyggingen.
6. **SW-cache**: `data/okter.json` må inn i SKALL-lista i sw.js når appen begynner å lese den (med cache-versjonsbump).

### Kildeoversikt (hovedopphav per kategori)

- **Gåtur**: Helsedirektoratet/WHO-anbefalingene; Lauren Giraldo 12-3-30; Talk Test (Foster/Persinger, UW-La Crosse); IWT (Nose/Masuki, Shinshu/Mayo Clin Proc 2007); INWA nordic walking; militær ruck-tradisjon/GORUCK.
- **Løp**: Couch to 5K (Josh Clark 1996/NHS); 10-20-30 (Gunnarsson & Bangsbo 2012); Seiler sone 2-tradisjonen; Mona-fartlek (Wardlaw/Moneghetti 1983, etter Holmér); MAF 180 (Maffetone); Norsk 4×4 (Helgerud et al. 2007, NTNU/CERG).
- **Yoga**: Sit'N'Fit stol-yoga (Park et al. 2017 RCT); Ardha Surya Namaskar; yin (Grilley/Powers/Clark); Ashtanga Surya Namaskara A og B (Pattabhi Jois-tradisjonen).
- **Styrke**: Dan John goblet-tradisjonen; DeLorme 3×10 (1948); ACSM Position Stand (2009/2026); Simple & Sinister-strukturen (Tsatsouline/StrongFirst); 5×5 (Reg Park 1960).
- **Tøying**: NHS/Bob Anderson-tradisjonen m/ ACSM-dosering; yin (Grilley); AIS (Aaron Mattes); PNF (Kabat/Knott).
- **Sykkel**: Seiler & Kjerland 2006 (polarisert); Tabata et al. 1996; Coggan/Allen sonesystemet; Helgerud 4×4; kadens-tradisjonen (CTS/TrainingPeaks); Rønnestad et al. 2020 (30/15).
- **Kroppsvekt**: NHS styrkeøvelser; 5BX (RCAF/Orban, 1950-tallet); Hundred Pushups (Speirs) + GTG (Tsatsouline); HICT 7-minutteren (Klika & Jordan, ACSM 2013); turntradisjonens hollow body/håndstående-prep; EMOM (CrossFit-tradisjonen).
- **Mobilitet**: Original Strength (Anderson/Neupert); McGill Big 3; World's Greatest Stretch (Verstegen-kanonisert); 90/90 m/ lift-offs (FRC/rehab-miljøet); CARs (Spina/FRC); dislokater/cossack/hip airplane-tradisjonene.
- **HIIT**: IWT (Nose/Masuki); Gibala/Little 2010 («ettminutts-økta»); sirkeltrening (Morgan & Adamson, Leeds 1953); Tabata 1996; 10-20-30 (Bangsbo); EMOM (CrossFit).
- **Restitusjon**: Syklisk sukk (Balban et al., Stanford, Cell Reports Medicine 2023); Viparita Karani (Iyengar-tradisjonen); boks-pust (Mark Divine/US Navy-tradisjonen); body scan (Kabat-Zinn, MBSR); koherent pust (Brown & Gerbarg/resonansfrekvens); yoga nidra (Satyananda-tradisjonen)/NSDR.

Fulle kildelister med URL-er står under hver økt i kategoriseksjonene over.
