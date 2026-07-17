// Mat (pilar 2) — oppskrifter, ukesplan og handleliste. Den delte modellen som
// binder Mat-modulen sammen: en oppskrift kan legges i ukesplanen (per dag/
// måltid) og/eller i handlelista; handlelista bygges ved lesetid av alle
// oppskriftene i planen (+ manuelt lagt til), skalert til antall personer og
// gruppert per varekategori. Alt lokalt, offline-first. De daglige mat-vanene
// («Logg i dag») bor fortsatt i js/kosthold.js og driver mat-gnisten.
import { hentSprakJson } from './i18n.js';

const DAG = 86400000;

// --- Oppskrifter (statisk innhold, lastes dovent + caches) -----------------
let _oppskrifter = null;
export async function lastOppskrifter() {
  if (_oppskrifter) return _oppskrifter;
  const data = await hentSprakJson('oppskrifter');
  _oppskrifter = Array.isArray(data) ? data : (data?.oppskrifter || []);
  return _oppskrifter;
}
export function alleOppskrifter() { return _oppskrifter || []; }
export function oppskriftMedId(id) { return (_oppskrifter || []).find((o) => o.id === id) || null; }

/** Alle ingredienser (hoved + evt. dressing) for en oppskrift. */
export function oppskriftIngredienser(o) {
  if (!o) return [];
  return [...(o.ingredienser || []), ...(o.dressing || [])];
}

// Tag-etiketter til oppskriftskortene (id → visningsnavn + ikon).
export const TAG_INFO = {
  plantebasert: { navn: 'Plantebasert', ikon: 'blad' },
  vegetar: { navn: 'Vegetar', ikon: 'blad' },
  fiber: { navn: 'Rik på fiber', ikon: 'korn' },
  protein: { navn: 'Høyt protein', ikon: 'vekt' },
  omega3: { navn: 'Omega-3', ikon: 'draape' },
  billig: { navn: 'Billig', ikon: 'merkelapp' },
};
/** De (opptil `maks`) tagene som skal vises på et kort, som {navn,ikon}. */
export function oppskriftTags(o, maks = 2) {
  return (o?.tags || []).map((t) => TAG_INFO[t]).filter(Boolean).slice(0, maks);
}

// Filtrene på Oppskrifter-skjermen (chip → predikat).
export const OPPSKRIFT_FILTRE = [
  { id: 'plantebasert', navn: 'Plantebasert', ikon: 'blad', test: (o) => (o.tags || []).includes('plantebasert') },
  { id: 'middag', navn: 'Middag', ikon: 'gryte', test: (o) => (o.maaltid || []).includes('middag') },
  { id: 'lunsj', navn: 'Lunsj', ikon: 'korn', test: (o) => (o.maaltid || []).includes('lunsj') },
  { id: 'rask', navn: '20 min', ikon: 'klokke', test: (o) => (o.tidMin || 99) <= 20 },
  { id: 'billig', navn: 'Billig', ikon: 'merkelapp', test: (o) => (o.tags || []).includes('billig') },
  { id: 'familie', navn: 'Familie', ikon: 'personer', test: (o) => (o.porsjoner || 0) >= 4 },
];
/** Oppskrifter som matcher fritekst-søk + aktive filter-id-er (alle må matche). */
export function filtrerOppskrifter(sok = '', aktive = []) {
  const q = String(sok).trim().toLowerCase();
  const valgte = OPPSKRIFT_FILTRE.filter((f) => aktive.includes(f.id));
  return alleOppskrifter().filter((o) => {
    if (q && !`${o.navn} ${o.kort || ''} ${o.beskrivelse || ''}`.toLowerCase().includes(q)) return false;
    return valgte.every((f) => f.test(o));
  });
}

/** «For deg i kveld» — en stabil dagsanbefaling (middag/lunsj), rullerer per dag. */
export function dagensOppskrift(ts = Date.now()) {
  const alle = alleOppskrifter();
  const kand = alle.filter((o) => (o.maaltid || []).includes('middag') || (o.maaltid || []).includes('lunsj'));
  const liste = kand.length ? kand : alle;
  if (!liste.length) return null;
  const d = new Date(ts);
  const dagIÅr = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / DAG);
  return liste[dagIÅr % liste.length];
}

// --- Datohjelpere -----------------------------------------------------------
export function isoDag(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function mandagFor(ts = Date.now()) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAG);
}
/** ISO-datoene (man–søn) for uka som inneholder `ts`. */
export function ukeDatoer(ts = Date.now()) {
  const man = mandagFor(ts);
  return Array.from({ length: 7 }, (_, i) => isoDag(man.getTime() + i * DAG));
}
export function ukenummer(ts = Date.now()) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const uke1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - uke1) / DAG - 3 + ((uke1.getDay() + 6) % 7)) / 7);
}

export const MAALTIDER = [
  { id: 'frokost', navn: 'Frokost', ikon: 'kaffe', under: 'En god start på dagen' },
  { id: 'lunsj', navn: 'Lunsj', ikon: 'korn', under: 'Næringsrikt og enkelt' },
  { id: 'middag', navn: 'Middag', ikon: 'gryte', under: 'Dagens høydepunkt' },
];

// --- Ukesplan (trening.matplan) --------------------------------------------
const LS_PLAN = 'trening.matplan';
function lesPlanRå() { try { return JSON.parse(localStorage.getItem(LS_PLAN) || '{}') || {}; } catch { return {}; } }
function skrivPlan(o) { try { localStorage.setItem(LS_PLAN, JSON.stringify(o)); } catch { /* valgfri */ } }
export function lesMatplan() { return lesPlanRå(); }
export function settMatplanRå(o) { skrivPlan(o && typeof o === 'object' ? o : {}); }

/** Måltidene planlagt for én dag: { frokost, lunsj, middag } (oppskrift-id-er). */
export function maaltidFor(iso) { return lesPlanRå()[iso] || {}; }

/** Sett (eller fjern med id=null) en oppskrift på en dag + måltid. */
export function settMaaltid(iso, maaltid, oppskriftId) {
  const plan = lesPlanRå();
  const dag = { ...(plan[iso] || {}) };
  if (oppskriftId) dag[maaltid] = oppskriftId; else delete dag[maaltid];
  if (Object.keys(dag).length) plan[iso] = dag; else delete plan[iso];
  skrivPlan(plan);
  return plan;
}

/** Fyll tomme måltider i uka med passende tilfeldige oppskrifter (deterministisk per dag). */
export function autofyllUke(ts = Date.now()) {
  const datoer = ukeDatoer(ts);
  const plan = lesPlanRå();
  const perMaaltid = {};
  for (const m of MAALTIDER) perMaaltid[m.id] = alleOppskrifter().filter((o) => (o.maaltid || []).includes(m.id));
  datoer.forEach((iso, di) => {
    const dag = { ...(plan[iso] || {}) };
    for (const m of MAALTIDER) {
      if (dag[m.id]) continue;
      const kand = perMaaltid[m.id];
      if (!kand.length) continue;
      dag[m.id] = kand[(di + m.id.length) % kand.length].id;
    }
    plan[iso] = dag;
  });
  skrivPlan(plan);
  return plan;
}

/** Antall planlagte måltider i uka + fordeling per type. */
export function planStatus(ts = Date.now()) {
  const datoer = ukeDatoer(ts);
  const plan = lesPlanRå();
  let antall = 0; const perType = { frokost: 0, lunsj: 0, middag: 0 };
  const dagerMedNoe = new Set();
  for (const iso of datoer) {
    const dag = plan[iso] || {};
    for (const m of MAALTIDER) if (dag[m.id]) { antall++; perType[m.id]++; dagerMedNoe.add(iso); }
  }
  return { antall, perType, dager: dagerMedNoe.size };
}

// --- Handleliste (trening.handleliste) -------------------------------------
// Bygges av oppskriftene i ukesplanen (denne uka) + manuelt lagt til, skalert
// til `personer` og gruppert per varekategori. Avkryssing + egne varer lagres.
const LS_HANDLE = 'trening.handleliste';
function lesHandleRå() {
  try { return JSON.parse(localStorage.getItem(LS_HANDLE) || 'null') || {}; } catch { return {}; }
}
function skrivHandle(o) { try { localStorage.setItem(LS_HANDLE, JSON.stringify(o)); } catch { /* valgfri */ } }
export function lesHandleliste() {
  const h = lesHandleRå();
  return { personer: h.personer || 2, ekstra: h.ekstra || [], avkrysset: h.avkrysset || {}, egne: h.egne || [] };
}
export function settHandlelisteRå(o) { skrivHandle(o && typeof o === 'object' ? o : {}); }

export function settPersoner(n) {
  const h = lesHandleliste(); h.personer = Math.max(1, Math.min(12, n)); skrivHandle(h); return h.personer;
}
/** Legg en oppskrift til handlelista (uten å planlegge den). */
export function leggOppskriftIHandle(id) {
  const h = lesHandleliste();
  if (!h.ekstra.includes(id)) h.ekstra.push(id);
  skrivHandle(h); return h;
}
export function fjernOppskriftFraHandle(id) {
  const h = lesHandleliste(); h.ekstra = h.ekstra.filter((x) => x !== id); skrivHandle(h); return h;
}
export function veksleAvkrysset(key) {
  const h = lesHandleliste();
  if (h.avkrysset[key]) delete h.avkrysset[key]; else h.avkrysset[key] = true;
  skrivHandle(h); return !!h.avkrysset[key];
}
export function leggEgenVare({ navn, mengde, enhet, kategori }) {
  const n = (navn || '').trim(); if (!n) return null;
  const h = lesHandleliste();
  h.egne.push({ navn: n.slice(0, 40), mengde: mengde || null, enhet: enhet || '', kategori: kategori || 'annet' });
  skrivHandle(h); return h;
}
export function tømAvkrysset() { const h = lesHandleliste(); h.avkrysset = {}; skrivHandle(h); }

// --- Favoritter (bokmerkede oppskrifter) -----------------------------------
const LS_FAV = 'trening.matfavoritter';
function lesFavRå() { try { return JSON.parse(localStorage.getItem(LS_FAV) || '[]') || []; } catch { return []; } }
export function lesFavoritter() { return lesFavRå(); }
export function erFavoritt(id) { return lesFavRå().includes(id); }
export function veksleFavoritt(id) {
  const f = lesFavRå(); const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  try { localStorage.setItem(LS_FAV, JSON.stringify(f)); } catch { /* valgfri */ }
  return f.includes(id);
}

// Varekategoriene i visningsrekkefølge.
export const VARE_KATEGORIER = [
  { id: 'grønnsaker', navn: 'Grønnsaker', ikon: 'blad' },
  { id: 'belgvekster', navn: 'Belgvekster', ikon: 'belg' },
  { id: 'korn', navn: 'Korn', ikon: 'korn' },
  { id: 'kjøl', navn: 'Kjøl', ikon: 'kjoleskap' },
  { id: 'annet', navn: 'Annet', ikon: 'handlepose' },
];

function nid(item) { return `${item.kategori}::${item.navn}`.toLowerCase(); }
function rundMengde(x, enhet) {
  if (x == null) return null;
  const heltall = ['stk', 'boks', 'pk', 'glass', 'bunt', 'eske', 'kurv', 'håndfull', 'fedd', 'pose', 'klype'];
  if (heltall.includes(enhet)) return Math.max(1, Math.round(x));
  return Math.round(x * 10) / 10;
}

/**
 * Oppskrift-id-ene som handlelista bygges på: alle måltider i ukesplanen for
 * uka som inneholder `ts` + manuelt lagt til (h.ekstra). Med gjentakelser.
 */
export function handlelisteKilder(ts = Date.now()) {
  const plan = lesPlanRå();
  const ids = [];
  for (const iso of ukeDatoer(ts)) {
    const dag = plan[iso] || {};
    for (const m of MAALTIDER) if (dag[m.id]) ids.push(dag[m.id]);
  }
  for (const id of lesHandleliste().ekstra) ids.push(id);
  return ids;
}

/**
 * Bygg handlelista: aggreger ingredienser fra kilde-oppskriftene, skaler til
 * `personer`, legg til egne varer, grupper per kategori. Returnerer
 * { grupper:[{kategori, navn, ikon, varer:[{key,navn,mengde,enhet,avkrysset}], antall, avkrysset}], personer, maaltider }.
 */
export function byggHandleliste(ts = Date.now()) {
  const h = lesHandleliste();
  const kilder = handlelisteKilder(ts);
  const agg = new Map(); // key → {navn,mengde,enhet,kategori}
  const perType = { frokost: 0, lunsj: 0, middag: 0 };

  // Tell måltidstyper for headeren (kun planlagte, ikke ekstra).
  const plan = lesPlanRå();
  for (const iso of ukeDatoer(ts)) { const dag = plan[iso] || {}; for (const m of MAALTIDER) if (dag[m.id]) perType[m.id]++; }

  for (const id of kilder) {
    const o = oppskriftMedId(id);
    if (!o) continue;
    const faktor = (h.personer || 2) / (o.porsjoner || 4);
    for (const ing of oppskriftIngredienser(o)) {
      const key = nid(ing);
      const skalert = ing.mengde != null ? ing.mengde * faktor : null;
      if (agg.has(key)) {
        const e = agg.get(key);
        e.mengde = (e.mengde != null && skalert != null) ? e.mengde + skalert : (e.mengde ?? skalert);
      } else {
        agg.set(key, { navn: ing.navn, mengde: skalert, enhet: ing.enhet || '', kategori: ing.kategori || 'annet' });
      }
    }
  }
  for (const e of h.egne) {
    const key = nid(e);
    if (!agg.has(key)) agg.set(key, { navn: e.navn, mengde: e.mengde, enhet: e.enhet || '', kategori: e.kategori || 'annet' });
  }

  const grupper = [];
  for (const kat of VARE_KATEGORIER) {
    const varer = [...agg.values()].filter((v) => v.kategori === kat.id).map((v) => ({
      key: nid(v), navn: v.navn, mengde: rundMengde(v.mengde, v.enhet), enhet: v.enhet, avkrysset: !!h.avkrysset[nid(v)],
    })).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
    if (varer.length) grupper.push({ ...kat, varer, antall: varer.length, avkrysset: varer.filter((x) => x.avkrysset).length });
  }
  const totalVarer = grupper.reduce((s, g) => s + g.antall, 0);
  return { grupper, personer: h.personer || 2, perType, totalVarer };
}

/** Flat tekst av handlelista til deling (Web Share / utklipp). */
export function handlelisteTekst(ts = Date.now()) {
  const b = byggHandleliste(ts);
  const linjer = ['Handleliste'];
  for (const g of b.grupper) {
    linjer.push('', g.navn);
    for (const v of g.varer) linjer.push(`- ${v.navn}${v.mengde != null ? ` (${v.mengde} ${v.enhet})` : ''}`);
  }
  return linjer.join('\n');
}
