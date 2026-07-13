// Ferdighetsstier (Fase 0 — spike). En «sti» er en progresjonskjede
// (data/chains.json) presentert som en vertikal læringssti: trinn for trinn
// fra lett til vanskelig. Innholdet per trinn kommer fra data/stier.json
// (kuratert intro + korte trinn-tekster) koblet mot øvelsesoppslaget
// (exercises.json via library.js). Å trykke på et trinn åpner det
// eksisterende øvelses-bunnarket (js/ovelse.js) — full gjenbruk.
//
// Fase 0 er ren lesing: ingen fullførings-/mestringsstatus ennå. Det kommer
// i Fase 1 (synket framgang + XP + opplåsing).
import { el, tom, ikon } from './ui.js';
import { ovelseInfo, ovelseBilde, visOvelseArk } from './ovelse.js';

let _stier = null;
let _kjeder = null;
let _bib = null;

/** Kobler biblioteket inn (kalles fra app.js ved oppstart). */
export function settBib(bib) { _bib = bib; }

/** Laster sti-definisjonene (kalles ved oppstart; cache i minne + SW). */
export async function lastStier() {
  if (_stier) return _stier;
  const res = await fetch('data/stier.json');
  if (!res.ok) throw new Error(`Kunne ikke laste stier (${res.status})`);
  _stier = await res.json();
  return _stier;
}

/** Laster progresjonskjedene (data/chains.json — ellers ubrukt i dag). */
export async function lastKjeder() {
  if (_kjeder) return _kjeder;
  const res = await fetch('data/chains.json');
  if (!res.ok) throw new Error(`Kunne ikke laste kjeder (${res.status})`);
  _kjeder = await res.json();
  return _kjeder;
}

export function alleStier() { return _stier || []; }
function finnSti(id) { return (_stier || []).find((s) => s.id === id) || null; }
function finnKjede(id) { return (_kjeder || []).find((k) => k.id === id) || null; }

// Nivå 1–5 → ord + fargeklasse (brukes på pin og pille).
const NIVA = {
  1: { ord: 'Helt fersk', klasse: 'sti-niv--1' },
  2: { ord: 'Nybegynner', klasse: 'sti-niv--2' },
  3: { ord: 'Viderekommen', klasse: 'sti-niv--3' },
  4: { ord: 'Erfaren', klasse: 'sti-niv--4' },
  5: { ord: 'Avansert', klasse: 'sti-niv--5' },
};

// --- Inngangskort til Lær-feeden -----------------------------------------
/** Ferdig «Ny: Ferdighetssti»-kort som Lær-skjermen kan vise øverst. */
export function stiInngang() {
  const sti = (_stier || [])[0];
  if (!sti) return null;
  return el('a', { class: 'stikort', href: `#/sti?id=${encodeURIComponent(sti.id)}` },
    el('span', { class: 'stikort__merke' }, 'Nytt'),
    el('div', { class: 'stikort__ikon' }, ikon(sti.ikon || 'vekt')),
    el('div', { class: 'stikort__kropp' },
      el('span', { class: 'stikort__over' }, 'Ferdighetssti'),
      el('h2', { class: 'stikort__tittel' }, sti.tittel),
      el('p', { class: 'stikort__under' }, sti.undertittel),
    ),
    el('span', { class: 'stikort__pil' }, ikon('chevron')),
  );
}

// --- Sti-skjerm (#/sti?id=) ----------------------------------------------
export function visStiSkjerm(mount) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const sti = finnSti(params.get('id') || '');
  if (!sti) { location.hash = '#/laer'; return; }
  const kjede = finnKjede(sti.kjede);
  const ledd = (kjede?.ledd || []).slice().sort((a, b) => a.pos - b.pos);

  tom(mount);
  mount.append(
    el('header', { class: 'topp topp--kjor' },
      el('button', { class: 'topp__tilbake', type: 'button', title: 'Tilbake', onclick: () => history.back() }, '‹'),
      el('div', {},
        el('h1', { class: 'topp__tittel' }, 'Ferdighetssti'),
        el('p', { class: 'topp__under' }, `${ledd.length} trinn`),
      ),
    ),
    el('main', { class: 'innhold innhold--ovelse' },
      el('div', { class: 'sti-hero' },
        el('div', { class: 'sti-hero__ikon' }, ikon(sti.ikon || 'vekt')),
        el('h1', { class: 'sti-hero__tittel' }, sti.tittel),
        el('p', { class: 'sti-hero__intro' }, sti.intro),
      ),
      el('div', { class: 'sti' }, ...ledd.map((l, i) => stiNode(sti, l, i))),
      el('p', { class: 'sti-fot dempet' }, 'Snart: merk trinn som mestret og lås opp veien videre.'),
    ),
  );
}

function stiNode(sti, ledd, i) {
  const e = _bib?.ovelse(ledd.ovelse);
  const navn = e?.navn || ledd.ovelse;
  const niva = NIVA[ledd.niva] || NIVA[1];
  const blurb = sti.trinn?.[ledd.ovelse] || ovelseInfo(navn)?.kort || '';
  const bilde = ovelseBilde(navn);

  const node = el('button', { class: 'sti-node', type: 'button' },
    el('span', { class: `sti-node__pin ${niva.klasse}` }, String(i + 1)),
    el('div', { class: 'sti-node__kropp' },
      el('div', { class: 'sti-node__hode' },
        el('span', { class: 'sti-node__navn' }, navn),
        el('span', { class: `sti-niv ${niva.klasse}` }, niva.ord),
      ),
      blurb ? el('p', { class: 'sti-node__blurb' }, blurb) : null,
    ),
    bilde
      ? el('span', { class: 'sti-node__bilde', style: `background-image:url('bilder/ovelser/${bilde}.webp')` })
      : el('span', { class: 'sti-node__gaa' }, ikon('info')),
  );
  node.addEventListener('click', () => visOvelseArk(navn));
  return node;
}
