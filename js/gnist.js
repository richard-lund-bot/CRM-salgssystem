// Gnist-laget — kjerneprogresjonen etter at XP ble fjernet: streaks på gode
// vaner i stedet for poeng. Hver pilar har en lav dagsterskel; når terskelen
// nås, tennes pilarens RØDE GNIST for dagen, og sammenhengende dager med tent
// gnist bygger pilarens gnist-streak. Tenner du ALLE de røde gnistene samme
// dag, er dagen en BLÅ DAG — og sammenhengende blå dager bygger den BLÅ
// FLAMMEN (blue zone-streaken), kjernemålingen på Hjem.
//
// Alt er avledet av loggene ved lesetid (samme mønster som beregnStreak og
// merkene): ingenting lagres, ingenting kan «mistes», og sync trenger aldri
// noe nytt. Rene funksjoner over `kilder = { logg, matlogg, sosiallogg }` så
// motoren kan røyk-testes uten nettleser; hentGnistStatus() leser lagrene.
import { hentLogg, hentProfil } from './store.js';
import { lesMatlogg } from './kosthold.js';
import { lesSosiallogg } from './sosialt.js';
import { lesRolog } from './ro.js';
import { loggBevegelse } from './bevegelse.js';

const DAG = 86400000;

// --- Dagstersklene («nå visse terskler per pilar») -------------------------
// Bevisst lave (senk dørstokkmila): en gnist skal være innen rekkevidde hver
// eneste dag — det er rekka som er prestasjonen, ikke enkeltdagen.
export const TERSKLER = {
  bevegelse: 10, // minutter bevegelse
  mat: 3,        // gode matvalg (av 5)
  ro: 1,         // rolige økter (pust/restitusjon)
  sosialt: 1,    // gode sosiale valg
};

// Pilarene som bærer en rød gnist. Mening er bevisst IKKE med: den er rammen
// rundt vanene (ukentlig refleksjon), ikke en daglig terskel som kan «tennes».
export const GNIST_PILARER = [
  { id: 'bevegelse', navn: 'Bevegelse', ikon: 'loper', rute: 'trening' },
  { id: 'mat', navn: 'Mat', ikon: 'eple', rute: 'kosthold' },
  { id: 'ro', navn: 'Ro', ikon: 'maane', rute: 'ro' },
  { id: 'sosialt', navn: 'Fellesskap', ikon: 'personer', rute: 'sosialt' },
];

// Lokal ISO-dag (YYYY-MM-DD) — gnistene følger brukerens døgn, ikke UTC.
export function isoDag(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Antall avhukede vaner per dag i en vane-logg (matlogg/sosiallogg).
function vanerPerDag(logg) {
  const per = new Map();
  for (const o of logg || []) {
    if (!o?.dato || !o.vaner) continue;
    const antall = Object.values(o.vaner).filter(Boolean).length;
    if (antall > 0) per.set(o.dato, Math.max(per.get(o.dato) || 0, antall));
  }
  return per;
}

/**
 * Dagsverdier per pilar for én dag: { verdi, maal, naadd } — verdiene er
 * minutter (bevegelse), antall valg (mat/sosialt) eller antall rolige økter (ro).
 */
export function dagsGnister(kilder, dato) {
  const { logg = [], matlogg = [], sosiallogg = [], rolog = [] } = kilder || {};
  let minutter = 0;
  let rolige = 0;
  for (const o of logg) {
    if (o.slettet || (o.dato || '').slice(0, 10) !== dato) continue;
    minutter += o.varighetMin || 0;
    if (loggBevegelse(o) === 'recovery') rolige++;
  }
  const mat = vanerPerDag(matlogg).get(dato) || 0;
  const sos = vanerPerDag(sosiallogg).get(dato) || 0;
  // Ro teller BÅDE avkryssede ro-vaner OG fullførte restitusjonsøkter.
  const roVerdi = (vanerPerDag(rolog).get(dato) || 0) + rolige;
  const pilar = (verdi, maal) => ({ verdi, maal, naadd: verdi >= maal });
  const ut = {
    bevegelse: pilar(minutter, TERSKLER.bevegelse),
    mat: pilar(mat, TERSKLER.mat),
    ro: pilar(roVerdi, TERSKLER.ro),
    sosialt: pilar(sos, TERSKLER.sosialt),
  };
  ut.alle = GNIST_PILARER.every((p) => ut[p.id].naadd);
  return ut;
}

/** Settet av dager (lokal ISO) der en pilars terskel er nådd. */
export function pilarDager(kilder, pilarId) {
  const { logg = [], matlogg = [], sosiallogg = [], rolog = [] } = kilder || {};
  const dager = new Set();
  if (pilarId === 'bevegelse') {
    const per = new Map(); // dato → minutter
    for (const o of logg) {
      if (o.slettet) continue;
      const t = Date.parse(o.dato);
      if (!Number.isFinite(t)) continue;
      const dato = isoDag(t);
      per.set(dato, (per.get(dato) || 0) + (o.varighetMin || 0));
    }
    for (const [dato, min] of per) if (min >= TERSKLER.bevegelse) dager.add(dato);
    return dager;
  }
  if (pilarId === 'ro') {
    // Ro tennes av ro-vaner ELLER en fullført restitusjonsøkt samme dag.
    const per = vanerPerDag(rolog);
    for (const [dato, antall] of per) if (antall >= TERSKLER.ro) dager.add(dato);
    for (const o of logg) {
      if (o.slettet || loggBevegelse(o) !== 'recovery') continue;
      const t = Date.parse(o.dato);
      if (Number.isFinite(t)) dager.add(isoDag(t));
    }
    return dager;
  }
  const per = vanerPerDag(pilarId === 'mat' ? matlogg : sosiallogg);
  const maal = TERSKLER[pilarId];
  for (const [dato, antall] of per) if (antall >= maal) dager.add(dato);
  return dager;
}

/** Dager der ALLE pilarene nådde terskelen — blå dager. */
export function blaaDager(kilder) {
  const [forste, ...resten] = GNIST_PILARER.map((p) => pilarDager(kilder, p.id));
  const ut = new Set();
  for (const dato of forste) if (resten.every((s) => s.has(dato))) ut.add(dato);
  return ut;
}

/**
 * Streak fra et sett tente dager, målt bakover fra i dag. Nådefrist (aldri
 * skam): er ikke dagens gnist tent ennå, kan den fortsatt komme — en tent
 * gårsdag holder streaken i live til dagen er omme.
 */
export function streakFraDager(dager, nå = Date.now()) {
  let t = nå;
  if (!dager.has(isoDag(t))) t -= DAG;
  let streak = 0;
  while (dager.has(isoDag(t))) { streak++; t -= DAG; }
  return streak;
}

/** Rød gnist-streak for én pilar. */
export function gnistStreak(kilder, pilarId, nå = Date.now()) {
  return streakFraDager(pilarDager(kilder, pilarId), nå);
}

// Bevegelse: minst 150 min moderat aktivitet per FULLFØRT uke (WHO-minimum).
const UKE_TERSKEL_BEVEGELSE = 150;

/**
 * Bevegelses-streak med ukesport: en tent dag krever ≥10 min (som ellers), OG
 * streaken nullstilles hvis en FULLFØRT uke (man–søn) lå under 150 min. Den
 * inneværende, ufullførte uka gjelder ikke — den kan ikke «feiles» ennå.
 */
export function bevegelseStreak(kilder, nå = Date.now()) {
  const tent = pilarDager(kilder, 'bevegelse');
  const minPerDag = new Map();
  for (const o of (kilder.logg || [])) {
    if (o.slettet) continue;
    const t = Date.parse(o.dato);
    if (!Number.isFinite(t)) continue;
    const d = isoDag(t);
    minPerDag.set(d, (minPerDag.get(d) || 0) + (o.varighetMin || 0));
  }
  const mandagAv = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime() - ((d.getDay() + 6) % 7) * DAG; };
  const ukeSum = (mandagTs) => { let s = 0; for (let i = 0; i < 7; i++) s += minPerDag.get(isoDag(mandagTs + i * DAG)) || 0; return s; };
  const denneMandag = mandagAv(nå);
  // Fripass på registreringsuka: man melder seg gjerne inn midt i uka eller i
  // helga, så den første, delvise uka skal ikke kunne bryte streaken.
  const regMandag = kilder.registrert ? mandagAv(kilder.registrert) : -Infinity;

  let t = nå;
  if (!tent.has(isoDag(t))) t -= DAG; // nådefrist: dagens gnist kan fortsatt komme
  let streak = 0;
  while (tent.has(isoDag(t))) {
    const mandag = mandagAv(t);
    // Krysser vi inn i en FULLFØRT uke som lå under 150 min → streaken er brutt.
    // Registreringsuka er fritatt (delvis uke — man melder seg inn midt i uka).
    if (mandag < denneMandag && mandag !== regMandag && ukeSum(mandag) < UKE_TERSKEL_BEVEGELSE) break;
    streak += 1;
    t -= DAG;
  }
  return streak;
}

/** Den blå flammen: sammenhengende blå dager (alle gnistene tent). */
export function blaaStreak(kilder, nå = Date.now()) {
  return streakFraDager(blaaDager(kilder), nå);
}

/**
 * Full status for skjermene: per pilar { streak, iDag: {verdi, maal, naadd} },
 * pluss blaa { streak, iDagAlle, tentIDag, totaltBlaa }.
 */
export function gnistStatus(kilder, nå = Date.now()) {
  const iDag = dagsGnister(kilder, isoDag(nå));
  const pilarer = {};
  for (const p of GNIST_PILARER) {
    const streak = p.id === 'bevegelse' ? bevegelseStreak(kilder, nå) : gnistStreak(kilder, p.id, nå);
    pilarer[p.id] = { streak, iDag: iDag[p.id] };
  }
  const alleBlaa = blaaDager(kilder);
  return {
    pilarer,
    blaa: {
      streak: streakFraDager(alleBlaa, nå),
      iDagAlle: iDag.alle,
      tentIDag: GNIST_PILARER.filter((p) => iDag[p.id].naadd).length,
      totaltBlaa: alleBlaa.size,
    },
  };
}

/** Som gnistStatus, men leser lagrene selv (til skjermene). */
export function hentGnistStatus(nå = Date.now()) {
  const registrert = Date.parse(hentProfil()?.opprettet || '') || undefined;
  return gnistStatus({ logg: hentLogg(), matlogg: lesMatlogg(), sosiallogg: lesSosiallogg(), rolog: lesRolog(), registrert }, nå);
}

/** Tente dager for én pilar (leser lagrene selv). Samme kilde som streaken, så
 *  skjermenes ukesprikker og «X dager på rad» alltid stemmer overens. */
export function hentPilarDager(pilarId, nå = Date.now()) {
  return pilarDager({ logg: hentLogg(), matlogg: lesMatlogg(), sosiallogg: lesSosiallogg(), rolog: lesRolog() }, pilarId, nå);
}
