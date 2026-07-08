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

// --- Profil ---
export function hentProfil() {
  return les(LS.profil, null);
}

export function lagreProfil(profil) {
  skriv(LS.profil, profil);
}

export function harProfil() {
  return hentProfil() != null;
}

// --- Logg ---
export function hentLogg() {
  return les(LS.logg, []);
}

export function leggTilLogg(oppforing) {
  const logg = hentLogg();
  logg.push(oppforing);
  skriv(LS.logg, logg);
  return logg;
}

// --- Genererte økter ---
export function hentGenererte() {
  return les(LS.genererte, []);
}

export function lagreGenerert(okt) {
  const alle = hentGenererte();
  alle.unshift(okt);
  skriv(LS.genererte, alle.slice(0, 50));
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
