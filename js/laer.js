// Lær (M18) — et kompendium av læringsartikler. Feed med nyeste øverst,
// tags, headerbilde, tittel og undertittel. Favoritter lagres lokalt og kan
// filtreres på. Innholdet bor i data/artikler.json (bilder i bilder/artikler).
import { el, tom, ikon } from './ui.js';
import { fanesideMedTittel } from './banner.js';

let _artikler = null;
const LS_FAV = 'trening.artikkelfav';

/** Laster artiklene (kalles ved oppstart; cache i minne + SW). */
export async function lastArtikler() {
  if (_artikler) return _artikler;
  const res = await fetch('data/artikler.json');
  if (!res.ok) throw new Error(`Kunne ikke laste artikler (${res.status})`);
  _artikler = await res.json();
  return _artikler;
}

function sortert() {
  return (_artikler || []).slice().sort((a, b) => String(b.dato).localeCompare(String(a.dato)));
}
function finn(id) { return (_artikler || []).find((a) => a.id === id) || null; }

// --- Favoritter -----------------------------------------------------------
function lesFav() { try { return JSON.parse(localStorage.getItem(LS_FAV) || '[]') || []; } catch { return []; } }
function skrivFav(a) { try { localStorage.setItem(LS_FAV, JSON.stringify(a)); } catch { /* valgfri */ } }
export function erFavoritt(id) { return lesFav().includes(id); }
export function vekslFavoritt(id) {
  const f = lesFav();
  const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  skrivFav(f);
  return i < 0; // true = ble favoritt
}

// --- Delte byggeklosser ---------------------------------------------------
function tags(a) {
  return el('div', { class: 'artkort__tags' }, ...(a.tags || []).map((t) => el('span', { class: 'arttag' }, t)));
}
function metaTekst(a) {
  const d = a.dato ? new Date(a.dato).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) : '';
  return [d, a.lesetid ? `${a.lesetid} min` : ''].filter(Boolean).join(' · ');
}
function bakgrunn(a) {
  return a.bilde ? `background-image:url('bilder/artikler/${a.bilde}.webp')` : '';
}
function favKnapp(id, påEndring) {
  const k = el('button', { class: 'artfav' + (erFavoritt(id) ? ' artfav--på' : ''), type: 'button', 'aria-label': 'Favoritt' },
    ikon('hjerte'));
  k.addEventListener('click', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    const på = vekslFavoritt(id);
    k.classList.toggle('artfav--på', på);
    påEndring?.(på);
  });
  return k;
}

// --- Feed-kort ------------------------------------------------------------
function artKort(a, påFavEndring) {
  return el('a', { class: 'artkort', href: `#/artikkel?id=${encodeURIComponent(a.id)}` },
    el('div', { class: 'artkort__bilde', style: bakgrunn(a) }),
    el('div', { class: 'artkort__kropp' },
      tags(a),
      el('h2', { class: 'artkort__tittel' }, a.tittel),
      el('p', { class: 'artkort__under' }, a.undertittel),
      el('div', { class: 'artkort__fot' },
        el('span', { class: 'artkort__meta' }, metaTekst(a)),
        favKnapp(a.id, påFavEndring),
      ),
    ),
  );
}

// --- Lær-feed (#/laer) ----------------------------------------------------
export function visLaerSkjerm(mount) {
  let filter = 'alle';
  const liste = el('div', { class: 'artliste' });
  const chipAlle = el('button', { class: 'artchip', type: 'button' }, 'Alle');
  const chipFav = el('button', { class: 'artchip', type: 'button' }, ikon('hjerte', 'ikon ikon--liten'), ' Favoritter');

  function tegn() {
    tom(liste);
    const alle = sortert();
    const vis = filter === 'fav' ? alle.filter((a) => erFavoritt(a.id)) : alle;
    if (!vis.length) {
      liste.append(el('div', { class: 'kort tomstyrke' },
        el('span', { class: 'tomstyrke__disk' }, ikon('hjerte')),
        el('p', { class: 'oppmuntring__tittel' }, 'Ingen favoritter ennå'),
        el('p', { class: 'dempet' }, 'Trykk hjertet på en artikkel for å ta vare på den til senere.'),
      ));
      return;
    }
    vis.forEach((a) => liste.append(artKort(a, () => { if (filter === 'fav') tegn(); })));
  }
  function settFilter(f) {
    filter = f;
    chipAlle.classList.toggle('artchip--valgt', f === 'alle');
    chipFav.classList.toggle('artchip--valgt', f === 'fav');
    tegn();
  }
  chipAlle.addEventListener('click', () => settFilter('alle'));
  chipFav.addEventListener('click', () => settFilter('fav'));

  fanesideMedTittel(mount, { tittel: 'Lær', under: 'Et lite kompendium — les når det passer.' })
    .append(el('div', { class: 'artfilter' }, chipAlle, chipFav), liste);
  settFilter('alle');
}

// --- Artikkelleser (#/artikkel?id=) --------------------------------------
export function visArtikkelSkjerm(mount) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const a = finn(params.get('id') || '');
  if (!a) { location.hash = '#/laer'; return; }

  tom(mount);
  mount.append(
    el('header', { class: 'topp topp--kjor' },
      el('button', { class: 'topp__tilbake', type: 'button', title: 'Tilbake', onclick: () => history.back() }, '‹'),
      el('div', {},
        el('h1', { class: 'topp__tittel' }, 'Lær'),
        el('p', { class: 'topp__under' }, metaTekst(a)),
      ),
      favKnapp(a.id),
    ),
    el('main', { class: 'innhold innhold--ovelse' },
      el('div', { class: 'arthero', style: bakgrunn(a) }),
      tags(a),
      el('h1', { class: 'arttittel' }, a.tittel),
      el('p', { class: 'artunder' }, a.undertittel),
      el('div', { class: 'artkropp' }, ...(a.avsnitt || []).map((b) => (
        b.h ? el('h2', { class: 'artkropp__h' }, b.h) : el('p', { class: 'artkropp__p' }, b.p)
      ))),
      kilderSeksjon(a),
    ),
  );
}

// --- Kilder / videre lesning ---------------------------------------------
// Alt under «Lær» skal ha dekning i forskning, bøker eller kjente figurer.
// Kildene bor på artikkelen (data/artikler.json → «kilder») og vises nederst.
function kilderSeksjon(a) {
  const kilder = a.kilder || [];
  if (!kilder.length) return null;
  return el('section', { class: 'artkilder' },
    el('h2', { class: 'artkilder__tittel' }, ikon('bok', 'ikon ikon--liten'), ' Grunnlaget'),
    el('p', { class: 'artkilder__ingress' }, 'Innholdet bygger på:'),
    el('ul', { class: 'artkilder__liste' }, ...kilder.map((k) => el('li', { class: 'artkilder__rad' },
      el('span', { class: 'artkilder__kilde' }, k.kilde),
      k.om ? el('span', { class: 'artkilder__om' }, k.om) : null,
    ))),
  );
}

// --- Relaterte artikler (til f.eks. yoga-biblioteket) ---------------------
export function relaterteArtikler(tag, n = 3) {
  const t = String(tag).toLowerCase();
  return sortert().filter((a) => (a.tags || []).some((x) => String(x).toLowerCase() === t)).slice(0, n);
}

/** Ferdig «Les mer»-stripe med relaterte artikler — null hvis ingen. */
export function lagArtikkelStripe(tag, tittel = 'Les mer') {
  const rel = relaterteArtikler(tag, 3);
  if (!rel.length) return null;
  return el('section', { class: 'artstripe' },
    el('h2', { class: 'artstripe__tittel' }, tittel),
    el('div', { class: 'artstripe__liste' }, ...rel.map((a) => el('a', { class: 'artmini', href: `#/artikkel?id=${encodeURIComponent(a.id)}` },
      el('div', { class: 'artmini__bilde', style: bakgrunn(a) }),
      el('div', { class: 'artmini__kropp' },
        el('span', { class: 'artmini__tittel' }, a.tittel),
        el('span', { class: 'artmini__meta' }, metaTekst(a)),
      ),
    ))),
  );
}
