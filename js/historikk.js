// Historikk (LAG 4, taksonomi §13): visninger bygget rent fra loggen + profilen.
// Ingen rammeverk — kalender-heatmap, ukesvolum, modalitetsfordeling (donut),
// PR-tavle, push/pull-balanse og øktlogg med detalj. Alt regnes ut lokalt.
import { el, tom, ikon } from './ui.js';
import { MODALITET_NAVN, MONSTER_NAVN } from './library.js';
import { hentLogg, hentProfil } from './store.js';
import { prsFraLogg, streak, ukeNokkel, globaltNiva } from './niva.js';
import { fyllInn } from './animasjon.js';

let _bib = null;
export function settBib(bib) { _bib = bib; }

const DAG = 86400000;
const svgNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs) {
  const n = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

// Palett for modalitetssegmenter (donut).
const PALETT = ['#2dd489', '#4aa3ff', '#ffd479', '#ff8f6b', '#b98cff', '#5ad0c0', '#ff6b9d', '#9bd45a', '#8b97a5'];

export function visHistorikkSkjerm(mount) {
  const logg = hentLogg();
  const profil = hentProfil();
  const nå = Date.now();

  tom(mount);
  const main = el('main', { class: 'innhold' });
  mount.append(el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Historikk')), main);

  if (!logg.length) {
    main.append(el('div', { class: 'kort kort--info' },
      el('h2', {}, 'Ingen økter ennå'),
      el('p', { class: 'dempet' }, 'Fullfør din første økt, så dukker heatmap, volum, PR-er og fordeling opp her.'),
      el('a', { class: 'knapp', href: '#/ny' }, 'Start en økt'),
    ));
    return;
  }

  const st = streak(logg, profil?.ukemaal || 4, nå);
  main.append(
    ...[
      oppsummering(logg, profil, st, nå),
      heatmapKort(logg, st, nå),
      ukesvolumKort(logg, nå),
      alleTiderKort(logg, profil),
      fordelingKort(logg, profil),
      balanseKort(logg, nå),
      prKort(logg),
      loggKort(logg),
    ].filter(Boolean),
  );
}

// --- All-Time Stats (Runna-stil rader) ------------------------------------
function alleTiderKort(logg, profil) {
  const totMin = logg.reduce((s, o) => s + (o.varighetMin || 0), 0);
  const totXp = profil?.globalXp || logg.reduce((s, o) => s + (o.xp || 0), 0);
  const lengste = logg.reduce((m, o) => Math.max(m, o.varighetMin || 0), 0);
  const prAntall = Object.keys(prsFraLogg(logg)).length;
  const gateways = (profil?.gatewaysPassert || []).length;
  const timer = Math.floor(totMin / 60);
  const rader = [
    ['loper', 'Totalt økter', String(logg.length)],
    ['stoppeklokke', 'Total tid', `${timer}t ${totMin % 60}m`],
    ['lyn', 'Total XP', String(totXp)],
    ['graf', 'Lengste økt', `${lengste} min`],
    ['medalje', 'Personlige rekorder', String(prAntall)],
    ['hexstjerne', 'Gateways bestått', String(gateways)],
  ];
  return el('div', { class: 'kort' },
    el('h2', {}, 'Gjennom all tid'),
    el('div', { class: 'statrader' },
      ...rader.map(([ikonNavn, label, verdi]) => el('div', { class: 'statrad2' },
        el('span', { class: 'statrad2__ikon' }, ikon(ikonNavn)),
        el('div', { style: 'flex:1' },
          el('div', { class: 'statrad2__label' }, label),
          el('div', { class: 'statrad2__tall' }, verdi),
        ),
      )),
    ),
  );
}

// --- Oppsummering ---------------------------------------------------------
function oppsummering(logg, profil, st, nå) {
  const totMin = logg.reduce((s, o) => s + (o.varighetMin || 0), 0);
  const totXp = profil?.globalXp || logg.reduce((s, o) => s + (o.xp || 0), 0);
  return el('div', { class: 'statrad' },
    stat(logg.length, 'økter'),
    stat(Math.round(totMin / 60) + 't', 'trent'),
    stat(globaltNiva(totXp), 'nivå'),
    stat(st.uker, 'streak', ikon('flamme')),
  );
}

// --- Kalender-heatmap -----------------------------------------------------
function heatmapKort(logg, st, nå) {
  const uker = 13;
  const dager = uker * 7;
  const perDag = {};
  for (const o of logg) {
    const d = new Date(Date.parse(o.dato)); d.setHours(0, 0, 0, 0);
    const k = d.getTime();
    perDag[k] = (perDag[k] || 0) + (o.varighetMin || 0);
  }
  // Start på mandag for `uker` uker siden.
  const idag = new Date(nå); idag.setHours(0, 0, 0, 0);
  const mandagDenne = new Date(idag.getTime() - ((idag.getDay() + 6) % 7) * DAG);
  const start = new Date(mandagDenne.getTime() - (uker - 1) * 7 * DAG);

  const nivåFor = (min) => (!min ? 0 : min < 15 ? 1 : min < 30 ? 2 : min < 50 ? 3 : 4);
  const rutenett = el('div', { class: 'heat', style: `grid-template-columns: repeat(${uker}, 1fr)` });
  // Kolonne = uke, rad = ukedag → fyll kolonnevis.
  for (let u = 0; u < uker; u++) {
    for (let d = 0; d < 7; d++) {
      const dato = new Date(start.getTime() + (u * 7 + d) * DAG);
      const fremtid = dato.getTime() > idag.getTime();
      const min = perDag[dato.getTime()] || 0;
      rutenett.append(el('i', {
        class: `heat__c heat__c--${fremtid ? 'x' : nivåFor(min)}`,
        title: `${dato.toLocaleDateString('no-NO')}${min ? ` · ${min} min` : ''}`,
        style: `grid-row:${d + 1}; grid-column:${u + 1}; animation-delay:${u * 16}ms`,
      }));
    }
  }
  return el('div', { class: 'kort' },
    el('h2', {}, 'Aktivitet'),
    el('div', { class: 'heat-wrap' }, rutenett),
    el('p', { class: 'dempet' }, `Streak: ${st.uker} uker på ${st.ukemaal}/uke · ${st.denneUken} denne uka`),
  );
}

// --- Ukesvolum ------------------------------------------------------------
function ukesvolumKort(logg, nå) {
  const antallUker = 8;
  const uker = [];
  for (let i = antallUker - 1; i >= 0; i--) uker.push(ukeNokkel(nå - i * 7 * DAG));
  const min = Object.fromEntries(uker.map((u) => [u, 0]));
  const xp = Object.fromEntries(uker.map((u) => [u, 0]));
  for (const o of logg) {
    const u = ukeNokkel(Date.parse(o.dato));
    if (u in min) { min[u] += o.varighetMin || 0; xp[u] += o.xp || 0; }
  }
  const maks = Math.max(1, ...uker.map((u) => min[u]));
  return el('div', { class: 'kort' },
    el('h2', {}, 'Ukesvolum'),
    el('div', { class: 'bars' },
      ...uker.map((u) => {
        const fyll = el('div', { class: 'bar__fyll' });
        fyllInn(fyll, 'height', `${Math.round((min[u] / maks) * 100)}%`);
        return el('div', { class: 'bar' },
          el('div', { class: 'bar__soyle', title: `${min[u]} min · ${xp[u]} XP` }, fyll),
          el('span', { class: 'bar__navn' }, u.slice(6)),
        );
      }),
    ),
    el('p', { class: 'dempet' }, 'Minutter per uke (siste 8).'),
  );
}

// --- Modalitetsfordeling (donut) ------------------------------------------
function fordelingKort(logg, profil) {
  const teller = {};
  for (const o of logg) teller[o.modalitet] = (teller[o.modalitet] || 0) + 1;
  const par = Object.entries(teller).sort((a, b) => b[1] - a[1]);
  const total = par.reduce((s, [, n]) => s + n, 0) || 1;

  const R = 54; const C = 2 * Math.PI * R;
  const svg = svgEl('svg', { viewBox: '0 0 140 140', class: 'donut' });
  svg.append(svgEl('circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: 'var(--kant)', 'stroke-width': 16 }));
  let offset = 0;
  par.forEach(([m, n], i) => {
    const andel = n / total;
    const seg = svgEl('circle', {
      cx: 70, cy: 70, r: R, fill: 'none', stroke: PALETT[i % PALETT.length], 'stroke-width': 16,
      'stroke-dasharray': `${andel * C} ${C}`, 'stroke-dashoffset': -offset * C,
      transform: 'rotate(-90 70 70)',
    });
    svg.append(seg);
    offset += andel;
  });
  svg.append(svgEl('text', { x: 70, y: 66, 'text-anchor': 'middle', fill: 'var(--tekst)', 'font-size': 20, 'font-weight': 700 }));
  svg.lastChild.textContent = String(total);
  svg.append(svgEl('text', { x: 70, y: 84, 'text-anchor': 'middle', fill: 'var(--dempet)', 'font-size': 9 }));
  svg.lastChild.textContent = 'økter';

  const forklaring = el('div', { class: 'donut-liste' },
    ...par.map(([m, n], i) => el('div', { class: 'donut-rad' },
      el('span', { class: 'donut-prikk', style: `background:${PALETT[i % PALETT.length]}` }),
      el('span', { class: 'donut-navn' }, MODALITET_NAVN[m] || m),
      el('span', { class: 'dempet' }, `${Math.round((n / total) * 100)}%`),
    )),
  );
  return el('div', { class: 'kort' },
    el('h2', {}, 'Fordeling'),
    el('div', { class: 'donut-wrap' }, svg, forklaring),
    profil?.ukemiks && el('p', { class: 'dempet' }, `Mål: ${profil.ukemiks}`),
  );
}

// --- Push/pull-balanse ----------------------------------------------------
function balanseKort(logg, nå) {
  const grense = nå - 30 * DAG;
  let push = 0; let pull = 0;
  for (const o of logg) {
    if (Date.parse(o.dato) < grense) continue;
    for (const id of o.ovelseIder || []) {
      const e = _bib?.ovelseMap?.get(id);
      if (!e) continue;
      if (e.monster.startsWith('push')) push++;
      else if (e.monster.startsWith('pull')) pull++;
    }
  }
  const total = push + pull;
  if (!total) return null;
  const pushPct = Math.round((push / total) * 100);
  return el('div', { class: 'kort' },
    el('h2', {}, 'Push / pull (30 d)'),
    el('div', { class: 'balanse' },
      el('div', { class: 'balanse__push', style: `width:${pushPct}%` }, `Push ${push}`),
      el('div', { class: 'balanse__pull', style: `width:${100 - pushPct}%` }, `Pull ${pull}`),
    ),
    el('p', { class: 'dempet' }, Math.abs(pushPct - 50) <= 12 ? 'Fin balanse.' : pushPct > 50 ? 'Litt push-tung — mer pull neste uke.' : 'Litt pull-tung — mer push neste uke.'),
  );
}

// --- PR-tavle -------------------------------------------------------------
function prKort(logg) {
  const pr = prsFraLogg(logg);
  const rader = Object.values(pr).sort((a, b) => Date.parse(b.dato) - Date.parse(a.dato));
  if (!rader.length) return el('div', { class: 'kort' },
    el('h2', {}, 'PR-tavle'),
    el('p', { class: 'dempet' }, 'Logg reps, kg eller hold under «Økt fullført» for å bygge PR-tavla.'),
  );
  return el('div', { class: 'kort' },
    el('h2', {}, 'PR-tavle'),
    el('div', { class: 'modliste' },
      ...rader.slice(0, 20).map((p) => el('div', { class: 'modrad' },
        el('span', { class: 'modrad__navn' }, ovelseNavn(p.id)),
        el('span', { class: 'modrad__tall' }, prVerdi(p)),
      )),
    ),
  );
}

function prVerdi(p) {
  const d = [];
  if (Number.isFinite(p.reps)) d.push(`${p.reps} reps`);
  if (Number.isFinite(p.last)) d.push(`${p.last} kg`);
  if (Number.isFinite(p.holdSek)) d.push(`${p.holdSek} s`);
  if (Number.isFinite(p.distKm)) d.push(`${p.distKm} km`);
  return d.join(' · ') || '—';
}

// --- Øktlogg --------------------------------------------------------------
function loggKort(logg) {
  const sortert = logg.slice().sort((a, b) => Date.parse(b.dato) - Date.parse(a.dato));
  return el('div', { class: 'kort' },
    el('h2', {}, 'Økter'),
    el('div', { class: 'okter' },
      ...sortert.slice(0, 40).map((o) => oktRad(o)),
    ),
  );
}

function oktRad(o) {
  const dato = new Date(Date.parse(o.dato)).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
  const detalj = el('div', { class: 'okt__detalj', hidden: true });
  const rad = el('div', { class: 'okt' },
    el('button', { class: 'okt__topp', type: 'button', onclick: () => { detalj.hidden = !detalj.hidden; } },
      el('span', { class: 'okt__dato' }, dato),
      el('span', { class: 'okt__mod' }, MODALITET_NAVN[o.modalitet] || o.modalitet),
      el('span', { class: 'okt__meta' }, `${o.varighetMin} min · +${o.xp || 0} XP`),
    ),
    detalj,
  );
  const navn = (o.ovelseIder || []).map(ovelseNavn);
  detalj.append(
    navn.length ? el('p', { class: 'dempet' }, navn.join(', ')) : el('p', { class: 'dempet' }, 'Ingen øvelsesdetaljer.'),
    (o.resultater || []).length ? el('p', { class: 'okt__pr' }, 'Logget: ' + o.resultater.map((r) => `${ovelseNavn(r.id)} ${prVerdi(r)}`).join(' · ')) : null,
  );
  return rad;
}

function ovelseNavn(id) { return _bib?.ovelseMap?.get(id)?.navn || id; }

function stat(tall, ...tekst) {
  return el('div', { class: 'stat' },
    el('div', { class: 'stat__tall' }, String(tall)),
    el('div', { class: 'stat__tekst' }, ...tekst),
  );
}
