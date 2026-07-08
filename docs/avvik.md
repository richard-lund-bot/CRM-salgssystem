# Avvikslogg — F1-konvertering (bibliotek → data/)

Alle normaliseringer, tolkninger og uklarheter fra konverteringen av `docs/treningsapp-v2-bibliotek.md` (+ utstyr/taksonomi) til `data/`. Ingen stille fiksing — hvert punkt er en bevisst beslutning.

**Sluttresultat:** 532 øvelser i `exercises.json` · 22 progresjonskjeder · 642 enhets-ekvivalenter (øvelser + 110 variant-oppgraderinger) mot §28-målet ≈595. Validering (`scripts/validate.mjs`) er grønn: ingen duplikat-IDer, alle mønstre/modaliteter/utstyrs-IDer/kjede-/gateway-referanser resolverer.

## §2–5 Styrke (push/pull/bein/hengsel/bæring)

- konvertert 27 rader fra §2
- konvertert 21 rader fra §3
- konvertert 23 rader fra §4
- konvertert 23 rader fra §5
- Mønster normalisert per spec: «knebøy»→kneboy (§4), «bæring»→baering (§5).
- Push-up: notat «variant: KB-håndtak (nøytral)» strukturert bort til ekstra variant med navnOverstyr (per variantregelen); merk at skjema-eksempelet i spec beholder notatet og kun én variant — regel­teksten fulgt.
- Ring push-up: notat «RTO-utgang = +1 nv» tolket som ekstra variant (ringer) med nivaJust +1; notat utelatt.
- Cossack squat: «+KB = nv 3» tolket som ekstra KB-variant med nivaJust +1.
- Utfall bak: «+KB/halo = nv 3» tolket som ekstra KB-variant med nivaJust +1.
- Bulgarsk splittknebøy: «+KB = nv 4» tolket som ekstra KB-variant med nivaJust +1; denne varianten tilsvarer kjedeleddet «bulgarsk m/ KB (4)» (utfall-kjedens ledd 6), som derfor ikke er egen øvelse. Basisøvelsen har kjedePos 4 («bulgarsk (3)»).
- Hip thrust (sofa): «+KB = nv 3» tolket som ekstra KB-variant med nivaJust +1.
- Ettbens stå: «lukkede øyne = nv 2» tolket som ekstra variant med nivaJust +1.
- Notater som kun var «mål-skill» (Fri HSPU, Muscle-up, Pistol) strukturert til tag maal-skill; notat utelatt.
- Face pull: notat «skulderhelse» strukturert til tag skulderhelse; notat utelatt. Dead hang: tag skulderhelse lagt til, notat «grep + skulderhelse» beholdt ordrett siden det også inneholder grep-info.
- Kjedeoppslag med navneavvik mellom §1 og tabellradene matchet på nivå+navn: «skrå pushup»=Skrå pushup (sofa/benk), «diamant»=Diamant/smal push-up, «dekline»=Dekline push-up, «archer»=Archer push-up, «cossack»=Cossack squat, «assistert pistol m/ ringer»=Assistert pistol, «hip thrust»=Hip thrust (sofa), «nordic»=Nordic curl, «tohånds/enhånds/dobbel swing»=KB swing tohånds/enhånds/dobbel, «snatch (4)»=KB snatch, «floor press/strict press/push press/jerk»=KB floor press/KB strict press/KB push press/KB jerk.
- Turkish get-up (nv 4) tolket som kjedeleddet «full TGU (4)» → tgu kjedePos 4; delposisjonene TGU til albue/TGU til hånd/halv TGU har ingen egne tabellrader (dekket av notat «deler = nv 2-3»).
- Kjedeledd uten egen rad i §2–5: «sots press (5)» (kb-press pos 5) finnes ikke som tabellrad; «hopp-utfall (3⚡)» (utfall pos 5) ligger i §7 (plyo) og konverteres der.
- KB clean inngår i OL-løft-kjeden (§20, ledd 2), men den kjeden er utenfor denne delens kjedeliste (kun §1-kjedene push-h…tgu) — kjede satt til null her.
- Chin-up, L-pull-up, Wall sit, Sumo squat, KB front squat (dobbel), Sissy squat assistert, Reverse nordic, Sideutfall, Step-up, KB thruster, KB bent-over row, KB gorilla row, Renegade row, Ring bicep curl, KB high pull, KB dead clean, Superman-hold, carries, KB windmill, KB halo, KB around-the-world og balanse-øvelsene inngår ikke i noen progresjonskjede → kjede/kjedePos null.
- KB halo: mønster mobilitet, modaliteter [STY, MOB]; KB around-the-world: mønster core-rot, modaliteter [STY] — per oppdragsinstruks.

## §6–8 Core / Plyo / Kondisjon

- Konvertert 31 rader fra §6 (pluss 2 opprettede kjedeledd, se under = 33 exercises).
- Konvertert 10 rader fra §7.
- Konvertert 22 rader fra §8.
- Opprettet egne entries for «Dragon flag straddle» (nv 4, kjedePos 7) og «Dragon flag» (nv 5, kjedePos 8): de finnes ikke som egne rader i §6-tabellen, kun som notat «straddle 4, full 5» på Dragon flag tuck og som egne ledd i core-antiekst-kjeden i §1. Notatet på Dragon flag tuck er strukturert bort som følge av dette.
- core-antiekst-kjedens siste ledd i §1, samt hollow- og core-heng-kjedene, er posisjonert 1-basert etter rekkefølgen i §1. core-heng-kjedens nivåer er ikke monotone i kilden (Toes-to-bar nv 4 ligger før L-sit tuck nv 3) — kjedePos følger kildens rekkefølge, ikke nivå.
- core-heng-kjedens siste ledd «windshield wipers i heng (5)» (§1) har ingen egen rad i §6 — det finnes kun som notat «i heng = nv 5» på «Windshield wipers liggende» (core-rot). Ingen egen entry opprettet (kun dragon flag-leddene var autorisert som nye entries); kjeden i data slutter derfor ved L-sit (kjedePos 5). Notatet er beholdt ordrett.
- «Planke m/ skulderklapp» har mønster antirot i §6-tabellen, men inngår i core-antiekst-kjeden i §1 — beholdt monster core-antirot med kjede core-antiekst, kjedePos 3.
- Mønster-normaliseringer per spek: antiekst→core-antiekst, antirot→core-antirot, «core» (Crab kicks)→core-flex, knebøy→kneboy (Squat pulse).
- Russian twist: notat «+KB = nv 3» strukturert som ekstra variant (utstyr kb+matte, navnOverstyr «Russian twist m/ KB», nivaJust +1); notatfeltet utelatt.
- Copenhagen kort: notat «lang = nv 4» strukturert som ekstra variant (navnOverstyr «Copenhagen lang», nivaJust +1); notatfeltet utelatt.
- L-sit tuck: notat «gulv/KB-håndtak» strukturert som varianter kv (gulv) og kb (navnOverstyr «L-sit tuck på KB-håndtak»); notatfeltet utelatt.
- Sideplanke: notat «m/ dips = reps» beholdt ordrett (typeendring, ikke utstyrsvariant — ikke strukturert).
- §7: alle rader er merket ⚡ → impact hoy på samtlige; ⚡ fjernet fra navnene per spek.
- «Split jump / hopp-utfall» (§7) tolket som kjedeleddet «hopp-utfall (3⚡)» i utfall-kjeden i §1 → kjede utfall, kjedePos 5 (spek sier kjede/kjedePos gjelder alle øvelser som inngår i §1-kjeder).
- «Trappe-/kassehopp»: id normalisert til trappe-kassehopp (dobbel bindestrek fra «-/» slått sammen). Utstyr KV beholdt fra kilden selv om navnet impliserer trapp/kasse.
- «KB swing (kondisjonsdose)» (§8): egen entry med id kb-swing-kondisjonsdose, uten kjede (kb-swing-kjeden dekkes av §5-øvelsene), per instruks.
- §8: kun «Burpee over KB» og «Star jump» er merket ⚡ → impact hoy; øvrige lav.
- Slug-normaliseringer: æ/ø/å→ae/o/a (ring-rollout-knestaende, sideplanke-m-loft, staende-kb-rotasjon, bat-navasana), «/» og mellomrom→bindestrek, parenteser fjernet (half-burpee-sprawl, kb-swing-kondisjonsdose, bat-navasana).

## §10 + §12 Yoga & Pilates (matte)

- Konvertert 42 rader fra §10 — tabellen inneholder 42 rader (Fjellstilling → Savasana), ikke 43 som oppgitt i oppdraget/§18 (58 = 43+15). Alle rader i kilden er med, ingen utelatt.
- Konvertert 15 yin-varianter fra kulepunktlisten under §10-tabellen.
- Konvertert 25 rader fra §12.
- Tolkning: monster 'balanse' satt der balanse/armbalanse er primærfokus i Fokus-kolonnen: kriger-3, halvmane, tre, orn, danser, krake, sidekrake. 'Høy utfall' (bein/balanse) og 'Rotert triangel' (rotasjon/balanse) har balanse som sekundærfokus og er beholdt som 'flyt'.
- Fokus-kolonnen i §10 er splittet på '/' og sluggifisert til tags (ø→o, å→a; f.eks. 'ryggbøy'→'ryggboy', 'hoftebøyere'→'hofteboyere').
- Normalisering: 'Lav lunge m/ quad-grep' har fokus 'quad/hofteb.' — forkortelsen utvidet til tag 'hofteboyere'.
- Tolkning: 'Delfin' har fokus 'skuldre (HS-prep!)' — tag 'skuldre', 'HS-prep' lagt i notat.
- Normalisering: 'Planke → chaturanga' — pilen fjernet i id → 'planke-chaturanga'. 'Katt–ku' — tankestrek behandlet som bindestrek → id 'katt-ku'.
- Tolkning (iht. oppdrag): yin-varianter som er samme posisjon som en §10-rad har fått egen entry med id-suffiks '-yin': 'sommerfugl-yin', 'liggende-twist-yin' og 'malasana-hold-yin' (samme posisjon som 'malasana').
- Yin-varianter: navn beholdt med små bokstaver nøyaktig som i kildens kulepunktliste; alle satt til niva 1, type 'hold', tag 'yin' og notat '2-5 min hold' iht. oppdraget (kilden angir '2-5 min hold' samlet for listen).
- Tolkning: yin-varianter har ingen 'u'-merking i kilden; unilateral satt til true kun der §11 angir per side (dragen 3/side, svanen 3/side, bananasana 2/side, liggende twist 2/side) — øvrige yin false.
- Normalisering: 'The Hundred' har type 'pust/tid' i kilden → 'tid' iht. spesifikasjonen.
- §10- og §12-tabellene har ingen utstyrskolonne; utstyr satt til ['matte'] for alle øvelser iht. oppdraget.
- Pilates: prinsipp-tags (pust, presisjon, kontroll, senter, flyt) ikke lagt per øvelse, iht. spesifikasjonen; tags tom array.

## §13–14 Tøying & Mobilitet

- Konvertert 31 rader (enkeltøvelser) fra §13 — §18 oppgir 32 for Tøying; differanse på 1. Opptelling per område: nakke 3, bryst/skulder 4, rygg 4, hoftebøyere 3, hamstrings 3, sete 3, adduktorer 3, quads 2, legger 2, håndledd 2, ankler 2 = 31.
- Konvertert 15 rader fra §14 — stemmer med §18 (Mobilitet 15).
- §13 mangler Nv-kolonne; niva satt til 1 som default. Unntak: «Couch stretch» har «(nv 3)» i kilden → niva 3.
- §13: markørene «(dyn)», «(PNF)» og «(nv 3)» i kildeteksten er strukturert bort til tags/niva og fjernet fra navn. Umerkede øvelser tolket som statiske (jf. §13-overskriften) og tagget «statisk».
- §13: korte kildenavn er gjort tydelige med område-/kontekstprefiks (f.eks. «sidebøy m/ lett drag» → «Nakke sidebøy m/ lett drag», «stående m/ hæl frem» → «Stående hamstringstrekk m/ hæl frem», «bøyd kne (soleus)» → «Veggstrekk bøyd kne (soleus)», «cross-body» → «Cross-body skulderstrekk»).
- §13: duplikater mot §10 (yoga/yin) i kilden: barnets stilling, katt–ku, liggende twist, kobra, sittende foroverbøy, due, sommerfugl, frosken, lav lunge m/ quad-grep. §13-utgavene har fått id-suffiks «-toy» for å unngå id-kollisjon med yoga-delen.
- Verdenshilsen finnes i §13 (dyn tøy), §14 (mobilitet, «world's greatest») og §16 (oppvarming) — duplikat i kilden. §13-utgaven fikk id «verdenshilsen», §14-utgaven «verdenshilsen-worlds-greatest» (slug av kildenavnet), så ingen kollisjon.
- §13: flere tøyinger utføres per side (sidebøy, cross-body, figur-4, due, quadstrekk m.fl.), men kilden merker ingen med «u» → unilateral: false på alle, i tråd med kilde = fasit.
- §13 Håndledd-raden har «obligatorisk før HS/planche-arbeid» som gjelder området — lagt som notat på begge håndledd-øvelsene. «(nese mot armhule)» flyttet til notat på Levator-strekk.
- §14 Hip airplane er duplikat i kilden av §4 Hip airplane (monster balanse, nv 3, reps u). §14-utgaven gitt id «hip-airplane-mob» og monster «mobilitet» som instruert.
- §14 Katt–ku er duplikat i kilden av §10 og §13 — gitt id «katt-ku-mob».
- §14 CARs: Ledd-kolonnen «alle» ekspandert til tags nakke/skulder/handledd/hofte/ankel (jf. navnet); tolkning logget.
- §14 «Dyp knebøy-hold m/ albuepress»: ledd «hofte/ankel» → to tags (hofte, ankel).
- §14 Jefferson curl: utstyr satt som én variant ["kv","kb"] per instruks; «(lett/KV)» i kilden antyder egentlig to alternativer (kun KV, eller lett KB) — tolkning logget.
- §14 Scapula pull-ups (ringheng) overlapper med §3 «Skulderdrag i heng» (notat: scapula pull-ups) — beholdt som egen oppføring, logget som mulig duplikat i kilden.
- §14: alle drills gitt monster «mobilitet» per instruks, også Verdenshilsen (ledd «helkropp») og Hip airplane; Ledd-kolonnen ligger som tag.

## §19–20 Pakke A1/A2 (manualer, stang)

- Konvertert 30 rader fra §19.
- Konvertert 39 rader fra §20.
- IKKE konvertert (håndteres sentralt som varianter): de 12 manual-variantene av eksisterende øvelser fra kulepunktet under §19 — goblet squat, bulgarsk, step-up, utfall, hip thrust, renegade row, suitcase/farmer/rack carry, russian twist, windmill, floor press, thruster, halo.
- IKKE konvertert (håndteres sentralt som varianter): smith-maskin-variantene (knebøy, benkpress, utfall, OHP, row; nivåJust −1) og multimaskin-variantene (brystpress, nedtrekk, row, curl, pushdown) fra §21-kulepunktene.
- Mønster-normalisering per spec: «knebøy»→kneboy, «bæring»→baering.
- Iso-informasjon i Notat-kolonnen er strukturert bort som tag «iso»; resttekst beholdt i notat («bakside skulder», «traps», «legger»). Rene «iso»-notater ga tomt notat-felt (utelatt).
- Power clean: notat «eksplosiv» strukturert bort som tag «eksplosiv». Hang clean, Split jerk og Power snatch fikk også tag «eksplosiv» per instruks selv om Notat-kolonnen deres er tom i kilden.
- Trap bar jump: ⚡ står i Notat-kolonnen («⚡ power»), ikke i Type-kolonnen — tolket som impact «hoy»; resttekst «power» beholdt i notat.
- Kjede kneboy-stang: ledd 1 «goblet (2)» er goblet squat — manual-variant/del 1-øvelse, ikke egen rad i mine seksjoner, kjedePos 1 ikke satt her. Ledd 2 «box squat tom stang (2)» tolket som raden Box squat (kjedePos 2). Ledd 4 «pause/front squat (3)» dekker to rader — både Pause squat og Front squat (stang) fikk kjedePos 4.
- Kjede markloft: ledd 1 «KB RDL (2)» ligger i del 1 (utenfor §19/§20), kjedePos 1 ikke satt her. Ledd 5 «sumo/tung (3)» tolket som Sumo markløft (kjedePos 5); «tung» er lastvariant av markløft, ingen egen rad.
- Kjede benkpress: ledd 1 «push-up (2)» ligger i del 1, kjedePos 1 ikke satt her. Ledd 3 «tom stang (2)» finnes ikke som egen rad — dekket av notatet «tom stang = 2» på Benkpress; kjedePos 3 står derfor tom. Ledd 5 «smal/skrå (3)» dekker to rader — både Smal benkpress og Skrå benkpress fikk kjedePos 5.
- Kjede press-stang: ledd 1 «DB skulderpress (2)» er tvetydig (§19 har både sittende og stående) — satt på DB skulderpress stående (kjedePos 1) siden stående matcher OHP-progresjonen. Ledd 2 «tom stang OHP (2)» finnes ikke som egen rad (dekket av notatet «tom stang = 2» på Militærpress); kjedePos 2 står derfor tom.
- Kjede ol-loft: ledd 1 «KB swing (2)» og ledd 2 «KB clean (3)» ligger i del 1 (§1/§5), kjedePos 1–2 ikke satt her. Power clean = kjedePos 3, Power snatch = kjedePos 4. Hang clean er ikke listet som kjedeledd og fikk kjede null.
- Kjede tau-linja hører til §24 og er ikke behandlet i denne filen.

## §21–24 Pakke B1/B2/C/D (maskiner, apparat, conditioning)

- konvertert 30 rader fra §21 — oppdraget og §28 oppgir 31 rader, men tabellen i kilden inneholder bare 30; alle 30 er konvertert, ingen utelatt
- konvertert 15 rader fra §22
- konvertert 34 rader fra §23
- konvertert 23 rader fra §24
- §21: Smith-maskin-varianter (knebøy, benkpress, utfall, OHP, row — nivåJust −1), multimaskin-varianter (brystpress, nedtrekk, row, curl, pushdown) og kabel-varianter av eksisterende (face pull, pallof) fra kulepunktene er IKKE konvertert som egne øvelser her — de er varianter av basisøvelser i andre parts-filer
- §21: «iso» i Notat-kolonnen strukturert bort til tag "iso"; notat-feltet utelatt der «iso» var eneste innhold
- §21: pilen «→» i «Kabel woodchop høy→lav / lav→høy» tolket som skilletegn i id (kabel-woodchop-hoy-lav / kabel-woodchop-lav-hoy)
- §21: Assistert pull-up-maskin / Assistert dips-maskin — notatet sier de fyller gap i PULL-V- og DIPS-kjedene, men ingen posisjon er angitt i kjedelistene i §1/§20; kjede/kjedePos satt til null, notat beholdt
- §22: monster satt til "lokomotorisk" for alle B2-økter iht. spesifikasjonen
- §22: type-skjønn — distansedefinerte økter (Z2, 2000 m-test, 500 m-gjentak) → "dist"; tidsdefinerte (intervaller, cal-EMOM, 10/50-sprints, 4×4, bakkeintervall) → "tid"; «Romaskin 500 m-gjentak» valgt som "dist" fordi arbeidsbolken defineres av distanse selv om det er intervallformat
- §22: «Spinsykkel Z2 / intervall», «Stepper Z2» og «Ellipse Z2» satt til type "tid" (skjønn: maskiner uten meningsfull distansemåling styres på tid); øvrige Z2 → "dist"
- §22: protokoll-tekst lagt i notat (f.eks. «Z2», «4×4»); der kilden har eget notat er det føyd til etter protokollen med semikolon (Romaskin 2000 m-test, Tredemølle bakkeintervall)
- §22: «test»-modalitet på «Romaskin 2000 m-test» → modaliteter ["BASE"] + tag "test"
- §22: «×» i «Tredemølle 4×4» normalisert til «x» i id (tredemolle-4x4)
- §23: kilden har ingen Type-kolonne; type "reps" satt for alle, unntatt «Ballet stretch-serie» → "hold" (tøyningsserie der hold er naturlig). «Thigh stretch» beholdt som "reps" (utføres klassisk med repetisjoner på reformer)
- §23: monster "flyt" for alle pilates-apparatøvelser iht. spesifikasjonen; ingen tolket som balanseposisjon
- §23: kolon i navn («Footwork:», «Stomach massage:», «Short box:», «Long box:») fjernet i id iht. slug-regelen
- §24: «u» i Notat-kolonnen for «Lateral slede-drag» tolket som unilateral: true (notat-feltet utelatt)
- §24: «⚡» i notat for «Slede-push lav (sprint)» strukturert bort til impact "hoy"; notat-feltet utelatt
- §24: tauklatring-familien tolket som alle fem klatretau-øvelser (Tau-drag liggende, Fotlås-teknikk, Tauklatring m/ bein, Tauklatring uten bein, Tau-heng) → modaliteter ["STY","SKILL"]
- §24: TAU-LINJA-kjeden fra §20 satt som: tau-drag-liggende-row pos 1, tauklatring-m-bein pos 2, tauklatring-uten-bein pos 3. Fotlås-teknikk står i kjedeteksten som del av ledd 2 («fotlås + klatring m/ bein») men er egen rad i §24-tabellen → kjede null på fotlas-teknikk

## §25–27 Pakke E/F/G (småutstyr, løpedriller, rulling)

- konvertert 36 rader fra §25 hovedtabellen (oppdraget anslo ~37, kilden har 36) + 8 rader fra §25 TRX/glidere-tabellen = 44 rader fra §25
- konvertert 9 rader fra §26
- konvertert 11 rader fra §27
- totalt 64 øvelser i denne filen
- §25: Band-varianter av eksisterende øvelser (kulepunkt: assistert pull-up (band), dislocates (band), squat m/ miniband (knær ut-cue), body saw på glidere, ringrow → TRX, ettbens stå → balansepute) er IKKE konvertert som nye øvelser — de hører hjemme som ekstra varianter på de eksisterende øvelsene i respektive parts-filer
- §25: Vektvest er IKKE konvertert — modifikator, ikke øvelse (nivaJust +1 på KV-øvelser: push-ups, pull-ups, dips, utfall, gange/bakke), håndteres sentralt iht. spec
- §25: mønster «knebøy»→«kneboy» og «bæring»→«baering» normalisert iht. spec
- §25: notat «iso» konvertert til tag iso (Band triceps pushdown, Band curl, Ring-klem armer, Ring-klem lår) og notat «skulderhelse» til tag skulderhelse (Band pull-apart); notat-feltet utelatt siden innholdet er strukturert bort
- §25: miniband-aktiveringsøvelser (Lateral walk, Monster walk, Glute bridge m/ miniband, Clamshell, Fire hydrant) gitt ["STY","MOB"] iht. spec-regelen «band/mini-band rehab/aktivering → ["STY","MOB"] etter skjønn»; ball-, ring-, ball-liten- og sandsekk-øvelser gitt ["STY"] eller ["CORE"] etter mønster (core-mønstre → CORE); hoppetau → ["HIIT"]
- §25: TRX/glidere-øvelser gitt ["CORE"] ved core-mønstre, ellers ["STY"] (TRX atomic push-up: helkropp → ["STY"])
- §26: Fartlek har «BASE/HIIT» i Mønster-kolonnen — dette er modaliteter, ikke et gyldig mønster; tolket som monster «lokomotorisk» og modaliteter ["BASE","HIIT"]
- §26: tabellen mangler Notat-kolonne; Bakkesprint «reps ⚡» → type reps + impact hoy
- §27: tabellen mangler navnekolonne — navn konstruert fra utstyr + område («Foam rolling …» for foamroller, «Massasjeball …» for massasjeball) iht. oppdraget; tid-anvisningen fra Tid-kolonnen lagt ordrett i notat
- §27: nivå mangler i kilden — satt niva 1 for alle (lavterskel restitusjonsarbeid); «s/side» tolket som tid-anvisning, ikke unilateral-markør (unilateral: false, siden spec kun definerer unilateral ved «u» i Type-kolonnen)

## Suppleringer (kjedeledd uten egen tabellrad)

- Opprettet 9 øvelser som kun finnes som kjedeledd/gateway-referanser i kilden, uten egne tabellrader: TGU til albue/til hånd/halv (tgu-kjeden, dekket av notat «deler = nv 2-3» på Turkish get-up), KB sots press (kb-press-kjedens ledd 5), Windshield wipers i heng (core-heng-kjedens ledd 6, dekket av notat «i heng = nv 5»), og hele HÅNDSTÅENDE-kjeden (vegg-hold mage inn / rygg inn / toe pulls / fri håndstående) som §1 og HS-porten-gatewayen refererer men ingen tabell inneholder.

## §11 Yoga-sekvenser (sequences.json)

- Konvertert 7 sekvenser fra §11.
- Sol-hilsen A/B: 'armer opp' og 'gå/hopp frem' er overganger uten egen §10-posisjon og er utelatt fra posisjoner-listen (beholdt i beskrivelse).
- Sol-hilsen A: 'planke → chaturanga' er én §10-oppføring — begge trinn mappes til id 'planke-chaturanga'. '(kne nv 1)' er en variantangivelse, kun beholdt i beskrivelse.
- Tolkning: 'oppovervendt hund/kobra' i Sol-hilsen A — 'oppovervendt-hund' valgt i posisjoner-listen; kobra er kildens alternativ (nv 1).
- Tolkning: Sol-hilsen B er utledet som A + 'stol' etter fjell (start og retur) og 'kriger-1' fra nedovervendt hund; 'begge sider' er representert med retur til nedovervendt hund og kriger-1 listet én gang — kilden spesifiserer ikke eksakt vinyasa mellom sidene.
- Morgen 10 min: 'verdenshilsen' refererer §14-øvelsen 'Verdenshilsen (world's greatest)' (id 'verdenshilsen', ligger utenfor yoga-pilates-filen); 'lav utfall m/ rotasjon' mappet til 'lav-utfall' (rotasjonen er ikke egen posisjon); 'Sol A ×2' er en sekvensreferanse (sol-hilsen-a) og er ikke ekspandert i posisjoner-listen.
- Kveld 10 min: 'figur-4/nålens øye' og 'knær til bryst' har ingen §10-id (figur-4 finnes kun i §13 tøying) og er utelatt fra posisjoner-listen.
- Yin-sekvensene refererer yin-id-ene fra yoga-pilates.json (sommerfugl-yin, dragen, svanen, frosken, caterpillar, sfinxen, selen, bananasana, liggende-twist-yin); 'savasana' refererer §10-posisjonen. Normalisering: 'sfinx' i kilden mappet til 'sfinxen'.
- niva: kun 'Morgen 10 min' (nv 1), 'Kveld 10 min' (nv 1) og 'Stående flow-blokk' (nv 2) har nivå i kilden — '(nv X)' flyttet fra navn til niva-feltet; Sol-hilsen A/B og yin-sekvensene satt til null.
- varighetMin hentet fra navnet der det finnes (10/10/25/20); Sol-hilsen A/B og Stående flow-blokk: null. '(1 runde ≈ 9 pust)' er ikke en varighet og er beholdt i navnet på Sol-hilsen A.
- Tall i beskrivelsene (f.eks. 'sommerfugl 3', 'katt–ku ×8') er hold-tider/repetisjoner per posisjon og er kun beholdt i beskrivelse, ikke strukturert.

## §9 KB-complexer (sequences.json)

- Konvertert 5 rader fra §9.
- §9 konvertert til egen complex-struktur (format C-sekvenser), ikke som exercises, per instruks.
- perSide er en tolkning: kilden markerer ikke «u» eksplisitt i noen rad (kolonneoverskriften sier bare «per side der u»). Satt true der sekvensens ledd er unilaterale enkelt-KB-øvelser iht. §5/§2 (Enkel flyt: dead clean/press/utfall bak er reps u; Klassisk complex: clean/press er reps u; TGU-flyt: halv TGU/windmill er reps u). Satt false for Swing-stigen (swings tolket som tohånds, jf. kjedebasen) og Armor building (utføres med dobbel KB, jf. «(dobbel)» i sekvensen).
- id-er slugget fra navn per spek: parenteser fjernet (armor-building-lett).

## Sammenslåing & variant-oppgradering (scripts/merge-parts.mjs)

- La på 97 utstyrsvarianter på eksisterende øvelser (utstyr-dok §5, bibliotek §19/§21/§25).
- Synket kjede/kjedePos fra chains.json på 7 øvelser: kb-clean: null/null → ol-loft/2 · benkpress: benkpress/4 → benkpress/3 · skra-benkpress: benkpress/5 → benkpress/4 · smal-benkpress: benkpress/5 → benkpress/4 · militaerpress-ohp: press-stang/3 → press-stang/2 · push-press-stang: press-stang/4 → press-stang/3 · split-jerk: press-stang/5 → press-stang/4

## Håndbygde datafiler (ikke tabellkonvertering)

- `formats.json` (37 formater fra §3), `templates.json` (23 øktmaler etter §9-anatomien + modalitet×format-matrisen), `gateways.json` (10 gateway-tester fra §17), `warmups.json` (§16), `protocols.json` (§15 pust), `equipment.json` (76 enheter fra utstyrsdok), `bundles.json` (10 bunker) er skrevet direkte fra kildedokumentene.
- `gateways.json` inneholder 10 tester (§17 lister 10 rader inkl. kondisjonsverifisering); §18 oppsummerer «9».
- `templates.json`: malene er representative eksempler bygget på §9-anatomien, ikke uttømmende fra kilden (kilden gir 6 eksempelmaler).

## M3–M4 app-logikk (designvalg, ikke datakonvertering)

Loggført her siden appen har egne tolkningsvalg der taksonomien er underspesifisert.

**Nivåmodell (§4c vs §12a).** Kilden separerer «modalitetsnivå» (base, kan vokse)
fra «øvelsesnivå» (1–5, egenskap på øvelsen) med opplåsingsterskler 3/5/7, men sier
også at selvrapport «kan låse opp t.o.m. øvelsesnivå 4». Valgt modell: `base` er et
heltall på 3/5/7-skalaen; `nivaFraBase` gir ulåst øvelsesnivå (base ≥3→3, ≥5→4, ≥7→5).
Ankertesten (svar 1–4) mappes til base 1/3/5/6 — sterk selvrapport låser opp t.o.m.
øvelsesnivå 4, mens nivå 5 alltid krever gateway (base 7). Dette forener §4c og §12a.

**XP-kurve.** Opprykk-terskel = `round(100 × base^1,5)` (§12a), globalt nivå bruker
samme kurve med konstant 250 (§12d). Comeback dobler XP (§12d); bonuser: PR +20, ny
øvelse +10, gateway +50. Ukebonus «+10 % på ukemål» er *ikke* implementert ennå
(krever ukesavregning) — notert som TODO.

**Decay er avledet, ikke destruktiv.** Base lagres uendret; decay/comeback trekkes fra
ved *lesetid* (`effektivBase`). Enhver økt nullstiller decay-klokka, og gulvet
(høyeste beviste −2) sikrer at verifiserte nivåer aldri forsvinner («rusten», §12c).
Pause-modus fryser klokka. Decay-tallene er startgjetningene fra §12c.

**Logging.** Resultater (reps/kg/hold) er valgfrie og fanges på «Økt fullført»-skjermen;
XP tildeles uansett fra tid × intensitet. Full per-sett-logging under kjøring er ikke
bygget — én verdi per øvelse holder for PR-sporing i v1.

## M5 skysync (designvalg)

**Payload som `data jsonb`, ikke typede kolonner.** Det eksisterende M2-skjemaet har
typede kolonner (fra §10), men de matchet ikke den ferdige klienttilstanden etter M4
(manglet gatewaysPassert, prs, settOvelser, globalXp, samt seed/templateId/ovelseIder på
logg). For å slippe en kolonnemigrasjon per milepæl la vi til `data jsonb not null default
'{}'` på alle tre tabeller og lar klienten være kilden til sannhet der. De typede kolonnene
beholdes for spørring; kun de påkrevde (dato/modalitet på logg, seed på generated) fylles.

**Direkte REST, ikke supabase-js.** Klienten snakker med GoTrue + PostgREST via `fetch`
(magic-link OTP, refresh-token, upsert med `Prefer: resolution=merge-duplicates`). Dette
holder appen avhengighetsfri, byggestegsfri og offline-first, og gjør at nøyaktig samme
kall kan testes headless.

**Last-write-wins per rad.** Profil er én rad (nyeste `oppdatert` vinner helt); logg og
genererte flettes per `id`. Konsekvens (dokumentert v1-tradeoff): en profilendring på enhet
B overskriver enhet A sin eldre profil i sin helhet — ingen felt-nivå-fletting. Sletting
synkes ikke i v1 (kun union). `handle_new_user`-trigger auto-oppretter en profiles-rad ved
signup; klientens upsert (`on_conflict=user_id`) håndterer dette.

**Auth-oppsett er dashboard-avhengig.** Magic-link krever at Pages-URL-en står i Supabase
sine Redirect URLs og at e-post er konfigurert — kan ikke settes fra koden. Se README.

## M6 belønninger & temaer (designvalg)

**To adskilte nivåsystemer.** Det fysiske kapasitetsnivået (base per modalitet,
§12) beholdes uendret — tregt og bevis-gatet. Oppå ligger et *belønningsnivå*
(js/belonninger.js) som er rent spill-lag: hyppig, uten tak, og gir en belønning
hvert nivå. Dette løser «level opp ofte + unlock noe hver gang» uten å undergrave
at det fysiske nivået skal bety noe.

**Kurve.** Belønningsnivå-kostnad = `40 + 20·n` XP fra nivå n til n+1 — lavt tidlig
(~1 nivå per økt), lineær vekst (aldri eksplosivt), aldri et tak. Erstatter den
gamle `250·n^1,5`-globalkurven. `globaltNiva()` peker nå hit.

**Belønninger er deterministiske, ikke lagret.** Alt utledes fra total-XP:
kuraterte milepæler (temaer/avatarer/titler på faste nivåer) + øvrige nivåer fylt
med «ny øvelse»-reveals i deterministisk rekkefølge (lette først). Ingenting kan
mistes, og sync trenger ikke lagre stigen. Belønnings-opplåste øvelser legges til
generatorens tilgjengelige sett (i tillegg til kapasitets-/gateway-opplåste).

**Kosmetikk offline-vennlig.** Avatarer = emoji (ingen bilde-generering). Temaer =
CSS-variabelpaletter (9 stk, inkl. ett lyst) valgt via `data-tema` på <html>. Valgt
avatar/tema lagres i `innstillinger` og synkes med profilen.

## M7 Runna-inspirert redesign (designvalg)

**Lyst standardtema.** Etter forbilde fra Runna er standardtemaet nå lyst (near-white
bakgrunn, hvite kort med myke skygger, fete overskrifter, store tall, sorte pille-CTA-er
via invertert `.knapp` = tekstfarge som bakgrunn). Det gamle mørke temaet er beholdt som
et fritt valgbart tema («Mørk»), sammen med alle M6-temaene. Alt er variabeldrevet, så
temabytte virker uendret.

**Ikoner.** Higgsfield (`nano_banana_pro`) genererte app-ikonet (teal→grønn gradient,
abstrakt stigende progresjons-/fjelltopp-merke), nedskalert til 192/512/maskable via
Chromium-canvas og committet under `icons/`. Linjeikoner i UI (tab-bar, liste-rader,
stat-rader, modaliteter) er håndlagde inline-SVG-er i `js/ui.js` (`ikon()`), temafarget
via `currentColor` — crisp, offline, ingen ekstern avhengighet. Achievement-/PR-visninger
bruker CSS-medaljer/hexagon-badges (`.medalje`, `.hexbadge`), i tråd med Runna-stilen.

**Nye komponenter (CSS).** Liste-rader (ikon+label+chevron), All-Time-stat-rader,
sirkulære medaljer, hexagon-badges, tier-/profil-header, gradient-fremhevet kort og
segmentert kontroll — alle variabeldrevne så de følger valgt tema.
