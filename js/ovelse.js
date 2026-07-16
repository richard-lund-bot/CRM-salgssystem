// Øvelsessider (M16): hver øvelse i appen kan åpnes via en (i)-knapp og har
// en dedikert side med beskrivelse, utførelse, tips, muskler og utstyr.
// Innholdet bor i data/ovelsesinfo.json og slås opp på navn — øktene bærer
// bare øvelsesnavn, så oppslaget normaliserer varianter («Katt–ku, myk og
// langsom» → «katt-ku») og følger alias-lister. To visninger deler samme
// innhold: en egen side (#/ovelse?n=…) for review/oppslag, og et bunnark
// (overlegg) under kjøring så timer og økt-tilstand aldri forstyrres.
import { el, tom, ikon } from './ui.js';
import { MONSTER_NAVN } from './library.js';
import { harStyrkedata, ovelseØkter, prognose, anbefaling, lagLinjegraf } from './styrke.js';

let _info = null;     // rå liste fra data/ovelsesinfo.json
let _oppslag = null;  // normalisert navn/alias → oppføring
let _bib = null;      // øvelsesoppslaget (exercises.json) som fallback

export function settBib(bib) { _bib = bib; }

/** Laster øvelsesinfoen (kalles ved oppstart; cache i minne + SW). */
export async function lastOvelsesinfo() {
  if (_info) return _info;
  const { hentSprakJson } = await import('./i18n.js');
  _info = await hentSprakJson('ovelsesinfo');
  _oppslag = new Map();
  for (const o of _info) {
    for (const navn of [o.navn, ...(o.alias || [])]) {
      _oppslag.set(grovNokkel(navn), o);
      _oppslag.set(finNokkel(navn), o);
    }
  }
  return _info;
}

// --- Navneoppslag -----------------------------------------------------------
// Grov nøkkel: bare små bokstaver og ens bindestreker — treffer eksakte navn
// og alias. Fin nøkkel: uten parenteser og halen etter komma/kolon — treffer
// varianter som «Utfall (3 s ned)» og «Tyrkisk oppreisning, rolig tempo».
function grovNokkel(navn) {
  return String(navn).toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function finNokkel(navn) {
  let n = grovNokkel(navn);
  n = n.replace(/\(.*?\)/g, '');
  n = n.split(',')[0].split(':')[0].split('·')[0]; // «Knebøy · sett 1/3» → «knebøy»
  n = n.replace(/[^a-z0-9æøå\- ]/g, ' ');
  return n.replace(/\s+/g, ' ').trim();
}

/** Oppføringen for et øvelsesnavn, eller null. */
export function ovelseInfo(navn) {
  if (!_oppslag || !navn) return null;
  return _oppslag.get(grovNokkel(navn)) || _oppslag.get(finNokkel(navn)) || null;
}

/** Kanonisk nøkkel for et øvelsesnavn — samme identitet for varianter/alias.
 *  Brukes for å matche øvelser på tvers av Lær og øktbiblioteket (opplåsing). */
export function ovelseKanon(navn) {
  const info = ovelseInfo(navn);
  return info ? grovNokkel(info.navn) : finNokkel(navn);
}

// Fallback: metadata fra øvelsesoppslaget (exercises.json) på navnetreff.
function bibOppslag(navn) {
  if (!_bib) return null;
  const mål = finNokkel(navn);
  return _bib.exercises.find((e) => finNokkel(e.navn) === mål) || null;
}

// --- (i)-knappen -------------------------------------------------------------
/**
 * Liten info-knapp for et øvelsesnavn — null hvis vi ikke har noe å vise.
 * `somSide` åpner den dedikerte siden (review/oppslag); ellers åpnes
 * bunnarket (kjøring — ingenting avbrytes).
 */
export function infoKnapp(navn, { dose = null, somSide = false } = {}) {
  if (!ovelseInfo(navn) && !bibOppslag(navn)) return null;
  return el('button', {
    class: 'infoknapp', type: 'button', 'aria-label': `Om øvelsen ${navn}`,
    onclick: (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (somSide) {
        location.hash = `#/ovelse?n=${encodeURIComponent(navn)}${dose ? `&d=${encodeURIComponent(dose)}` : ''}`;
      } else {
        visOvelseArk(navn, dose);
      }
    },
  }, ikon('info'));
}

/** Bilde-slug for et øvelsesnavn (til miniatyrer under kjøring), eller null. */
export function ovelseBilde(navn) {
  return ovelseInfo(navn)?.bilde || null;
}

// --- Delt innholdsrenderer ---------------------------------------------------
// Rekkefølge for skanning: bilde → dose → hurtige merker (muskler/utstyr) →
// kort intro → «Slik gjør du» → tips. Merkene ligger høyt så du ser hva
// øvelsen trener med ett blikk.
function ovelseInnhold(navn, dose) {
  const info = ovelseInfo(navn);
  const bibE = bibOppslag(info?.navn || navn);
  const deler = [];

  if (info?.bilde) {
    deler.push(el('figure', { class: 'ovelsebilde' },
      el('img', { src: `bilder/ovelser/${info.bilde}.webp`, alt: `Illustrasjon: ${info.navn}`, loading: 'lazy' }),
    ));
  }

  if (dose) {
    deler.push(el('p', { class: 'ovelsedose' }, ikon('repeat', 'ikon ikon--liten'), ` I denne økta: ${dose}`));
  }

  const muskler = info?.muskler || [];
  const utstyr = info?.utstyr
    || (bibE ? [...new Set(bibE.varianter.flatMap((v) => v.utstyr))].map((u) => _bib?.utstyrMap?.get(u)?.navn || u) : []);
  const tagger = [
    ...muskler.map((m) => el('span', { class: 'tag tag--mod' }, m)),
    ...(bibE ? [el('span', { class: 'tag' }, MONSTER_NAVN[bibE.monster] || bibE.monster)] : []),
    ...utstyr.filter((u) => u && u !== 'ingen').slice(0, 4).map((u) => el('span', { class: 'tag' }, u)),
  ];
  if (tagger.length) deler.push(el('div', { class: 'ovelse__meta' }, ...tagger));

  if (info) {
    deler.push(el('p', { class: 'ovelsekort' }, info.kort));
    if (info.steg?.length) {
      deler.push(el('div', { class: 'kort' },
        el('h2', { class: 'ovelse__h' }, 'Slik gjør du'),
        el('ol', { class: 'stegliste' }, ...info.steg.map((s) => el('li', {}, s))),
      ));
    }
    if (info.tips?.length) {
      deler.push(el('div', { class: 'kort kort--tips' },
        el('h2', { class: 'ovelse__h' }, 'Tips'),
        ...info.tips.map((t) => el('p', { class: 'ovelsetips' }, ikon('lyn', 'ikon ikon--liten'), ` ${t}`)),
      ));
    }
  } else {
    deler.push(el('p', { class: 'ovelsekort' },
      'Ingen detaljert beskrivelse ennå — gjør øvelsen rolig og kontrollert, i ditt tempo.'));
  }

  const histNavn = info?.navn || navn;
  if (harStyrkedata(histNavn)) deler.push(styrkehistorikk(histNavn));

  return deler;
}

// Styrkehistorikk: e1RM-graf, nøkkeltall, prognose, anbefaling og siste økter.
function styrkehistorikk(navn) {
  const okter = ovelseØkter(navn);
  const siste = okter[okter.length - 1];
  const pg = prognose(navn);
  const anbef = anbefaling(navn, {});
  const stat = (v, l) => el('div', { class: 'histstat' },
    el('span', { class: 'histstat__verdi' }, v), el('span', { class: 'histstat__merk' }, l));
  const kort = el('div', { class: 'kort kort--hist' },
    el('h2', { class: 'ovelse__h' }, 'Din historikk'),
    el('div', { class: 'histgraf' }, lagLinjegraf(okter.map((o) => o.e1rm))),
    el('p', { class: 'histgraf__merk' }, 'Estimert 1RM over tid'),
    el('div', { class: 'histstatrad' },
      stat(`${Math.round(siste.e1rm)} kg`, 'est. 1RM'),
      stat(`${Math.max(...okter.map((o) => o.toppVekt))} kg`, 'tyngste'),
      stat(String(okter.length), okter.length === 1 ? 'økt' : 'økter'),
    ),
  );
  if (pg) kort.append(el('p', { class: 'histprognose' }, ikon('graf', 'ikon ikon--liten'),
    ` ${pg.perUke >= 0 ? 'På vei mot' : 'Trend'} ~${pg.om4Uker} kg est. 1RM om 4 uker (${pg.perUke >= 0 ? '+' : ''}${pg.perUke} kg/uke).`));
  if (anbef.vekt) kort.append(el('p', { class: 'histanbef' }, ikon('lyn', 'ikon ikon--liten'),
    ` Neste gang: prøv ${anbef.vekt} kg. ${anbef.tekst}`));
  kort.append(el('div', { class: 'histliste' },
    ...okter.slice(-5).reverse().map((o) => el('div', { class: 'histrad' },
      el('span', { class: 'histrad__dato' }, o.dato),
      el('span', { class: 'histrad__sett' }, `${o.toppVekt} kg · ${o.sett.length} sett`),
      el('span', { class: 'histrad__vol' }, `${o.volum.toLocaleString('nb-NO')} kg`),
    ))));
  return kort;
}

// --- Dedikert side: #/ovelse?n=<navn>&d=<dose> --------------------------------
export function visOvelseSkjerm(mount) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const navn = params.get('n') || '';
  const dose = params.get('d') || null;
  const info = ovelseInfo(navn);

  tom(mount);
  mount.append(
    el('header', { class: 'topp topp--kjor' },
      el('button', { class: 'topp__tilbake', type: 'button', title: 'Tilbake', onclick: () => history.back() }, '‹'),
      el('div', {},
        el('h1', { class: 'topp__tittel' }, info?.navn || navn || 'Øvelse'),
        el('p', { class: 'topp__under' }, info?.muskler?.length ? info.muskler.join(' · ') : 'Øvelse'),
      ),
    ),
    el('main', { class: 'innhold innhold--ovelse' }, ...ovelseInnhold(navn, dose)),
  );
}

// --- Bunnark: overlegg som ikke forstyrrer økta -------------------------------
export function visOvelseArk(navn, dose = null) {
  const info = ovelseInfo(navn);
  document.querySelector('.ark')?.remove(); // aldri to ark oppå hverandre

  const panel = el('div', { class: 'ark__panel', role: 'dialog', 'aria-label': `Om øvelsen ${navn}` },
    el('i', { class: 'ark__grip', 'aria-hidden': 'true' }),
    el('div', { class: 'ark__hode' },
      el('h2', { class: 'ark__tittel' }, info?.navn || navn),
      el('button', { class: 'ikonknapp', type: 'button', 'aria-label': 'Lukk', onclick: lukk }, ikon('kryss')),
    ),
    el('div', { class: 'ark__innhold' }, ...ovelseInnhold(navn, dose)),
  );
  const ark = el('div', { class: 'ark' }, panel);
  ark.addEventListener('click', (ev) => { if (ev.target === ark) lukk(); });

  function lukk() {
    ark.classList.add('ark--lukker');
    setTimeout(() => ark.remove(), 220);
  }

  document.body.append(ark);
  requestAnimationFrame(() => ark.classList.add('ark--apen'));
}
