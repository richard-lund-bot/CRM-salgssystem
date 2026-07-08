// Supabase-klient: auth (e-post magic link) + sync av brukertilstand.
// Offline-first: alt skrives lokalt først (store.js); denne modulen synker
// mot Supabase når nett + innlogging finnes. Sync = last-write-wins per rad
// via kolonnen `oppdatert`.
//
// supabase-js lastes via CDN som ES-modul. Ved manglende nett/CDN faller appen
// tilbake til ren localStorage-drift — ingen funksjon blokkerer på skyen.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let _klient = null;
let _lasteFeil = null;

/** Laster supabase-js (CDN) og oppretter klienten. Returnerer null offline. */
export async function hentKlient() {
  if (_klient) return _klient;
  if (_lasteFeil) return null;
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    _klient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return _klient;
  } catch (e) {
    _lasteFeil = e;
    console.warn('Supabase-klient utilgjengelig (offline?) — kjører lokalt.', e);
    return null;
  }
}

/** Nåværende innlogget bruker, eller null. */
export async function hentBruker() {
  const k = await hentKlient();
  if (!k) return null;
  const { data } = await k.auth.getUser();
  return data?.user ?? null;
}

/** Sender magic link til e-post. */
export async function sendMagicLink(epost) {
  const k = await hentKlient();
  if (!k) throw new Error('Ingen nettforbindelse til innlogging.');
  const { error } = await k.auth.signInWithOtp({
    email: epost,
    options: { emailRedirectTo: location.href.split('#')[0] },
  });
  if (error) throw error;
}

export async function loggUt() {
  const k = await hentKlient();
  if (k) await k.auth.signOut();
}

/** Abonnerer på auth-endringer (innlogget/utlogget). */
export async function paaAuthEndring(cb) {
  const k = await hentKlient();
  if (!k) return () => {};
  const { data } = k.auth.onAuthStateChange((_e, sesjon) => cb(sesjon?.user ?? null));
  return () => data.subscription.unsubscribe();
}

// --- Sync-primitiver (last-write-wins per rad via `oppdatert`) ---

/** Henter alle rader brukeren eier i en tabell. */
export async function hentRader(tabell) {
  const k = await hentKlient();
  if (!k) return null;
  const { data, error } = await k.from(tabell).select('*');
  if (error) { console.warn(`hentRader(${tabell}) feilet`, error); return null; }
  return data;
}

/** Upsert av rader (nyeste `oppdatert` vinner ved sync-fletting i klienten). */
export async function upsertRader(tabell, rader) {
  const k = await hentKlient();
  if (!k || !rader?.length) return false;
  const { error } = await k.from(tabell).upsert(rader);
  if (error) { console.warn(`upsertRader(${tabell}) feilet`, error); return false; }
  return true;
}

/** Sanntidsstatus for om vi har en klient og en innlogget bruker. */
export async function skyStatus() {
  const bruker = await hentBruker();
  return { klient: !!_klient, innlogget: !!bruker, bruker };
}
