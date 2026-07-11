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
// Returnerer { tekst, kat } + metadata til anbefalingskortet: undertekst,
// varighet og tre merkelapper (intensitet / omfang / terskel).
export function anbefalingFraRegioner(s) {
  const overkropp = Math.max(s.skuldre, s.armer, s.bryst, s.rygg);
  const underkropp = Math.max(s.sete, s.lar, s.baklar, s.legger);
  const alle = REGIONER.map((r) => s[r]);
  const snitt = alle.reduce((a, b) => a + b, 0) / alle.length;
  const maks = Math.max(...alle);
  const min = Math.min(...alle);

  if (snitt > 0.55 && min > 0.4)
    return {
      tekst: 'Kroppen er godt brukt — kjør rolig mobilitet i dag.', kat: 'mobilitet',
      undertekst: 'Fokus på pust, flyt og lett bevegelse', varighet: '15–25 min',
      intensitet: 'Rolig', omfang: 'Helkropp', terskel: 'Lav terskel',
    };
  if (maks < 0.25)
    return {
      tekst: 'Du er frisk og klar — kjør på med en hard økt.', kat: 'styrke',
      undertekst: 'Kroppen er uthvilt og tåler god belastning', varighet: '40–55 min',
      intensitet: 'Høy', omfang: 'Helkropp', terskel: 'Full innsats',
    };
  if (underkropp > 0.5 && overkropp < 0.3)
    return {
      tekst: 'Beina trenger hvile — ta en overkroppsøkt.', kat: 'kroppsvekt',
      undertekst: 'Bryst, rygg, skuldre og armer er klare', varighet: '30–45 min',
      intensitet: 'Moderat', omfang: 'Overkropp', terskel: 'Middels',
    };
  if (overkropp > 0.5 && underkropp < 0.3)
    return {
      tekst: 'Overkroppen restituerer — kjør bein i dag.', kat: 'styrke',
      undertekst: 'Lår, sete og legger er klare for jobb', varighet: '30–45 min',
      intensitet: 'Moderat', omfang: 'Underkropp', terskel: 'Middels',
    };
  if (s.kjerne < 0.25 && snitt > 0.3)
    return {
      tekst: 'Ta en rolig kjerne- og mobilitetsøkt.', kat: 'mobilitet',
      undertekst: 'Fokus på kjerne, kontroll og bevegelighet', varighet: '20–30 min',
      intensitet: 'Rolig', omfang: 'Kjerne', terskel: 'Lav terskel',
    };
  return {
    tekst: 'Balansert helkroppsøkt passer fint i dag.', kat: 'styrke',
    undertekst: 'Fokus på kontroll, flyt og moderat intensitet', varighet: '25–35 min',
    intensitet: 'Moderat', omfang: 'Helkropp', terskel: 'Lav terskel',
  };
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

// Anatomisk to-figurs silhuett. Formene er tegnet i ETT lokalt koordinatsystem
// (én figur, cx≈58, y 12–236); forfra-figuren plasseres på translate(0,0) og
// bakfra på translate(104,0). Et lysegrått «grunnlag» (torso, armer, ben, hode,
// hender, føtter) tegnes først, så fargelegges muskel-regionene oppå. Regionene
// er de samme 9 (REGIONER); bare hvilke muskler som vises skiller for/bak.
const NS = 'http://www.w3.org/2000/svg';

// Grått kropps-grunnlag (samme for begge figurer).
const BASE_FORM = [
  { t: 'path', d: 'M52,35 L64,35 L63,45 Q58,48 53,45 Z' }, // hals
  { t: 'path', d: 'M43,49 C36,50 33,58 33,66 C33,80 37,93 44,104 C40,111 44,119 50,119 L58,114 L66,119 C72,119 76,111 72,104 C79,93 83,80 83,66 C83,58 80,50 73,49 C66,46 50,46 43,49 Z' }, // torso
  { t: 'path', d: 'M40,54 C31,55 27,64 27,75 C27,90 29,104 33,117 C34,121 39,121 40,117 C43,104 42,90 43,77 C44,66 44,58 43,54 Z' }, // venstre arm
  { t: 'path', d: 'M76,54 C85,55 89,64 89,75 C89,90 87,104 83,117 C82,121 77,121 76,117 C73,104 74,90 73,77 C72,66 72,58 73,54 Z' }, // høyre arm
  { t: 'path', d: 'M46,116 C41,122 43,138 45,152 C47,166 48,182 49,200 C49,214 51,224 54,227 C57,228 59,224 59,215 C59,196 58,178 57,152 C56,138 56,122 55,116 Z' }, // venstre ben
  { t: 'path', d: 'M70,116 C75,122 73,138 71,152 C69,166 68,182 67,200 C67,214 65,224 62,227 C59,228 57,224 57,215 C57,196 58,178 59,152 C60,138 60,122 61,116 Z' }, // høyre ben
];

// Hode/hender/føtter — nøytralt, litt annen grå.
const HODE_FORM = [
  { t: 'ellipse', cx: 58, cy: 24, rx: 11, ry: 13 },
  { t: 'ellipse', cx: 35, cy: 121, rx: 4, ry: 5 },
  { t: 'ellipse', cx: 81, cy: 121, rx: 4, ry: 5 },
  { t: 'ellipse', cx: 53, cy: 231, rx: 5.5, ry: 4 },
  { t: 'ellipse', cx: 63, cy: 231, rx: 5.5, ry: 4 },
];

// Muskler forfra (venstre figur).
const MUSKLER_FORAN = {
  skuldre: [
    { t: 'ellipse', cx: 38, cy: 60, rx: 6.5, ry: 7 },
    { t: 'ellipse', cx: 78, cy: 60, rx: 6.5, ry: 7 },
  ],
  bryst: [
    { t: 'path', d: 'M45,55 C50,53 56,54 57,58 C57,64 53,68 48,68 C44,68 42,63 43,59 C43,57 44,56 45,55 Z' },
    { t: 'path', d: 'M71,55 C66,53 60,54 59,58 C59,64 63,68 68,68 C72,68 74,63 73,59 C73,57 72,56 71,55 Z' },
  ],
  kjerne: [
    { t: 'path', d: 'M49,71 C52,70 64,70 67,71 C68,82 66,95 61,100 C59,102 57,102 55,100 C50,95 48,82 49,71 Z' },
  ],
  armer: [
    { t: 'ellipse', cx: 34, cy: 80, rx: 4.5, ry: 9 },
    { t: 'ellipse', cx: 37, cy: 104, rx: 4, ry: 9 },
    { t: 'ellipse', cx: 82, cy: 80, rx: 4.5, ry: 9 },
    { t: 'ellipse', cx: 79, cy: 104, rx: 4, ry: 9 },
  ],
  sete: [
    { t: 'path', d: 'M49,103 C53,101 63,101 67,103 C68,109 65,115 58,115 C51,115 48,109 49,103 Z' },
  ],
  lar: [
    { t: 'path', d: 'M47,119 C43,127 44,141 48,151 C50,154 53,154 54,151 C57,141 55,127 52,119 C51,117 48,117 47,119 Z' },
    { t: 'path', d: 'M69,119 C73,127 72,141 68,151 C66,154 63,154 62,151 C59,141 61,127 64,119 C65,117 68,117 69,119 Z' },
  ],
  legger: [
    { t: 'path', d: 'M49,167 C46,178 46,192 49,203 C50,206 53,206 54,203 C56,192 54,178 53,167 C52,164 50,164 49,167 Z' },
    { t: 'path', d: 'M67,167 C70,178 70,192 67,203 C66,206 63,206 62,203 C60,192 62,178 63,167 C64,164 66,164 67,167 Z' },
  ],
};

// Muskler bakfra (høyre figur).
const MUSKLER_BAK = {
  skuldre: [
    { t: 'ellipse', cx: 38, cy: 60, rx: 6.5, ry: 7 },
    { t: 'ellipse', cx: 78, cy: 60, rx: 6.5, ry: 7 },
  ],
  rygg: [
    { t: 'path', d: 'M46,53 C50,51 66,51 70,53 C71,66 66,80 58,82 C50,80 45,66 46,53 Z' },
    { t: 'path', d: 'M50,84 C53,83 63,83 66,84 C67,92 65,100 58,102 C51,100 49,92 50,84 Z' },
  ],
  armer: [
    { t: 'ellipse', cx: 34, cy: 80, rx: 4.5, ry: 9 },
    { t: 'ellipse', cx: 37, cy: 104, rx: 4, ry: 9 },
    { t: 'ellipse', cx: 82, cy: 80, rx: 4.5, ry: 9 },
    { t: 'ellipse', cx: 79, cy: 104, rx: 4, ry: 9 },
  ],
  sete: [
    { t: 'path', d: 'M50,104 C46,105 47,116 55,118 C59,119 60,112 59,106 C58,103 53,103 50,104 Z' },
    { t: 'path', d: 'M66,104 C70,105 69,116 61,118 C57,119 56,112 57,106 C58,103 63,103 66,104 Z' },
  ],
  baklar: [
    { t: 'path', d: 'M47,119 C43,127 44,141 48,151 C50,154 53,154 54,151 C57,141 55,127 52,119 C51,117 48,117 47,119 Z' },
    { t: 'path', d: 'M69,119 C73,127 72,141 68,151 C66,154 63,154 62,151 C59,141 61,127 64,119 C65,117 68,117 69,119 Z' },
  ],
  legger: [
    { t: 'path', d: 'M49,167 C46,178 46,192 49,203 C50,206 53,206 54,203 C56,192 54,178 53,167 C52,164 50,164 49,167 Z' },
    { t: 'path', d: 'M67,167 C70,178 70,192 67,203 C66,206 63,206 62,203 C60,192 62,178 63,167 C64,164 66,164 67,167 Z' },
  ],
};

function lagElement(spec, klasse) {
  const n = document.createElementNS(NS, spec.t);
  for (const [k, v] of Object.entries(spec)) if (k !== 't') n.setAttribute(k, String(v));
  n.setAttribute('class', klasse);
  return n;
}

/**
 * Bygger kroppskartet én gang og returnerer en controller {svg, sett(scores)}
 * — samme mønster som lagRing. sett() tinter regionene om.
 */
export function lagKroppskart() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 220 250');
  svg.setAttribute('class', 'kroppskart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Kroppskart som viser hvor restituert hver muskelgruppe er');

  const noder = {};
  function byggFigur(dx, muskler, etikett) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${dx},0)`);
    for (const b of BASE_FORM) g.append(lagElement(b, 'kroppskart__base'));
    for (const r of REGIONER) {
      for (const form of (muskler[r] || [])) {
        const n = lagElement(form, `kroppskart__region kroppskart__region--${r}`);
        n.setAttribute('data-region', r);
        (noder[r] ||= []).push(n);
        g.append(n);
      }
    }
    for (const h of HODE_FORM) g.append(lagElement(h, 'kroppskart__hode'));
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', '58');
    t.setAttribute('y', '244');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'kroppskart__etikett');
    t.textContent = etikett;
    g.append(t);
    svg.append(g);
  }
  byggFigur(0, MUSKLER_FORAN, 'Forfra');
  byggFigur(104, MUSKLER_BAK, 'Bakfra');

  return {
    svg,
    sett(scores) {
      for (const r of REGIONER) {
        for (const n of (noder[r] || [])) n.style.fill = fargeForScore(scores[r] ?? 0);
      }
    },
  };
}
