// Belønningssystemet (M6, omlagt i M11 til Mova-spesifikasjonen §10/§14):
// belønningsnivået stiger ofte, har INGEN tak, og gir noe nytt hver gang —
// et plagg eller tilbehør til figuren, et miljø til reisen, et app-tema, en
// varm tittel eller en ny øvelse å prøve. Alt utledes deterministisk fra
// total-XP + bevegelsestellere, så ingenting kan «mistes» og sync trenger
// ikke lagre stigen. Ingen tiers, ingen aggressive titler (jf. spec §10).

import { BEVEGELSE_NAVN } from './bevegelse.js';

// --- Nivåkurve: rask og uendelig ------------------------------------------
// XP for å gå fra nivå n til n+1. Starter lavt (fremgang tidlig), vokser
// lineært, aldri et tak. ~1 nivå per økt tidlig.
export function nivaKostnad(n) {
  return 40 + 20 * n;
}

/** Nivå + progresjon mot neste fra total-XP. */
export function nivaFraTotalXp(totalXp) {
  const xp = Math.max(0, totalXp || 0);
  let niva = 1;
  let brukt = 0;
  while (xp >= brukt + nivaKostnad(niva)) { brukt += nivaKostnad(niva); niva++; }
  const inne = xp - brukt;
  const tilNeste = nivaKostnad(niva);
  return { niva, inne, tilNeste, igjen: tilNeste - inne, pct: Math.min(100, Math.round((inne / tilNeste) * 100)), totalXp: xp };
}

// --- Titler: varme, aldri aggressive (spec §10) ----------------------------
export const TITLER = [
  [1, 'Nybegynner'], [4, 'I gang'], [8, 'Momentum-bygger'], [12, 'Hverdagsmover'],
  [17, 'Stifinner'], [23, 'Sterk rytme'], [31, 'Langveisfarer'], [41, 'Fri flyt'],
  [55, 'Move for Life'],
];

export function tittelFor(niva) {
  let t = TITLER[0][1];
  for (const [n, navn] of TITLER) if (niva >= n) t = navn; else break;
  return t;
}

/** Titler som er låst opp ved gitt nivå. */
export function lasteTitler(niva) {
  return TITLER.filter(([n]) => niva >= n).map(([, navn]) => navn);
}

// --- Gjenstander: klær, tilbehør og miljøer til figuren --------------------
// laas: {type:'start'} alltid åpen · {type:'niva', niva} fra belønningsstigen
// · {type:'antall', bevegelse, antall} bevegelsesbelønning (§14) ·
// {type:'comeback'} første gang du kommer tilbake etter en pause (§14).
export const GJENSTANDER = [
  // Gratis fra start
  { id: 't-teal', navn: 'Teal t-skjorte', kategori: 'topp', farge: '#0BA69F', laas: { type: 'start' } },
  { id: 't-navy', navn: 'Marine t-skjorte', kategori: 'topp', farge: '#26385C', laas: { type: 'start' } },
  { id: 'bukse-navy', navn: 'Joggebukse', kategori: 'bukse', farge: '#2C354A', laas: { type: 'start' } },
  { id: 'shorts-gra', navn: 'Shorts', kategori: 'bukse', farge: '#8A93A6', laas: { type: 'start' } },
  { id: 'sko-hvit', navn: 'Hvite joggesko', kategori: 'sko', farge: '#E9ECEF', laas: { type: 'start' } },
  { id: 'miljo-eng', navn: 'Engstien', kategori: 'miljo', laas: { type: 'start' } },

  // Nivåbelønninger (kuratert i stigen under)
  { id: 'sko-trail', navn: 'Trail-joggesko', kategori: 'sko', farge: '#E8853D', laas: { type: 'niva', niva: 2 } },
  { id: 'jakke-skog', navn: 'Skogsjakke', kategori: 'jakke', farge: '#3E6B4F', laas: { type: 'niva', niva: 3 } },
  { id: 'miljo-park', navn: 'Parken', kategori: 'miljo', laas: { type: 'niva', niva: 5 } },
  { id: 'matte', navn: 'Yogamatte', kategori: 'tilbehor', farge: '#8B5CF6', laas: { type: 'niva', niva: 6 } },
  { id: 'miljo-kyst', navn: 'Kystveien', kategori: 'miljo', laas: { type: 'niva', niva: 7 } },
  { id: 'sekk', navn: 'Tursekk', kategori: 'tilbehor', farge: '#E8503F', laas: { type: 'niva', niva: 8 } },
  { id: 't-koral', navn: 'Korallgenser', kategori: 'topp', farge: '#FF6F61', laas: { type: 'niva', niva: 9 } },
  { id: 'miljo-fjell', navn: 'Fjellstien', kategori: 'miljo', laas: { type: 'niva', niva: 10 } },
  { id: 'lue-teal', navn: 'Teal lue', kategori: 'tilbehor', farge: '#027170', laas: { type: 'niva', niva: 11 } },
  { id: 'bukse-tights', navn: 'Tights', kategori: 'bukse', farge: '#11264D', laas: { type: 'niva', niva: 13 } },
  { id: 't-sol', navn: 'Solgul t-skjorte', kategori: 'topp', farge: '#F0B429', laas: { type: 'niva', niva: 14 } },
  { id: 'miljo-solnedgang', navn: 'Solnedgangsveien', kategori: 'miljo', laas: { type: 'niva', niva: 16 } },
  { id: 'sko-koral', navn: 'Korall-joggesko', kategori: 'sko', farge: '#FF6F61', laas: { type: 'niva', niva: 19 } },
  { id: 'jakke-regn', navn: 'Regnjakke', kategori: 'jakke', farge: '#2E8FE0', laas: { type: 'niva', niva: 21 } },
  { id: 'miljo-vinter', navn: 'Snøstien', kategori: 'miljo', laas: { type: 'niva', niva: 26 } },

  // Bevegelsesbelønninger — låses opp av aktivitetsmønstre (§14)
  { id: 'sokker-tur', navn: 'Tursokker', kategori: 'tilbehor', farge: '#0BA69F', laas: { type: 'antall', bevegelse: 'walk', antall: 5 } },
  { id: 'matte-rolig', navn: 'Rolig matte', kategori: 'tilbehor', farge: '#7ED0CB', laas: { type: 'antall', bevegelse: 'yoga', antall: 3 } },
  { id: 'hansker', navn: 'Treningshansker', kategori: 'tilbehor', farge: '#566078', laas: { type: 'antall', bevegelse: 'strength', antall: 5 } },
  { id: 'flaske', navn: 'Drikkeflaske', kategori: 'tilbehor', farge: '#4FA9F5', laas: { type: 'antall', bevegelse: 'run', antall: 3 } },
  { id: 'miljo-hostskog', navn: 'Høstskogen', kategori: 'miljo', laas: { type: 'antall', bevegelse: 'walk', antall: 15 } },

  // Comeback-belønning — å komme tilbake er en prestasjon (§14)
  { id: 'caps-comeback', navn: 'Comeback-caps', kategori: 'tilbehor', farge: '#FF6F61', laas: { type: 'comeback' } },
];

export const GJENSTAND_MAP = new Map(GJENSTANDER.map((g) => [g.id, g]));

export const KATEGORI_NAVN = {
  topp: 'Topp', bukse: 'Bukse', sko: 'Sko', jakke: 'Jakke',
  tilbehor: 'Tilbehør', miljo: 'Miljø',
};

/** Lesbar tekst for en opplåsingsbetingelse. */
export function laasTekst(laas) {
  if (!laas || laas.type === 'start') return 'Alltid åpen';
  if (laas.type === 'niva') return `Nivå ${laas.niva}`;
  if (laas.type === 'antall') return `${laas.antall} × ${BEVEGELSE_NAVN[laas.bevegelse] || laas.bevegelse}`;
  if (laas.type === 'comeback') return 'Kom tilbake etter en pause';
  return '';
}

/** Er en enkelt gjenstand låst opp for denne profilen? */
export function erUlastGjenstand(g, profil) {
  const laas = g.laas || { type: 'start' };
  if (laas.type === 'start') return true;
  if (laas.type === 'niva') return nivaFraTotalXp(profil?.globalXp || 0).niva >= laas.niva;
  if (laas.type === 'antall') return (profil?.bevegelsesTeller?.[laas.bevegelse] || 0) >= laas.antall;
  if (laas.type === 'comeback') return !!profil?.harComeback;
  return false;
}

/** Sett av gjenstands-IDer som er låst opp for profilen. */
export function ulasteGjenstander(profil) {
  const sett = new Set();
  for (const g of GJENSTANDER) if (erUlastGjenstand(g, profil)) sett.add(g.id);
  return sett;
}

/** Gjenstander som ble låst opp mellom to profiltilstander (til feiring). */
export function nyeGjenstander(profilFør, profilEtter) {
  const før = ulasteGjenstander(profilFør);
  return GJENSTANDER.filter((g) => !før.has(g.id) && erUlastGjenstand(g, profilEtter));
}

/** Neste låste gjenstander med hvor langt unna de er (til «neste opp»-hint). */
export function nesteGjenstander(profil, antall = 3) {
  const info = nivaFraTotalXp(profil?.globalXp || 0);
  const laste = GJENSTANDER.filter((g) => !erUlastGjenstand(g, profil));
  const avstand = (g) => {
    if (g.laas.type === 'niva') return g.laas.niva - info.niva;
    if (g.laas.type === 'antall') return g.laas.antall - (profil?.bevegelsesTeller?.[g.laas.bevegelse] || 0);
    return 99;
  };
  return laste.sort((a, b) => avstand(a) - avstand(b)).slice(0, antall);
}

// --- Temaer (CSS-paletter, se app.css) — Mova-aksentvarianter --------------
export const TEMAER = [
  { id: 'standard', navn: 'Mova (standard)', prikk: '#008382' },
  { id: 'mork', navn: 'Marine', prikk: '#11264D' },
  { id: 'midnatt', navn: 'Midnatt', prikk: '#2E8FE0' },
  { id: 'glod', navn: 'Glød', prikk: '#E8853D' },
  { id: 'oliven', navn: 'Oliven', prikk: '#7E9C2E' },
  { id: 'nordlys', navn: 'Nordlys', prikk: '#8B5CF6' },
  { id: 'rodglod', navn: 'Rødglød', prikk: '#FF6F61' },
  { id: 'papir', navn: 'Papir (varm)', prikk: '#E8E2D9' },
  { id: 'mono', navn: 'Mono', prikk: '#3C4660' },
  { id: 'gull', navn: 'Gull', prikk: '#B08D2A' },
];

// --- Belønningsstige --------------------------------------------------------
// Kuraterte milepæler; øvrige nivåer fylles med «ny øvelse»-reveals.
const KURATERT = {
  2: { type: 'gjenstand', id: 'sko-trail' },
  3: { type: 'gjenstand', id: 'jakke-skog' },
  4: { type: 'tittel', id: 'I gang' },
  5: { type: 'gjenstand', id: 'miljo-park' },
  6: { type: 'gjenstand', id: 'matte' },
  7: { type: 'gjenstand', id: 'miljo-kyst' },
  8: { type: 'gjenstand', id: 'sekk' },
  9: { type: 'gjenstand', id: 't-koral' },
  10: { type: 'gjenstand', id: 'miljo-fjell' },
  11: { type: 'gjenstand', id: 'lue-teal' },
  12: { type: 'tittel', id: 'Hverdagsmover' },
  13: { type: 'gjenstand', id: 'bukse-tights' },
  14: { type: 'gjenstand', id: 't-sol' },
  15: { type: 'tema', id: 'nordlys' },
  16: { type: 'gjenstand', id: 'miljo-solnedgang' },
  17: { type: 'tittel', id: 'Stifinner' },
  18: { type: 'tema', id: 'glod' },
  19: { type: 'gjenstand', id: 'sko-koral' },
  20: { type: 'tema', id: 'oliven' },
  21: { type: 'gjenstand', id: 'jakke-regn' },
  23: { type: 'tittel', id: 'Sterk rytme' },
  25: { type: 'tema', id: 'rodglod' },
  26: { type: 'gjenstand', id: 'miljo-vinter' },
  28: { type: 'tema', id: 'midnatt' },
  30: { type: 'tema', id: 'papir' },
  31: { type: 'tittel', id: 'Langveisfarer' },
  35: { type: 'tema', id: 'mono' },
  41: { type: 'tittel', id: 'Fri flyt' },
  50: { type: 'tema', id: 'gull' },
  55: { type: 'tittel', id: 'Move for Life' },
};

// Deterministisk øvelsesrekkefølge for reveals — lette først, så tyngre.
let _ordnet = null;
function ordnedeOvelser(bib) {
  if (_ordnet) return _ordnet;
  if (!bib?.exercises?.length) return [];
  _ordnet = bib.exercises.slice().sort((a, b) => (a.niva - b.niva) || a.navn.localeCompare(b.navn, 'no'));
  return _ordnet;
}

// Hvor mange kuraterte nivåer ≤ n (for å mappe øvrige nivåer til øvelsesindeks).
function kuratertTil(n) {
  let c = 0;
  for (const k in KURATERT) if (Number(k) <= n) c++;
  return c;
}

/** Belønningen som deles ut når du når `niva`. */
export function belonningFor(niva, bib) {
  if (niva <= 1) return { type: 'start', niva };
  const k = KURATERT[niva];
  if (k) {
    if (k.type === 'gjenstand') {
      const g = GJENSTAND_MAP.get(k.id);
      return { type: 'gjenstand', id: k.id, navn: g?.navn || k.id, kategori: g?.kategori, niva };
    }
    if (k.type === 'tema') return { type: 'tema', id: k.id, navn: TEMAER.find((t) => t.id === k.id)?.navn || k.id, niva };
    if (k.type === 'tittel') return { type: 'tittel', id: k.id, navn: k.id, niva };
  }
  // Øvelses-reveal
  const ordnet = ordnedeOvelser(bib);
  if (!ordnet.length) return { type: 'xp', navn: 'XP-bonus', niva };
  const idx = (niva - 1 - kuratertTil(niva)) % ordnet.length;
  const e = ordnet[(idx + ordnet.length) % ordnet.length];
  return { type: 'ovelse', id: e.id, navn: e.navn, niva };
}

/** Alle belønninger til og med `niva` (for stigevisning og opplåsingssett). */
export function belonningerTil(niva, bib) {
  const ut = [];
  for (let n = 2; n <= niva; n++) ut.push(belonningFor(n, bib));
  return ut;
}

/** Sett av øvelses-IDer låst opp via belønningsstigen ved gitt nivå. */
const _revealCache = new Map();
export function belonningsOvelser(niva, bib) {
  if (_revealCache.has(niva)) return _revealCache.get(niva);
  const sett = new Set();
  for (let n = 2; n <= niva; n++) {
    const b = belonningFor(n, bib);
    if (b.type === 'ovelse') sett.add(b.id);
  }
  _revealCache.set(niva, sett);
  return sett;
}

// Opplåste temaer ved gitt nivå (gratis + belønnede).
export function lasteTemaer(niva, bib) {
  const sett = new Set(['standard', 'mork']); // lyst + marine er gratis
  for (const b of belonningerTil(niva, bib)) if (b.type === 'tema') sett.add(b.id);
  return sett;
}

// Neste belønning etter gjeldende nivå (for «neste opp»-hint).
export function nesteBelonning(niva, bib) {
  return belonningFor(niva + 1, bib);
}

// SVG-ikonnavn (fra js/ui.js sitt ikon-sett) per belønningstype.
export function belonningIkonNavn(b) {
  if (b.type === 'tema') return 'palett';
  if (b.type === 'tittel') return 'medalje';
  if (b.type === 'ovelse') return 'vekt';
  if (b.type === 'gjenstand') return b.kategori === 'miljo' ? 'fjell' : 'stjerne';
  return 'hexstjerne';
}
