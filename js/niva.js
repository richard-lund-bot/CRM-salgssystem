// Nivåsystemet (LAG 3, taksonomi §12): logg → XP → nivå per modalitet.
// Designprinsipp: nivået skal bety noe fysisk. XP alene rykker deg aldri opp —
// opprykk krever både XP-terskel OG bevis (økter på toppnivå eller bestått
// gateway). Nedrykk følger kalibrert detrening (decay), men verifiserte nivåer
// blir «rustne», ikke slettet — én re-test gjenoppretter dem.
//
// Autoritativ progresjon (base, xp, bevis, gateways, PR, sisteOkt) lagres i
// profilen og oppdateres transaksjonelt i registrerOkt(). Momentum, decay og
// streak er *avledet* fra datoer/logg ved lesetid (rene funksjoner) — så en
// ferie «fryser» ingenting permanent.

import { nivaFraTotalXp, belonningFor } from './belonninger.js';

const DAG = 86400000;

// §4b — intensitet → XP-faktor
export const INTENSITET = {
  1: { navn: 'Restitusjon', faktor: 0.5 },
  2: { navn: 'Lett', faktor: 0.8 },
  3: { navn: 'Moderat', faktor: 1.0 },
  4: { navn: 'Hard', faktor: 1.4 },
  5: { navn: 'Maks', faktor: 1.8 },
};

// §12c — decay per modalitetsgruppe (grace-dager, deretter −1 base per takt-dager)
const DECAY = {
  HIIT: { grace: 14, takt: 21 }, BASE: { grace: 14, takt: 21 },
  MOB: { grace: 14, takt: 21 }, STR: { grace: 14, takt: 21 },
  STY: { grace: 21, takt: 28 }, YOGA: { grace: 21, takt: 28 },
  PIL: { grace: 21, takt: 28 }, CORE: { grace: 21, takt: 28 },
  SKILL: { grace: 28, takt: 42 },
  _standard: { grace: 21, takt: 28 },
};

const dager = (fra, til) => Math.max(0, Math.floor((til - fra) / DAG));

// --- XP-terskler ----------------------------------------------------------
/** XP som trengs for å gå fra nivå n til n+1 (§12a: 100 × nivå^1,5). */
export function terskel(niva) {
  return Math.round(100 * Math.pow(niva, 1.5));
}

/** Belønningsnivå = f(total XP) — hyppig, uten tak (kurve i belonninger.js). */
export function globaltNiva(totalXp) {
  return nivaFraTotalXp(totalXp).niva;
}

// --- Øvelsesnivå-opplåsing (§4c) ------------------------------------------
/** Hvilket øvelsesnivå en modalitetsbase låser opp. */
export function nivaFraBase(base) {
  if (base >= 7) return 5;
  if (base >= 5) return 4;
  if (base >= 3) return 3;
  return 2; // 1–2 er alltid åpne
}

/** Alle kjede-IDer et bestått gateway-sett låser opp til et gitt nivå. */
export function gatewayUnlocks(profil, gateways) {
  const passert = new Set(profil?.gatewaysPassert || []);
  const kart = new Map(); // kjede → høyeste ulåste nivå
  for (const g of gateways) {
    if (!passert.has(g.id)) continue;
    for (const kj of g.laserOpp?.kjeder || []) {
      kart.set(kj, Math.max(kart.get(kj) || 0, g.laserOpp.niva || 0));
    }
  }
  return kart;
}

/**
 * Er en øvelse (med effektivt variant-nivå) tilgjengelig for brukeren nå?
 * Base-opplåsing (evt. redusert av decay/comeback) ∪ gateway-opplåsing per
 * kjede ∪ manuell overstyring. Appen skal aldri nekte en voksen mann å prøve
 * det han manuelt låser opp.
 */
export function erUlast(profil, e, variantNiva, gateways, nå = Date.now()) {
  const overstyr = profil?.innstillinger?.nivaOverstyr || {};
  const tak = Math.max(2, ...e.modaliteter.map((m) =>
    Number.isFinite(overstyr[m]) ? overstyr[m] : nivaFraBase(effektivBase(profil, m, nå))));
  if (variantNiva <= tak) return true;
  if (e.kjede && gateways) {
    const unlocks = gatewayUnlocks(profil, gateways);
    if ((unlocks.get(e.kjede) || 0) >= variantNiva) return true;
  }
  return false;
}

// --- Momentum & decay (avledet) -------------------------------------------
/** Rå base før decay/comeback (fra progresjonstilstanden). */
export function raBase(profil, mod) {
  const n = profil?.nivaer?.[mod]?.base;
  return Number.isFinite(n) ? n : 2;
}

export function sisteOkt(profil, mod) {
  const s = profil?.nivaer?.[mod]?.sisteOkt;
  return s ? Date.parse(s) : null;
}

/** Effektiv dato-avstand, med pause-modus som fryser klokka. */
function dagerSidenØkt(profil, mod, nå) {
  const s = sisteOkt(profil, mod);
  if (!s) return null;
  const pauseTil = profil?.innstillinger?.pauseTil ? Date.parse(profil.innstillinger.pauseTil) : null;
  const effektivNå = pauseTil && pauseTil > nå ? s : nå; // aktiv pause → ingen tid går
  return dager(s, effektivNå);
}

/** §12b — momentumtilstand for en modalitet. */
export function momentum(profil, mod, nå = Date.now()) {
  const d = dagerSidenØkt(profil, mod, nå);
  if (d == null) return { tilstand: 'ny', dagerSiden: null, pil: '·' };
  if (d <= 10) return { tilstand: 'aktiv', dagerSiden: d, pil: '↑' };
  if (d <= 21) return { tilstand: 'kjolig', dagerSiden: d, pil: '→' };
  return { tilstand: 'comeback', dagerSiden: d, pil: '↓' };
}

/** §12c — hvor mange trinn decay har låst (rustne nivåer). */
export function decay(profil, mod, nå = Date.now()) {
  const d = dagerSidenØkt(profil, mod, nå);
  const konf = DECAY[mod] || DECAY._standard;
  if (d == null) return { trinn: 0, rusten: false, dagerTil: konf.grace, konf };
  if (d <= konf.grace) return { trinn: 0, rusten: false, dagerTil: konf.grace - d, konf };
  const trinn = 1 + Math.floor((d - konf.grace) / konf.takt);
  const nesteOm = konf.takt - ((d - konf.grace) % konf.takt);
  return { trinn, rusten: true, dagerTil: nesteOm, konf };
}

/**
 * Effektiv base = rå base − decay − comeback, med gulv: aldri under 1, og aldri
 * mer enn 2 under høyeste beviste punkt (da tilbys re-test i stedet).
 */
export function effektivBase(profil, mod, nå = Date.now()) {
  const ra = raBase(profil, mod);
  const dec = decay(profil, mod, nå).trinn;
  const cb = momentum(profil, mod, nå).tilstand === 'comeback' ? 1 : 0;
  const hoyesteBevist = profil?.nivaer?.[mod]?.hoyesteBevist ?? ra;
  const gulv = Math.max(1, hoyesteBevist - 2); // aldri mer enn 2 under bevist punkt
  return Math.max(gulv, ra - dec - cb, 1);
}

// --- Streak (§12d) --------------------------------------------------------
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

/** Streak = antall sammenhengende uker (t.o.m. denne/forrige) med ≥ ukemål. */
export function streak(logg, ukemaal = 4, nå = Date.now()) {
  const perUke = {};
  for (const o of logg) perUke[ukeNokkel(Date.parse(o.dato))] = (perUke[ukeNokkel(Date.parse(o.dato))] || 0) + 1;
  const denneUken = perUke[ukeNokkel(nå)] || 0;

  let uker = 0;
  const start = new Date(nå);
  // Hvis inneværende uke ikke er nådd ennå, ikke knekk streaken — tell fra forrige.
  let peker = denneUken >= ukemaal ? new Date(nå) : new Date(nå - 7 * DAG);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const n = perUke[ukeNokkel(peker.getTime())] || 0;
    if (n >= ukemaal) { uker++; peker = new Date(peker.getTime() - 7 * DAG); } else break;
  }
  return { uker, denneUken, ukemaal, nadd: denneUken >= ukemaal };
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

// --- Transaksjon: registrer en fullført økt -------------------------------
/**
 * Ren funksjon: tar profil + økt + bibliotek → { profil, resultat }.
 * Oppdaterer XP, PR, sisteOkt, bevisteller og evt. nivåopprykk. Kalleren lagrer
 * den nye profilen og loggfører økta (med resultatene) selv.
 */
export function registrerOkt(profil, okt, bib, resultater = [], nå = Date.now()) {
  const p = strukturertKopi(profil);
  p.nivaer = p.nivaer || {};
  p.prs = p.prs || {};
  p.globalXp = p.globalXp || 0;

  const mod = okt.modalitet;
  const niv = p.nivaer[mod] || (p.nivaer[mod] = { base: 2, xp: 0, bevisTeller: 0, hoyesteBevist: 2, verifisert: false });

  const comeback = momentum(profil, mod, nå).tilstand === 'comeback';

  // Nye øvelser (ikke sett i loggen før) — kun ekte øvelsesblokker teller,
  // ikke oppvarming/pust/sekvens. Registreres i profilens «sett»-register.
  p.settOvelser = p.settOvelser || {};
  const ovelseIder = [...new Set(okt.blokker
    .filter((b) => b.kind === 'ovelser')
    .flatMap((b) => (b.ovelser || []).map((o) => o.id)))].filter(Boolean);
  let nyeØvelser = 0;
  for (const id of ovelseIder) if (!p.settOvelser[id]) { p.settOvelser[id] = true; nyeØvelser++; }

  // PR-er
  const nyePrs = [];
  for (const r of resultater) {
    const forrige = p.prs[r.id];
    const slår = (felt) => Number.isFinite(r[felt]) && r[felt] > (forrige?.[felt] || 0);
    if (!forrige || slår('reps') || slår('last') || slår('holdSek') || slår('distKm')) {
      const oppdatert = { ...(forrige || { id: r.id }) };
      for (const f of ['reps', 'last', 'holdSek', 'distKm']) if (Number.isFinite(r[f])) oppdatert[f] = Math.max(oppdatert[f] || 0, r[f]);
      oppdatert.dato = new Date(nå).toISOString();
      const erNyPr = forrige && (slår('reps') || slår('last') || slår('holdSek') || slår('distKm'));
      p.prs[r.id] = oppdatert;
      if (erNyPr) nyePrs.push({ id: r.id, ...oppdatert });
    }
  }

  // XP (§12d): minutter × intensitetsfaktor × (comeback ? 2 : 1) + bonuser
  const faktor = INTENSITET[okt.intensitet]?.faktor ?? 1;
  const grunnXp = Math.round((okt.varighetMin || 0) * faktor * (comeback ? 2 : 1));
  const bonusXp = nyePrs.length * 20 + nyeØvelser * 10;
  const xp = grunnXp + bonusXp;

  niv.xp = (niv.xp || 0) + xp;
  p.globalXp += xp;

  // Bevis: talte økta på toppnivået som er ulåst nå?
  const topp = nivaFraBase(niv.base);
  const påTopp = okt.blokker.some((b) => (b.ovelser || []).some((o) => Number.isFinite(o.niva) && o.niva >= topp));
  if (påTopp) niv.bevisTeller = (niv.bevisTeller || 0) + 1;

  niv.sisteOkt = new Date(nå).toISOString();

  // Opprykk: krever XP-terskel OG bevis (≥5 økter på topp, eller gateway senere).
  const nivaOpp = [];
  while (niv.xp >= terskel(niv.base) && (niv.bevisTeller || 0) >= 5) {
    niv.xp -= terskel(niv.base);
    niv.base += 1;
    niv.bevisTeller = 0;
    niv.hoyesteBevist = Math.max(niv.hoyesteBevist || 0, niv.base);
    niv.verifisert = true;
    nivaOpp.push({ modalitet: mod, tilNiva: niv.base });
  }

  const globalFør = globaltNiva(profil.globalXp || 0);
  const globalEtter = globaltNiva(p.globalXp);
  // Belønninger for hvert kryssede belønningsnivå (ny øvelse/avatar/tema/tittel).
  const belonninger = [];
  for (let n = globalFør + 1; n <= globalEtter; n++) belonninger.push(belonningFor(n, bib));

  return {
    profil: p,
    resultat: {
      xp, grunnXp, bonusXp, comeback,
      nyePrs, nyeØvelser,
      nivaOpp,
      globalOpp: globalEtter > globalFør ? globalEtter : null,
      belonninger,
      tilNesteBase: terskel(niv.base),
      bevisTeller: niv.bevisTeller,
      xpIModalitet: niv.xp,
    },
  };
}

/**
 * Registrer et bestått gateway-sett: markér passert, oppgi bevis, og hev
 * hoyesteBevist så nivået er «verifisert» (§12a — gateway = hurtigspor).
 */
export function registrerGateway(profil, gateway, nå = Date.now()) {
  const p = strukturertKopi(profil);
  p.gatewaysPassert = [...new Set([...(p.gatewaysPassert || []), gateway.id])];
  p.nivaer = p.nivaer || {};
  const mod = gateway.modalitet;
  const niv = p.nivaer[mod] || (p.nivaer[mod] = { base: 2, xp: 0, bevisTeller: 0, hoyesteBevist: 2, verifisert: false });
  // Gateway beviser kapasitet på sitt nivå — hev base til minst tilsvarende.
  const målBase = { 3: 3, 4: 5, 5: 7 }[gateway.laserOpp?.niva] || niv.base;
  if (målBase > niv.base) niv.base = målBase;
  niv.hoyesteBevist = Math.max(niv.hoyesteBevist || 0, niv.base);
  niv.verifisert = true;
  niv.sisteOkt = new Date(nå).toISOString();
  p.globalXp = (p.globalXp || 0) + 50; // §12d gateway-bonus
  return { profil: p, resultat: { xp: 50, gateway: gateway.id, tilBase: niv.base } };
}

/** Sjekker om et sett med selvrapporterte tall oppfyller gateway-kravene. */
export function bestattGateway(gateway, svar) {
  return (gateway.krav || []).every((k) => {
    if (k.ovelse == null || k.type === 'nulltest') return true; // verifiseringstest u/ tallkrav
    const v = svar?.[k.ovelse];
    return Number.isFinite(v) && v >= k.verdi;
  });
}

// Liten dyp-kopi uten avhengighet til structuredClone i eldre miljø.
function strukturertKopi(o) {
  return JSON.parse(JSON.stringify(o || {}));
}
