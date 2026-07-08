// App-inngang for Treningsapp v2.
// M1: PWA-skjelett + bibliotek-utforsker. M3: onboarding (gate ved oppstart),
// generator, review og kjøre-UI. Onboarding kjøres første gang; deretter viser
// hjem et adaptivt «Dagens forslag»-kort med én-trykks start.
import { lastBibliotek, modalitetsoversikt, MODALITET_NAVN, MONSTER_NAVN } from './library.js';
import { hentProfil, harProfil, hentSistLokasjon, lagreSistLokasjon, nivaFor } from './store.js';
import { el, tom, chip } from './ui.js';
import { APP_VERSION } from './config.js';
import { kjorOnboarding } from './onboarding.js';
import { settBib, visGeneratorSkjerm, visReviewSkjerm, visKjoreSkjerm } from './kjor.js';

const app = document.getElementById('app');
let bib = null;

// --- Ruter (hash-basert) ---
const ruter = {
  hjem: visHjem,
  ny: () => visGeneratorSkjerm(app, lesForhandsvalg()),
  review: () => visReviewSkjerm(app),
  kjor: () => visKjoreSkjerm(app),
  bibliotek: visBibliotek,
  kjeder: visKjeder,
  om: visOm,
};

// Ruter uten tab-bar (fokusmodus: generator, review, kjøring).
const FOKUS = new Set(['ny', 'review', 'kjor']);

function lesForhandsvalg() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const v = {};
  if (params.get('m')) v.modalitet = params.get('m');
  return v;
}

function navger() {
  const rute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
  document.body.classList.toggle('fokusmodus', FOKUS.has(rute));
  (ruter[rute] || visHjem)();
  oppdaterNav(rute);
}

function oppdaterNav(rute) {
  document.querySelectorAll('.tabbar__knapp').forEach((b) => {
    b.classList.toggle('tabbar__knapp--aktiv', b.dataset.rute === rute);
  });
}

// --- Skjermer ---
function skjerm(tittel, ...innhold) {
  tom(app);
  app.append(
    el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, tittel)),
    el('main', { class: 'innhold' }, ...innhold),
  );
}

function visHjem() {
  const profil = hentProfil();
  const teller = modalitetsoversikt(bib);
  const totalt = bib.exercises.length;

  skjerm('Treningsapp',
    profil ? dagensForslag(profil) : velkommenKort(),
    profil && nivaSammendrag(profil),
    el('div', { class: 'kort' },
      el('h2', {}, 'Biblioteket'),
      el('div', { class: 'modliste' },
        ...Object.entries(teller).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([m, n]) =>
          el('a', { class: 'modrad', href: `#/bibliotek?m=${m}` },
            el('span', { class: 'modrad__navn' }, MODALITET_NAVN[m] || m),
            el('span', { class: 'modrad__tall' }, String(n)),
          ),
        ),
      ),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Snarveier'),
      el('div', { class: 'knapprad' },
        el('a', { class: 'knapp knapp--sekundaer', href: '#/bibliotek' }, `Utforsk ${totalt} øvelser`),
        el('a', { class: 'knapp knapp--sekundaer', href: '#/kjeder' }, 'Progresjonskjeder'),
      ),
    ),
  );
}

function velkommenKort() {
  return el('div', { class: 'kort kort--info' },
    el('h2', {}, 'Velkommen 👋'),
    el('p', {}, 'La oss sette opp profilen din — under 2 minutter.'),
    el('button', { class: 'knapp', type: 'button', onclick: startOnboarding }, 'Kom i gang'),
  );
}

// Adaptivt hero-kort: foreslått økt + én-trykks start + lokasjonsvelger.
function dagensForslag(profil) {
  const modalitet = foreslaModalitet(profil);
  const varighet = profil.varighetsklasse || 'standard';
  const lokasjoner = (profil.lokasjoner || []).map((l) => l.navn);
  const aktiv = hentSistLokasjon() || profil.aktivLokasjon || lokasjoner[0];

  return el('div', { class: 'kort hero' },
    el('p', { class: 'hero__eyebrow' }, 'Dagens forslag'),
    el('h2', { class: 'hero__tittel' }, `${MODALITET_NAVN[modalitet] || modalitet} · ${varighetNavn(varighet)}`),
    el('p', { class: 'dempet' }, ukemiksTekst(profil)),
    lokasjoner.length > 1 && el('div', { class: 'chiprad hero__lok' },
      ...lokasjoner.map((navn) => chip(navn, {
        aktiv: aktiv === navn,
        onClick: () => { lagreSistLokasjon(navn); visHjem(); },
      })),
    ),
    el('div', { class: 'knapprad' },
      el('button', { class: 'knapp', type: 'button', onclick: () => {
        location.hash = `#/ny?m=${modalitet}`;
      } }, 'Sett opp økt ▶'),
    ),
  );
}

function nivaSammendrag(profil) {
  const rekke = ['STY', 'HIIT', 'CORE', 'YOGA', 'STR'];
  return el('div', { class: 'kort' },
    el('h2', {}, 'Nivå'),
    el('div', { class: 'nivliste' },
      ...rekke.map((m) => el('div', { class: 'nivkort' },
        el('span', { class: 'nivkort__navn' }, MODALITET_NAVN[m] || m),
        el('span', { class: 'niva' }, ...[1, 2, 3, 4, 5].map((k) =>
          el('i', { class: 'niva__p' + (k <= nivaFor(profil, m) ? ' niva__p--på' : '') }))),
      )),
    ),
    el('p', { class: 'dempet' }, 'Uverifisert til første loggede bevis (M4).'),
  );
}

function foreslaModalitet(profil) {
  const medMal = new Set(bib.templates.map((t) => t.modalitet));
  const vekter = profil.motivasjon?.vekter || {};
  let best = 'STY';
  let bestV = -Infinity;
  for (const m of medMal) {
    const v = vekter[m] || 0;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}

function varighetNavn(k) {
  return { mikro: '5–10 min', kort: '15–20 min', standard: '30–40 min', lang: '45–60 min' }[k] || k;
}

function ukemiksTekst(profil) {
  return `${profil.ukemiks || 'Allsidig helse'} · mål ${profil.ukemaal || 4} økter/uke`;
}

function visBibliotek() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  let valgtMod = params.get('m') || null;
  let sok = '';

  const liste = el('div', { class: 'ovelseliste' });
  const tellerTekst = el('p', { class: 'dempet' });

  function tegn() {
    let ovelser = bib.exercises;
    if (valgtMod) ovelser = ovelser.filter((e) => e.modaliteter.includes(valgtMod));
    if (sok) {
      const q = sok.toLowerCase();
      ovelser = ovelser.filter((e) => e.navn.toLowerCase().includes(q) || (MONSTER_NAVN[e.monster] || '').toLowerCase().includes(q));
    }
    tellerTekst.textContent = `${ovelser.length} øvelser`;
    tom(liste);
    for (const e of ovelser.slice(0, 300)) liste.append(ovelseKort(e));
    if (ovelser.length > 300) liste.append(el('p', { class: 'dempet' }, `… viser 300 av ${ovelser.length}`));
    if (!ovelser.length) liste.append(el('p', { class: 'dempet' }, 'Ingen treff.'));
  }

  const modChips = el('div', { class: 'chiprad' },
    chip('Alle', { aktiv: !valgtMod, onClick: () => { valgtMod = null; oppdaterChips(); tegn(); } }),
    ...Object.keys(MODALITET_NAVN).filter((m) => bib.exercises.some((e) => e.modaliteter.includes(m))).map((m) =>
      chip(MODALITET_NAVN[m], { aktiv: valgtMod === m, onClick: () => { valgtMod = m; oppdaterChips(); tegn(); } }),
    ),
  );
  function oppdaterChips() {
    [...modChips.children].forEach((c, i) => {
      const m = i === 0 ? null : Object.keys(MODALITET_NAVN).filter((x) => bib.exercises.some((e) => e.modaliteter.includes(x)))[i - 1];
      c.classList.toggle('chip--aktiv', m === valgtMod);
    });
  }

  const sokefelt = el('input', {
    class: 'sok', type: 'search', placeholder: 'Søk øvelse…', value: sok,
    oninput: (ev) => { sok = ev.target.value; tegn(); },
  });

  skjerm('Bibliotek', sokefelt, modChips, tellerTekst, liste);
  tegn();
}

function ovelseKort(e) {
  const nivaPrikker = el('span', { class: 'niva', title: `Nivå ${e.niva}` },
    ...[1, 2, 3, 4, 5].map((n) => el('i', { class: 'niva__p' + (n <= e.niva ? ' niva__p--på' : '') })),
  );
  const utstyr = [...new Set(e.varianter.flatMap((v) => v.utstyr))]
    .map((u) => bib.utstyrMap.get(u)?.navn || u).slice(0, 4).join(', ');

  return el('div', { class: 'ovelse' },
    el('div', { class: 'ovelse__topp' },
      el('span', { class: 'ovelse__navn' }, e.navn),
      nivaPrikker,
    ),
    el('div', { class: 'ovelse__meta' },
      el('span', { class: 'tag' }, MONSTER_NAVN[e.monster] || e.monster),
      ...e.modaliteter.map((m) => el('span', { class: 'tag tag--mod' }, m)),
      e.unilateral && el('span', { class: 'tag tag--u' }, 'per side'),
      e.impact === 'hoy' && el('span', { class: 'tag tag--impact' }, 'høy impact'),
    ),
    utstyr && el('div', { class: 'ovelse__utstyr' }, utstyr),
    e.kjede && el('div', { class: 'ovelse__kjede' }, `${bib.kjedeMap.get(e.kjede)?.navn || e.kjede} · steg ${e.kjedePos}`),
  );
}

function visKjeder() {
  skjerm('Progresjonskjeder',
    el('p', { class: 'dempet' }, `${bib.chains.length} kjeder — ryggraden i nivåsystemet.`),
    ...bib.chains.map((c) => el('div', { class: 'kort' },
      el('h2', {}, c.navn),
      el('ol', { class: 'kjede' },
        ...c.ledd.map((l) => {
          const o = bib.ovelse(l.ovelse);
          return el('li', { class: 'kjede__ledd' },
            el('span', { class: 'kjede__navn' }, o ? o.navn : l.ovelse),
            el('span', { class: 'kjede__niva' }, `nv ${l.niva}`),
          );
        }),
      ),
    )),
  );
}

function visOm() {
  const profil = hentProfil();
  skjerm('Om',
    el('div', { class: 'kort' },
      el('h2', {}, 'Treningsapp v2'),
      el('p', {}, 'Milepæl 3: onboarding, generator og kjøre-UI. Bygget som PWA i vanilla HTML/CSS/JS.'),
      el('p', { class: 'dempet' }, `Versjon ${APP_VERSION}`),
      el('p', { class: 'dempet' }, `${bib.exercises.length} øvelser · ${bib.chains.length} kjeder · ${bib.formats.length} formater · ${bib.templates.length} maler · ${bib.gateways.length} gateways · ${bib.sequences.length} sekvenser.`),
    ),
    profil && el('div', { class: 'kort' },
      el('h2', {}, 'Profil'),
      el('p', { class: 'dempet' }, `Motivasjon: ${(profil.motivasjon?.valg || []).join(', ') || '–'}`),
      el('p', { class: 'dempet' }, `Ukemål ${profil.ukemaal} · ${profil.ukemiks}`),
      el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: startOnboarding }, 'Ta profilen på nytt'),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Neste milepæl'),
      el('ul', {}, el('li', {}, 'M4: Logging, XP, nivåsystem, gateways og historikk')),
    ),
  );
}

// --- Tab-bar ---
function byggTabbar() {
  if (document.querySelector('.tabbar')) return;
  const tab = (rute, ikon, tekst) => el('a', {
    class: 'tabbar__knapp', href: `#/${rute}`, 'data-rute': rute,
  }, el('span', { class: 'tabbar__ikon' }, ikon), el('span', { class: 'tabbar__tekst' }, tekst));

  document.body.append(el('nav', { class: 'tabbar' },
    tab('hjem', '🏠', 'Hjem'),
    tab('ny', '⚡', 'Trene'),
    tab('bibliotek', '📚', 'Bibliotek'),
    tab('kjeder', '🪜', 'Kjeder'),
    tab('om', 'ℹ️', 'Om'),
  ));
}

// --- Onboarding ---
function startOnboarding() {
  document.body.classList.add('fokusmodus');
  kjorOnboarding(app, bib, () => {
    document.body.classList.remove('fokusmodus');
    byggTabbar();
    location.hash = '#/hjem';
    navger();
  });
}

// --- Oppstart ---
async function start() {
  try {
    bib = await lastBibliotek();
  } catch (e) {
    tom(app);
    app.append(el('div', { class: 'kort kort--info' },
      el('h2', {}, 'Kunne ikke laste biblioteket'),
      el('p', { class: 'dempet' }, e.message),
    ));
    return;
  }
  settBib(bib);
  window.addEventListener('hashchange', navger);

  if (!harProfil()) {
    startOnboarding();
    return;
  }
  byggTabbar();
  navger();
}

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW-registrering feilet', e));
  });
}

start();
