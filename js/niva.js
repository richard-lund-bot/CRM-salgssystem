// Nivåsystemet (M15): logg → XP → globalt nivå. Én kurve, ingen tak.
// Nivået er et lavmælt tall (vises som en liten boble på profilikonet);
// feiringen bor i merkene (js/merker.js). Alt er avledet fra profilens
// total-XP og loggen ved lesetid — ingenting kan «mistes», og sync trenger
// aldri lagre noe ekstra.

import { beregnXp, loggBevegelse, BEVEGELSE_TIL_NIVATYPER } from './bevegelse.js';

const DAG = 86400000;

// --- Nivåkurve: rask og uendelig ------------------------------------------
// XP for å gå fra nivå n til n+1. Starter lavt (fremgang tidlig), vokser
// lineært, aldri et tak. ~1 nivå per økt tidlig.
export function nivaKostnad(n) {
  return 40 + 20 * n;
}

/** Nivå + progresjon mot neste fra total-XP. */
export function nivaFraTotalXp(totalXp) {
  const xp = Math.max(0, totalXp || 0);
  let niva = 1;
  let brukt = 0;
  while (xp >= brukt + nivaKostnad(niva)) { brukt += nivaKostnad(niva); niva++; }
  const inne = xp - brukt;
  const tilNeste = nivaKostnad(niva);
  return { niva, inne, tilNeste, igjen: tilNeste - inne, pct: Math.min(100, Math.round((inne / tilNeste) * 100)), totalXp: xp };
}

/** Globalt nivå fra total-XP (snarvei for visninger). */
export function globaltNiva(totalXp) {
  return nivaFraTotalXp(totalXp).niva;
}

// --- Nivå per treningstype (M17) -------------------------------------------
// Tre uavhengige nivåer avledet av loggen ved lesetid, samme kurve som globalt.
// En økt kan telle mot flere typer; XP deles LIKT mellom dem, så summen av de
// tre ≈ total logget XP. Alt avledet — ingen nye felt, ingenting å synke.

/** Typene en loggrad teller mot (0-3). `oktTyper` = kuratert override fra økt. */
export function typerForLogg(o, oktTyper) {
  if (oktTyper && oktTyper.length) return oktTyper;
  const bev = loggBevegelse(o);
  const t = BEVEGELSE_TIL_NIVATYPER[bev];
  if (t && t.length) return t;
  // Tvetydig (sport/custom): la sekundærsignaler på loggraden avgjøre.
  if (o.volumKg || (o.resultater && o.resultater.length)) return ['styrke'];
  if (o.distanseM || o.snittPuls) return ['kondisjon'];
  return bev === 'sport' ? ['kondisjon'] : []; // sport uten signal → kondisjon; custom → kun globalt
}

/**
 * Tre nivåer {kondisjon, styrke, mobilitet}, hver som nivaFraTotalXp(sum).
 * `oktTyperFor(o)` er en valgfri callback som gir per-økt override uten at
 * niva.js må importere øktbiblioteket (unngår kobling).
 */
export function nivaPerType(logg, oktTyperFor = null) {
  const sum = { kondisjon: 0, styrke: 0, mobilitet: 0 };
  for (const o of logg || []) {
    const typer = typerForLogg(o, oktTyperFor ? oktTyperFor(o) : null);
    if (!typer.length) continue;
    const del = (o.xp || 0) / typer.length; // lik fordeling mellom typene
    for (const t of typer) sum[t] += del;
  }
  return {
    kondisjon: nivaFraTotalXp(sum.kondisjon),
    styrke: nivaFraTotalXp(sum.styrke),
    mobilitet: nivaFraTotalXp(sum.mobilitet),
  };
}

// --- Ukenøkkel (brukes av ukesvolum og ukemål-merker) ----------------------
/** ISO-ukenøkkel «YYYY-Www» for en dato. */
export function ukeNokkel(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  // Torsdag i inneværende uke bestemmer året (ISO 8601).
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const uke1 = new Date(d.getFullYear(), 0, 4);
  const nr = 1 + Math.round(((d - uke1) / DAG - 3 + ((uke1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(nr).padStart(2, '0')}`;
}

// --- PR-uttrekk -----------------------------------------------------------
/** Best per øvelse fra loggens resultater. */
export function prsFraLogg(logg) {
  const pr = {};
  for (const o of logg) {
    for (const r of o.resultater || []) {
      const p = pr[r.id] || (pr[r.id] = { id: r.id, dato: o.dato });
      if (Number.isFinite(r.reps)) p.reps = Math.max(p.reps || 0, r.reps);
      if (Number.isFinite(r.last)) p.last = Math.max(p.last || 0, r.last);
      if (Number.isFinite(r.holdSek)) p.holdSek = Math.max(p.holdSek || 0, r.holdSek);
      if (Number.isFinite(r.distKm)) p.distKm = Math.max(p.distKm || 0, r.distKm);
      p.dato = o.dato;
    }
  }
  return pr;
}

// --- Transaksjon: registrer bevegelse ---------------------------------------
/**
 * Ren funksjon for all bevegelse (bibliotekøkt, hurtigstart, manuell logg,
 * Strava-import): tar profil + {bevegelse, varighetMin, intensitet, comeback}
 * → { profil, resultat }. Alt teller (spec §5.1/§7) — XP og nivå, uten krav.
 */
export function registrerBevegelse(profil, { bevegelse, varighetMin, intensitet = 3, comeback = false }, nå = Date.now()) {
  const p = strukturertKopi(profil);
  p.globalXp = p.globalXp || 0;

  const xp = beregnXp(varighetMin, bevegelse, intensitet) * (comeback ? 2 : 1);
  p.globalXp += xp;
  if (comeback) p.harComeback = true;

  const globalFør = globaltNiva(profil.globalXp || 0);
  const globalEtter = globaltNiva(p.globalXp);

  return {
    profil: p,
    resultat: {
      xp, comeback,
      globalOpp: globalEtter > globalFør ? globalEtter : null,
    },
  };
}

// Liten dyp-kopi uten avhengighet til structuredClone i eldre miljø.
function strukturertKopi(o) {
  return JSON.parse(JSON.stringify(o || {}));
}
