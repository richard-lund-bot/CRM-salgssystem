// Restitusjons-kroppskart (M17) — en for-/bakside-figur der hver kroppsregion
// tones grønn→rød ut fra hvor nylig og hvor mye den er trent. Grønn = frisk/klar,
// rød = nylig/tungt trent (restituerer). Alt avledes ved lesetid fra
// bevegelsesloggen + øvelsenes muskeltagger — ingen nye felt, ingenting å synke.
// Selve figuren er en anatomisk SVG (js/kroppskart-svg.js) der hver kroppsdel har
// data-region; lagKroppskart() kobler regionene til fargeleggingen.
import { hentLogg } from './store.js';
import { oktMedId } from './bibliotek-okter.js';
import { ovelseInfo } from './ovelse.js';
import { loggBevegelse, KATEGORI_TIL_BEVEGELSE } from './bevegelse.js';
import { KROPPSKART_MARKUP } from './kroppskart-svg.js';

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
  // Engelske muskelnavn (data/ovelsesinfo.en.json) → samme regioner, så
  // restitusjonskartet virker likt i engelsk-modus. Ikke-muskulære nøkler
  // (Balance/Breath/Rest o.l.) utelates bevisst — de skal aldri gjøre en
  // region rød, akkurat som yoga/tøying/mobilitet på norsk.
  Shoulders: 'skuldre',
  Triceps: 'armer', Biceps: 'armer', Forearms: 'armer', Wrists: 'armer', Grip: 'armer', Elbows: 'armer',
  Chest: 'bryst',
  Back: 'rygg', 'Upper back': 'rygg', 'Shoulder blades': 'rygg', 'Rotator cuff': 'rygg', Neck: 'rygg',
  Core: 'kjerne', Obliques: 'kjerne', 'Side body': 'kjerne', 'Lower back': 'kjerne',
  Glutes: 'sete', Hips: 'sete', 'Hip flexors': 'sete', Groin: 'sete',
  Thighs: 'lar', Quads: 'lar', 'Inner thighs': 'lar',
  Hamstrings: 'baklar',
  Calves: 'legger', Ankles: 'legger', Knees: 'legger',
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
// `o` kan være en loggrad (med oktId/bevegelse) ELLER en rå bibliotekøkt (med
// blokker/kategori) — sistnevnte brukes av anbefalingens innholds-scoring.
function regionAndel(o) {
  const teller = {};
  let sum = 0;
  const okt = o.blokker ? o : (o.oktId && oktMedId(o.oktId));
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
    const bev = o.blokker ? KATEGORI_TIL_BEVEGELSE[o.kategori] : loggBevegelse(o);
    for (const r of (BEVEGELSE_REGIONHINT[bev] || [])) { teller[r] = 1; sum++; }
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

/** Regionfordeling for en rå bibliotekøkt (til anbefalingens innholds-scoring). */
export function regionAndelForOkt(okt) {
  return regionAndel(okt);
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

// Figurens SVG (js/kroppskart-svg.js) merker hver kroppsdel med data-region.
// Vi mapper SVG-ens regionnavn til appens 9 REGIONER. Baklårene er merket
// data-region="lar" i kilden (samme som framlår), så de skilles ut på id
// (bakside-lar-*) → baklar. Hode/nakke/hender/føtter har ingen score → nøytralt.
const NS = 'http://www.w3.org/2000/svg';
const SVG_REGION_TIL_APP = {
  skuldre: 'skuldre', armer: 'armer', bryst: 'bryst', rygg: 'rygg',
  mage: 'kjerne', hofte: 'sete', sete: 'sete', lar: 'lar', legger: 'legger',
};

/**
 * Bygger kroppskartet én gang og returnerer en controller {svg, sett(scores)}
 * — samme mønster som lagRing. sett() tinter regionene om.
 */
export function lagKroppskart() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 680 560');
  svg.setAttribute('class', 'kroppskart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Kroppskart som viser hvor restituert hver muskelgruppe er');
  svg.innerHTML = KROPPSKART_MARKUP; // samme mønster som ikon() i ui.js

  const noder = {};
  for (const n of svg.querySelectorAll('[data-region]')) {
    n.removeAttribute('fill'); // dropp kildens gradient-referanse; vi setter solid farge
    const id = n.getAttribute('id') || '';
    const key = id.startsWith('bakside-lar') ? 'baklar' : SVG_REGION_TIL_APP[n.getAttribute('data-region')];
    if (key && REGIONER.includes(key)) {
      n.setAttribute('class', 'kroppskart__region');
      (noder[key] ||= []).push(n);
    } else {
      n.setAttribute('class', 'kroppskart__base'); // hode/nakke/hender/føtter
    }
  }
  // Etiketter: fjern kildens mørke fyll så CSS styrer fargen (tema-riktig).
  const etikettG = svg.querySelector('#etiketter');
  if (etikettG) etikettG.removeAttribute('fill');
  for (const t of svg.querySelectorAll('#etiketter text')) t.setAttribute('class', 'kroppskart__etikett');

  return {
    svg,
    sett(scores) {
      for (const r of REGIONER) {
        for (const n of (noder[r] || [])) n.style.fill = fargeForScore(scores[r] ?? 0);
      }
    },
  };
}
