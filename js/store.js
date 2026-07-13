// Brukertilstand — offline-first (samme mønster som Spor).
// localStorage er primærkilden; Supabase-sync legges på i M2/M5.
// All tilstand er lokal og overlever uten nett.
import { LS, LS_UTFASET } from './config.js';

function les(nokkel, fallback) {
  try {
    const raw = localStorage.getItem(nokkel);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function skriv(nokkel, verdi) {
  try {
    localStorage.setItem(nokkel, JSON.stringify(verdi));
  } catch (e) {
    console.warn('localStorage skriv feilet', e);
  }
}

// --- Endringsvarsling (M5-sync) ---
// Sync-modulen registrerer en lytter her; store importerer aldri sync (unngår
// syklisk avhengighet). Lokale skrivinger stemples med `oppdatert` for
// last-write-wins og varsler lytteren, som planlegger en debouncet synk.
let endringslytter = null;
export function settEndringslytter(fn) { endringslytter = fn; }
function varsle(type) { if (endringslytter) { try { endringslytter(type); } catch { /* ignorer */ } } }
const nåISO = () => new Date().toISOString();

// --- Profil ---
export function hentProfil() {
  return les(LS.profil, null);
}

export function lagreProfil(profil) {
  const stemplet = { ...profil, oppdatert: nåISO() };
  skriv(LS.profil, stemplet);
  varsle('profil');
  return stemplet;
}

/** Skriv profil uten å stemple/varsle — brukes når sync henter fjernrad. */
export function settProfilRå(profil) { skriv(LS.profil, profil); }

export function harProfil() {
  return hentProfil() != null;
}

// --- Logg ---
export function hentLogg() {
  return les(LS.logg, []);
}

export function leggTilLogg(oppforing) {
  const logg = hentLogg();
  logg.push({ ...oppforing, oppdatert: oppforing.oppdatert || nåISO() });
  skriv(LS.logg, logg);
  varsle('logg');
  return logg;
}

export function settLoggRå(logg) { skriv(LS.logg, logg); }

// --- Planlagte økter (Plan-modulen) ---
// Rene datoer «YYYY-MM-DD» (lokal kalenderdag, ingen klokkeslett) holder
// planlegging enkel — én eller flere planer kan ligge på samme dag.
function nyPlanId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function hentPlan() {
  return les(LS.plan, []);
}

/** Legger til en planlagt økt og returnerer den nye oppføringen.
 *  Nye planer peker på en bibliotekøkt (oktId) eller en Lær-modul (type/sti/enhet);
 *  eldre bærer modalitet. */
export function leggTilPlan({ dato, oktId, modalitet, varighetsklasse, lokasjon, type, sti, enhet, tittel }) {
  const liste = hentPlan();
  const ny = {
    id: nyPlanId(), dato, oktId: oktId || null, modalitet: modalitet || null,
    varighetsklasse: varighetsklasse || null,
    lokasjon: lokasjon || null, status: 'planlagt', opprettet: nåISO(),
    ...(type ? { type, sti: sti || null, enhet: enhet || null, tittel: tittel || null } : {}),
  };
  liste.push(ny);
  skriv(LS.plan, liste);
  varsle('plan');
  return ny;
}

export function fjernPlan(id) {
  const liste = hentPlan().filter((p) => p.id !== id);
  skriv(LS.plan, liste);
  varsle('plan');
  return liste;
}

export function settPlanStatus(id, status) {
  const liste = hentPlan().map((p) => (p.id === id ? { ...p, status } : p));
  skriv(LS.plan, liste);
  varsle('plan');
  return liste;
}

/** Planer for én kalenderdag «YYYY-MM-DD». */
export function planForDato(dato) {
  return hentPlan().filter((p) => p.dato === dato && p.status === 'planlagt');
}

/** Full nullstilling (innstillinger → full reset). */
export function nullstillAlt() {
  for (const n of [...Object.values(LS), ...LS_UTFASET]) localStorage.removeItem(n);
}
