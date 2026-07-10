// Strava-broen (M14): økter fra Garmin-klokka går Garmin → Strava →
// webhook (Supabase Edge Function) → rad i session_logs med data.xp = null.
// Denne modulen gjør resten på enheten: etter hver pull krediteres nye
// rader med XP via registrerBevegelse (profilen synkes som hel blob og må
// aldri røres av serveren), soft-slettede rader fjernes, og planlagte økter
// samme dag hukes av. I tillegg eier den Strava-kortet i innstillingene.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { el } from './ui.js';
import {
  hentProfil, lagreProfil, hentLogg, settLoggRå, planForDato, settPlanStatus,
} from './store.js';
import { registrerBevegelse } from './niva.js';
import { erComeback, MODALITET_TIL_BEVEGELSE, KATEGORI_TIL_BEVEGELSE } from './bevegelse.js';
import { oktMedId } from './bibliotek-okter.js';
import { erInnlogget, gyldigToken } from './sync.js';

let _bib = null;
export function settBib(bib) { _bib = bib; }

const FUNKSJON = `${SUPABASE_URL}/functions/v1/strava`;

// Lokal kalenderdag for et ISO-tidspunkt (radens dato er ekte UTC).
function lokalDag(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || '').slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// En importert økt huker av en planlagt økt samme dag med samme bevegelse.
function hukAvPlan(o) {
  for (const p of planForDato(lokalDag(o.dato))) {
    const bev = p.oktId
      ? KATEGORI_TIL_BEVEGELSE[oktMedId(p.oktId)?.kategori]
      : MODALITET_TIL_BEVEGELSE[p.modalitet];
    if (bev && bev === o.bevegelse) { settPlanStatus(p.id, 'gjort'); return; }
  }
}

/**
 * Post-pull-krok (kobles via sync.settEtterPull): rydder soft-slettede
 * Strava-rader og krediterer XP for nye. Hovedboka profil.stravaKreditert
 * bor i samme last-write-wins-objekt som XP-en — de kan aldri sprike, så
 * to enheter kan ikke dobbelkreditere samme aktivitet.
 */
export function krediterNye() {
  const logg = hentLogg();
  const uslettet = logg.filter((o) => !(o.kilde === 'strava' && o.slettet));
  let endret = uslettet.length !== logg.length;

  let profil = hentProfil();
  if (!profil) { if (endret) settLoggRå(uslettet); return; }

  const bok = new Set(profil.stravaKreditert || []);
  const nye = uslettet
    .filter((o) => o.kilde === 'strava' && o.xp == null && !bok.has(o.id))
    .sort((a, b) => (Date.parse(a.dato) || 0) - (Date.parse(b.dato) || 0));

  if (nye.length) {
    // Comeback vurderes mot loggen slik den så ut FØR de nye radene.
    const grunnlag = uslettet.filter((x) => !(x.kilde === 'strava' && x.xp == null));
    for (const o of nye) {
      const tid = Date.parse(o.dato) || Date.now();
      const comeback = erComeback(grunnlag, tid);
      const { profil: ny, resultat } = registrerBevegelse(profil, {
        bevegelse: o.bevegelse || 'custom',
        varighetMin: o.varighetMin || 1,
        intensitet: o.intensitet || 3,
        comeback,
      }, _bib, tid);
      profil = ny;
      o.xp = resultat.xp;
      o.oppdatert = new Date().toISOString();
      bok.add(o.id);
      grunnlag.push(o);
      hukAvPlan(o);
    }
    profil.stravaKreditert = [...bok].slice(-200);
    lagreProfil(profil);
    endret = true;
  }

  if (endret) settLoggRå(uslettet);
  return nye.length;
}

// --- Kobling (REST + Edge Function) ----------------------------------------
async function hentKobling() {
  const token = await gyldigToken();
  if (!token) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/strava_koblinger?select=athlete_id,athlete_navn,opprettet`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  return (await res.json())?.[0] || null;
}

async function kobleTil() {
  const token = await gyldigToken();
  if (!token) throw new Error('ikke innlogget');
  const res = await fetch(`${FUNKSJON}/koble`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`koble → ${res.status}`);
  const { url } = await res.json();
  location.href = url; // Stravas godkjenningsside → tilbake via /callback
}

async function kobleFra() {
  const token = await gyldigToken();
  if (!token) return;
  await fetch(`${FUNKSJON}/frakoble`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  }).catch(() => { /* best effort */ });
}

// --- Innstillinger-kortet ---------------------------------------------------
export function stravaKort(tegnPåNytt) {
  const kort = el('div', { class: 'kort' }, el('h2', {}, 'Strava'));

  if (!erInnlogget()) {
    kort.append(el('p', { class: 'dempet' },
      'Logg inn med skysync over, så kan økter fra Garmin-klokka (via Strava) lande automatisk i loggen.'));
    return kort;
  }

  const retur = new URLSearchParams(location.hash.split('?')[1] || '').get('strava');
  const status = el('p', { class: 'dempet' },
    retur === 'ok' ? 'Tilkoblet! Aktiviteter fra klokka dukker opp ved neste synk.'
      : retur === 'feil' ? 'Tilkoblingen feilet — prøv igjen.'
        : 'Henter status …');
  kort.append(status);

  hentKobling().then((k) => {
    if (k) {
      status.textContent = `Tilkoblet som ${k.athlete_navn || 'Strava-bruker'} — økter fra Garmin-klokka logges automatisk.`;
      kort.append(el('div', { class: 'knapprad' },
        el('button', {
          class: 'knapp knapp--sekundaer', type: 'button',
          onclick: async (ev) => { ev.target.disabled = true; await kobleFra(); tegnPåNytt(); },
        }, 'Koble fra'),
      ));
    } else {
      if (retur !== 'feil') {
        status.textContent = 'Koble til Strava, så havner økter fra Garmin-klokka automatisk i loggen — med XP.';
      }
      kort.append(el('div', { class: 'knapprad' },
        el('button', {
          class: 'knapp', type: 'button',
          onclick: async (ev) => {
            ev.target.disabled = true;
            try { await kobleTil(); } catch { status.textContent = 'Kunne ikke starte tilkoblingen — er Strava-oppsettet på plass? Se docs/strava-integrasjon.md.'; ev.target.disabled = false; }
          },
        }, 'Koble til Strava'),
      ));
    }
  }).catch(() => { status.textContent = 'Fikk ikke hentet Strava-status.'; });

  return kort;
}
