// Ro (pilar 3) — hvile og nervesystem-ro som daglig praksis. Som Kosthold og
// Fellesskap: du huker av de rolige valgene du fikk til i dag (pustet rolig,
// var uten skjerm, mediterte, tok en pause, var ute i naturen). Egen logg
// (trening.rolog), atskilt fra alt annet. Valgene mater ro-gnisten (js/gnist.js);
// i tillegg teller fullførte restitusjons-/pusteøkter som ro (via bevegelsesloggen).
// Rene funksjoner over localStorage — ingen DOM her.
import { beregnStreak } from './bevegelse.js';

const LS = 'trening.rolog';

// Daglige ro-vaner (stabile id-er; visningsnavn oversettes av i18n).
export const RO_VANER = [
  { id: 'pust', navn: 'Pustet rolig', ikon: 'vind' },
  { id: 'skjermfri', navn: 'Var uten skjerm', ikon: 'telefon' },
  { id: 'meditasjon', navn: 'Ba / mediterte', ikon: 'lotus' },
  { id: 'pause', navn: 'Tok en liten pause', ikon: 'kaffe' },
  { id: 'natur', navn: 'Var ute i naturen', ikon: 'tre' },
];
const VANE = Object.fromEntries(RO_VANER.map((v) => [v.id, v]));

// Mikroøkter til «Start på 2 minutter» — ultralav terskel. Egen lett spiller
// (ikke øktbiblioteket): en rolig nedtelling som huker av den tilhørende vanen.
export const MIKRO_OKTER = [
  { id: 'pust1', navn: '1 min pust', ikon: 'vind', min: 1, vane: 'pust',
    instr: 'Pust inn gjennom nesen. Slipp et langt, rolig sukk ut.', pust: true, inn: 4, ut: 6 },
  { id: 'kroppsskann', navn: 'Kort kroppsskann', ikon: 'person', min: 2, vane: 'pause',
    instr: 'Merk kroppen fra tå til isse. Slipp spenning der du finner den.', pust: false },
  { id: 'stillhet', navn: 'Stillhet', ikon: 'maane', min: 2, vane: 'pause',
    instr: 'Bare vær. La tankene komme og gå — du trenger ikke gjøre noe.', pust: false },
];

// --- Lager ------------------------------------------------------------------
function les() { try { return JSON.parse(localStorage.getItem(LS) || '[]') || []; } catch { return []; } }
function skriv(a) { try { localStorage.setItem(LS, JSON.stringify(a)); } catch { /* lagring valgfri */ } }
export function lesRolog() { return les(); }
/** Skriver hele loggen rått (brukes av synk etter fletting). */
export function settRologRå(arr) { skriv(Array.isArray(arr) ? arr : []); }

export function isoDag(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dagensInnslag(dato = isoDag()) {
  return les().find((o) => o.dato === dato) || null;
}

function harVane(o) { return o && o.vaner && Object.values(o.vaner).some(Boolean); }
function aktiveDager(logg) { return logg.filter(harVane); }

/** Ro-streak: sammenhengende dager med minst ett rolig valg. */
export function roStreak(nå = Date.now()) { return beregnStreak(aktiveDager(les()), nå); }

export function roStatus(nå = Date.now()) {
  const logg = les();
  const iDag = dagensInnslag(isoDag(nå));
  const iDagAntall = iDag ? Object.values(iDag.vaner || {}).filter(Boolean).length : 0;
  const uke = new Set(aktiveDager(logg).map((o) => o.dato));
  let ukeAktive = 0;
  for (let i = 0; i < 7; i++) if (uke.has(isoDag(nå - i * 86400000))) ukeAktive++;
  return { streak: roStreak(nå), iDagAntall, ukeAktive, antallVaner: RO_VANER.length };
}

function hentEllerLagDag(logg, dato) {
  let o = logg.find((x) => x.dato === dato);
  if (!o) { o = { id: `ro-${dato}`, dato, vaner: {}, oppdatert: '' }; logg.push(o); }
  return o;
}

/**
 * Slår en ro-vane av/på for en dag. Oppdaterer streaken og returnerer et
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
  return { aktiv, streakØkte: streakEtterVerdi > streakFør ? streakEtterVerdi : 0, streak: streakEtterVerdi };
}

/**
 * Sikrer at en ro-vane er PÅ for dagen (idempotent) — brukes når en mikroøkt
 * fullføres. Returnerer feiring-resultat: { aktiv, streakØkte, streak }.
 */
export function sikreVane(vaneId, dato = isoDag()) {
  const logg = les();
  const streakFør = beregnStreak(aktiveDager(logg), Date.now());
  const dag = hentEllerLagDag(logg, dato);
  if (!dag.vaner[vaneId]) {
    dag.vaner[vaneId] = true;
    dag.oppdatert = new Date().toISOString();
    skriv(logg);
  }
  const streakEtterVerdi = beregnStreak(aktiveDager(logg), Date.now());
  return { aktiv: true, streakØkte: streakEtterVerdi > streakFør ? streakEtterVerdi : 0, streak: streakEtterVerdi };
}
