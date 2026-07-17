// Merker (M15) — badgesystemet som erstatter «Min reise». Alt utledes fra
// loggen + profilen ved lesetid (rene funksjoner): ingenting kan «mistes»,
// sync trenger aldri lagre merkestatus, og Strava-importerte økter teller
// automatisk med. Kjerneprogresjonen er streaks (js/gnist.js: røde gnister
// per pilar, blå flamme når alle tennes); merkene er feiringen — streaks,
// prøv noe nytt, milepæler og mye rart.
import { el, tom, ikon } from './ui.js';
import { hentProfil, hentLogg, hentPlan } from './store.js';
import { loggBevegelse, ukeNokkel, prsFraLogg } from './bevegelse.js';
import { blaaDager, hentGnistStatus } from './gnist.js';
import { regionScores, lagKroppskart } from './kroppskart.js';
import { lesMatlogg } from './kosthold.js';
import { lesSosiallogg } from './sosialt.js';
import { fanesideMedTittel } from './banner.js';
import { REDUSERT } from './animasjon.js';

const DAG = 86400000;

// Seksjonsstrukturen (metadata, ikke brukerdata) injiseres av sti.js etter at
// data/seksjoner.json er lastet, så enhet-/seksjon-fullført-merker kan avledes
// rent fra loggen uten at merker.js selv må laste JSON. Tom → merkene står på 0.
let _seksjonsstruktur = [];
export function settSeksjonsstruktur(seksjoner) { _seksjonsstruktur = seksjoner || []; }

// --- Kontekst: én gjennomgang av loggen gir alt merkene trenger -------------
function dagsStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function byggKontekst(profil, logg, planer) {
  const rader = (logg || [])
    .map((o) => ({ ...o, ts: Date.parse(o.dato) || 0 }))
    .filter((o) => o.ts > 0)
    .sort((a, b) => a.ts - b.ts);

  // Kumulative tellere med dato for når hver terskel ble krysset.
  const antallDato = new Map();   // n-te bevegelse → dato
  const minutterDato = [];        // [{min, dato}] kumulative minutter
  const typerDato = [];           // [{antall, dato}] n-te nye bevegelsestype
  const settTyper = new Set();
  let kumMin = 0;

  // Første forekomst av «øyeblikk»-betingelser.
  const forste = {};
  const settForste = (nokkel, o) => { if (!forste[nokkel]) forste[nokkel] = o.dato; };

  // Comeback: 5+ dager mellom to bevegelser → returdagen teller.
  let forrigeDag = null;

  // PR-er: dato når n-te øvelse fikk et loggført resultat.
  const prOvelser = new Set();
  const prDato = new Map();

  // Tellere per kilde.
  const kildeTeller = {};
  const laerDatoListe = []; // dato for hvert lærte teknikk-steg (kilde 'laer', ikke boss/graduation)
  const gradBesteStjerner = new Map();   // «sti::enhet» → høyeste uteksaminerings-stjerner
  const gradTreStjernerDato = new Map(); // «sti::enhet» → dato første gang 3★ (uteksaminert)
  const legendariskDato = new Map();     // «sti::enhet» → dato første gang legendarisk (3★ m/ dobbelt opp)
  const bossStjernePerSti = new Map(); // stiId → høyeste vunne boss-nivå (stjerner)
  const bossSlaattDato = new Map();    // stiId → dato da 3. stjerne ble nådd

  for (const o of rader) {
    antallDato.set(antallDato.size + 1, o.dato);
    kumMin += o.varighetMin || 0;
    minutterDato.push({ min: kumMin, dato: o.dato });

    const type = loggBevegelse(o);
    if (!settTyper.has(type)) {
      settTyper.add(type);
      typerDato.push({ antall: settTyper.size, dato: o.dato });
    }

    const time = new Date(o.ts).getHours();
    if (time < 7) settForste('morgen', o);
    if (time >= 21) settForste('kveld', o);
    if ((o.varighetMin || 0) >= 45) settForste('min45', o);
    if ((o.varighetMin || 0) >= 90) settForste('min90', o);
    if (o.intensitet === 5) settForste('maks', o);
    if (o.test) settForste('test', o);

    const dag = dagsStart(o.ts);
    if (forrigeDag != null && dag - forrigeDag >= 5 * DAG) settForste('comeback', o);
    forrigeDag = Math.max(forrigeDag ?? dag, dag);

    for (const r of o.resultater || []) {
      if (r.id && !prOvelser.has(r.id)) {
        prOvelser.add(r.id);
        prDato.set(prOvelser.size, o.dato);
      }
    }

    if (o.kilde) kildeTeller[o.kilde] = (kildeTeller[o.kilde] || 0) + 1;
    if (o.kilde === 'laer' && o.node === 'boss' && o.sti) {
      const stj = o.bossNiva || 0;
      if (stj > (bossStjernePerSti.get(o.sti) || 0)) {
        bossStjernePerSti.set(o.sti, stj);
        if (stj >= 3 && !bossSlaattDato.has(o.sti)) bossSlaattDato.set(o.sti, o.dato);
      }
    } else if (o.kilde === 'laer' && o.node === 'graduation' && o.sti && o.enhet) {
      const k = o.sti + '::' + o.enhet;
      const stj = o.stjerner || 0;
      if (stj > (gradBesteStjerner.get(k) || 0)) gradBesteStjerner.set(k, stj);
      if (stj >= 3 && !gradTreStjernerDato.has(k)) gradTreStjernerDato.set(k, o.dato);
      if (stj >= 3 && o.legendarisk && !legendariskDato.has(k)) legendariskDato.set(k, o.dato);
    } else if (o.kilde === 'laer') {
      laerDatoListe.push(o.dato); // lært teknikk-steg (ikke boss/graduation)
    }
    if (o.kilde === 'strava') settForste('strava', o);
    if (o.kilde === 'bibliotek') {
      settForste('bibliotek', o);
      if (kildeTeller.bibliotek === 10) settForste('bibliotek10', o);
    }
  }

  // Dagstreak: lengste rekke sammenhengende dager, med dato per terskel.
  const dager = [...new Set(rader.map((o) => dagsStart(o.ts)))].sort((a, b) => a - b);
  const streakDato = new Map(); // rekkelengde → dato første gang nådd
  let rekke = 0;
  for (let i = 0; i < dager.length; i++) {
    rekke = i > 0 && dager[i] - dager[i - 1] === DAG ? rekke + 1 : 1;
    if (!streakDato.has(rekke)) streakDato.set(rekke, new Date(dager[i]).toISOString());
  }
  const maksStreak = Math.max(0, ...streakDato.keys());

  // Helg: første uke med aktivitet både lørdag og søndag.
  let helgDato = null;
  const helgUker = new Map(); // ukenøkkel → {lor, son, dato}
  for (const dag of dager) {
    const d = new Date(dag);
    const uke = ukeNokkel(dag);
    const info = helgUker.get(uke) || { lor: false, son: false };
    if (d.getDay() === 6) info.lor = true;
    if (d.getDay() === 0) info.son = true;
    helgUker.set(uke, info);
    if (!helgDato && info.lor && info.son) helgDato = d.toISOString();
  }

  // Ukerytme: sammenhengende uker med ≥ ukemål aktive dager.
  const ukemaal = profil?.ukemaal || 4;
  const perUke = new Map(); // mandag-ts → {dager: antall, dato: dagen målet ble nådd}
  for (const dag of dager) {
    const man = dag - ((new Date(dag).getDay() + 6) % 7) * DAG;
    const info = perUke.get(man) || { dager: 0, dato: null };
    info.dager += 1;
    if (info.dager === ukemaal) info.dato = new Date(dag).toISOString();
    perUke.set(man, info);
  }
  const mandager = [...perUke.keys()].sort((a, b) => a - b);
  const ukerDato = new Map(); // rekkelengde → dato
  let ukeRekke = 0;
  let forrigeMan = null;
  for (const man of mandager) {
    const info = perUke.get(man);
    if (info.dager < ukemaal) { ukeRekke = 0; forrigeMan = null; continue; }
    ukeRekke = forrigeMan != null && man - forrigeMan === 7 * DAG ? ukeRekke + 1 : 1;
    forrigeMan = man;
    if (!ukerDato.has(ukeRekke)) ukerDato.set(ukeRekke, info.dato);
  }
  const maksUker = Math.max(0, ...ukerDato.keys());

  // Comeback-fallback for gamle profiler der loggen er ryddet.
  if (!forste.comeback && profil?.harComeback) forste.comeback = null;

  const planGjort = (planer || []).filter((p) => p.status === 'gjort').length;

  // Kosthold (egen matlogg, trening.matlogg): aktive dager (≥1 god vane) og
  // kosthold-streak, så Kosthold-merkene avledes rent — atskilt fra bevegelse.
  const matdager = [...new Set(
    (lesMatlogg() || [])
      .filter((o) => o.vaner && Object.values(o.vaner).some(Boolean))
      .map((o) => dagsStart(Date.parse(o.dato) || 0))
      .filter((t) => t > 0),
  )].sort((a, b) => a - b);
  const kostDagerDato = matdager.map((t) => new Date(t).toISOString());
  const kostStreakDato = new Map();
  let kostRekke = 0;
  for (let i = 0; i < matdager.length; i++) {
    kostRekke = i > 0 && matdager[i] - matdager[i - 1] === DAG ? kostRekke + 1 : 1;
    if (!kostStreakDato.has(kostRekke)) kostStreakDato.set(kostRekke, new Date(matdager[i]).toISOString());
  }
  const kostMaksStreak = Math.max(0, ...kostStreakDato.keys());

  // Sosialt (egen sosiallogg): aktive dager (≥1 sosialt valg) + sosial-streak.
  const sosDager = [...new Set(
    (lesSosiallogg() || [])
      .filter((o) => o.vaner && Object.values(o.vaner).some(Boolean))
      .map((o) => dagsStart(Date.parse(o.dato) || 0))
      .filter((t) => t > 0),
  )].sort((a, b) => a - b);
  const sosDagerDato = sosDager.map((t) => new Date(t).toISOString());
  const sosStreakDato = new Map();
  let sosRekke = 0;
  for (let i = 0; i < sosDager.length; i++) {
    sosRekke = i > 0 && sosDager[i] - sosDager[i - 1] === DAG ? sosRekke + 1 : 1;
    if (!sosStreakDato.has(sosRekke)) sosStreakDato.set(sosRekke, new Date(sosDager[i]).toISOString());
  }
  const sosMaksStreak = Math.max(0, ...sosStreakDato.keys());

  // Blå dager (js/gnist.js): dager der ALLE pilar-gnistene ble tent — grunnlag
  // for Blå flamme-merkene. Lokale ISO-dager stemples til kl. 12 lokal tid så
  // merkedatoene oppfører seg som de andre.
  const blaaListe = [...blaaDager({ logg: logg || [], matlogg: lesMatlogg(), sosiallogg: lesSosiallogg() })].sort();
  const blaaDatoListe = [];
  const blaaStreakDatoMap = new Map();
  let blaaRekke = 0;
  let forrigeBlaaTs = null;
  for (const dagIso of blaaListe) {
    const t = new Date(`${dagIso}T12:00:00`).getTime();
    if (!Number.isFinite(t)) continue;
    const iso = new Date(t).toISOString();
    blaaDatoListe.push(iso);
    blaaRekke = forrigeBlaaTs != null && Math.round((t - forrigeBlaaTs) / DAG) === 1 ? blaaRekke + 1 : 1;
    forrigeBlaaTs = t;
    if (!blaaStreakDatoMap.has(blaaRekke)) blaaStreakDatoMap.set(blaaRekke, iso);
  }
  const blaaMaksStreak = Math.max(0, ...blaaStreakDatoMap.keys());

  // Enhet-/seksjon-fullført: avledes av uteksaminering (3★ pr. enhet). En enhet
  // er fullført når den har en 3★-graduation-rad; en seksjon når alle enhetene
  // er uteksaminert. Datoen er da 3★ først ble nådd. Krever injisert struktur.
  const perfektDatoListe = [...gradTreStjernerDato.values()].sort(); // 3★-uteksamineringer, kronologisk
  const legendariskListe = [...legendariskDato.values()].sort();     // legendariske enheter, kronologisk
  const enhetDatoer = [];
  const seksjonDatoer = [];
  for (const seksjon of _seksjonsstruktur) {
    let alleGradert = true;
    let sisteDato = null;
    for (const enhet of seksjon.enheter || []) {
      const dato = gradTreStjernerDato.get(seksjon.id + '::' + enhet.id);
      if (dato) { enhetDatoer.push(dato); if (!sisteDato || dato > sisteDato) sisteDato = dato; }
      else alleGradert = false;
    }
    if (alleGradert && (seksjon.enheter || []).length) seksjonDatoer.push(sisteDato);
  }
  enhetDatoer.sort();
  seksjonDatoer.sort();

  return {
    antall: rader.length,
    antallDato: (n) => antallDato.get(n) || null,
    minutter: kumMin,
    minutterDato: (min) => minutterDato.find((m) => m.min >= min)?.dato || null,
    typer: settTyper.size,
    typerDato: (n) => typerDato.find((t) => t.antall >= n)?.dato || null,
    forste,
    harForste: (n) => n in forste,
    maksStreak,
    streakDato: (n) => streakDato.get(n) || null,
    maksUker,
    ukerDato: (n) => ukerDato.get(n) || null,
    ukemaal,
    helgDato,
    prAntall: prOvelser.size,
    prDato: (n) => prDato.get(n) || null,
    bibliotekAntall: kildeTeller.bibliotek || 0,
    laerAntall: laerDatoListe.length,
    laerDato: (n) => laerDatoListe[n - 1] || null,
    perfekteSteg: perfektDatoListe.length,
    perfektDato: (n) => perfektDatoListe[n - 1] || null,
    legendariskeEnheter: legendariskListe.length,
    legendariskDato: (n) => legendariskListe[n - 1] || null,
    enheterFullfort: enhetDatoer.length,
    enheterFullfortDato: (n) => enhetDatoer[n - 1] || null,
    seksjonerFullfort: seksjonDatoer.length,
    seksjonerFullfortDato: (n) => seksjonDatoer[n - 1] || null,
    bossStjerner: (stiId) => bossStjernePerSti.get(stiId) || 0,
    bossSlaattDato: (stiId) => bossSlaattDato.get(stiId) || null,
    planGjort,
    kostDager: matdager.length,
    kostDagerDato: (n) => kostDagerDato[n - 1] || null,
    kostStreak: kostMaksStreak,
    kostStreakDato: (n) => kostStreakDato.get(n) || null,
    sosDager: sosDager.length,
    sosDagerDato: (n) => sosDagerDato[n - 1] || null,
    sosStreak: sosMaksStreak,
    sosStreakDato: (n) => sosStreakDato.get(n) || null,
    blaaDagerAntall: blaaDatoListe.length,
    blaaDagerDato: (n) => blaaDatoListe[n - 1] || null,
    blaaStreak: blaaMaksStreak,
    blaaStreakDato: (n) => blaaStreakDatoMap.get(n) || null,
  };
}

// --- Merkedefinisjoner -------------------------------------------------------
// Hvert merke: beregn(ctx) → { verdi, maal, dato } — oppnådd når verdi ≥ maal.
// «farge» peker på flis-paletten (movflis--*) så merkene matcher resten av appen.
const teller = (id, navn, tekst, ikonNavn, farge, maal, verdi, dato) =>
  ({ id, navn, tekst, ikon: ikonNavn, farge, beregn: (ctx) => ({ verdi: verdi(ctx), maal, dato: dato(ctx) }) });

const oyeblikk = (id, navn, tekst, ikonNavn, farge, nokkel) =>
  ({ id, navn, tekst, ikon: ikonNavn, farge, beregn: (ctx) => ({ verdi: ctx.harForste(nokkel) ? 1 : 0, maal: 1, dato: ctx.forste[nokkel] || null }) });

export const MERKE_KATEGORIER = [
  { id: 'milepaler', navn: 'Milepæler' },
  { id: 'streak', navn: 'Streak' },
  { id: 'rytme', navn: 'Ukerytme' },
  { id: 'kosthold', navn: 'Kosthold' },
  { id: 'sosialt', navn: 'Sosialt' },
  { id: 'laering', navn: 'Ferdighetsstier' },
  { id: 'nytt', navn: 'Prøv noe nytt' },
  { id: 'tid', navn: 'Tid i bevegelse' },
  { id: 'blaflamme', navn: 'Blå flamme' },
  { id: 'oyeblikk', navn: 'Store øyeblikk' },
  { id: 'dognet', navn: 'Døgnet rundt' },
  { id: 'ekstra', navn: 'Litt av hvert' },
];

export const MERKER = {
  milepaler: [
    teller('bev-1', 'Første steg', 'Din aller første bevegelse', 'sko', 'lime', 1, (c) => c.antall, (c) => c.antallDato(1)),
    teller('bev-10', 'I gang', '10 bevegelser', 'loper', 'teal', 10, (c) => c.antall, (c) => c.antallDato(10)),
    teller('bev-25', 'Rutinebygger', '25 bevegelser', 'loper', 'koral', 25, (c) => c.antall, (c) => c.antallDato(25)),
    teller('bev-50', 'Femti!', '50 bevegelser', 'lyn', 'blaa', 50, (c) => c.antall, (c) => c.antallDato(50)),
    teller('bev-100', 'Hundreklubben', '100 bevegelser', 'hexstjerne', 'indigo', 100, (c) => c.antall, (c) => c.antallDato(100)),
    teller('bev-250', 'Levende legende', '250 bevegelser', 'trofe', 'gul', 250, (c) => c.antall, (c) => c.antallDato(250)),
  ],
  streak: [
    teller('streak-3', 'Tre på rad', '3 dager på rad', 'flamme', 'koral', 3, (c) => c.maksStreak, (c) => c.streakDato(3)),
    teller('streak-7', 'Hel uke', '7 dager på rad', 'flamme', 'oransje', 7, (c) => c.maksStreak, (c) => c.streakDato(7)),
    teller('streak-14', 'To uker', '14 dager på rad', 'flamme', 'gul', 14, (c) => c.maksStreak, (c) => c.streakDato(14)),
    teller('streak-30', 'En hel måned', '30 dager på rad', 'flamme', 'indigo', 30, (c) => c.maksStreak, (c) => c.streakDato(30)),
  ],
  rytme: [
    teller('uker-2', 'To gode uker', 'Ukemålet nådd 2 uker på rad', 'kalender', 'teal', 2, (c) => c.maksUker, (c) => c.ukerDato(2)),
    teller('uker-4', 'Månedsrytme', 'Ukemålet nådd 4 uker på rad', 'kalender', 'blaa', 4, (c) => c.maksUker, (c) => c.ukerDato(4)),
    teller('uker-8', 'Vanedyr', 'Ukemålet nådd 8 uker på rad', 'kalender', 'lilla', 8, (c) => c.maksUker, (c) => c.ukerDato(8)),
  ],
  kosthold: [
    teller('kost-1', 'Første gode valg', 'Ditt første blue-zones-valg', 'eple', 'lime', 1, (c) => c.kostDager, (c) => c.kostDagerDato(1)),
    teller('kost-7', 'God uke på kjøkkenet', 'Gode valg 7 dager', 'eple', 'teal', 7, (c) => c.kostDager, (c) => c.kostDagerDato(7)),
    teller('kost-streak-3', 'Tre dager på rad', 'Kosthold-streak 3 dager', 'flamme', 'koral', 3, (c) => c.kostStreak, (c) => c.kostStreakDato(3)),
    teller('kost-streak-14', 'To uker på rad', 'Kosthold-streak 14 dager', 'flamme', 'gul', 14, (c) => c.kostStreak, (c) => c.kostStreakDato(14)),
    teller('kost-30', 'Vanen sitter', 'Gode valg 30 dager', 'trofe', 'indigo', 30, (c) => c.kostDager, (c) => c.kostDagerDato(30)),
  ],
  sosialt: [
    teller('sos-1', 'Første møte', 'Ditt første sosiale valg', 'snakke', 'lime', 1, (c) => c.sosDager, (c) => c.sosDagerDato(1)),
    teller('sos-7', 'Sosial uke', 'Sosiale valg 7 dager', 'snakke', 'teal', 7, (c) => c.sosDager, (c) => c.sosDagerDato(7)),
    teller('sos-streak-3', 'Tre dager på rad', 'Sosial streak 3 dager', 'hjerte', 'koral', 3, (c) => c.sosStreak, (c) => c.sosStreakDato(3)),
    teller('sos-streak-14', 'Fast moai', 'Sosial streak 14 dager', 'hjerte', 'gul', 14, (c) => c.sosStreak, (c) => c.sosStreakDato(14)),
    teller('sos-30', 'Tilhørighet', 'Sosiale valg 30 dager', 'trofe', 'indigo', 30, (c) => c.sosDager, (c) => c.sosDagerDato(30)),
  ],
  laering: [
    teller('laer-1', 'Første trinn', 'Lærte din første øvelses-teknikk', 'stjerne', 'lime', 1, (c) => c.laerAntall, (c) => c.laerDato(1)),
    teller('laer-5', 'På vei', 'Lærte teknikken på 5 øvelser', 'graf', 'teal', 5, (c) => c.laerAntall, (c) => c.laerDato(5)),
    teller('laer-10', 'Ferdighetsbygger', 'Lærte teknikken på 10 øvelser', 'hexstjerne', 'blaa', 10, (c) => c.laerAntall, (c) => c.laerDato(10)),
    teller('laer-perfekt', 'Uteksaminert', 'Tok tre stjerner på en uteksaminering', 'stjerne', 'gul', 1, (c) => c.perfekteSteg, (c) => c.perfektDato(1)),
    teller('laer-perfekt-5', 'Toppkarakter', 'Tre stjerner på 5 uteksamineringer', 'hexstjerne', 'oransje', 5, (c) => c.perfekteSteg, (c) => c.perfektDato(5)),
    teller('enhet-1', 'Klassekamerat', 'Uteksaminert din første enhet', 'medalje', 'koral', 1, (c) => c.enheterFullfort, (c) => c.enheterFullfortDato(1)),
    teller('enhet-3', 'Klasseturnering', 'Uteksaminert 3 enheter', 'kalender', 'blaa', 3, (c) => c.enheterFullfort, (c) => c.enheterFullfortDato(3)),
    teller('seksjon-1', 'Seksjonsmester', 'Uteksaminert en hel seksjon', 'trofe', 'lilla', 1, (c) => c.seksjonerFullfort, (c) => c.seksjonerFullfortDato(1)),
    teller('legendarisk-1', 'Legendarisk', 'Tok en enhet legendarisk — dobbelt opp med reps', 'hexstjerne', 'gul', 1, (c) => c.legendariskeEnheter, (c) => c.legendariskDato(1)),
    teller('push-mester', 'Push-up-mester', 'Slo push-up-pandaen — tre stjerner', 'trofe', 'gul', 3, (c) => c.bossStjerner('push-opp'), (c) => c.bossSlaattDato('push-opp')),
  ],
  nytt: [
    teller('nytt-2', 'Nysgjerrig', 'Prøvd 2 ulike bevegelsestyper', 'terning', 'lime', 2, (c) => c.typer, (c) => c.typerDato(2)),
    teller('nytt-4', 'Utforsker', 'Prøvd 4 ulike bevegelsestyper', 'kompass', 'teal', 4, (c) => c.typer, (c) => c.typerDato(4)),
    teller('nytt-7', 'Allsidig', 'Prøvd 7 ulike bevegelsestyper', 'stjerne', 'lilla', 7, (c) => c.typer, (c) => c.typerDato(7)),
    teller('nytt-10', 'Alt teller', 'Prøvd 10 ulike bevegelsestyper', 'hexstjerne', 'indigo', 10, (c) => c.typer, (c) => c.typerDato(10)),
  ],
  tid: [
    teller('tid-1t', 'Første time', '1 time i bevegelse totalt', 'klokke', 'lime', 60, (c) => c.minutter, (c) => c.minutterDato(60)),
    teller('tid-10t', '10 timer', '10 timer i bevegelse', 'klokke', 'teal', 600, (c) => c.minutter, (c) => c.minutterDato(600)),
    teller('tid-24t', 'Et helt døgn', '24 timer i bevegelse', 'stoppeklokke', 'blaa', 1440, (c) => c.minutter, (c) => c.minutterDato(1440)),
    teller('tid-100t', '100 timer', '100 timer i bevegelse', 'trofe', 'indigo', 6000, (c) => c.minutter, (c) => c.minutterDato(6000)),
  ],
  blaflamme: [
    teller('blaa-1', 'Første blå dag', 'Alle gnistene tent samme dag', 'flamme', 'teal', 1, (c) => c.blaaDagerAntall, (c) => c.blaaDagerDato(1)),
    teller('blaa-3', 'Tre blå på rad', 'Blå flamme 3 dager på rad', 'flamme', 'blaa', 3, (c) => c.blaaStreak, (c) => c.blaaStreakDato(3)),
    teller('blaa-7', 'Blå uke', 'Blå flamme 7 dager på rad', 'flamme', 'lilla', 7, (c) => c.blaaStreak, (c) => c.blaaStreakDato(7)),
    teller('blaa-14', 'To blå uker', 'Blå flamme 14 dager på rad', 'flamme', 'indigo', 14, (c) => c.blaaStreak, (c) => c.blaaStreakDato(14)),
    teller('blaa-30', 'Blue zone-måneden', 'Blå flamme 30 dager på rad', 'trofe', 'gul', 30, (c) => c.blaaStreak, (c) => c.blaaStreakDato(30)),
  ],
  oyeblikk: [
    oyeblikk('okt-45', 'Langøkta', 'Én bevegelse på 45 minutter eller mer', 'fjell', 'oransje', 'min45'),
    oyeblikk('okt-90', 'Eventyrdagen', 'Én bevegelse på 90 minutter eller mer', 'fjell', 'indigo', 'min90'),
    oyeblikk('maks', 'Full guffe', 'Én økt på maks intensitet', 'lyn', 'koral', 'maks'),
    teller('pr-1', 'Første rekord', 'Loggført resultat i en øvelse', 'medalje', 'gul', 1, (c) => c.prAntall, (c) => c.prDato(1)),
    teller('pr-5', 'Rekordjeger', 'Resultater i 5 ulike øvelser', 'trofe', 'koral', 5, (c) => c.prAntall, (c) => c.prDato(5)),
  ],
  dognet: [
    oyeblikk('morgen', 'Morgenfugl', 'Bevegelse før klokka 07', 'sol', 'gul', 'morgen'),
    oyeblikk('kveld', 'Nattugle', 'Bevegelse etter klokka 21', 'maane', 'indigo', 'kveld'),
    { id: 'helg', navn: 'Helgekriger', tekst: 'Aktiv både lørdag og søndag samme helg', ikon: 'kalender', farge: 'koral', beregn: (c) => ({ verdi: c.helgDato ? 1 : 0, maal: 1, dato: c.helgDato }) },
  ],
  ekstra: [
    oyeblikk('comeback', 'Comeback', 'Tilbake etter 5+ dagers pause', 'hjerte', 'koral', 'comeback'),
    { id: 'plan-1', navn: 'Som planlagt', tekst: 'Fullført en planlagt økt', ikon: 'sjekk', farge: 'teal', beregn: (c) => ({ verdi: c.planGjort, maal: 1, dato: null }) },
    { id: 'plan-10', navn: 'Planleggeren', tekst: '10 planlagte økter gjennomført', ikon: 'kalender', farge: 'blaa', beregn: (c) => ({ verdi: c.planGjort, maal: 10, dato: null }) },
    teller('bib-10', 'Øktsamler', '10 økter fra biblioteket', 'bok', 'lilla', 10, (c) => c.bibliotekAntall, (c) => c.forste.bibliotek10 || null),
    oyeblikk('test-1', 'Testet og målt', 'Logget en «Test deg selv»', 'penn', 'oransje', 'test'),
    oyeblikk('strava-1', 'Koblet på klokka', 'Første økt importert fra Strava', 'puls', 'oransje', 'strava'),
  ],
};

/** Alle merker med beregnet status: [{...def, oppnadd, dato, verdi, maal, kategori}]. */
export function beregnMerker(profil, logg, planer) {
  const ctx = byggKontekst(profil, logg, planer);
  const ut = [];
  for (const kat of MERKE_KATEGORIER) {
    for (const def of MERKER[kat.id]) {
      const { verdi, maal, dato } = def.beregn(ctx);
      ut.push({ ...def, kategori: kat.id, verdi, maal, dato, oppnadd: verdi >= maal });
    }
  }
  return ut;
}

/** Merker som ble oppnådd mellom to tilstander — til feiring på ferdigskjermen. */
export function nyeMerker(for_, etter) {
  const hadde = new Set(for_.filter((m) => m.oppnadd).map((m) => m.id));
  return etter.filter((m) => m.oppnadd && !hadde.has(m.id));
}

/** Snapshot for feiring: kall før og etter registrering, diff med nyeMerker. */
export function merkerNå() {
  return beregnMerker(hentProfil(), hentLogg(), hentPlan());
}

// ===========================================================================
// Skjermen: #/merker — blå flamme-hero + merkegalleri i Min dag/bibliotek-stilen.
// ===========================================================================
function datoTekst(iso) {
  if (!iso) return 'Oppnådd';
  const d = new Date(iso);
  const iar = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('nb-NO', iar ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

// Restitusjons-kroppskart (flyttet fra Min dag M20): anatomisk for-/bakside-
// figur som tones grønn→rød per muskelgruppe. Bor nå på Profil; anbefalt økt på
// Min dag lenker hit via #/merker?vis=restitusjon.
function kroppskartWidget(logg) {
  const kart = lagKroppskart();
  requestAnimationFrame(() => kart.sett(regionScores(logg)));
  const hjelp = el('p', { class: 'restitusjonskort__hjelp', hidden: true },
    'Hver muskelgruppe farges fra grønn (klar) til rød (nylig belastet) ut fra hvor '
    + 'nylig og hvor hardt du har trent den — det avtar over tre døgn. Bruk kartet til å '
    + 'se hva som er lurt å trene i dag.');
  const info = el('button', {
    class: 'restitusjonskort__info', type: 'button', 'aria-label': 'Hvordan fungerer kroppskartet?',
    onclick: () => { hjelp.hidden = !hjelp.hidden; },
  }, ikon('info'));
  return el('section', { class: 'kort restitusjonskort' },
    el('div', { class: 'restitusjonskort__hode' },
      el('span', { class: 'restitusjonskort__merke' }, 'M'),
      el('div', { class: 'restitusjonskort__tittelrad' },
        el('h2', { class: 'restitusjonskort__tittel' }, 'Restitusjon'),
        el('p', { class: 'restitusjonskort__undertittel' },
          'Se hvor kroppen trenger ro eller er klar for belastning'),
      ),
      info,
    ),
    hjelp,
    kart.svg,
    el('div', { class: 'kroppskart-forklaring' },
      el('span', {}, 'Klar'),
      el('span', { class: 'kroppskart-forklaring__skala' }),
      el('span', {}, 'Nylig belastet'),
    ),
  );
}

export function visMerkerSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { location.hash = '#/hjem'; return; }
  const vis = new URLSearchParams(location.hash.split('?')[1] || '').get('vis');
  const merker = beregnMerker(profil, hentLogg(), hentPlan());
  const gs = hentGnistStatus();
  const oppnadd = merker.filter((m) => m.oppnadd).length;

  // Blå flamme-heroen: kjernemålingen — hvor lenge du har streaket blue
  // zone-dagene, og hvor langt dagens flamme er kommet.
  const hero = el('div', { class: 'kort merkehero' },
    el('span', { class: 'merkehero__flamme' + (gs.blaa.iDagAlle ? ' merkehero__flamme--tent' : '') }, ikon('flamme')),
    el('div', { class: 'merkehero__meta' },
      el('span', { class: 'merkehero__tittel' }, 'Blå flamme'),
      el('span', { class: 'merkehero__sub' },
        `${gs.blaa.streak} ${gs.blaa.streak === 1 ? 'blå dag' : 'blå dager'} på rad · ${gs.blaa.totaltBlaa} totalt`),
      el('span', { class: 'merkehero__sub' },
        gs.blaa.iDagAlle ? 'Alle gnistene tent i dag!' : `${gs.blaa.tentIDag} av 4 gnister tent i dag · ${oppnadd} av ${merker.length} merker`),
    ),
  );

  function merkeKort(m) {
    const laast = !m.oppnadd;
    const fremdrift = laast && m.maal > 1 && m.verdi > 0;
    // Nettopp opptjent (siste 10 min) → avdekkes med pop + glød når man kommer hit.
    const ny = !laast && m.dato && (Date.now() - Date.parse(m.dato)) < 10 * 60000;
    return el('div', { class: 'merke' + (laast ? ' merke--laast' : '') + (ny ? ' merke--ny' : '') },
      el('span', { class: 'merke__sirkel' + (laast ? '' : ` movflis--${m.farge}`) },
        ikon(laast ? 'las' : m.ikon)),
      el('span', { class: 'merke__navn' }, m.navn),
      el('span', { class: 'merke__sub' },
        laast ? (fremdrift ? `${m.verdi} av ${m.maal}` : m.tekst) : datoTekst(m.dato)),
    );
  }

  function bolk(kat) {
    const liste = merker.filter((m) => m.kategori === kat.id);
    const antall = liste.filter((m) => m.oppnadd).length;
    return el('section', { class: 'merkebolk' },
      el('div', { class: 'merkebolk__hode' },
        el('h2', { class: 'merkebolk__tittel' }, kat.navn),
        el('span', { class: 'merkebolk__teller' }, `${antall}/${liste.length}`),
      ),
      el('div', { class: 'merkegrid' }, ...liste.map(merkeKort)),
    );
  }

  const restitusjon = kroppskartWidget(hentLogg());

  // Trening-området (M37): alt av treningsstats og -oppslag samlet på Profil —
  // restitusjonskartet og snarveier til Aktivitet (den gamle fanen), Styrke &
  // fremgang og Øvelsesoppslaget.
  const lenke = (ikonNavn, tekst, href) => el('a', { class: 'listerad', href },
    el('span', { class: 'listerad__ikon' }, ikon(ikonNavn)),
    el('span', { class: 'listerad__navn' }, tekst),
    el('span', { class: 'listerad__chevron' }, ikon('chevron')),
  );
  const treningsomrade = el('section', { class: 'merkebolk' },
    el('div', { class: 'merkebolk__hode' },
      el('h2', { class: 'merkebolk__tittel' }, 'Trening'),
    ),
    restitusjon,
    el('div', { class: 'kort' },
      el('div', { class: 'liste' },
        lenke('puls', 'Aktivitet & historikk', '#/aktivitet'),
        lenke('vekt', 'Styrke & fremgang', '#/styrke'),
        lenke('sok', 'Øvelsesoppslag', '#/bibliotek'),
      ),
    ),
  );

  fanesideMedTittel(mount, { tittel: 'Profil', under: 'Flammen din, treningen din og merkene dine — samlet.' })
    .append(hero, treningsomrade, ...MERKE_KATEGORIER.map(bolk));

  // Kommer man fra «restitusjonsbehov»-lenka på Min dag, scroll widgeten inn.
  if (vis === 'restitusjon') {
    requestAnimationFrame(() =>
      mount.querySelector('.restitusjonskort')?.scrollIntoView({ behavior: REDUSERT() ? 'auto' : 'smooth', block: 'start' }));
  }
}
