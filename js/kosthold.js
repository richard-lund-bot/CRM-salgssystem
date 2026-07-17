// Kosthold (Fase 3) — blue-zones-spising som daglige HANDLINGER, ikke tall.
// Ingen kalorier eller makroer: du huker av de gode vanene du fikk til i dag
// (grønt, belgvekster, fullkorn, fisk, måtehold) og kan legge et kort
// måltidsnotat. Alt ligger lokalt i sin EGEN logg (trening.matlogg) — atskilt
// fra bevegelsesloggen (trening.logg) så treningsstatistikk/streak/merker aldri
// blandes. XP går inn i det globale nivået; streak og feiring gjenbrukes fra
// bevegelses-/feiringssystemet (beregnStreak, kisteKort, streakEtter).
import { hentProfil, lagreProfil } from './store.js';
import { globaltNiva } from './niva.js';
import { beregnStreak } from './bevegelse.js';

const LS = 'trening.matlogg';

// Blue-zones-vaner (stabile id-er; visningsnavn oversettes av i18n). Én XP-verdi
// per avhuking — små, jevne belønninger for ekte handlinger.
export const VANER = [
  { id: 'gront', navn: 'Grønnsaker', xp: 5 },
  { id: 'belg', navn: 'Belgvekster', xp: 5 },
  { id: 'fullkorn', navn: 'Fullkorn', xp: 5 },
  { id: 'fisk', navn: 'Fisk', xp: 5 },
  { id: 'moderasjon', navn: 'Måtehold', xp: 5 },
];
const VANE = Object.fromEntries(VANER.map((v) => [v.id, v]));

// --- Lager -----------------------------------------------------------------
function les() {
  try { return JSON.parse(localStorage.getItem(LS) || '[]') || []; } catch { return []; }
}
function skriv(a) {
  try { localStorage.setItem(LS, JSON.stringify(a)); } catch { /* lagring valgfri */ }
}
export function lesMatlogg() { return les(); }
/** Skriver hele loggen rått (brukes av synk etter fletting). */
export function settMatloggRå(arr) { skriv(Array.isArray(arr) ? arr : []); }

export function isoDag(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Dagens innslag (eller null hvis ingenting er logget i dag). */
export function dagensInnslag(dato = isoDag()) {
  return les().find((o) => o.dato === dato) || null;
}

// En dag «teller» (mot streak/aktive dager) når minst én vane er huket av.
function harVane(o) { return o && o.vaner && Object.values(o.vaner).some(Boolean); }
function aktiveDager(logg) { return logg.filter(harVane); }

/** Kostholds-streak: sammenhengende dager med minst én god vane. */
export function kostStreak(nå = Date.now()) { return beregnStreak(aktiveDager(les()), nå); }

/** Status til kosthold-skjermen: streak, antall vaner i dag, aktive dager (7). */
export function kostStatus(nå = Date.now()) {
  const logg = les();
  const iDag = dagensInnslag(isoDag(nå));
  const iDagAntall = iDag ? Object.values(iDag.vaner || {}).filter(Boolean).length : 0;
  const uke = new Set(aktiveDager(logg).map((o) => o.dato));
  let ukeAktive = 0;
  for (let i = 0; i < 7; i++) if (uke.has(isoDag(nå - i * 86400000))) ukeAktive++;
  return { streak: kostStreak(nå), iDagAntall, ukeAktive, antallVaner: VANER.length };
}

function hentEllerLagDag(logg, dato) {
  let o = logg.find((x) => x.dato === dato);
  if (!o) { o = { id: `mat-${dato}`, dato, vaner: {}, notat: '', xp: 0, oppdatert: '' }; logg.push(o); }
  return o;
}

/**
 * Slår en vane av/på for en dag. Gir/trekker XP (globalt nivå), oppdaterer
 * streaken og returnerer et resultat feiringen kan bruke:
 *   { aktiv, xp, globalOpp, streakØkte, streak }
 */
export function veksleVane(vaneId, dato = isoDag()) {
  const vane = VANE[vaneId];
  if (!vane) return null;
  const logg = les();
  const streakFør = beregnStreak(aktiveDager(logg), Date.now());
  const dag = hentEllerLagDag(logg, dato);
  const aktiv = !dag.vaner[vaneId];
  dag.vaner[vaneId] = aktiv;
  const dxp = aktiv ? vane.xp : -vane.xp;
  dag.xp = Math.max(0, (dag.xp || 0) + dxp);
  dag.oppdatert = new Date().toISOString();
  skriv(logg);

  // Global XP (samme nivåkurve som bevegelse) — via profilen som synkes.
  const profil = hentProfil();
  let globalOpp = 0;
  if (profil) {
    const før = globaltNiva(profil.globalXp || 0);
    profil.globalXp = Math.max(0, (profil.globalXp || 0) + dxp);
    lagreProfil(profil);
    const etter = globaltNiva(profil.globalXp || 0);
    if (etter > før) globalOpp = etter;
  }

  const streakEtterVerdi = beregnStreak(aktiveDager(logg), Date.now());
  const streakØkte = streakEtterVerdi > streakFør ? streakEtterVerdi : 0;
  return { aktiv, xp: dxp, globalOpp, streakØkte, streak: streakEtterVerdi };
}

/** Lagrer et kort måltidsnotat på en dag (valgfritt, ingen makroer). */
export function settNotat(tekst, dato = isoDag()) {
  const logg = les();
  const dag = hentEllerLagDag(logg, dato);
  dag.notat = String(tekst || '').slice(0, 280);
  dag.oppdatert = new Date().toISOString();
  skriv(logg);
}
