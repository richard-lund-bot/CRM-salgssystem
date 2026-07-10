// Strava-broen (M14) — Supabase Edge Function. Deployes med verify_jwt: false
// (Strava kaller webhook/callback uten Supabase-JWT); brukeridentitet
// verifiseres selv mot GoTrue der det trengs. Ruter:
//   GET  /koble     (Bearer)  → { url } til Stravas OAuth-side
//   GET  /callback            → veksler kode, lagrer kobling, backfill, 302 til appen
//   GET  /webhook             → Stravas abonnements-handshake (hub.challenge)
//   POST /webhook             → aktivitets-/deauth-hendelser (200 straks, jobb i waitUntil)
//   POST /frakoble  (Bearer)  → deautoriser hos Strava + slett koblingen
//
// Prinsipp: serveren rører ALDRI profiles (XP krediteres på enheten).
// Aktiviteter skrives som session_logs-rader med data.xp = null.
import { tilLoggRad } from './mapping.js';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200, ekstra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...CORS, ...ekstra },
  });
}

// --- PostgREST med service role --------------------------------------------
async function sb(path: string, init: RequestInit & { prefer?: string } = {}) {
  const headers: Record<string, string> = {
    apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json',
  };
  if (init.prefer) headers.Prefer = init.prefer;
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`postgrest ${path} → ${res.status} ${await res.text()}`);
  const tekst = await res.text();
  return tekst ? JSON.parse(tekst) : null;
}

// --- Konfig: env-secrets først, strava_config-tabellen som fallback --------
let _cfg: Record<string, string> | null = null;
async function cfg(nokkel: string): Promise<string | null> {
  const env = Deno.env.get(nokkel);
  if (env) return env;
  if (!_cfg) {
    try {
      const rader = await sb('strava_config?select=nokkel,verdi');
      _cfg = Object.fromEntries((rader || []).map((r: { nokkel: string; verdi: string }) => [r.nokkel, r.verdi]));
    } catch { _cfg = {}; }
  }
  return _cfg![nokkel] || null;
}

// --- Stateless OAuth-state: "uid.exp.HMAC(uid.exp)" ------------------------
function base64url(b: Uint8Array) {
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function hmac(tekst: string): Promise<string> {
  const hemmelighet = (await cfg('STATE_SECRET')) || '';
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(hemmelighet), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(tekst));
  return base64url(new Uint8Array(sig));
}
async function lagState(uid: string) {
  const grunn = `${uid}.${Date.now() + 10 * 60000}`;
  return `${grunn}.${await hmac(grunn)}`;
}
async function lesState(state: string): Promise<string | null> {
  const [uid, exp, sig] = (state || '').split('.');
  if (!uid || !exp || !sig || Number(exp) < Date.now()) return null;
  return (await hmac(`${uid}.${exp}`)) === sig ? uid : null;
}

// --- Bruker-verifisering (GoTrue) ------------------------------------------
async function verifiserBruker(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const res = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: auth } });
  if (!res.ok) return null;
  const u = await res.json();
  return u?.id || null;
}

// --- Strava-tokens ----------------------------------------------------------
type Kobling = {
  user_id: string; athlete_id: number; access_token: string;
  refresh_token: string; expires_at: string;
};

async function friskToken(k: Kobling): Promise<string | null> {
  if (Date.parse(k.expires_at) > Date.now() + 5 * 60000) return k.access_token;
  const body = new URLSearchParams({
    client_id: (await cfg('STRAVA_CLIENT_ID')) || '',
    client_secret: (await cfg('STRAVA_CLIENT_SECRET')) || '',
    grant_type: 'refresh_token', refresh_token: k.refresh_token,
  });
  const res = await fetch('https://www.strava.com/oauth/token', { method: 'POST', body });
  if (!res.ok) { console.error('token-refresh feilet', res.status); return null; }
  const d = await res.json();
  // Persister det roterte refresh-tokenet FØR vi bruker access-tokenet —
  // ellers kan et krasj etterlate oss med et ubrukelig gammelt token.
  await sb(`strava_koblinger?user_id=eq.${k.user_id}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: JSON.stringify({
      access_token: d.access_token, refresh_token: d.refresh_token,
      expires_at: new Date(d.expires_at * 1000).toISOString(),
      oppdatert: new Date().toISOString(),
    }),
  });
  return d.access_token;
}

// --- Webhook-jobb -----------------------------------------------------------
async function behandle(ev: {
  object_type?: string; aspect_type?: string; object_id?: number;
  owner_id?: number; updates?: Record<string, unknown>;
}) {
  try {
    if (ev.object_type === 'athlete') {
      if (String(ev.updates?.authorized) === 'false') {
        await sb(`strava_koblinger?athlete_id=eq.${ev.owner_id}`, { method: 'DELETE', prefer: 'return=minimal' });
      }
      return;
    }
    if (ev.object_type !== 'activity' || !ev.object_id) return;
    const kob: Kobling | undefined = (await sb(`strava_koblinger?athlete_id=eq.${ev.owner_id}&limit=1`))?.[0];
    if (!kob) return;
    const radId = `strava-${ev.object_id}`;

    if (ev.aspect_type === 'delete') {
      // Soft delete: flettingen i appen er union-only, så en hard DELETE
      // ville gjenoppstått fra en enhets neste push. data.slettet vinner LWW.
      const rad = (await sb(`session_logs?id=eq.${radId}&select=data`))?.[0];
      if (!rad) return;
      const oppdatert = new Date().toISOString();
      await sb(`session_logs?id=eq.${radId}`, {
        method: 'PATCH', prefer: 'return=minimal',
        body: JSON.stringify({ data: { ...rad.data, slettet: true, oppdatert }, oppdatert }),
      });
      return;
    }

    // create / update
    const token = await friskToken(kob);
    if (!token) return;
    const res = await fetch(`https://www.strava.com/api/v3/activities/${ev.object_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { console.error('aktivitet-henting feilet', res.status); return; }
    const rad = tilLoggRad(await res.json(), kob.user_id);

    const fins = (await sb(`session_logs?id=eq.${radId}&select=data`))?.[0];
    if (fins?.data?.xp != null) {
      // Allerede kreditert på enheten — behold XP m.m., oppdater bare tittelen.
      const oppdatert = new Date().toISOString();
      await sb(`session_logs?id=eq.${radId}`, {
        method: 'PATCH', prefer: 'return=minimal',
        body: JSON.stringify({ data: { ...fins.data, tittel: rad.data.tittel, oppdatert }, oppdatert }),
      });
      return;
    }
    await sb('session_logs?on_conflict=id', {
      method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify([rad]),
    });
  } catch (e) {
    console.error('webhook-behandling feilet', e);
  }
}

// Backfill siste 30 dager ved tilkobling (én side à 50 — bevisst avgrenset).
async function backfill(kob: Kobling) {
  try {
    const token = await friskToken(kob);
    if (!token) return;
    const etter = Math.floor(Date.now() / 1000) - 30 * 86400;
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${etter}&per_page=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const alle = await res.json();
    if (!Array.isArray(alle) || !alle.length) return;
    const rader = alle.map((a) => tilLoggRad(a, kob.user_id));
    const fins = await sb(`session_logs?id=in.(${rader.map((r) => `"${r.id}"`).join(',')})&select=id`);
    const finsIder = new Set((fins || []).map((r: { id: string }) => r.id));
    const nye = rader.filter((r) => !finsIder.has(r.id));
    if (nye.length) {
      await sb('session_logs?on_conflict=id', {
        method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
        body: JSON.stringify(nye),
      });
    }
  } catch (e) {
    console.error('backfill feilet', e);
  }
}

function iBakgrunnen(p: Promise<unknown>) {
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime) EdgeRuntime.waitUntil(p);
  // Uten EdgeRuntime (lokal kjøring) lar vi promiset løpe — svaret venter ikke.
}

// --- Router ------------------------------------------------------------------
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const sti = url.pathname.replace(/^.*\/strava/, '') || '/';

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  // Stravas abonnements-handshake + hendelser
  if (sti === '/webhook') {
    if (req.method === 'GET') {
      const token = url.searchParams.get('hub.verify_token');
      if (token && token === (await cfg('STRAVA_VERIFY_TOKEN'))) {
        return json({ 'hub.challenge': url.searchParams.get('hub.challenge') });
      }
      return json({ feil: 'ugyldig verify_token' }, 403);
    }
    if (req.method === 'POST') {
      let ev = null;
      try { ev = await req.json(); } catch { /* tomt/ugyldig — ack uansett */ }
      if (ev) iBakgrunnen(behandle(ev));
      return new Response('EVENT_RECEIVED', { status: 200, headers: CORS });
    }
  }

  if (req.method === 'GET' && sti === '/koble') {
    const uid = await verifiserBruker(req);
    if (!uid) return json({ feil: 'ikke innlogget' }, 401);
    const clientId = await cfg('STRAVA_CLIENT_ID');
    if (!clientId) return json({ feil: 'STRAVA_CLIENT_ID mangler — se docs/strava-integrasjon.md' }, 503);
    const redirect = `${SB_URL}/functions/v1/strava/callback`;
    const authorize = 'https://www.strava.com/oauth/authorize'
      + `?client_id=${encodeURIComponent(clientId)}`
      + `&redirect_uri=${encodeURIComponent(redirect)}`
      + '&response_type=code&approval_prompt=auto&scope=activity:read_all'
      + `&state=${encodeURIComponent(await lagState(uid))}`;
    return json({ url: authorize });
  }

  if (req.method === 'GET' && sti === '/callback') {
    const appUrl = (await cfg('APP_URL')) || 'https://richard-lund-bot.github.io/CRM-salgssystem/';
    const feil = () => new Response(null, { status: 302, headers: { Location: `${appUrl}#/innstillinger?strava=feil` } });
    try {
      const uid = await lesState(url.searchParams.get('state') || '');
      const code = url.searchParams.get('code');
      if (!uid || !code || url.searchParams.get('error')) return feil();
      const body = new URLSearchParams({
        client_id: (await cfg('STRAVA_CLIENT_ID')) || '',
        client_secret: (await cfg('STRAVA_CLIENT_SECRET')) || '',
        code, grant_type: 'authorization_code',
      });
      const res = await fetch('https://www.strava.com/oauth/token', { method: 'POST', body });
      if (!res.ok) return feil();
      const d = await res.json();
      const kobling = {
        user_id: uid,
        athlete_id: d.athlete?.id,
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: new Date(d.expires_at * 1000).toISOString(),
        athlete_navn: [d.athlete?.firstname, d.athlete?.lastname].filter(Boolean).join(' ') || null,
        oppdatert: new Date().toISOString(),
      };
      await sb('strava_koblinger?on_conflict=user_id', {
        method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
        body: JSON.stringify([kobling]),
      });
      iBakgrunnen(backfill(kobling as Kobling));
      return new Response(null, { status: 302, headers: { Location: `${appUrl}#/innstillinger?strava=ok` } });
    } catch (e) {
      console.error('callback feilet', e);
      return feil();
    }
  }

  if (req.method === 'POST' && sti === '/frakoble') {
    const uid = await verifiserBruker(req);
    if (!uid) return json({ feil: 'ikke innlogget' }, 401);
    const kob: Kobling | undefined = (await sb(`strava_koblinger?user_id=eq.${uid}&limit=1`))?.[0];
    if (kob) {
      try {
        const token = await friskToken(kob);
        if (token) await fetch(`https://www.strava.com/oauth/deauthorize?access_token=${encodeURIComponent(token)}`, { method: 'POST' });
      } catch { /* deauth er best effort — slett koblingen uansett */ }
      await sb(`strava_koblinger?user_id=eq.${uid}`, { method: 'DELETE', prefer: 'return=minimal' });
    }
    return json({ ok: true });
  }

  return json({ feil: 'ukjent rute' }, 404);
});
