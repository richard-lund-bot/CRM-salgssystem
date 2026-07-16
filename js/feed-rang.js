// Feed-rangering (M41) — bestemmer rekkefølgen på Hjem-feeden per bruker.
// Fire signaler, alt utledet lokalt (offline-first, ingen server):
//   1) Deklarerte interesser — kategorier brukeren velger (ved første besøk /
//      «Interesser»-arket). Sterkest løft. Bor i profilen (synkes).
//   2) Affinitet — implisitt engasjement per kategori: visningstid (dwell),
//      spill, likerklikk, lagringer, kommentarer, delinger, story-visninger.
//      Aggregeres per kategori, normaliseres til 0–1.
//   3) Sett/spilt — det man alt har sett synker, det man har spilt synker mest,
//      så feeden helst viser nytt.
//   4) Variasjon — en utforsknings-jitter + en diversitets-spredning så samme
//      kategori ikke klumper seg, og litt ukjent alltid slipper til.
// Tilstanden bor i localStorage (trening.feedRang): kort per-kategori-teller +
// sett-tidsstempler. Rangeringen regnes ÉN gang per feed-bygging (stabil mens
// man scroller); neste økt re-rangerer med oppdaterte signaler.
import { hentProfil, lagreProfil } from './store.js';

const LS_RANG = 'trening.feedRang';
const LS_FEED = 'trening.feed'; // spilt/likt/lagret (delt med feed.js)

// Vekter for engasjementssignaler → affinitetspoeng per kategori.
const VEKT = { dwellPerSek: 0.15, spilt: 3, likt: 2, lagret: 2.5, kommentar: 2.5, delt: 3, story: 1 };
const DWELL_TAK_SEK = 20; // maks dwell-bidrag per innlegg (unngå at ett kort dominerer)

// --- Tilstand ---------------------------------------------------------------
function les() {
  try {
    const t = JSON.parse(localStorage.getItem(LS_RANG) || '{}');
    return { kat: t.kat || {}, sett: t.sett || {}, dwellPost: t.dwellPost || {} };
  } catch {
    return { kat: {}, sett: {}, dwellPost: {} };
  }
}
function skriv(t) { try { localStorage.setItem(LS_RANG, JSON.stringify(t)); } catch { /* valgfri */ } }
function feedState() {
  try { return JSON.parse(localStorage.getItem(LS_FEED) || '{}'); } catch { return {}; }
}

// --- Deklarerte interesser (profil) -----------------------------------------
export function interesser() {
  const i = hentProfil()?.innstillinger?.feedInteresser;
  return Array.isArray(i) ? i : null; // null = ikke valgt ennå (vis interessekort)
}
export function harValgtInteresser() { return interesser() != null; }
export function settInteresser(katIder) {
  const profil = hentProfil();
  if (!profil) return;
  profil.innstillinger = profil.innstillinger || {};
  profil.innstillinger.feedInteresser = [...new Set(katIder)];
  lagreProfil(profil);
}

// --- Signal-registrering ----------------------------------------------------
/** Legg til visningstid (ms) for et innlegg og marker som sett når det er lest nok. */
export function registrerVisning(post, ms) {
  if (!post?.katId || !(ms > 0)) return;
  const t = les();
  const brukt = t.dwellPost[post.id] || 0;
  const nyTotal = Math.min(DWELL_TAK_SEK * 1000, brukt + ms);
  const tillegg = nyTotal - brukt;
  if (tillegg > 0) {
    t.dwellPost[post.id] = nyTotal;
    t.kat[post.katId] = (t.kat[post.katId] || 0) + (tillegg / 1000) * VEKT.dwellPerSek;
  }
  // Sett-terskel: ~2 sekunder synlig regnes som «sett».
  if (nyTotal >= 2000 && !t.sett[post.id]) t.sett[post.id] = Date.now();
  skriv(t);
}

/** Vektet affinitets-bump for en eksplisitt handling (spilt/likt/lagret/…). */
export function registrerInteraksjon(post, type) {
  if (!post?.katId || !VEKT[type]) return;
  const t = les();
  t.kat[post.katId] = (t.kat[post.katId] || 0) + VEKT[type];
  if (!t.sett[post.id]) t.sett[post.id] = Date.now();
  skriv(t);
}

// --- Rangering --------------------------------------------------------------
function normaliserAffinitet(katTeller) {
  const maks = Math.max(1, ...Object.values(katTeller));
  const ut = {};
  for (const k in katTeller) ut[k] = katTeller[k] / maks; // 0–1
  return ut;
}

// Deterministisk «tilfeldig» jitter per innlegg + økt-frø, så utforskningen er
// stabil mens man scroller (reshuffler ikke), men varierer mellom økter.
function jitter(id, fro) {
  let h = fro >>> 0;
  for (let i = 0; i < id.length; i++) { h = Math.imul(h ^ id.charCodeAt(i), 16777619); }
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296; // 0–1
}

/**
 * Rangerer innleggene for gjeldende bruker. Returnerer en ny sortert liste.
 * `fro` = øktfrø (så utforskningen varierer mellom besøk uten å reshuffle nå).
 */
export function rangerPoster(posts, fro = 1) {
  const t = les();
  const fs = feedState();
  const aff = normaliserAffinitet(t.kat);
  const valgte = interesser() || [];
  const nyeste = Math.max(...posts.map((p) => p.rekkefolge || 0), 1);

  const skår = (p) => {
    const interesse = valgte.includes(p.katId) ? 1 : 0;
    const affinitet = aff[p.katId] || 0;
    const spilt = fs.spilt && fs.spilt[p.id] ? 1 : 0;
    const sett = t.sett[p.id] ? 1 : 0;
    const ferskhet = (p.rekkefolge || 0) / nyeste; // nyere litt høyere
    const utforsk = jitter(p.id, fro); // 0–1 variasjon
    return (
      3.0 * interesse
      + 2.0 * affinitet
      + 0.4 * ferskhet
      + 0.6 * utforsk
      - 4.0 * spilt   // spilt → helt bakerst
      - 1.2 * sett    // sett (men ikke spilt) → nedprioritert
    );
  };

  const scoret = posts.map((p) => ({ p, s: skår(p) })).sort((a, b) => b.s - a.s);
  return spreDiversitet(scoret.map((x) => x.p));
}

// Diversitets-spredning: grådig utvelging som unngår at samme kategori kommer
// rett etter hverandre (vindu 2), så feeden alltid føles variert. Faller
// tilbake til beste gjenværende når ingen annen kategori er igjen.
function spreDiversitet(sortert, vindu = 2) {
  const ut = [];
  const igjen = sortert.slice();
  while (igjen.length) {
    const nylig = ut.slice(-vindu).map((p) => p.katId);
    let idx = igjen.findIndex((p) => !nylig.includes(p.katId));
    if (idx === -1) idx = 0; // bare én kategori igjen → ta den beste
    ut.push(igjen.splice(idx, 1)[0]);
  }
  return ut;
}

// --- Visnings-sporing (dwell) -----------------------------------------------
// Måler synlig tid per kort via IntersectionObserver: starter en klokke når
// kortet er godt synlig, stopper og bokfører når det forlater skjermen eller
// feeden bygges om. Idempotent oppsett per feed-bygging.
export function lagDwellSporer() {
  const start = new Map(); // element → { post, ts }
  const bokfor = (elp) => {
    const s = start.get(elp);
    if (!s) return;
    registrerVisning(s.post, Date.now() - s.ts);
    start.delete(elp);
  };
  const obs = new IntersectionObserver((oppf) => {
    for (const o of oppf) {
      if (o.isIntersecting && o.intersectionRatio >= 0.5) {
        if (!start.has(o.target)) start.set(o.target, { post: o.target.__post, ts: Date.now() });
      } else {
        bokfor(o.target);
      }
    }
  }, { threshold: [0, 0.5, 1] });
  // Bokfør alt ved sidebytte/skjuling så tid ikke går tapt.
  const påSkjul = () => { if (document.visibilityState === 'hidden') for (const el of start.keys()) bokfor(el); };
  document.addEventListener('visibilitychange', påSkjul);

  return {
    følg(el, post) { el.__post = post; obs.observe(el); },
    stopp() {
      for (const el of start.keys()) bokfor(el);
      obs.disconnect();
      document.removeEventListener('visibilitychange', påSkjul);
    },
  };
}
