// Restitusjons-kroppskart (M17) — en for-/bakside-silhuett der hver
// kroppsregion tones grønn→rød ut fra hvor nylig og hvor mye den er trent.
// Grønn = frisk/klar, rød = nylig/tungt trent (restituerer). Alt avledes ved
// lesetid fra bevegelsesloggen + øvelsenes muskeltagger — ingen nye felt,
// ingenting å synke. Silhuetten er håndbygd inline-SVG (offline-trygg), i
// samme stil som lagRing/lagLinjegraf.
import { hentLogg } from './store.js';
import { oktMedId } from './bibliotek-okter.js';
import { ovelseInfo } from './ovelse.js';
import { loggBevegelse } from './bevegelse.js';

// --- Regioner + muskel→region ----------------------------------------------
export const REGIONER = ['skuldre', 'armer', 'bryst', 'rygg', 'kjerne', 'sete', 'lar', 'baklar', 'legger'];
export const REGION_NAVN = {
  skuldre: 'Skuldre', armer: 'Armer', bryst: 'Bryst', rygg: 'Rygg',
  kjerne: 'Kjerne', sete: 'Sete/hofter', lar: 'Lår', baklar: 'Baklår', legger: 'Legger',
};

// Alle 39 muskeltaggene i data/ovelsesinfo.json samles i ni regioner.
// Ikke-anatomiske/restitusjonsnøytrale tagger (Puls, Pust, Ro, Hvile, Balanse,
// Koordinasjon, Holdning, Sirkulasjon, Hele kroppen) mangler med vilje → null.
export const MUSKEL_TIL_REGION = {
  Skuldre: 'skuldre',
  Triceps: 'armer', Biceps: 'armer', Underarmer: 'armer', 'Håndledd': 'armer', Grep: 'armer', Albuer: 'armer',
  Bryst: 'bryst',
  Rygg: 'rygg', 'Øvre rygg': 'rygg', Skulderblad: 'rygg', Traps: 'rygg', Serratus: 'rygg', Rotatorcuff: 'rygg', Nakke: 'rygg',
  Kjerne: 'kjerne', Sidekjerne: 'kjerne', Sidekropp: 'kjerne', Korsrygg: 'kjerne',
  Sete: 'sete', Hofter: 'sete', 'Hoftebøyere': 'sete', Lyske: 'sete',
  'Lår': 'lar', 'Framside lår': 'lar', 'Innside lår': 'lar',
  'Baklår': 'baklar',
  Legger: 'legger', Ankler: 'legger', 'Knær': 'legger',
};

// Fallback når en loggrad mangler oktId (hurtig/manuell/Strava) og vi ikke kan
// slå opp øvelsene. Yoga/tøying/mobilitet/restitusjon får ingen hint — de ER
// restitusjon og skal aldri gjøre en region rød.
const BEVEGELSE_REGIONHINT = {
  run: ['lar', 'baklar', 'legger', 'sete'],
  walk: ['lar', 'legger', 'sete'],
  bike: ['lar', 'sete', 'legger'],
  hiit: ['lar', 'sete', 'kjerne', 'baklar', 'legger'],
  bodyweight: ['kjerne', 'bryst', 'skuldre', 'armer'],
  sport: ['lar', 'legger', 'kjerne'],
};

// --- Restitusjons-scoring: lineær nedtrapping over 72 t --------------------
const VINDU_H = 72; // 3 døgn → helt restituert
const decay = (dtH) => Math.max(0, 1 - dtH / VINDU_H);
const INTENSITET = { 1: 0.8, 2: 0.9, 3: 1.0, 4: 1.15, 5: 1.25 };

// Belastning per økt: 1.0 ≈ en solid 45-min normaløkt. Tung styrke (volumKg)
// drar den opp mot 2× → rødere start.
function belastning(o) {
  let b = ((o.varighetMin || 0) / 45) * (INTENSITET[o.intensitet] || 1);
  if (o.volumKg) b *= 1 + Math.min(0.5, o.volumKg / 16000); // tung styrke → inntil ~1,5×
  return b;
}

// Fordeling av en økt over regionene (summerer til 1), fra øvelsenes muskler.
function regionAndel(o) {
  const teller = {};
  let sum = 0;
  const okt = o.oktId && oktMedId(o.oktId);
  if (okt) {
    for (const blk of okt.blokker || []) {
      if (blk.kind !== 'ovelser' && blk.kind !== 'sekvens') continue;
      for (const ov of blk.ovelser || []) {
        for (const m of (ovelseInfo(ov.navn)?.muskler || [])) {
          const r = MUSKEL_TIL_REGION[m];
          if (r) { teller[r] = (teller[r] || 0) + 1; sum++; }
        }
      }
    }
  }
  if (!sum) {
    for (const r of (BEVEGELSE_REGIONHINT[loggBevegelse(o)] || [])) { teller[r] = 1; sum++; }
  }
  // Normaliser mot den mest belastede regionen: primærfokuset får full
  // øktbelastning, resten proporsjonalt. (Å dele på summen ville tynne ut selv
  // en hard økt til nesten ingenting når mange regioner er involvert.)
  let maks = 0;
  for (const r in teller) maks = Math.max(maks, teller[r]);
  const ut = {};
  if (maks) for (const r in teller) ut[r] = teller[r] / maks;
  return ut;
}

/** 0..1 per region: 0 = frisk (grønn), 1 = nylig/tungt trent (rød). */
export function regionScores(logg = hentLogg(), nå = Date.now()) {
  const raw = Object.fromEntries(REGIONER.map((r) => [r, 0]));
  for (const o of logg || []) {
    const dtH = (nå - (Date.parse(o.dato) || 0)) / 3.6e6;
    if (dtH < 0 || dtH > VINDU_H) continue;
    const w = decay(dtH) * belastning(o);
    if (w <= 0) continue;
    const andel = regionAndel(o);
    for (const r in andel) raw[r] += w * andel[r];
  }
  for (const r of REGIONER) raw[r] = Math.min(1, raw[r]);
  return raw;
}

// --- Anbefaling: «hva bør du trene nå» -------------------------------------
export function anbefalingFraRegioner(s) {
  const overkropp = Math.max(s.skuldre, s.armer, s.bryst, s.rygg);
  const underkropp = Math.max(s.sete, s.lar, s.baklar, s.legger);
  const alle = REGIONER.map((r) => s[r]);
  const snitt = alle.reduce((a, b) => a + b, 0) / alle.length;
  const maks = Math.max(...alle);
  const min = Math.min(...alle);

  if (snitt > 0.55 && min > 0.4)
    return { tekst: 'Kroppen er godt brukt — kjør rolig mobilitet i dag.', kat: 'mobilitet' };
  if (maks < 0.25)
    return { tekst: 'Du er frisk og klar — kjør på med en hard økt.', kat: 'styrke' };
  if (underkropp > 0.5 && overkropp < 0.3)
    return { tekst: 'Beina trenger hvile — ta en overkroppsøkt.', kat: 'kroppsvekt' };
  if (overkropp > 0.5 && underkropp < 0.3)
    return { tekst: 'Overkroppen restituerer — kjør bein i dag.', kat: 'styrke' };
  if (s.kjerne < 0.25 && snitt > 0.3)
    return { tekst: 'Ta en rolig kjerne- og mobilitetsøkt.', kat: 'mobilitet' };
  return { tekst: 'Balansert helkroppsøkt passer fint i dag.', kat: 'styrke' };
}

// --- SVG-hjelper -----------------------------------------------------------
/** Farge på en 0..1-skala: teal (frisk) → gul → coral (nylig trent). */
export function fargeForScore(s) {
  const teal = [11, 166, 159], gul = [249, 205, 85], koral = [255, 111, 97];
  const k = Math.min(1, Math.max(0, s));
  const [a, b, t] = k < 0.5 ? [teal, gul, k / 0.5] : [gul, koral, (k - 0.5) / 0.5];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// Stilisert to-figurs silhuett bygd av enkle rektangler. Forside (venstre,
// cx≈50) bærer bryst/kjerne/lår; bakside (høyre, cx≈150) bærer rygg/baklår;
// skuldre/armer/sete/legger finnes på begge. Hver region kan ha flere biter.
const REGION_FORM = {
  skuldre: [
    { t: 'rect', x: 34, y: 32, width: 32, height: 8, rx: 4 },
    { t: 'rect', x: 134, y: 32, width: 32, height: 8, rx: 4 },
  ],
  bryst: [
    { t: 'rect', x: 38, y: 41, width: 24, height: 16, rx: 3 },
  ],
  rygg: [
    { t: 'rect', x: 138, y: 41, width: 24, height: 37, rx: 3 },
  ],
  kjerne: [
    { t: 'rect', x: 39, y: 58, width: 22, height: 20, rx: 3 },
  ],
  armer: [
    { t: 'rect', x: 27, y: 40, width: 7, height: 26, rx: 3 },
    { t: 'rect', x: 66, y: 40, width: 7, height: 26, rx: 3 },
    { t: 'rect', x: 26, y: 66, width: 6, height: 24, rx: 3 },
    { t: 'rect', x: 68, y: 66, width: 6, height: 24, rx: 3 },
    { t: 'rect', x: 127, y: 40, width: 7, height: 26, rx: 3 },
    { t: 'rect', x: 166, y: 40, width: 7, height: 26, rx: 3 },
    { t: 'rect', x: 126, y: 66, width: 6, height: 24, rx: 3 },
    { t: 'rect', x: 168, y: 66, width: 6, height: 24, rx: 3 },
  ],
  sete: [
    { t: 'rect', x: 38, y: 79, width: 24, height: 12, rx: 3 },
    { t: 'rect', x: 138, y: 79, width: 24, height: 12, rx: 3 },
  ],
  lar: [
    { t: 'rect', x: 39, y: 92, width: 10, height: 34, rx: 4 },
    { t: 'rect', x: 51, y: 92, width: 10, height: 34, rx: 4 },
  ],
  baklar: [
    { t: 'rect', x: 139, y: 92, width: 10, height: 34, rx: 4 },
    { t: 'rect', x: 151, y: 92, width: 10, height: 34, rx: 4 },
  ],
  legger: [
    { t: 'rect', x: 40, y: 127, width: 8, height: 34, rx: 4 },
    { t: 'rect', x: 52, y: 127, width: 8, height: 34, rx: 4 },
    { t: 'rect', x: 140, y: 127, width: 8, height: 34, rx: 4 },
    { t: 'rect', x: 152, y: 127, width: 8, height: 34, rx: 4 },
  ],
};

/**
 * Bygger kroppskartet én gang og returnerer en controller {svg, sett(scores)}
 * — samme mønster som lagRing. sett() tinter regionene om.
 */
export function lagKroppskart() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 190');
  svg.setAttribute('class', 'kroppskart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Kroppskart som viser hvor restituert hver muskelgruppe er');

  // Nøytrale elementer: hoder + for-/bakside-etiketter.
  for (const cx of [50, 150]) {
    const hode = document.createElementNS(NS, 'circle');
    hode.setAttribute('cx', String(cx));
    hode.setAttribute('cy', '20');
    hode.setAttribute('r', '9');
    hode.setAttribute('class', 'kroppskart__hode');
    svg.append(hode);
  }
  for (const [cx, tekst] of [[50, 'Forfra'], [150, 'Bakfra']]) {
    const etikett = document.createElementNS(NS, 'text');
    etikett.setAttribute('x', String(cx));
    etikett.setAttribute('y', '178');
    etikett.setAttribute('text-anchor', 'middle');
    etikett.setAttribute('class', 'kroppskart__etikett');
    etikett.textContent = tekst;
    svg.append(etikett);
  }

  const noder = {};
  for (const r of REGIONER) {
    for (const form of REGION_FORM[r] || []) {
      const n = document.createElementNS(NS, form.t);
      for (const [k, v] of Object.entries(form)) if (k !== 't') n.setAttribute(k, String(v));
      n.setAttribute('class', `kroppskart__region kroppskart__region--${r}`);
      n.setAttribute('data-region', r);
      (noder[r] ||= []).push(n);
      svg.append(n);
    }
  }

  return {
    svg,
    sett(scores) {
      for (const r of REGIONER) {
        for (const n of (noder[r] || [])) n.style.fill = fargeForScore(scores[r] ?? 0);
      }
    },
  };
}
