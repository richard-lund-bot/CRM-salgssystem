// Brukertilstand — offline-first (samme mønster som Spor).
// localStorage er primærkilden; Supabase-sync legges på i M2/M5.
// All tilstand er lokal og overlever uten nett.
import { LS } from './config.js';

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

// --- Genererte økter ---
export function hentGenererte() {
  return les(LS.genererte, []);
}

export function lagreGenerert(okt) {
  const alle = hentGenererte();
  alle.unshift({ ...okt, oppdatert: okt.oppdatert || nåISO() });
  skriv(LS.genererte, alle.slice(0, 50));
  varsle('generert');
}

export function settGenererteRå(alle) { skriv(LS.genererte, alle); }

// --- Planlagte økter (Plan-modulen) ---
// Rene datoer «YYYY-MM-DD» (lokal kalenderdag, ingen klokkeslett) holder
// planlegging enkel — én eller flere planer kan ligge på samme dag.
function nyPlanId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function hentPlan() {
  return les(LS.plan, []);
}

export function settPlanRå(liste) { skriv(LS.plan, liste); }

/** Legger til en planlagt økt og returnerer den nye oppføringen.
 *  Nye planer peker på en bibliotekøkt (oktId); eldre bærer modalitet. */
export function leggTilPlan({ dato, oktId, modalitet, varighetsklasse, lokasjon }) {
  const liste = hentPlan();
  const ny = {
    id: nyPlanId(), dato, oktId: oktId || null, modalitet: modalitet || null,
    varighetsklasse: varighetsklasse || null,
    lokasjon: lokasjon || null, status: 'planlagt', opprettet: nåISO(),
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

/** Kommende planer fra og med `fraDato`, sortert kronologisk. */
export function planKommende(fraDato) {
  return hentPlan()
    .filter((p) => p.status === 'planlagt' && p.dato >= fraDato)
    .sort((a, b) => a.dato.localeCompare(b.dato));
}

// --- Aktiv lokasjon ---
export function hentSistLokasjon() {
  return les(LS.sistLokasjon, null);
}

export function lagreSistLokasjon(navn) {
  skriv(LS.sistLokasjon, navn);
  const profil = hentProfil();
  if (profil && profil.aktivLokasjon !== navn && (profil.lokasjoner || []).some((l) => l.navn === navn)) {
    lagreProfil({ ...profil, aktivLokasjon: navn });
  }
}

// --- Profiloppslag (brukes av generatoren) ---
/** Basenivå for en modalitet (1-4 fra onboarding). Default 2 = «grunnleggende». */
export function nivaFor(profil, modalitet) {
  const n = profil?.nivaer?.[modalitet]?.base;
  return Number.isFinite(n) ? n : 2;
}

/** IDene til øvelser i de N siste kjørte øktene — generatoren unngår gjentak. */
export function nyligeOvelseIder(antallOkter = 3) {
  const logg = hentLogg().slice(-antallOkter);
  const ider = new Set();
  for (const o of logg) for (const id of o.ovelseIder || []) ider.add(id);
  return ider;
}

/** Full nullstilling (innstillinger → full reset). */
export function nullstillAlt() {
  for (const n of Object.values(LS)) localStorage.removeItem(n);
}
