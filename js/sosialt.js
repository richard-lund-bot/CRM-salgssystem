// Sosialt (Fase 5) — tilhørighet som daglige HANDLINGER. Sterk sosial tilknytning
// er en av de kraftigste blue-zones-faktorene for et langt liv (jf. «moai» på
// Okinawa). Ingen sosial graf, ingen scraping: du huker av de gode sosiale
// valgene du fikk til i dag (møtte noen, ringte en du er glad i, delte et
// måltid, ble med på noe). Egen logg (trening.sosiallogg), atskilt fra alt
// annet. Valgene mater sosial-gnisten (js/gnist.js: ett valg tenner dagen);
// streak/feiring gjenbrukes fra bevegelsessystemet.
import { beregnStreak } from './bevegelse.js';

const LS = 'trening.sosiallogg';

// Sosiale blue-zones-vaner (stabile id-er; visningsnavn oversettes av i18n).
export const SOSIALE_VANER = [
  { id: 'motte', navn: 'Møtte noen' },
  { id: 'naere', navn: 'Ringte en du er glad i' },
  { id: 'maaltid', navn: 'Delte et måltid' },
  { id: 'fellesskap', navn: 'Ble med på noe' },
];
const VANE = Object.fromEntries(SOSIALE_VANER.map((v) => [v.id, v]));

// --- Lager -----------------------------------------------------------------
function les() {
  try { return JSON.parse(localStorage.getItem(LS) || '[]') || []; } catch { return []; }
}
function skriv(a) {
  try { localStorage.setItem(LS, JSON.stringify(a)); } catch { /* lagring valgfri */ }
}
export function lesSosiallogg() { return les(); }
/** Skriver hele loggen rått (brukes av synk etter fletting). */
export function settSosialloggRå(arr) { skriv(Array.isArray(arr) ? arr : []); }

export function isoDag(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dagensInnslag(dato = isoDag()) {
  return les().find((o) => o.dato === dato) || null;
}

function harVane(o) { return o && o.vaner && Object.values(o.vaner).some(Boolean); }
function aktiveDager(logg) { return logg.filter(harVane); }

/** Sosial-streak: sammenhengende dager med minst ett sosialt valg. */
export function sosialStreak(nå = Date.now()) { return beregnStreak(aktiveDager(les()), nå); }

export function sosialStatus(nå = Date.now()) {
  const logg = les();
  const iDag = dagensInnslag(isoDag(nå));
  const iDagAntall = iDag ? Object.values(iDag.vaner || {}).filter(Boolean).length : 0;
  const uke = new Set(aktiveDager(logg).map((o) => o.dato));
  let ukeAktive = 0;
  for (let i = 0; i < 7; i++) if (uke.has(isoDag(nå - i * 86400000))) ukeAktive++;
  return { streak: sosialStreak(nå), iDagAntall, ukeAktive, antallVaner: SOSIALE_VANER.length };
}

function hentEllerLagDag(logg, dato) {
  let o = logg.find((x) => x.dato === dato);
  if (!o) { o = { id: `sos-${dato}`, dato, vaner: {}, oppdatert: '' }; logg.push(o); }
  return o;
}

/**
 * Slår en sosial vane av/på for en dag. Oppdaterer streaken og returnerer et
 * feirings-resultat: { aktiv, streakØkte, streak }.
 */
export function veksleVane(vaneId, dato = isoDag()) {
  const vane = VANE[vaneId];
  if (!vane) return null;
  const logg = les();
  const streakFør = beregnStreak(aktiveDager(logg), Date.now());
  const dag = hentEllerLagDag(logg, dato);
  const aktiv = !dag.vaner[vaneId];
  dag.vaner[vaneId] = aktiv;
  dag.oppdatert = new Date().toISOString();
  skriv(logg);

  const streakEtterVerdi = beregnStreak(aktiveDager(logg), Date.now());
  const streakØkte = streakEtterVerdi > streakFør ? streakEtterVerdi : 0;
  return { aktiv, streakØkte, streak: streakEtterVerdi };
}
