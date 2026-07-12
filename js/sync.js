// Skysync (M2/M5) — Spor-mønsteret. Brukertilstand (profil + logg) synkes til
// Supabase når du er innlogget og på nett. localStorage er alltid
// primærkilden — appen blokkerer aldri på nett. Konfliktløsing er
// last-write-wins per rad via `oppdatert`-stempelet: vi henter fjernrader,
// fletter (nyeste vinner) inn i localStorage, og skyver den flettede tilstanden
// opp igjen. Ingen SDK — direkte REST mot GoTrue + PostgREST holder appen
// avhengighetsfri og offline-first.
import { SUPABASE_URL, SUPABASE_ANON_KEY, LS } from './config.js';
import {
  hentProfil, settProfilRå, hentLogg, settLoggRå,
  settEndringslytter,
} from './store.js';
import { lesStyrkelogg, settStyrkeloggRå, oktVolum } from './styrke.js';

const AUTH = `${SUPABASE_URL}/auth/v1`;
const REST = `${SUPABASE_URL}/rest/v1`;
const felles = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };

// --- Sesjonslagring -------------------------------------------------------
function hentSesjon() {
  try { return JSON.parse(localStorage.getItem(LS.sesjon) || 'null'); } catch { return null; }
}
function lagreSesjon(s) { localStorage.setItem(LS.sesjon, JSON.stringify(s)); }
function slettSesjon() { localStorage.removeItem(LS.sesjon); }

export function erInnlogget() { return !!hentSesjon()?.refresh_token; }
export function brukerEpost() { return hentSesjon()?.epost || null; }
export function sistSynk() { return localStorage.getItem(LS.sistSynk); }

// --- Lyttere (UI kan abonnere på statusendringer) -------------------------
const lyttere = new Set();
export function påStatus(fn) { lyttere.add(fn); return () => lyttere.delete(fn); }
function meldStatus(status) { for (const fn of lyttere) { try { fn(status); } catch { /* */ } } }

// --- Auth: magic link -----------------------------------------------------
/** Sender en engangs-innloggingslenke til e-posten. */
export async function sendMagicLink(epost) {
  const redirectTo = location.origin + location.pathname;
  const res = await fetch(`${AUTH}/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    headers: felles,
    body: JSON.stringify({ email: epost, create_user: true, gotrue_meta_security: {} }),
  });
  if (!res.ok) throw new Error(`Kunne ikke sende lenke (${res.status})`);
  return true;
}

/** Fanger tokens fra magic-link-retur (#access_token=…) ved oppstart. */
async function fangRetur() {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : '';
  if (!hash.includes('access_token=')) return false;
  const p = new URLSearchParams(hash);
  const access = p.get('access_token');
  const refresh = p.get('refresh_token');
  if (!access || !refresh) return false;
  const utløp = Date.now() + (Number(p.get('expires_in')) || 3600) * 1000;
  const bruker = await hentBruker(access);
  lagreSesjon({ access_token: access, refresh_token: refresh, utløp, epost: bruker?.email, uid: bruker?.id });
  // Fjern tokens fra URL-en (behold ev. app-rute).
  history.replaceState(null, '', location.pathname + location.search);
  return true;
}

async function hentBruker(token) {
  const res = await fetch(`${AUTH}/user`, { headers: { ...felles, Authorization: `Bearer ${token}` } });
  return res.ok ? res.json() : null;
}

/** Gyldig access-token, med automatisk refresh når det nærmer seg utløp.
 *  Eksportert for moduler som kaller egne endepunkter (Strava-broen). */
export async function gyldigToken() {
  const s = hentSesjon();
  if (!s) return null;
  if (s.utløp && s.utløp > Date.now() + 60000) return s.access_token;
  const res = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
    method: 'POST', headers: felles, body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (!res.ok) { slettSesjon(); meldStatus('utlogget'); return null; }
  const d = await res.json();
  lagreSesjon({
    access_token: d.access_token, refresh_token: d.refresh_token,
    utløp: Date.now() + (d.expires_in || 3600) * 1000, epost: d.user?.email || s.epost, uid: d.user?.id || s.uid,
  });
  return d.access_token;
}

export function loggUt() { slettSesjon(); meldStatus('utlogget'); }

// --- Auth: e-post + passord og OAuth --------------------------------------
// Direkte mot GoTrue (samme avhengighetsfrie mønster som magic link over).
// signup → /signup, innlogging → /token?grant_type=password,
// Apple/Facebook → /authorize (redirect, fanges av fangRetur ved retur).

/** Oversetter GoTrue-feil til vennlig norsk. */
function authFeil(d, status) {
  const m = String(d?.msg || d?.error_description || d?.error || d?.message || '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Feil e-post eller passord.';
  if (m.includes('already') && (m.includes('registered') || m.includes('exists'))) return 'Denne e-posten er allerede registrert. Prøv å logge inn.';
  if (m.includes('password') && m.includes('least')) return 'Passordet må ha minst 6 tegn.';
  if (m.includes('weak password') || (m.includes('password') && m.includes('short'))) return 'Velg et lengre passord (minst 6 tegn).';
  if (m.includes('email') && (m.includes('invalid') || m.includes('validate'))) return 'Sjekk at e-postadressen er gyldig.';
  if (m.includes('not confirmed') || m.includes('email not')) return 'Bekreft e-posten din først — se innboksen.';
  if (status === 429 || m.includes('rate limit')) return 'For mange forsøk. Vent litt og prøv igjen.';
  return d?.msg || d?.error_description || 'Noe gikk galt. Prøv igjen.';
}

/** Lagrer en token-respons fra GoTrue som aktiv sesjon. */
async function lagreFraToken(d) {
  const utløp = Date.now() + (Number(d.expires_in) || 3600) * 1000;
  const bruker = d.user || await hentBruker(d.access_token);
  lagreSesjon({
    access_token: d.access_token, refresh_token: d.refresh_token,
    utløp, epost: bruker?.email, uid: bruker?.id,
  });
  meldStatus('innlogget');
  return bruker;
}

/** Registrer ny bruker med e-post + passord. Navn lagres som user-metadata.
 *  Returnerer { innlogget } — false betyr at e-post må bekreftes først. */
export async function registrerMedEpost({ navn, epost, passord }) {
  const redirectTo = location.origin + location.pathname;
  const res = await fetch(`${AUTH}/signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST', headers: felles,
    body: JSON.stringify({ email: epost, password: passord, data: navn ? { navn, full_name: navn } : {} }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(authFeil(d, res.status));
  if (d.access_token) { await lagreFraToken(d); return { innlogget: true }; }
  return { innlogget: false, måBekrefte: true }; // e-postbekreftelse er slått på
}

/** Logg inn med e-post + passord. */
export async function loggInnMedEpost({ epost, passord }) {
  const res = await fetch(`${AUTH}/token?grant_type=password`, {
    method: 'POST', headers: felles,
    body: JSON.stringify({ email: epost, password: passord }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(authFeil(d, res.status));
  await lagreFraToken(d);
  return { innlogget: true };
}

/** OAuth med Apple/Facebook — navigerer bort; retur fanges av fangRetur().
 *  Krever at leverandøren er aktivert i Supabase (Auth → Providers). */
export function startOAuth(provider) {
  const redirectTo = location.origin + location.pathname;
  location.href = `${AUTH}/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectTo)}`;
}

/** Send lenke for å tilbakestille glemt passord. */
export async function sendPassordTilbakestilling(epost) {
  const redirectTo = location.origin + location.pathname;
  const res = await fetch(`${AUTH}/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST', headers: felles, body: JSON.stringify({ email: epost }),
  });
  if (!res.ok) throw new Error(`Kunne ikke sende lenke (${res.status})`);
  return true;
}

// --- REST-hjelper ---------------------------------------------------------
async function rest(path, { method = 'GET', body, prefer } = {}) {
  const token = await gyldigToken();
  if (!token) throw new Error('Ikke innlogget');
  const headers = { ...felles, Authorization: `Bearer ${token}` };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${REST}/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`REST ${path} → ${res.status}`);
  const tekst = await res.text();
  return tekst ? JSON.parse(tekst) : null;
}

// --- Fletting (rene funksjoner, last-write-wins per rad) -------------------
const nyere = (a, b) => (Date.parse(a || 0) || 0) >= (Date.parse(b || 0) || 0);

/** Profil er én rad: nyeste `oppdatert` vinner helt. */
export function flettProfil(lokal, fjernRad) {
  if (!fjernRad?.data || !Object.keys(fjernRad.data).length) return lokal;
  if (!lokal) return { ...fjernRad.data, oppdatert: fjernRad.oppdatert };
  return nyere(lokal.oppdatert, fjernRad.oppdatert)
    ? lokal
    : { ...fjernRad.data, oppdatert: fjernRad.oppdatert };
}

/** Loggen flettes per id: union, nyeste `oppdatert` ved konflikt. */
export function flettPerId(lokalArr, fjernRader, sorterEtter = 'dato') {
  const kart = new Map();
  for (const o of lokalArr || []) if (o?.id) kart.set(o.id, o);
  for (const rad of fjernRader || []) {
    const inn = { ...(rad.data || {}), oppdatert: rad.oppdatert };
    if (!inn.id) continue;
    const fins = kart.get(inn.id);
    if (!fins || !nyere(fins.oppdatert, inn.oppdatert)) kart.set(inn.id, inn);
  }
  return [...kart.values()].sort((a, b) => Date.parse(b[sorterEtter] || 0) - Date.parse(a[sorterEtter] || 0));
}

// --- Pull + push ----------------------------------------------------------
async function pull() {
  const [profilRader, loggRader] = await Promise.all([
    rest('profiles?select=data,oppdatert&limit=1'),
    rest('session_logs?select=data,oppdatert&order=oppdatert.desc'),
  ]);
  const flettetProfil = flettProfil(hentProfil(), profilRader?.[0]);
  if (flettetProfil) settProfilRå(flettetProfil);
  settLoggRå(flettPerId(hentLogg(), loggRader, 'dato'));
  // Styrkelogg synkes isolert — en manglende tabell/feil skal aldri stoppe
  // resten av synken.
  try {
    const rader = await rest('styrke_logs?select=data,oppdatert&order=oppdatert.desc');
    settStyrkeloggRå(flettPerId(lesStyrkelogg(), rader, 'dato'));
  } catch (e) { console.warn('Styrkelogg-pull hoppet over', e.message); }
}

async function push() {
  const uid = hentSesjon()?.uid;
  if (!uid) return;
  const profil = hentProfil();
  if (profil) {
    await rest('profiles?on_conflict=user_id', {
      method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      body: [{ user_id: uid, data: profil, oppdatert: profil.oppdatert || new Date().toISOString() }],
    });
  }
  const logg = hentLogg();
  if (logg.length) {
    await rest('session_logs?on_conflict=id', {
      method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      body: logg.map((o) => ({
        id: o.id, user_id: uid, dato: (o.dato || '').slice(0, 10), modalitet: o.modalitet,
        data: o, oppdatert: o.oppdatert || o.dato || new Date().toISOString(),
      })),
    });
  }
  const styrke = lesStyrkelogg();
  if (styrke.length) {
    try {
      await rest('styrke_logs?on_conflict=id', {
        method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
        body: styrke.map((o) => ({
          id: o.id, user_id: uid, dato: (o.dato || '').slice(0, 10), okt_navn: o.oktNavn,
          volum: oktVolum(o.ovelser), data: o, oppdatert: o.oppdatert || o.dato || new Date().toISOString(),
        })),
      });
    } catch (e) { console.warn('Styrkelogg-push hoppet over', e.message); }
  }
}

// --- Orkestrering ---------------------------------------------------------
// Krok som kjøres mellom pull og push: Strava-broen krediterer XP for
// ferske fjernrader her, så oppdatert profil og rader pushes i samme runde.
let etterPull = null;
export function settEtterPull(fn) { etterPull = fn; }

let synkerNå = false;
/** Full synk: hent fjern → flett inn → skyv opp. Trygg å kalle ofte. */
export async function synk() {
  if (!erInnlogget() || !navigator.onLine || synkerNå) return { ok: false };
  synkerNå = true;
  meldStatus('synker');
  try {
    await pull();
    if (etterPull) { try { etterPull(); } catch (e) { console.warn('etterPull feilet', e); } }
    await push();
    localStorage.setItem(LS.sistSynk, new Date().toISOString());
    meldStatus('synket');
    return { ok: true };
  } catch (e) {
    console.warn('Synk feilet', e);
    meldStatus('feil');
    return { ok: false, feil: e.message };
  } finally {
    synkerNå = false;
  }
}

let debounce = null;
function planleggSynk() {
  if (!erInnlogget() || !navigator.onLine) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => synk(), 1500);
}

/** Kobles opp ved app-oppstart: fanger magic-link-retur og starter sync. */
export async function init() {
  let returFanget = false;
  try { returFanget = await fangRetur(); } catch (e) { console.warn('Auth-retur feilet', e); }
  // Lokale endringer planlegger en synk (debouncet).
  settEndringslytter(planleggSynk);
  window.addEventListener('online', () => synk());
  if (erInnlogget()) meldStatus('innlogget');
  // Selve første synken styres av appen (den vil vente på pull før
  // onboarding-gaten på en ny enhet som nettopp logget inn).
  return { returFanget, innlogget: erInnlogget() };
}
