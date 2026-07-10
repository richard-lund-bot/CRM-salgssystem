// Øktbiblioteket (M13): kuraterte, true-and-tested økter fra data/okter.json
// erstatter generatoren. Velgeren viser 6 økter per kategori (3 skillnivåer ×
// 2 intensiteter); et trykk konverterer bibliotekøkta til spillerformatet og
// går rett til review → kjøring. Kildene står på hver økt.
import { el, tom, chip, ikon } from './ui.js';
import { settØkt } from './kjor.js';
import { BEVEGELSER, KATEGORI_TIL_BEVEGELSE } from './bevegelse.js';

let _okter = null;

/** Laster biblioteket (kalles ved oppstart, cache i minne + SW). */
export async function lastOkter() {
  if (_okter) return _okter;
  const res = await fetch('data/okter.json');
  if (!res.ok) throw new Error(`Kunne ikke laste øktbiblioteket (${res.status})`);
  _okter = await res.json();
  return _okter;
}

export function hentOkter() { return _okter || []; }
export function oktMedId(id) { return hentOkter().find((o) => o.id === id) || null; }

export const KATEGORIER = [
  { id: 'gatur', navn: 'Gåtur', ikon: 'loper' },
  { id: 'lop', navn: 'Løp', ikon: 'lyn' },
  { id: 'yoga', navn: 'Yoga', ikon: 'yoga' },
  { id: 'styrke', navn: 'Styrke', ikon: 'vekt' },
  { id: 'toying', navn: 'Tøying', ikon: 'blad' },
  { id: 'sykkel', navn: 'Sykkel', ikon: 'sykkel' },
  { id: 'kroppsvekt', navn: 'Kroppsvekt', ikon: 'person' },
  { id: 'mobilitet', navn: 'Mobilitet', ikon: 'repeat' },
  { id: 'hiit', navn: 'HIIT', ikon: 'flamme' },
  { id: 'restitusjon', navn: 'Restitusjon', ikon: 'hjerte' },
];
export const KATEGORI_NAVN = Object.fromEntries(KATEGORIER.map((k) => [k.id, k.navn]));

// Gamle generator-modaliteter → bibliotekkategori (for #/ny-lenker og
// gamle planoppføringer).
export const MODALITET_TIL_KATEGORI = {
  STY: 'styrke', HIIT: 'hiit', BASE: 'gatur', MET: 'hiit', SKILL: 'kroppsvekt',
  PLYO: 'hiit', YOGA: 'yoga', PIL: 'yoga', STR: 'toying', MOB: 'mobilitet',
  CORE: 'kroppsvekt', REST: 'restitusjon', HYB: 'styrke',
};

const SKILL_NAVN = { lav: 'Enkel', medium: 'Middels', hoy: 'Avansert' };
const INTENSITET_NAVN = { lett: 'Rolig', intens: 'Intens' };
const SKILL_REKKE = ['lav', 'medium', 'hoy'];

/** Konverterer en bibliotekøkt til formatet øktspilleren (kjor.js) bruker. */
export function tilSpillerOkt(o, planId = null) {
  return {
    id: `okt-${o.id}-${Date.now()}`,
    bibliotekId: o.id,
    kategori: o.kategori,
    bevegelse: KATEGORI_TIL_BEVEGELSE[o.kategori] || 'custom',
    navn: o.navn,
    beskrivelse: o.beskrivelse,
    kilde: o.kilde,
    varighetMin: o.varighetMin,
    utstyr: o.utstyr || [],
    intensitet: o.intensitet === 'intens' ? 4 : 2,
    planId: planId || undefined,
    blokker: o.blokker,
  };
}

/** Starter en bibliotekøkt: sett som gjeldende og gå til review. */
export function startOkt(oktId, planId = null) {
  const o = oktMedId(oktId);
  if (!o) { location.hash = '#/okter'; return; }
  settØkt(tilSpillerOkt(o, planId));
  location.hash = '#/review';
}

/** Tilfeldig økt («Overrask meg») — holder seg til enkel/middels skill. */
export function tilfeldigOkt() {
  const kandidater = hentOkter().filter((o) => o.skill !== 'hoy');
  return kandidater[Math.floor(Math.random() * kandidater.length)] || null;
}

// ===========================================================================
// Velgeren: #/okter?kat=styrke — kategorichips, skill/intensitet-filter,
// øktkort. #/okter?start=<id>&p=<planId> starter en økt direkte.
// ===========================================================================
export function visOkterSkjerm(mount) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');

  const startId = params.get('start');
  if (startId) { startOkt(startId, params.get('p')); return; }

  const state = {
    kat: KATEGORI_NAVN[params.get('kat')] ? params.get('kat') : 'gatur',
    skill: null,      // null = vis alle
    intensitet: null,
  };

  function tegn() {
    const okter = hentOkter()
      .filter((o) => o.kategori === state.kat)
      .filter((o) => !state.skill || o.skill === state.skill)
      .filter((o) => !state.intensitet || o.intensitet === state.intensitet)
      .sort((a, b) => SKILL_REKKE.indexOf(a.skill) - SKILL_REKKE.indexOf(b.skill)
        || (a.intensitet === 'lett' ? 0 : 1) - (b.intensitet === 'lett' ? 0 : 1));

    const bevegelse = KATEGORI_TIL_BEVEGELSE[state.kat];
    const kanHurtig = BEVEGELSER[bevegelse]?.slag === 'fri';

    tom(mount);
    mount.append(
      el('header', { class: 'topp topp--kjor' },
        el('button', { class: 'topp__tilbake', type: 'button', onclick: () => { location.hash = '#/hjem'; }, title: 'Tilbake' }, '‹'),
        el('div', {},
          el('h1', { class: 'topp__tittel' }, 'Velg økt'),
          el('p', { class: 'topp__under' }, 'Ferdige økter med dokumentert opphav.'),
        ),
      ),
      el('main', { class: 'innhold' },
        el('div', { class: 'chiprad' },
          ...KATEGORIER.map((k) => chip(k.navn, {
            aktiv: state.kat === k.id,
            onClick: () => { state.kat = k.id; state.skill = null; state.intensitet = null; tegn(); },
          })),
        ),
        el('div', { class: 'chiprad' },
          chip('Alle nivåer', { aktiv: !state.skill, onClick: () => { state.skill = null; tegn(); } }),
          ...SKILL_REKKE.map((s) => chip(SKILL_NAVN[s], {
            aktiv: state.skill === s, onClick: () => { state.skill = state.skill === s ? null : s; tegn(); },
          })),
          chip('Rolig', { aktiv: state.intensitet === 'lett', onClick: () => { state.intensitet = state.intensitet === 'lett' ? null : 'lett'; tegn(); } }),
          chip('Intens', { aktiv: state.intensitet === 'intens', onClick: () => { state.intensitet = state.intensitet === 'intens' ? null : 'intens'; tegn(); } }),
        ),
        ...okter.map((o) => oktKort(o)),
        kanHurtig && el('a', { class: 'listerad listerad--enkel', href: `#/hurtig?b=${bevegelse}` },
          el('span', { class: 'listerad__ikon' }, ikon('stoppeklokke')),
          el('span', { class: 'listerad__navn' }, 'Fri økt med timer'),
          el('span', { class: 'listerad__chevron' }, ikon('chevron')),
        ),
        el('a', { class: 'listerad listerad--enkel', href: '#/loggfor' },
          el('span', { class: 'listerad__ikon' }, ikon('penn')),
          el('span', { class: 'listerad__navn' }, 'Logg noe du alt har gjort'),
          el('span', { class: 'listerad__chevron' }, ikon('chevron')),
        ),
      ),
    );
  }

  function oktKort(o) {
    return el('button', {
      class: 'kort oktkort', type: 'button',
      onclick: () => { settØkt(tilSpillerOkt(o)); location.hash = '#/review'; },
    },
      el('div', { class: 'oktkort__topp' },
        el('span', { class: 'oktkort__navn' }, o.navn),
        el('span', { class: 'oktkort__tid' }, `${o.varighetMin} min`),
      ),
      el('p', { class: 'oktkort__beskr' }, o.beskrivelse),
      el('div', { class: 'oktkort__meta' },
        el('span', { class: 'tag tag--mod' }, SKILL_NAVN[o.skill]),
        el('span', { class: 'tag' + (o.intensitet === 'intens' ? ' tag--impact' : '') }, INTENSITET_NAVN[o.intensitet]),
        ...(o.utstyr || []).map((u) => el('span', { class: 'tag' }, u)),
      ),
      o.kilde?.navn && el('p', { class: 'oktkort__kilde' }, `Basert på: ${o.kilde.navn}`),
    );
  }

  tegn();
}
