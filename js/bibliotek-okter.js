// Øktbiblioteket (M13): kuraterte, true-and-tested økter fra data/okter.json
// erstatter generatoren. Velgeren viser 6 økter per kategori (3 skillnivåer ×
// 2 intensiteter); et trykk konverterer bibliotekøkta til spillerformatet og
// går rett til review → kjøring. Kildene står på hver økt.
import { el, tom, chip, ikon } from './ui.js';
import { settØkt } from './kjor.js';
import { BEVEGELSER, KATEGORI_TIL_BEVEGELSE } from './bevegelse.js';
import { lagFaneside } from './banner.js';

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

const SKILL_NAVN = { lav: 'Nybegynner', medium: 'Viderekommen', hoy: 'Erfaren' };
const SKILL_REKKE = ['lav', 'medium', 'hoy'];

// Sidetittel per kategori («Styrkebibliotek»-stilen fra skissen).
const KATEGORI_TITTEL = {
  gatur: 'Gåturbibliotek', lop: 'Løpebibliotek', yoga: 'Yogabibliotek',
  styrke: 'Styrkebibliotek', toying: 'Tøyebibliotek', sykkel: 'Sykkelbibliotek',
  kroppsvekt: 'Kroppsvektbibliotek', mobilitet: 'Mobilitetsbibliotek',
  hiit: 'HIIT-bibliotek', restitusjon: 'Restitusjonsbibliotek',
};

// Kortene sykler gjennom flis-paletten fra hjemskjermen så radene blir
// fargerike (som i skissen) — deterministisk, så en rad ser lik ut hver gang.
const PALETT = ['lime', 'teal', 'gul', 'koral', 'blaa', 'lilla', 'oransje', 'indigo'];

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
// Biblioteket: #/okter?kat=styrke (fra hjem-flisene) og #/beveg (Beveg-
// fanen) — samme skjerm, med faneside-skallet øverst (banner m/ kalender-
// knapp, dagsfasebilde, pull-to-refresh) og ukeskalender der dagene har
// bibliotekets aksjoner: bakover = logg en glemt økt, i dag = start en økt
// (skroll til bolkene), fremover = planlegg. Frostet filterknapp på linje
// med sidetittelen; horisontalt skrollbare bolker per ferdighetsnivå, kort
// i hjemflis-stilen. #/okter?start=<id>&p=<planId> starter direkte.
// ===========================================================================
function isoIdag() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function visOkterSkjerm(mount) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');

  const startId = params.get('start');
  if (startId) { startOkt(startId, params.get('p')); return; }

  const state = {
    kat: KATEGORI_NAVN[params.get('kat')] ? params.get('kat') : null, // null = alle typer
    skill: null,       // null = alle nivåer
    filterApen: false, // panelet er skjult til filterknappen åpner det
  };

  function utstyrTekst(o) {
    const u = o.utstyr || [];
    if (!u.length) return 'Uten utstyr';
    const første = u[0].replaceAll('-', ' ');
    const tekst = første.charAt(0).toUpperCase() + første.slice(1);
    return u.length > 1 ? `${tekst} +${u.length - 1}` : tekst;
  }

  function bibKort(o, farge) {
    const ikonNavn = KATEGORIER.find((k) => k.id === o.kategori)?.ikon || 'stjerne';
    return el('button', {
      class: `bibkort movflis--${farge}`, type: 'button',
      onclick: () => { settØkt(tilSpillerOkt(o)); location.hash = '#/review'; },
    },
      el('span', { class: 'bibkort__bak' }, ikon(ikonNavn)),
      el('span', { class: 'bibkort__ikon' }, ikon(ikonNavn)),
      el('span', { class: 'bibkort__navn' }, o.navn),
      el('span', { class: 'bibkort__beskr' }, o.beskrivelse),
      o.kilde?.navn && el('span', { class: 'bibkort__kilde' }, `Basert på ${o.kilde.navn}`),
      el('span', { class: 'bibkort__meta' },
        el('span', { class: 'bibkort__tag' }, ikon('klokke'), `${o.varighetMin} min`),
        el('span', { class: 'bibkort__tag' }, utstyrTekst(o)),
      ),
      el('span', { class: 'bibkort__nivaer' },
        el('span', { class: 'bibkort__pille' + (o.intensitet === 'lett' ? ' bibkort__pille--aktiv' : '') }, 'Rolig'),
        el('span', { class: 'bibkort__pille' + (o.intensitet === 'intens' ? ' bibkort__pille--aktiv' : '') }, 'Intens'),
      ),
      el('span', { class: 'bibkort__start' }, 'Start'),
    );
  }

  function bolk(skill, radIdx) {
    const okter = hentOkter()
      .filter((o) => o.skill === skill)
      .filter((o) => !state.kat || o.kategori === state.kat)
      .sort((a, b) => KATEGORIER.findIndex((k) => k.id === a.kategori) - KATEGORIER.findIndex((k) => k.id === b.kategori)
        || (a.intensitet === 'lett' ? 0 : 1) - (b.intensitet === 'lett' ? 0 : 1));
    if (!okter.length) return null;
    return el('section', { class: 'bibbolk' },
      el('h2', { class: 'bibbolk__tittel' }, SKILL_NAVN[skill]),
      el('div', { class: 'bibbolk__rad' },
        ...okter.map((o, i) => bibKort(o, PALETT[(radIdx * 3 + i) % PALETT.length])),
      ),
    );
  }

  function filterPanel() {
    return el('div', { class: 'kort bibfilter' },
      el('h2', {}, 'Type bevegelse'),
      el('div', { class: 'chiprad' },
        chip('Alle', { aktiv: !state.kat, onClick: () => { state.kat = null; tegn(); } }),
        ...KATEGORIER.map((k) => chip(k.navn, {
          aktiv: state.kat === k.id, onClick: () => { state.kat = k.id; tegn(); },
        })),
      ),
      el('h2', {}, 'Ferdighetsnivå'),
      el('div', { class: 'chiprad' },
        chip('Alle', { aktiv: !state.skill, onClick: () => { state.skill = null; tegn(); } }),
        ...SKILL_REKKE.map((s) => chip(SKILL_NAVN[s], {
          aktiv: state.skill === s, onClick: () => { state.skill = state.skill === s ? null : s; tegn(); },
        })),
      ),
    );
  }

  function lenkerad(ikonNavn, tekst, href) {
    return el('a', { class: 'listerad', href },
      el('span', { class: 'listerad__ikon' }, ikon(ikonNavn)),
      el('span', { class: 'listerad__navn' }, tekst),
      el('span', { class: 'listerad__chevron' }, ikon('chevron')),
    );
  }

  // Ukeskalenderens dager: bakover → logg en glemt økt på den datoen,
  // fremover → planlegg i kalenderen, i dag → start en økt (skroll til bolkene).
  function dagAksjon(iso) {
    const idag = isoIdag();
    if (iso < idag) location.hash = `#/loggfor?d=${iso}`;
    else if (iso > idag) location.hash = `#/kalender?d=${iso}`;
    else document.querySelector('.bibbolk')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Frostet, rund filterknapp — ligger på linje med sidetittelen, ikke i
  // banneret, så banneret beholder kalenderknappen som på de andre fanene.
  const filterKnapp = el('button', {
    class: 'ikonknapp ikonknapp--frostet', type: 'button', 'aria-label': 'Filter',
    onclick: () => { state.filterApen = !state.filterApen; tegn(); },
  }, ikon('filter'));

  const rot = el('div', { class: 'bib' });
  lagFaneside(mount, { dagAksjon }).append(rot);

  function tegn() {
    const bevegelse = KATEGORI_TIL_BEVEGELSE[state.kat];
    const kanHurtig = !state.kat || BEVEGELSER[bevegelse]?.slag === 'fri';
    const nivaer = state.skill ? [state.skill] : SKILL_REKKE;
    filterKnapp.classList.toggle('ikonknapp--aktiv', state.filterApen || !!(state.kat || state.skill));

    tom(rot);
    rot.append(
      el('div', { class: 'bibhero' },
        el('div', { class: 'bibhero__titler' },
          el('h1', { class: 'bibhero__tittel' }, KATEGORI_TITTEL[state.kat] || 'Øktbiblioteket'),
          el('p', { class: 'bibhero__under' }, 'Velg en økt som passer dagen din.'),
        ),
        filterKnapp,
      ),
      el('main', { class: 'innhold bib__innhold' },
        state.filterApen && filterPanel(),
        ...nivaer.map((s, i) => bolk(s, i)),
        el('div', { class: 'kort' },
          el('div', { class: 'liste' },
            kanHurtig && lenkerad('stoppeklokke', 'Fri økt med timer', `#/hurtig${bevegelse ? `?b=${bevegelse}` : ''}`),
            lenkerad('penn', 'Logg noe du alt har gjort', '#/loggfor'),
            lenkerad('kalender', 'Planlagte økter', '#/kalender'),
          ),
        ),
      ),
    );
  }

  tegn();
}
