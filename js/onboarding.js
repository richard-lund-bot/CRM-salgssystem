// Onboarding (M13 — preferanse-først): < 2 min, 4 skjermer. Spør om
// motivasjon, hvilke bevegelser du liker, ukemål + tid og navn — aldri
// prestasjonskrav eller kalibrering. Øktbiblioteket har egne skillnivåer,
// så startnivåer trengs ikke lenger.
import { el, tom, chip, ikon } from './ui.js';
import { MODALITET_NAVN } from './library.js';
import { lagreProfil } from './store.js';
import { BEVEGELSER } from './bevegelse.js';
import { standardFigur } from './figur.js';

// --- Skjerm 1: motivasjon ---------------------------------------------------
// Hvert valg gir modalitetsvekt + formatvekt + hvilket toppkort hjem viser.
const MOTIVASJON = [
  { id: 'stabil', navn: 'Stabil rutine', ikon: 'repeat', mod: { alle: 1 }, format: { mikro: 2, kort: 1 }, toppkort: 'streak' },
  { id: 'mestre', navn: 'Mestre nye øvelser', ikon: 'hexstjerne', mod: { SKILL: 3, STY: 2 }, format: { gtg: 2, emom: 1, styrkehold: 1 }, toppkort: 'skilltre' },
  { id: 'sterkere', navn: 'Bli sterkere', ikon: 'vekt', mod: { STY: 3 }, format: { 'straight-sets': 2, supersett: 2, complex: 1 }, toppkort: 'pr' },
  { id: 'kondis', navn: 'Bedre kondis', ikon: 'loper', mod: { HIIT: 2, BASE: 2 }, format: { intervall: 2, '4x4': 1 }, toppkort: 'volum' },
  { id: 'ro', navn: 'Ro / mindre stress', ikon: 'yoga', mod: { REST: 3, YOGA: 2, STR: 1 }, format: { yin: 2, 'hold-flyt': 1, koherent: 1 }, toppkort: 'kveld' },
  { id: 'hverdag', navn: 'Mer bevegelse i hverdagen', ikon: 'hjerte', mod: { BASE: 2, MOB: 1, alle: 1 }, format: { mikro: 2 }, toppkort: 'volum' },
  { id: 'variasjon', navn: 'Variasjon / lek', ikon: 'terning', mod: { alle: 1 }, format: {}, toppkort: 'overrask' },
];

// --- Skjerm 2: bevegelser du liker (spec: «Movement you enjoy») -------------
const FAVORITT_VALG = ['walk', 'strength', 'bodyweight', 'yoga', 'stretch', 'mobility', 'run', 'bike', 'hiit', 'sport'];

// Forsiktige standardnivåer — beholdes som inert profildata så eldre
// kodeveier (historikk/PR) fortsatt har det de forventer.
export function forsiktigeNivaer() {
  const nivaer = {};
  for (const m of Object.keys(MODALITET_NAVN)) {
    const base = (m === 'SKILL' || m === 'REST' || m === 'PLYO') ? 1 : 2;
    nivaer[m] = { base, xp: 0, bevisTeller: 0, hoyesteBevist: base, verifisert: false, sisteOkt: null };
  }
  return nivaer;
}

// --- Anbefalt ukemiks fra topp-motivasjon (taksonomi §8) --------------------
const UKEMIKS = {
  sterkere: 'Styrke/skills', mestre: 'Styrke/skills',
  kondis: 'Fettap + form', stabil: 'Allsidig helse', variasjon: 'Allsidig helse',
  hverdag: 'Allsidig helse', ro: 'Restitusjonsuke',
};

function motivasjonTilVekter(valgt) {
  // valgt = liste av motivasjon-id-er i rangert rekkefølge (#1 viktigst) → vekt 3/2/1.
  const vekter = {};
  const formatVekter = {};
  const rangvekt = [3, 2, 1];
  valgt.forEach((id, i) => {
    const m = MOTIVASJON.find((x) => x.id === id);
    if (!m) return;
    const rv = rangvekt[i] || 1;
    for (const [mod, v] of Object.entries(m.mod)) {
      if (mod === 'alle') {
        for (const k of Object.keys(MODALITET_NAVN)) vekter[k] = (vekter[k] || 0) + v * rv;
      } else {
        vekter[mod] = (vekter[mod] || 0) + v * rv;
      }
    }
    for (const [fmt, v] of Object.entries(m.format)) formatVekter[fmt] = (formatVekter[fmt] || 0) + v * rv;
  });
  return { vekter, formatVekter };
}

// ---------------------------------------------------------------------------
/**
 * Kjører onboarding inn i et container-element.
 * @param bib biblioteket (for bunkeliste)
 * @param ferdig callback(profil) når brukeren fullfører
 */
export function kjorOnboarding(container, bib, ferdig) {
  const state = {
    steg: 1,
    navn: '',
    motivasjon: [], // rangert liste av id
    favoritter: [],
    ukemaal: 4,
    varighetsklasse: 'standard',
  };

  function ramme(tittel, undertekst, ...innhold) {
    tom(container);
    const prikker = el('div', { class: 'ob-prikker' },
      ...[1, 2, 3, 4].map((n) => el('i', { class: 'ob-prikk' + (n <= state.steg ? ' ob-prikk--på' : '') })),
    );
    container.append(el('div', { class: 'ob' },
      el('header', { class: 'ob__topp' },
        prikker,
        el('h1', { class: 'ob__tittel' }, tittel),
        undertekst && el('p', { class: 'ob__under' }, undertekst),
      ),
      el('div', { class: 'ob__kropp' }, ...innhold),
    ));
  }

  function bunn(tekst, kanGaVidere, videre, tilbake) {
    return el('div', { class: 'ob__bunn' },
      state.steg > 1 && el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: tilbake }, 'Tilbake'),
      el('button', {
        class: 'knapp' + (kanGaVidere ? '' : ' knapp--av'),
        type: 'button',
        disabled: !kanGaVidere,
        onclick: kanGaVidere ? videre : undefined,
      }, tekst),
    );
  }

  // --- Skjerm 1: motivasjon ---
  function skjerm1() {
    ramme('Hva motiverer deg?', 'Velg inntil 3 — trykk i rekkefølge, viktigst først.',
      el('div', { class: 'ob-valg' },
        ...MOTIVASJON.map((m) => {
          const rang = state.motivasjon.indexOf(m.id);
          const valgt = rang >= 0;
          return el('button', {
            class: 'ob-kort' + (valgt ? ' ob-kort--valgt' : ''),
            type: 'button',
            onclick: () => {
              if (valgt) state.motivasjon.splice(rang, 1);
              else if (state.motivasjon.length < 3) state.motivasjon.push(m.id);
              skjerm1();
            },
          },
            el('span', { class: 'ob-kort__ikon' }, ikon(m.ikon)),
            el('span', { class: 'ob-kort__navn' }, m.navn),
            valgt && el('span', { class: 'ob-kort__rang' }, String(rang + 1)),
          );
        }),
      ),
      bunn('Neste', state.motivasjon.length > 0, () => { state.steg = 2; skjerm2(); }),
    );
  }

  // --- Skjerm 2: bevegelser du liker ---
  function skjerm2() {
    ramme('Hvordan liker du å bevege deg?', 'Bevegelse kan være hva som helst du liker. Velg inntil 4.',
      el('div', { class: 'ob-valg' },
        ...FAVORITT_VALG.map((id) => {
          const b = BEVEGELSER[id];
          const valgt = state.favoritter.includes(id);
          return el('button', {
            class: 'ob-kort' + (valgt ? ' ob-kort--valgt' : ''),
            type: 'button',
            onclick: () => {
              if (valgt) state.favoritter = state.favoritter.filter((x) => x !== id);
              else if (state.favoritter.length < 4) state.favoritter.push(id);
              skjerm2();
            },
          },
            el('span', { class: 'ob-kort__ikon' }, ikon(b.ikon)),
            el('span', { class: 'ob-kort__navn' }, b.navn),
          );
        }),
      ),
      bunn('Neste', state.favoritter.length > 0, () => { state.steg = 3; skjerm3(); }, () => { state.steg = 1; skjerm1(); }),
    );
  }

  // --- Skjerm 3: ukemål & tid ---
  function skjerm3() {
    const varigheter = [['Mikro', 'mikro', '5–10 min'], ['Kort', 'kort', '15–20 min'], ['Standard', 'standard', '30–40 min'], ['Lang', 'lang', '45–60 min']];
    ramme('Ukemål & tid', 'Et vennlig mål for rytmen din. Livet går foran — ingenting «ryker».',
      el('div', { class: 'kort' },
        el('h2', {}, 'Dager i bevegelse per uke'),
        el('div', { class: 'chiprad' },
          ...[2, 3, 4, 5, 6].map((n) => chip(String(n), {
            aktiv: state.ukemaal === n, onClick: () => { state.ukemaal = n; skjerm3(); },
          })),
        ),
      ),
      el('div', { class: 'kort' },
        el('h2', {}, 'Vanlig øktlengde'),
        el('div', { class: 'ob-varig' },
          ...varigheter.map(([navn, id, und]) => el('button', {
            class: 'ob-varig__kort' + (state.varighetsklasse === id ? ' ob-varig__kort--valgt' : ''),
            type: 'button', onclick: () => { state.varighetsklasse = id; skjerm3(); },
          }, el('span', { class: 'ob-varig__navn' }, navn), el('span', { class: 'dempet' }, und))),
        ),
        el('p', { class: 'dempet' }, 'Mikro teller like fullt som lang. 7 minutter er 7 minutter.'),
      ),
      bunn('Neste', true, () => { state.steg = 4; skjerm4(); }, () => { state.steg = 2; skjerm2(); }),
    );
  }

  // --- Skjerm 4: oppsummering + navn ---
  function skjerm4() {
    const favNavn = state.favoritter.map((id) => BEVEGELSER[id]?.navn).filter(Boolean);

    ramme('Klar til å bevege deg', 'Alt kan justeres senere i innstillinger.',
      el('div', { class: 'kort' },
        el('h2', {}, 'Din profil'),
        el('input', {
          class: 'sok', type: 'text', placeholder: 'Hva skal vi kalle deg? (valgfritt)',
          value: state.navn, autocomplete: 'given-name', maxlength: '24',
          oninput: (ev) => { state.navn = ev.target.value; },
        }),
        el('p', { style: 'margin-top:10px' }, `Bevegelser du liker: ${favNavn.join(', ')}`),
        el('p', {}, `${state.ukemaal} dager i bevegelse/uke · ${state.varighetsklasse}-lengde`),
        el('p', { class: 'dempet' }, 'Øktbiblioteket har ferdige økter på alle nivåer — velg det som passer dagen.'),
      ),
      bunn('Fullfør', true, () => {
        const profil = byggProfil();
        lagreProfil(profil);
        ferdig(profil);
      }, () => { state.steg = 3; skjerm3(); }),
    );
  }

  function byggProfil() {
    const { vekter, formatVekter } = motivasjonTilVekter(state.motivasjon);
    const topp = state.motivasjon[0];
    return {
      opprettet: new Date().toISOString(),
      navn: state.navn.trim() || null,
      motivasjon: {
        valg: state.motivasjon.slice(),
        vekter,
        formatVekter,
        toppkort: MOTIVASJON.find((m) => m.id === topp)?.toppkort || 'streak',
      },
      bevegelsesFavoritter: state.favoritter.slice(),
      bevegelsesTeller: {},
      figur: standardFigur(),
      nivaer: forsiktigeNivaer(),
      ukemaal: state.ukemaal,
      varighetsklasse: state.varighetsklasse,
      ukemiks: UKEMIKS[topp] || 'Allsidig helse',
      gatewaysPassert: [],
      prs: {},
      settOvelser: {},
      globalXp: 0,
      innstillinger: { brukJern: true, nivaOverstyr: {}, pauseTil: null },
    };
  }

  skjerm1();
}
