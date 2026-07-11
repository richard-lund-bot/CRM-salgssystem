// Merker (M15) — badgesystemet som erstatter «Min reise». Alt utledes fra
// loggen + profilen ved lesetid (rene funksjoner): ingenting kan «mistes»,
// sync trenger aldri lagre merkestatus, og Strava-importerte økter teller
// automatisk med. Nivå/XP er et lavmælt tall (nivåboblen på profilikonet);
// merkene er feiringen — streaks, prøv noe nytt, milepæler og mye rart.
import { el, tom, ikon } from './ui.js';
import { hentProfil, hentLogg, hentPlan } from './store.js';
import { nivaFraTotalXp, nivaKostnad, ukeNokkel, prsFraLogg } from './niva.js';
import { loggBevegelse } from './bevegelse.js';
import { fanesideMedTittel } from './banner.js';
import { fyllInn } from './animasjon.js';

const DAG = 86400000;

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
  const xpDato = [];              // [{xp, dato}] kumulativ XP
  const typerDato = [];           // [{antall, dato}] n-te nye bevegelsestype
  const settTyper = new Set();
  let kumMin = 0;
  let kumXp = 0;

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

  for (const o of rader) {
    antallDato.set(antallDato.size + 1, o.dato);
    kumMin += o.varighetMin || 0;
    minutterDato.push({ min: kumMin, dato: o.dato });
    kumXp += o.xp || 0;
    xpDato.push({ xp: kumXp, dato: o.dato });

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

  return {
    antall: rader.length,
    antallDato: (n) => antallDato.get(n) || null,
    minutter: kumMin,
    minutterDato: (min) => minutterDato.find((m) => m.min >= min)?.dato || null,
    xpDato: (xp) => xpDato.find((x) => x.xp >= xp)?.dato || null,
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
    planGjort,
    niva: nivaFraTotalXp(profil?.globalXp || 0).niva,
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
  { id: 'nytt', navn: 'Prøv noe nytt' },
  { id: 'tid', navn: 'Tid i bevegelse' },
  { id: 'niva', navn: 'Nivå' },
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
  niva: [5, 10, 20, 35, 50].map((n, i) =>
    teller(`niva-${n}`, `Nivå ${n}`, `Nådd nivå ${n}`, 'medalje', ['teal', 'blaa', 'lilla', 'oransje', 'gul'][i], n,
      (c) => c.niva, (c) => c.xpDato(xpForNiva(n)))),
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

// Total-XP som trengs for å stå på nivå n (invers av nivåkurven).
function xpForNiva(n) {
  let sum = 0;
  for (let i = 1; i < n; i++) sum += nivaKostnad(i);
  return sum;
}

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
// Skjermen: #/merker — nivåhero + merkegalleri i Min dag/bibliotek-stilen.
// ===========================================================================
function datoTekst(iso) {
  if (!iso) return 'Oppnådd';
  const d = new Date(iso);
  const iar = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('nb-NO', iar ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function visMerkerSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { location.hash = '#/hjem'; return; }
  const merker = beregnMerker(profil, hentLogg(), hentPlan());
  const info = nivaFraTotalXp(profil.globalXp || 0);
  const oppnadd = merker.filter((m) => m.oppnadd).length;

  const xpFyll = el('div', { class: 'xpbar__fyll' });
  fyllInn(xpFyll, 'width', `${info.pct}%`);

  const hero = el('div', { class: 'kort merkehero' },
    el('span', { class: 'merkehero__niva movflis--teal' }, String(info.niva)),
    el('div', { class: 'merkehero__meta' },
      el('span', { class: 'merkehero__tittel' }, `Nivå ${info.niva}`),
      el('div', { class: 'xpbar merkehero__bar' }, xpFyll),
      el('span', { class: 'merkehero__sub' }, `${info.igjen} XP til nivå ${info.niva + 1} · ${oppnadd} av ${merker.length} merker`),
    ),
  );

  function merkeKort(m) {
    const laast = !m.oppnadd;
    const fremdrift = laast && m.maal > 1 && m.verdi > 0;
    return el('div', { class: 'merke' + (laast ? ' merke--laast' : '') },
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

  const lenke = (ikonNavn, tekst, href) => el('a', { class: 'listerad', href },
    el('span', { class: 'listerad__ikon' }, ikon(ikonNavn)),
    el('span', { class: 'listerad__navn' }, tekst),
    el('span', { class: 'listerad__chevron' }, ikon('chevron')),
  );
  const menyKort = el('div', { class: 'kort' },
    el('div', { class: 'liste' },
      lenke('vekt', 'Styrke & fremgang', '#/styrke'),
      lenke('sok', 'Øvelsesoppslag', '#/bibliotek'),
      lenke('gir', 'Innstillinger', '#/innstillinger'),
      lenke('info', 'Om Mova', '#/om'),
    ),
  );

  fanesideMedTittel(mount, { tittel: 'Profil', under: 'Nivået ditt, merkene dine — og alt det andre.' })
    .append(hero, menyKort, ...MERKE_KATEGORIER.map(bolk));
}
