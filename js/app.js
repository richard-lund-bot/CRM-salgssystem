// App-inngang for Treningsapp v2 — M1-skjelett.
// Ansvar i M1: registrere service worker, laste biblioteket offline-first,
// og vise en fungerende bibliotek-utforsker som beviser at datalaget er komplett.
// Onboarding (M3), generator (M3) og logging (M4) legges på i senere milepæler.
import { lastBibliotek, modalitetsoversikt, MODALITET_NAVN, MONSTER_NAVN } from './library.js';
import { hentProfil } from './store.js';
import { el, tom, chip } from './ui.js';
import { APP_VERSION } from './config.js';

const app = document.getElementById('app');
let bib = null;

// --- Ruter (hash-basert) ---
const ruter = {
  hjem: visHjem,
  bibliotek: visBibliotek,
  kjeder: visKjeder,
  om: visOm,
};

function navger() {
  const rute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
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
  const teller = modalitetsoversikt(bib);
  const totalt = bib.exercises.length;
  const profil = hentProfil();

  const stat = (tall, tekst) => el('div', { class: 'stat' },
    el('div', { class: 'stat__tall' }, String(tall)),
    el('div', { class: 'stat__tekst' }, tekst),
  );

  skjerm('Treningsapp',
    !profil && el('div', { class: 'kort kort--info' },
      el('p', {}, 'Velkommen. Onboarding, generator og logging kommer i neste milepæl.'),
      el('p', { class: 'dempet' }, 'Nå kan du utforske hele øvelsesbiblioteket som er bygget inn.'),
    ),
    el('div', { class: 'statrad' },
      stat(totalt, 'øvelser'),
      stat(bib.chains.length, 'progresjonskjeder'),
      stat(bib.equipment.length, 'utstyr'),
      stat(bib.templates.length, 'øktmaler'),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Biblioteket'),
      el('div', { class: 'modliste' },
        ...Object.entries(teller).sort((a, b) => b[1] - a[1]).map(([m, n]) =>
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
        el('a', { class: 'knapp', href: '#/bibliotek' }, 'Utforsk øvelser'),
        el('a', { class: 'knapp knapp--sekundaer', href: '#/kjeder' }, 'Progresjonskjeder'),
      ),
    ),
  );
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
  skjerm('Om',
    el('div', { class: 'kort' },
      el('h2', {}, 'Treningsapp v2'),
      el('p', {}, 'Milepæl 1: skjelett + datakonvertering. Bygget som PWA i vanilla HTML/CSS/JS.'),
      el('p', { class: 'dempet' }, `Versjon ${APP_VERSION}`),
      el('p', { class: 'dempet' }, `${bib.exercises.length} øvelser · ${bib.chains.length} kjeder · ${bib.formats.length} formater · ${bib.templates.length} maler · ${bib.gateways.length} gateways · ${bib.sequences.length} sekvenser.`),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Neste milepæler'),
      el('ul', {},
        el('li', {}, 'M2: Supabase-skjema for brukertilstand'),
        el('li', {}, 'M3: Onboarding + generator + kjøre-UI'),
        el('li', {}, 'M4: Logging, nivåsystem, historikk'),
      ),
    ),
  );
}

// --- Tab-bar ---
function byggTabbar() {
  const tab = (rute, ikon, tekst) => el('a', {
    class: 'tabbar__knapp', href: `#/${rute}`, 'data-rute': rute,
  }, el('span', { class: 'tabbar__ikon' }, ikon), el('span', { class: 'tabbar__tekst' }, tekst));

  document.body.append(el('nav', { class: 'tabbar' },
    tab('hjem', '🏠', 'Hjem'),
    tab('bibliotek', '📚', 'Bibliotek'),
    tab('kjeder', '🪜', 'Kjeder'),
    tab('om', 'ℹ️', 'Om'),
  ));
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
  byggTabbar();
  window.addEventListener('hashchange', navger);
  navger();
}

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW-registrering feilet', e));
  });
}

start();
