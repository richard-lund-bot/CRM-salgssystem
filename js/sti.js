// Ferdighetsstier (Fase 1). En «sti» er en progresjonskjede (data/chains.json)
// presentert som en vertikal læringssti: trinn for trinn fra lett til
// vanskelig. Hvert trinn er en liten leksjon: lær → teknikk-sjekk → guidet
// praksis → «mestret». Innhold per trinn bor i data/stier.json (intro, dose,
// quiz), koblet mot øvelsesoppslaget (exercises.json via library.js) og de
// rike «hvordan gjøre»-kortene (ovelse.js / ovelsesinfo.json).
//
// «Mestret» lagres ikke som egen tilstand — det avledes fra bevegelsesloggen
// (en fullført praksis logges via registrerOgLogg med kilde 'laer'). Slik gir
// et trinn XP, mater streaken og kan låse opp merker gjennom den eksisterende
// motoren, og alt synker som vanlig. Neste trinn låses opp når forrige er
// mestret.
import { el, tom, ikon } from './ui.js';
import { hentLogg } from './store.js';
import { ovelseInfo, ovelseBilde, visOvelseArk } from './ovelse.js';
import { registrerOgLogg } from './beveg.js';
import { lagKonfetti } from './animasjon.js';

let _stier = null;
let _kjeder = null;
let _bib = null;
let _mount = null;

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

/** Laster progresjonskjedene (data/chains.json). */
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

/** Sett av mestrede node-id-er for en sti — avledet fra bevegelsesloggen. */
function mestredeNoder(stiId) {
  const sett = new Set();
  for (const o of hentLogg()) {
    if (o.kilde === 'laer' && o.sti === stiId && o.node) sett.add(o.node);
  }
  return sett;
}

// --- Inngangskort til Lær-feeden -----------------------------------------
/** Ferdig «Ferdighetssti»-kort som Lær-skjermen kan vise øverst. */
export function stiInngang() {
  const sti = (_stier || [])[0];
  if (!sti) return null;
  const kjede = finnKjede(sti.kjede);
  const antall = kjede?.ledd?.length || 0;
  const mestret = mestredeNoder(sti.id).size;
  const under = mestret > 0 ? `${mestret} av ${antall} trinn mestret` : sti.undertittel;
  return el('a', { class: 'stikort', href: `#/sti?id=${encodeURIComponent(sti.id)}` },
    el('span', { class: 'stikort__merke' }, mestret > 0 ? 'Fortsett' : 'Nytt'),
    el('div', { class: 'stikort__ikon' }, ikon(sti.ikon || 'vekt')),
    el('div', { class: 'stikort__kropp' },
      el('span', { class: 'stikort__over' }, 'Ferdighetssti'),
      el('h2', { class: 'stikort__tittel' }, sti.tittel),
      el('p', { class: 'stikort__under' }, under),
    ),
    el('span', { class: 'stikort__pil' }, ikon('chevron')),
  );
}

// --- Sti-skjerm (#/sti?id=) ----------------------------------------------
export function visStiSkjerm(mount) {
  _mount = mount;
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const sti = finnSti(params.get('id') || '');
  if (!sti) { location.hash = '#/laer'; return; }
  const kjede = finnKjede(sti.kjede);
  const ledd = (kjede?.ledd || []).slice().sort((a, b) => a.pos - b.pos);
  const mestret = mestredeNoder(sti.id);
  const antallMestret = ledd.filter((l) => mestret.has(l.ovelse)).length;

  // Tilstand per node: mestret / gjeldende (neste å gjøre) / laast.
  let gjeldendeFunnet = false;
  const noder = ledd.map((l, i) => {
    const erMestret = mestret.has(l.ovelse);
    const forrigeMestret = i === 0 || mestret.has(ledd[i - 1].ovelse);
    let tilstand;
    if (erMestret) tilstand = 'mestret';
    else if (forrigeMestret && !gjeldendeFunnet) { tilstand = 'gjeldende'; gjeldendeFunnet = true; }
    else tilstand = 'laast';
    return { l, i, tilstand };
  });

  tom(mount);
  mount.append(
    el('header', { class: 'topp topp--kjor' },
      el('button', { class: 'topp__tilbake', type: 'button', title: 'Tilbake', onclick: () => history.back() }, '‹'),
      el('div', {},
        el('h1', { class: 'topp__tittel' }, 'Ferdighetssti'),
        el('p', { class: 'topp__under' }, `${antallMestret} av ${ledd.length} mestret`),
      ),
    ),
    el('main', { class: 'innhold innhold--ovelse' },
      el('div', { class: 'sti-hero' },
        el('div', { class: 'sti-hero__ikon' }, ikon(sti.ikon || 'vekt')),
        el('h1', { class: 'sti-hero__tittel' }, sti.tittel),
        el('p', { class: 'sti-hero__intro' }, sti.intro),
        stiFramdrift(antallMestret, ledd.length),
      ),
      el('div', { class: 'reise' }, ...noder.map((n) => reiseNode(sti, n))),
      antallMestret >= ledd.length && ledd.length
        ? el('p', { class: 'sti-fot sti-fot--ferdig' }, ikon('trofe', 'ikon'), ' Hele stien er mestret — sterkt jobba!')
        : el('p', { class: 'sti-fot dempet' }, 'Mestre et trinn for å låse opp det neste.'),
    ),
  );
}

function stiFramdrift(gjort, av) {
  const pct = av ? Math.round((gjort / av) * 100) : 0;
  return el('div', { class: 'sti-framdrift' },
    el('div', { class: 'sti-framdrift__spor' }, el('div', { class: 'sti-framdrift__fyll', style: `width:${pct}%` })),
    el('span', { class: 'sti-framdrift__tall' }, `${gjort}/${av}`),
  );
}

// Slyngende sti («reise»): horisontal forskyvning per node lager S-kurven.
const REISE_MONSTER = [0, 0.6, 1, 0.6, 0, -0.6, -1, -0.6];
const REISE_AMP = 66; // px

function reiseNode(sti, { l, i, tilstand }) {
  const e = _bib?.ovelse(l.ovelse);
  const navn = e?.navn || l.ovelse;
  const niva = NIVA[l.niva] || NIVA[1];
  const dx = Math.round(REISE_AMP * REISE_MONSTER[i % REISE_MONSTER.length]);

  const innhold = tilstand === 'mestret' ? ikon('sjekk', 'ikon')
    : tilstand === 'laast' ? ikon('las', 'ikon')
      : ikon('stjerne', 'ikon');

  const knapp = el('button', { class: `reise-node__knapp ${niva.klasse}`, type: 'button', 'aria-label': navn, title: navn }, innhold);
  knapp.addEventListener('click', () => {
    if (tilstand === 'laast') visOvelseArk(navn); // forhåndstitt, men ingen leksjon
    else startLeksjon(sti, l);
  });

  const wrap = el('div', { class: `reise-node reise-node--${tilstand}`, style: `transform:translateX(${dx}px)` },
    tilstand === 'gjeldende'
      ? el('div', { class: 'reise-node__boble' },
        el('span', { class: 'reise-node__boble-navn' }, navn),
        el('span', { class: 'reise-node__boble-cta' }, 'Start ›'))
      : null,
    knapp,
  );
  wrap.style.setProperty('--reise-forsinkelse', `${i * 55}ms`);
  return wrap;
}

// --- Mini-leksjon (lær → teknikk-sjekk → praksis → mestret) ---------------
function startLeksjon(sti, ledd) {
  const e = _bib?.ovelse(ledd.ovelse);
  const navn = e?.navn || ledd.ovelse;
  const data = (sti.trinn && sti.trinn[ledd.ovelse]) || {};
  const info = ovelseInfo(navn);
  const bilde = ovelseBilde(navn);

  const steg = ['laer'];
  if (data.sjekk) steg.push('sjekk');
  steg.push('praksis');
  let idx = 0;

  const lukkX = el('button', { class: 'leksjon__lukk', type: 'button', 'aria-label': 'Avslutt', onclick: lukk }, ikon('kryss'));
  const framdrift = el('div', { class: 'leksjon__framdrift' });
  const kropp = el('div', { class: 'leksjon__kropp' });
  const bunn = el('div', { class: 'leksjon__bunn' });
  const overlay = el('div', { class: 'leksjon' },
    el('div', { class: 'leksjon__topp' }, lukkX, framdrift),
    kropp, bunn,
  );
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('leksjon--apen'));
  tegn();

  function lukk() {
    overlay.classList.add('leksjon--lukker');
    setTimeout(() => overlay.remove(), 200);
  }

  function settFramdrift(fylte) {
    tom(framdrift);
    steg.forEach((_, i) => framdrift.append(el('span', { class: 'leksjon__seg' + (i <= fylte ? ' leksjon__seg--fyllt' : '') })));
  }

  function primaer(tekst, onclick, { av = false } = {}) {
    const t = el('span', {}, tekst);
    const b = el('button', { class: 'leksjon-primaer' + (av ? ' leksjon-primaer--av' : ''), type: 'button' }, t);
    b.disabled = av;
    b.addEventListener('click', onclick);
    b.settTekst = (x) => { t.textContent = x; };
    b.settAv = (v) => { b.disabled = v; b.classList.toggle('leksjon-primaer--av', v); };
    return b;
  }

  function heroBilde() {
    return bilde ? el('div', { class: 'leksjon__bilde', style: `background-image:url('bilder/ovelser/${bilde}.webp')` }) : null;
  }

  function tegn() {
    settFramdrift(idx - 1);
    tom(kropp); tom(bunn);
    const s = steg[idx];
    if (s === 'laer') tegnLaer();
    else if (s === 'sjekk') tegnSjekk();
    else tegnPraksis();
    kropp.scrollTop = 0;
  }

  function tegnLaer() {
    kropp.append(
      el('span', { class: 'leksjon__merke' }, 'Nytt trinn'),
      el('h1', { class: 'leksjon__tittel' }, navn),
      heroBilde(),
      el('p', { class: 'leksjon__blurb' }, data.blurb || info?.kort || ''),
      ...(info?.steg?.length
        ? [el('h2', { class: 'leksjon__h' }, 'Slik gjør du'), el('ol', { class: 'leksjon__steg' }, ...info.steg.map((x) => el('li', {}, x)))]
        : []),
      ...(info?.tips?.length
        ? [el('h2', { class: 'leksjon__h' }, 'Tips'), ...info.tips.map((x) => el('p', { class: 'leksjon__tips' }, ikon('lyn', 'ikon ikon--liten'), ' ' + x))]
        : []),
    );
    bunn.append(primaer('Neste', () => { idx++; tegn(); }));
  }

  function tegnSjekk() {
    const q = data.sjekk;
    let valgt = null;
    let besvart = false;
    const valgKnapper = q.valg.map((v, i) => {
      const b = el('button', { class: 'leksjon-valg', type: 'button' }, v);
      b.addEventListener('click', () => {
        if (besvart) return;
        valgt = i;
        valgKnapper.forEach((k, j) => k.classList.toggle('leksjon-valg--valgt', j === i));
        knapp.settAv(false);
      });
      return b;
    });
    const feedback = el('div', { class: 'leksjon-feedback', hidden: true });
    kropp.append(
      el('span', { class: 'leksjon__merke' }, 'Teknikk-sjekk'),
      el('h2', { class: 'leksjon__sporsmal' }, q.sporsmal),
      el('div', { class: 'leksjon-valg-liste' }, ...valgKnapper),
      feedback,
    );
    const knapp = primaer('Sjekk', () => {
      if (valgt == null) return;
      if (!besvart) {
        besvart = true;
        const riktig = valgt === q.riktig;
        valgKnapper.forEach((k, j) => {
          k.disabled = true;
          if (j === q.riktig) k.classList.add('leksjon-valg--riktig');
          else if (j === valgt) k.classList.add('leksjon-valg--feil');
        });
        feedback.hidden = false;
        feedback.className = 'leksjon-feedback ' + (riktig ? 'leksjon-feedback--riktig' : 'leksjon-feedback--feil');
        feedback.textContent = (riktig ? 'Riktig! ' : 'Nesten — ') + q.forklaring;
        knapp.settTekst('Fortsett');
      } else {
        idx++; tegn();
      }
    }, { av: true });
    bunn.append(knapp);
  }

  function tegnPraksis() {
    kropp.append(
      el('span', { class: 'leksjon__merke' }, 'Din tur'),
      el('h2', { class: 'leksjon__sporsmal' }, 'Gjør ' + (data.dose || 'noen rolige reps')),
      heroBilde(),
      el('p', { class: 'leksjon__blurb' }, 'Ta det i ditt tempo og med god teknikk. Klarer du ikke alle, teller det du gjør.'),
      el('button', { class: 'leksjon-lenke', type: 'button', onclick: () => visOvelseArk(navn) }, 'Vis hvordan igjen'),
    );
    bunn.append(primaer('Jeg gjorde det ✓', fullfor));
  }

  function fullfor() {
    let res = { xp: 0, nyeMerker: [] };
    try {
      res = registrerOgLogg({
        bevegelse: sti.bevegelse || 'bodyweight',
        varighetMin: data.minutter || 3,
        intensitet: 3,
        tittel: `${sti.tittel}: ${navn}`,
        kilde: 'laer',
        ekstra: { sti: sti.id, node: ledd.ovelse },
      });
    } catch (err) { console.warn('Kunne ikke logge leksjon', err); }
    tegnFeiring(res);
  }

  function tegnFeiring(res) {
    settFramdrift(steg.length - 1);
    tom(kropp); tom(bunn);
    lukkX.style.visibility = 'hidden';
    kropp.append(
      el('div', { class: 'leksjon-feiring' },
        el('div', { class: 'leksjon-feiring__ikon' }, ikon('sjekk', 'ikon')),
        el('h1', { class: 'leksjon-feiring__tittel' }, 'Trinn mestret!'),
        el('p', { class: 'leksjon-feiring__under' }, navn),
        el('div', { class: 'leksjon-feiring__xp' }, ikon('lyn', 'ikon'), ` +${res.xp || 0} XP`),
        ...((res.nyeMerker || []).length
          ? [el('div', { class: 'leksjon-feiring__merke' }, ikon('medalje', 'ikon'), ' Nytt merke: ' + res.nyeMerker.map((m) => m.navn).join(', '))]
          : []),
      ),
    );
    bunn.append(primaer('Fortsett', () => { lukk(); if (_mount) visStiSkjerm(_mount); }));
    try { overlay.append(lagKonfetti()); } catch { /* valgfri feiring */ }
  }
}
