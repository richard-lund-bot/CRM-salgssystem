// Figuren (M11 — spec §11): brukerens bevegelsesfølgesvenn. En hverdagslig,
// inkluderende person bygd av lagdelte inline-SVG-er (MVP-nivået i spec
// §11.4): hud, hår, topp, bukse, sko, jakke, tilbehør — pluss miljøet
// figuren beveger seg gjennom. Ingen bildefiler; alt tegnes med kode og
// farges av gjenstandskatalogen i belonninger.js.
//
// Poser: idle, gå (brukes på reisen) og jubel (fullført-skjermer).
// Skjermen «Tilpass figur» bor også her.

import { el, tom, chip, ikon } from './ui.js';
import { hentProfil, lagreProfil } from './store.js';
import {
  GJENSTANDER, GJENSTAND_MAP, laasTekst, erUlastGjenstand,
  nivaFraTotalXp, lasteTemaer, lasteTitler, tittelFor, TEMAER, TITLER,
} from './belonninger.js';

// --- Kropp: hud og hår (alt gratis — identitet skal aldri låses) -----------
export const HUD = [
  { id: 'lys', farge: '#F6D7B8' },
  { id: 'gyllen', farge: '#E3B287' },
  { id: 'medium', farge: '#C68B59' },
  { id: 'dyp', farge: '#8C5A3C' },
];
export const HAR_STILER = [
  { id: 'kort', navn: 'Kort' },
  { id: 'kroller', navn: 'Krøller' },
  { id: 'langt', navn: 'Langt' },
  { id: 'hestehale', navn: 'Hestehale' },
  { id: 'ingen', navn: 'Uten' },
];
export const HAR_FARGER = [
  { id: 'mork', farge: '#2B2118' },
  { id: 'brun', farge: '#5C4230' },
  { id: 'blond', farge: '#C9A050' },
  { id: 'rod', farge: '#A34A2A' },
  { id: 'gra', farge: '#9A9A9A' },
];

export function standardFigur() {
  return {
    hud: 'medium', har: 'kort', harFarge: 'mork',
    topp: 't-teal', bukse: 'bukse-navy', sko: 'sko-hvit',
    jakke: null, tilbehor: null, miljo: 'miljo-eng', tittel: null,
  };
}

/** Profilens figur med defaults fylt inn (gamle profiler mangler feltet). */
export function sikreFigur(profil) {
  return { ...standardFigur(), ...(profil?.figur || {}) };
}

// --- Miljøer (spec §13): lagdelte scener figuren beveger seg gjennom -------
export const MILJOER = {
  'miljo-eng': { navn: 'Engstien', himmel: ['#E8F6F1', '#F9FDFB'], aas: '#CBE8CE', aas2: '#B2DDBA', sti: '#EBDFC9', sol: '#FFE9A8', detalj: 'blomster' },
  'miljo-park': { navn: 'Parken', himmel: ['#DCF1E4', '#F6FBF7'], aas: '#A9D6A9', aas2: '#8FC894', sti: '#E4D7BE', sol: '#FFE9A8', detalj: 'traer' },
  'miljo-kyst': { navn: 'Kystveien', himmel: ['#D8EEF9', '#F4FBFE'], aas: '#9AD1E8', aas2: '#7FC2DE', sti: '#F0E3C4', sol: '#FFF0B8', detalj: 'bolger' },
  'miljo-fjell': { navn: 'Fjellstien', himmel: ['#DDE7F2', '#F5F8FC'], aas: '#A7B9CE', aas2: '#8DA3BD', sti: '#D9D3C6', sol: '#FFF3C4', detalj: 'topper' },
  'miljo-solnedgang': { navn: 'Solnedgangsveien', himmel: ['#FFDFC2', '#FFF4E3'], aas: '#E8A87C', aas2: '#D68F63', sti: '#E9D3B0', sol: '#FFB067', detalj: 'traer' },
  'miljo-hostskog': { navn: 'Høstskogen', himmel: ['#F6E8D4', '#FCF7EE'], aas: '#DBA55E', aas2: '#C98D48', sti: '#E3CFAA', sol: '#FFDF9E', detalj: 'traer' },
  'miljo-vinter': { navn: 'Snøstien', himmel: ['#E3EDF6', '#F8FBFD'], aas: '#E8F0F6', aas2: '#D3E2EE', sti: '#F2F5F8', sol: '#FFF7D6', detalj: 'topper' },
};

// --- Figur-SVG --------------------------------------------------------------
// Poser som rotasjoner (grader) rundt skulder/hofte.
const POSER = {
  idle: { vArm: 6, hArm: -6, vBein: 0, hBein: 0, hopp: 0 },
  gaa: { vArm: -24, hArm: 24, vBein: 17, hBein: -15, hopp: 0 },
  jubel: { vArm: -150, hArm: 150, vBein: 8, hBein: -8, hopp: -4 },
};

function harSvg(stil, farge) {
  switch (stil) {
    case 'kort':
      return `<path d="M45 29 a15 15 0 0 1 30 0 l0 -3 a15 15 0 0 0 -30 0 Z" fill="${farge}"/>
        <path d="M45 30 a15 15 0 0 1 30 0 c0 -12 -6 -17 -15 -17 s-15 5 -15 17 Z" fill="${farge}"/>`;
    case 'kroller':
      return `<g fill="${farge}"><circle cx="49" cy="21" r="7"/><circle cx="60" cy="17" r="8"/><circle cx="71" cy="21" r="7"/><circle cx="45" cy="29" r="5"/><circle cx="75" cy="29" r="5"/></g>`;
    case 'langt':
      return `<path d="M45 30 c0 -12 6 -17 15 -17 s15 5 15 17 l0 16 c0 4 -3 6 -6 5 l0 -14 a15 15 0 0 1 -18 0 l0 14 c-3 1 -6 -1 -6 -5 Z" fill="${farge}"/>`;
    case 'hestehale':
      return `<path d="M45 30 a15 15 0 0 1 30 0 c0 -12 -6 -17 -15 -17 s-15 5 -15 17 Z" fill="${farge}"/>
        <path d="M73 22 c8 2 8 14 4 22 c-2 3 -6 2 -5 -2 c2 -7 3 -14 1 -20 Z" fill="${farge}"/>`;
    default:
      return '';
  }
}

function tilbehorSvg(id, farge, hud) {
  switch (id) {
    case 'lue-teal':
      return `<path d="M44 26 a16 16 0 0 1 32 0 l0 3 l-32 0 Z" fill="${farge}"/><rect x="43" y="27" width="34" height="4" rx="2" fill="${farge}"/>`;
    case 'caps-comeback':
      return `<path d="M45 25 a15 13 0 0 1 30 0 l0 3 l-30 0 Z" fill="${farge}"/><rect x="58" y="25" width="26" height="5" rx="2.5" fill="${farge}"/>`;
    case 'matte':
      return `<g transform="rotate(-14 88 88)"><rect x="82" y="72" width="12" height="32" rx="6" fill="${farge}"/><rect x="82" y="72" width="12" height="32" rx="6" fill="none" stroke="rgba(0,0,0,.12)"/><circle cx="88" cy="76" r="3.4" fill="rgba(255,255,255,.5)"/></g>`;
    case 'sekk':
      return null; // tegnes bak torsoen (egen håndtering)
    case 'sokker':
    case 'sokker-tur':
      return null; // tegnes på beina (egen håndtering)
    case 'hansker':
      return null; // farger hendene (egen håndtering)
    case 'flaske':
      return `<rect x="30" y="80" width="7" height="14" rx="3" fill="${farge}"/><rect x="31.5" y="77" width="4" height="4" rx="1.5" fill="${farge}"/>`;
    case 'matte-rolig':
      return `<g transform="rotate(-14 88 88)"><rect x="82" y="72" width="12" height="32" rx="6" fill="${farge}"/><circle cx="88" cy="76" r="3.4" fill="rgba(255,255,255,.55)"/></g>`;
    default:
      return '';
  }
}

/**
 * Tegner figuren som et SVG-element.
 * @param figur profilens figur (bruk sikreFigur)
 * @param opts { pose: 'idle'|'gaa'|'jubel', bredde: px, klasse }
 */
export function tegnFigur(figur, { pose = 'idle', bredde = 96, klasse = '' } = {}) {
  const f = { ...standardFigur(), ...(figur || {}) };
  const p = POSER[pose] || POSER.idle;
  const hud = HUD.find((h) => h.id === f.hud)?.farge || HUD[2].farge;
  const harFarge = HAR_FARGER.find((h) => h.id === f.harFarge)?.farge || HAR_FARGER[0].farge;
  const farge = (id, fallback) => GJENSTAND_MAP.get(id)?.farge || fallback;
  const toppF = farge(f.topp, '#0BA69F');
  const bukseF = farge(f.bukse, '#2C354A');
  const skoF = farge(f.sko, '#E9ECEF');
  const jakkeF = f.jakke ? farge(f.jakke, '#3E6B4F') : null;
  const tilb = f.tilbehor ? GJENSTAND_MAP.get(f.tilbehor) : null;

  const erShorts = f.bukse === 'shorts-gra';
  const beinBredde = f.bukse === 'bukse-tights' ? 8 : 10;
  const handF = tilb?.id === 'hansker' ? tilb.farge : hud;
  const sokkerSvg = (tilb?.id === 'sokker-tur')
    ? `<rect x="-5" y="30" width="10" height="5" fill="${tilb.farge}"/>` : '';

  // Bein tegnes i egne grupper med origo i hofta, så posen kan rotere dem.
  const bein = (rot, hofteX) => `
    <g transform="rotate(${rot} ${hofteX} 90)">
      <rect x="${hofteX - beinBredde / 2}" y="88" width="${beinBredde}" height="${erShorts ? 18 : 36}" rx="${beinBredde / 2}" fill="${bukseF}"/>
      ${erShorts ? `<rect x="${hofteX - 3.5}" y="102" width="7" height="22" rx="3.5" fill="${hud}"/>` : ''}
      <g transform="translate(${hofteX} 90)">${sokkerSvg}</g>
      <path d="M${hofteX - 5} 122 h10 a5 5 0 0 1 5 5 l0 2 h-20 l0 -2 a5 5 0 0 1 5 -5 Z" fill="${skoF}" stroke="rgba(0,0,0,.08)"/>
    </g>`;

  // Armer: kapsel med hånd, origo i skulderen.
  const arm = (rot, skulderX) => `
    <g transform="rotate(${rot} ${skulderX} 53)">
      <rect x="${skulderX - 4}" y="50" width="8" height="32" rx="4" fill="${jakkeF || toppF}"/>
      <circle cx="${skulderX}" cy="84" r="4.4" fill="${handF}"/>
    </g>`;

  const sekkSvg = tilb?.id === 'sekk'
    ? `<rect x="30" y="52" width="14" height="26" rx="7" fill="${tilb.farge}"/><rect x="33" y="56" width="8" height="7" rx="3" fill="rgba(255,255,255,.35)"/>`
    : '';

  const jakkeSvg = jakkeF
    ? `<path d="M42 49 h13 v42 h-13 a6 6 0 0 1 -6 -6 l0 -26 a10 10 0 0 1 6 -10 Z" fill="${jakkeF}"/>
       <path d="M78 49 h-13 v42 h13 a6 6 0 0 0 6 -6 l0 -26 a10 10 0 0 0 -6 -10 Z" fill="${jakkeF}"/>`
    : '';

  const smil = pose === 'jubel'
    ? '<path d="M54 34 a6.5 6.5 0 0 0 12 0 Z" fill="#7B4A2D"/>'
    : '<path d="M55 35 q5 4 10 0" stroke="#7B4A2D" stroke-width="1.8" fill="none" stroke-linecap="round"/>';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 132');
  svg.setAttribute('width', bredde);
  svg.setAttribute('class', `figur figur--${pose}${klasse ? ' ' + klasse : ''}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <g transform="translate(0 ${p.hopp})">
      ${sekkSvg}
      ${arm(p.vArm, 40)}
      ${bein(p.vBein, 52)}
      ${bein(p.hBein, 68)}
      <rect x="55" y="42" width="10" height="10" fill="${hud}"/>
      <path d="M42 47 h36 a0 0 0 0 1 0 0 l0 32 a12 12 0 0 1 -12 12 h-12 a12 12 0 0 1 -12 -12 Z" fill="${toppF}" transform="translate(0 2)"/>
      <rect x="42" y="47" width="36" height="14" rx="7" fill="${toppF}"/>
      ${jakkeSvg}
      ${arm(p.hArm, 80)}
      <circle cx="60" cy="28" r="15" fill="${hud}"/>
      <circle cx="54.5" cy="28" r="1.7" fill="#3A2A1E"/>
      <circle cx="65.5" cy="28" r="1.7" fill="#3A2A1E"/>
      ${smil}
      ${harSvg(f.har, harFarge)}
      ${tilb ? (tilbehorSvg(tilb.id, tilb.farge, hud) || '') : ''}
    </g>`;
  return svg;
}

// --- Miljøscene --------------------------------------------------------------
/** Tegner en lagdelt miljøscene (himmel, sol, åser, sti) som SVG. */
export function tegnMiljo(miljoId, { hoyde = 150, klasse = 'miljo' } = {}) {
  const m = MILJOER[miljoId] || MILJOER['miljo-eng'];
  const gid = `himmel-${miljoId}-${Math.round(hoyde)}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 360 150');
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('class', klasse);
  svg.setAttribute('aria-hidden', 'true');

  let detaljer = '';
  if (m.detalj === 'traer') {
    detaljer = [[46, 96], [300, 90], [258, 100]].map(([x, y]) =>
      `<g><rect x="${x - 2}" y="${y}" width="4" height="14" rx="2" fill="#8A6B4A"/><circle cx="${x}" cy="${y - 8}" r="13" fill="${m.aas2}" opacity=".9"/></g>`).join('');
  } else if (m.detalj === 'bolger') {
    detaljer = '<path d="M0 96 q14 -5 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0" stroke="rgba(255,255,255,.55)" stroke-width="2.4" fill="none"/>';
  } else if (m.detalj === 'topper') {
    detaljer = `<path d="M20 100 L70 42 L120 100 Z" fill="${m.aas2}"/><path d="M60 56 L70 42 L81 56 L70 62 Z" fill="#fff" opacity=".85"/><path d="M230 100 L290 52 L350 100 Z" fill="${m.aas2}" opacity=".8"/>`;
  } else {
    detaljer = [[40, 108], [90, 112], [286, 110], [322, 106]].map(([x, y]) =>
      `<g><circle cx="${x}" cy="${y}" r="3" fill="#FF9E92"/><circle cx="${x}" cy="${y}" r="1.3" fill="#fff"/></g>`).join('');
  }

  svg.innerHTML = `
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${m.himmel[0]}"/><stop offset="1" stop-color="${m.himmel[1]}"/>
    </linearGradient></defs>
    <rect width="360" height="150" fill="url(#${gid})"/>
    <circle cx="304" cy="34" r="17" fill="${m.sol}"/>
    <path d="M0 92 q60 -26 130 -12 q90 18 160 -6 q40 -12 70 -2 L360 150 L0 150 Z" fill="${m.aas}"/>
    ${detaljer}
    <path d="M0 150 L150 150 C 190 128 150 118 200 108 q30 -6 60 -8 L360 100 L360 150 Z" fill="${m.sti}"/>
    <path d="M178 138 q40 -22 120 -34" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-dasharray="1 8" stroke-linecap="round" fill="none"/>`;
  return svg;
}

// --- Skjerm: Tilpass figur ----------------------------------------------------
const KATEGORIER = [
  ['hud', 'Hud'], ['har', 'Hår'], ['harFarge', 'Hårfarge'], ['topp', 'Topp'],
  ['bukse', 'Bukse'], ['sko', 'Sko'], ['jakke', 'Jakke'], ['tilbehor', 'Tilbehør'],
  ['miljo', 'Miljø'], ['tema', 'Tema'], ['tittel', 'Tittel'],
];

function anvendTema(id) {
  if (id && id !== 'standard') document.documentElement.dataset.tema = id;
  else delete document.documentElement.dataset.tema;
}

export function visTilpassSkjerm(mount, bib) {
  const profil = hentProfil();
  if (!profil) { location.hash = '#/hjem'; return; }
  let kategori = 'topp';

  function lagre(muter) {
    const p = hentProfil();
    p.figur = sikreFigur(p);
    muter(p);
    lagreProfil(p);
    tegn();
  }

  function tegn() {
    const p = hentProfil();
    const figur = sikreFigur(p);
    const info = nivaFraTotalXp(p.globalXp || 0);

    tom(mount);
    mount.append(
      el('header', { class: 'topp topp--kjor' },
        el('button', { class: 'topp__tilbake', type: 'button', onclick: () => { location.hash = '#/reise'; }, title: 'Tilbake' }, '‹'),
        el('div', {},
          el('h1', { class: 'topp__tittel' }, 'Tilpass figur'),
          el('p', { class: 'topp__under' }, 'Din figur. Din stil.'),
        ),
      ),
      el('main', { class: 'innhold' },
        el('div', { class: 'kort tilpass-scene' },
          tegnMiljo(figur.miljo, { klasse: 'tilpass-scene__miljo' }),
          el('div', { class: 'tilpass-scene__figur' }, tegnFigur(figur, { pose: 'idle', bredde: 108 })),
          el('div', { class: 'tilpass-scene__navn' }, figur.tittel || tittelFor(info.niva)),
        ),
        el('div', { class: 'chiprad chiprad--scroll' },
          ...KATEGORIER.map(([id, navn]) => chip(navn, { aktiv: kategori === id, onClick: () => { kategori = id; tegn(); } })),
        ),
        valgKort(p, figur, info),
      ),
    );
  }

  function valgKort(p, figur, info) {
    const kort = el('div', { class: 'kort' });

    // Farge-/stilvalg for kropp (alltid gratis)
    if (kategori === 'hud' || kategori === 'harFarge') {
      const liste = kategori === 'hud' ? HUD : HAR_FARGER;
      kort.append(el('div', { class: 'fargegrid' },
        ...liste.map((v) => el('button', {
          class: 'fargevalg' + (figur[kategori] === v.id ? ' fargevalg--valgt' : ''),
          type: 'button', title: v.id,
          style: `background:${v.farge}`,
          onclick: () => lagre((pr) => { pr.figur[kategori] = v.id; }),
        })),
      ));
      return kort;
    }
    if (kategori === 'har') {
      kort.append(el('div', { class: 'chiprad' },
        ...HAR_STILER.map((s) => chip(s.navn, {
          aktiv: figur.har === s.id,
          onClick: () => lagre((pr) => { pr.figur.har = s.id; }),
        })),
      ));
      return kort;
    }

    // Tema (app-farger) — låses opp i belønningsstigen
    if (kategori === 'tema') {
      const ulast = lasteTemaer(info.niva, bib);
      const valgt = p.innstillinger?.tema || 'standard';
      kort.append(el('div', { class: 'temaliste' },
        ...TEMAER.map((t) => {
          const er = ulast.has(t.id);
          return el('button', {
            class: 'temaknapp' + (valgt === t.id ? ' temaknapp--valgt' : '') + (er ? '' : ' temaknapp--laast'),
            type: 'button',
            onclick: er ? () => lagre((pr) => {
              pr.innstillinger = pr.innstillinger || {};
              pr.innstillinger.tema = t.id;
              anvendTema(t.id);
            }) : undefined,
          },
            el('span', { class: 'temaknapp__prikk', style: `background:${t.prikk}` }),
            el('span', { class: 'temaknapp__navn' }, t.navn),
            el('span', { class: 'temaknapp__status' }, valgt === t.id ? ikon('sjekk') : er ? null : ikon('las')),
          );
        }),
      ));
      return kort;
    }

    // Tittel — varme titler fra nivåstigen
    if (kategori === 'tittel') {
      const ulaste = lasteTitler(info.niva);
      const valgt = figur.tittel || tittelFor(info.niva);
      kort.append(
        el('p', { class: 'dempet' }, 'Tittelen vises på reisen din.'),
        el('div', { class: 'valgliste' },
          ...TITLER_MED_LAAS(info.niva).map(([navn, niva, er]) => el('button', {
            class: 'valgrad' + (valgt === navn ? ' valgrad--valgt' : '') + (er ? '' : ' valgrad--laast'),
            type: 'button',
            onclick: er ? () => lagre((pr) => { pr.figur.tittel = navn; }) : undefined,
          },
            el('span', { class: 'valgrad__navn' }, navn),
            el('span', { class: 'valgrad__status' }, valgt === navn ? ikon('sjekk') : er ? null : el('span', { class: 'dempet' }, `Nivå ${niva}`)),
          )),
        ),
      );
      return kort;
    }

    // Gjenstander (topp/bukse/sko/jakke/tilbehør/miljø)
    const valgfri = kategori === 'jakke' || kategori === 'tilbehor';
    const gjenstander = GJENSTANDER.filter((g) => g.kategori === kategori);
    const valgtId = figur[kategori];

    const rad = (g) => {
      const er = erUlastGjenstand(g, p);
      const m = kategori === 'miljo' ? MILJOER[g.id] : null;
      return el('button', {
        class: 'valgrad' + (valgtId === g.id ? ' valgrad--valgt' : '') + (er ? '' : ' valgrad--laast'),
        type: 'button',
        onclick: er ? () => lagre((pr) => { pr.figur[kategori] = g.id; }) : undefined,
      },
        m
          ? el('span', { class: 'valgrad__swatch', style: `background:linear-gradient(180deg, ${m.himmel[0]}, ${m.aas})` })
          : el('span', { class: 'valgrad__swatch', style: `background:${g.farge || 'var(--bg-kort-2)'}` }),
        el('span', { class: 'valgrad__navn' }, g.navn),
        el('span', { class: 'valgrad__status' },
          valgtId === g.id ? ikon('sjekk') : er ? null : ikon('las'),
          !er && el('span', { class: 'valgrad__laas' }, laasTekst(g.laas)),
        ),
      );
    };

    kort.append(el('div', { class: 'valgliste' },
      valgfri && el('button', {
        class: 'valgrad' + (!valgtId ? ' valgrad--valgt' : ''),
        type: 'button',
        onclick: () => lagre((pr) => { pr.figur[kategori] = null; }),
      },
        el('span', { class: 'valgrad__swatch valgrad__swatch--ingen' }),
        el('span', { class: 'valgrad__navn' }, 'Ingen'),
        el('span', { class: 'valgrad__status' }, !valgtId ? ikon('sjekk') : null),
      ),
      ...gjenstander.map(rad),
    ));
    return kort;
  }

  tegn();
}

// Titler med opplåsingsnivå og status.
function TITLER_MED_LAAS(niva) {
  return TITLER.map(([n, navn]) => [navn, n, niva >= n]);
}
