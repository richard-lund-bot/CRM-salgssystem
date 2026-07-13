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
import { beregnXp } from './bevegelse.js';
import { lagKonfetti } from './animasjon.js';
import { vibrer } from './haptikk.js';

// Mova-maskot: den ekte push-up-pandaen — illustrerte poser i icons/brand/panda.
// Poser: idle, wave, flex, cheer, pushup-up, pushup-down. Brukes som guide, på
// lasteskjermen, som boss langs stien og i push-up-kampen.
const PANDA = 'icons/brand/panda/panda-';
function pandaImg(pose, klasse) {
  return el('img', {
    class: 'panda-bilde' + (klasse ? ' ' + klasse : ''),
    src: `${PANDA}${pose}.webp`, alt: '', 'aria-hidden': 'true', draggable: 'false',
  });
}
// To-frames maskot som veksler mellom to poser. `variant` styrer rytmen i CSS:
//   'idle'   → rolig idle↔vink (står ved stien)
//   'pushup' → flip-bok som gjør push-ups (lasteskjerm)
//   'kamp'   → viser topp-posituren; ett dukk pr. rep (drives via .dukk())
function pandaAnim(poseA, poseB, klasse, variant = 'idle') {
  return el('div', { class: `panda-anim panda-anim--${variant}` + (klasse ? ' ' + klasse : ''), 'aria-hidden': 'true' },
    pandaImg(poseA, 'panda-anim__lag panda-anim__lag--a'),
    pandaImg(poseB, 'panda-anim__lag panda-anim__lag--b'),
  );
}

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
    if (o.kilde === 'laer' && o.sti === stiId && o.node && o.node !== 'boss') sett.add(o.node);
  }
  return sett;
}

// --- Boss: push-up-pandaen (tre stjerner = mestret øvelse) ------------------
const BOSS_MAKS_STJERNER = 3;

/** Stjerner vunnet mot bossen på en sti (0–3) — avledet fra bevegelsesloggen. */
function bossStjerner(stiId) {
  let maks = 0;
  for (const o of hentLogg()) {
    if (o.kilde === 'laer' && o.sti === stiId && o.node === 'boss') maks = Math.max(maks, o.bossNiva || 0);
  }
  return Math.min(BOSS_MAKS_STJERNER, maks);
}

/** Rad med tre stjerner; de `fylte` første er gullfylte. */
function stjerneRad(fylte, klasse) {
  return el('div', { class: 'stjernerad' + (klasse ? ' ' + klasse : '') },
    ...Array.from({ length: BOSS_MAKS_STJERNER }, (_, i) =>
      el('span', { class: 'stjernerad__stj' + (i < fylte ? ' stjernerad__stj--pa' : '') }, ikon('stjerne', 'ikon'))),
  );
}

/** Felles primærknapp for kamp-skjermene (samme stil som leksjonen). */
function leksjonPrimaer(tekst, onclick) {
  const b = el('button', { class: 'leksjon-primaer', type: 'button' }, tekst);
  b.addEventListener('click', onclick);
  return b;
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

  // Boss-tilstand: låst (til «etterNode» er mestret) / klar / slått (3 stjerner).
  const boss = sti.boss || null;
  const bossAapen = boss ? mestret.has(boss.etterNode) : false;
  const bossStj = boss ? bossStjerner(sti.id) : 0;
  const bossTilstand = !boss ? null
    : !bossAapen ? 'laast'
      : bossStj >= BOSS_MAKS_STJERNER ? 'slaatt' : 'klar';

  // Reise-innhold: guide + noder, med bossen flettet inn rett etter «etterNode».
  const guideSnakk = bossTilstand === 'slaatt'
    ? 'Push-up-pandaen er slått — du er offisielt push-up-mester 🐼'
    : bossTilstand === 'klar'
      ? 'Push-up-pandaen står klar. Tør du en push-up-kamp?'
      : antallMestret >= ledd.length
        ? 'Wow — hele stien! Sterkt jobba.'
        : 'Push-up-pandaen heier på deg. Ett trinn om gangen!';
  const reiseBarn = [
    el('div', { class: 'reise-guide' },
      pandaAnim('idle', 'wave', 'reise-guide__panda', 'idle'),
      el('span', { class: 'reise-guide__snakk' }, guideSnakk),
    ),
  ];
  let bossSatt = false;
  noder.forEach((n) => {
    reiseBarn.push(reiseNode(sti, n));
    if (boss && !bossSatt && n.l.ovelse === boss.etterNode) {
      reiseBarn.push(reiseBoss(sti, boss, bossTilstand, bossStj));
      bossSatt = true;
    }
  });
  if (boss && !bossSatt) reiseBarn.push(reiseBoss(sti, boss, bossTilstand, bossStj));

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
      el('div', { class: 'reise' }, ...reiseBarn),
      bossTilstand === 'slaatt'
        ? el('p', { class: 'sti-fot sti-fot--ferdig' }, ikon('trofe', 'ikon'), ' Push-up-pandaen er slått — du er push-up-mester!')
        : antallMestret >= ledd.length && ledd.length
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
  const wrap = el('div', { class: `reise-node reise-node--${tilstand}`, style: `transform:translateX(${dx}px)` }, knapp);
  wrap.style.setProperty('--reise-forsinkelse', `${i * 55}ms`);
  wrap.style.setProperty('--dx', `${dx}px`);
  knapp.addEventListener('click', (ev) => {
    ev.stopPropagation();
    apneNodePopover(sti, l, tilstand, wrap);
  });
  return wrap;
}

// --- Node-popover (trykk på node → kort med START + XP) -------------------
let _apenPopover = null;
let _aktivWrap = null;

function lukkPopover() {
  _apenPopover?.remove(); _apenPopover = null;
  _aktivWrap?.classList.remove('reise-node--aktiv'); _aktivWrap = null;
  document.querySelector('.reise-scrim')?.remove();
}

function knappStart(tekst, onclick, sekundaer = false) {
  const b = el('button', { class: 'reise-popover__start' + (sekundaer ? ' reise-popover__start--sek' : ''), type: 'button' }, tekst);
  b.addEventListener('click', (ev) => { ev.stopPropagation(); onclick(); });
  return b;
}

function apneNodePopover(sti, ledd, tilstand, wrap) {
  const alleredeApen = _aktivWrap === wrap;
  lukkPopover();
  if (alleredeApen) return; // andre trykk lukker igjen
  vibrer('lett');

  const e = _bib?.ovelse(ledd.ovelse);
  const navn = e?.navn || ledd.ovelse;
  const niva = NIVA[ledd.niva] || NIVA[1];
  const data = (sti.trinn && sti.trinn[ledd.ovelse]) || {};
  const xp = beregnXp(data.minutter || 3, sti.bevegelse || 'bodyweight', 3);

  let kort;
  if (tilstand === 'laast') {
    kort = el('div', { class: `reise-popover ${niva.klasse} reise-popover--laast` },
      el('span', { class: 'reise-popover__tail' }),
      el('h3', { class: 'reise-popover__navn' }, navn),
      el('p', { class: 'reise-popover__meta' }, 'Fullfør forrige trinn for å låse opp.'),
      knappStart('Se øvelsen', () => { lukkPopover(); visOvelseArk(navn); }, true),
    );
  } else {
    const cta = tilstand === 'mestret' ? 'Øv igjen' : 'Start';
    kort = el('div', { class: `reise-popover ${niva.klasse}` },
      el('span', { class: 'reise-popover__tail' }),
      el('h3', { class: 'reise-popover__navn' }, navn),
      el('p', { class: 'reise-popover__meta' }, niva.ord),
      knappStart(`${cta} · +${xp} XP`, () => startMedAnimasjon(sti, ledd)),
    );
  }

  const scrim = el('div', { class: 'reise-scrim' });
  scrim.addEventListener('click', lukkPopover);
  const reise = wrap.parentElement;
  reise.append(scrim);
  wrap.append(kort);
  wrap.classList.add('reise-node--aktiv');
  _apenPopover = kort;
  _aktivWrap = wrap;
  requestAnimationFrame(() => kort.classList.add('reise-popover--inn'));
}

// --- Overgang til modulen: zoom + fade til hvitt → lasteskjerm med panda --
const LASTETEKSTER = [
  'Push-up-pandaen varmer opp for deg …',
  'Visste du? Push-ups trener bryst, skuldre, triceps og kjernen på én gang.',
  'Ti rolige reps slår null reps. Hver gang.',
  'Teknikk før tempo — rent og kontrollert vinner.',
  'Klar? Pandaen teller ned …',
];

function startMedAnimasjon(sti, ledd) {
  lukkPopover();
  vibrer('medium');
  const i = Math.floor((Date.now() / 1000) % LASTETEKSTER.length);
  const laster = el('div', { class: 'reise-laster' },
    el('div', { class: 'reise-laster__inn' },
      el('div', { class: 'reise-laster__panda reise-laster__panda--pushup' },
        pandaAnim('pushup-up', 'pushup-down', 'reise-laster__figur', 'pushup')),
      el('p', { class: 'reise-laster__merke' }, 'Laster …'),
      el('p', { class: 'reise-laster__tekst' }, LASTETEKSTER[i]),
    ),
  );
  document.body.append(laster);
  requestAnimationFrame(() => laster.classList.add('reise-laster--pa'));
  setTimeout(() => {
    startLeksjon(sti, ledd);
    requestAnimationFrame(() => laster.classList.add('reise-laster--ut'));
    setTimeout(() => laster.remove(), 400);
  }, 1050);
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
        vibrer(riktig ? 'riktig' : 'feil');
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
    vibrer('medium');
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
    vibrer('feiring');
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

// ===========================================================================
// Boss: push-up-pandaen står ved stien og kan utfordres til push-up-kamp.
// Tre nivåer, én stjerne pr. slått nivå, tre stjerner = mestret øvelse.
// ===========================================================================
function reiseBoss(sti, boss, tilstand, stjerner) {
  const figur = tilstand === 'slaatt'
    ? pandaImg('cheer', 'reise-boss__panda')
    : pandaAnim('idle', 'wave', 'reise-boss__panda', 'idle');

  const scene = el('button', {
    class: 'reise-boss__scene', type: 'button',
    'aria-label': `${boss.tittel} — ${stjerner} av ${BOSS_MAKS_STJERNER} stjerner`,
  },
    el('div', { class: 'reise-boss__glow' }),
    tilstand === 'laast' ? el('span', { class: 'reise-boss__zzz' }, 'z z') : null,
    figur,
    el('div', { class: 'reise-boss__plate' },
      el('span', { class: 'reise-boss__navn' }, boss.tittel),
      stjerneRad(stjerner, 'reise-boss__stjerner'),
    ),
  );

  const wrap = el('div', { class: `reise-boss reise-boss--${tilstand}` }, scene);
  wrap.style.setProperty('--dx', '0px');
  scene.addEventListener('click', (ev) => {
    ev.stopPropagation();
    apneBossPopover(sti, boss, tilstand, stjerner, wrap);
  });
  return wrap;
}

function apneBossPopover(sti, boss, tilstand, stjerner, wrap) {
  const alleredeApen = _aktivWrap === wrap;
  lukkPopover();
  if (alleredeApen) return;
  vibrer('lett');

  let kort;
  if (tilstand === 'laast') {
    kort = el('div', { class: 'reise-popover reise-popover--laast' },
      el('span', { class: 'reise-popover__tail' }),
      el('h3', { class: 'reise-popover__navn' }, boss.tittel),
      el('p', { class: 'reise-popover__meta' }, boss.laasHint),
    );
  } else {
    const revansje = stjerner >= BOSS_MAKS_STJERNER;
    const cta = revansje ? 'Ta en revansje'
      : stjerner === 0 ? 'Utfordre pandaen'
        : `Nivå ${stjerner + 1} av ${BOSS_MAKS_STJERNER}`;
    kort = el('div', { class: 'reise-popover reise-popover--boss' },
      el('span', { class: 'reise-popover__tail' }),
      el('h3', { class: 'reise-popover__navn' }, boss.tittel),
      el('p', { class: 'reise-popover__meta' }, revansje ? 'Push-up-mester! Alle tre stjerner er dine.' : boss.innbydelse),
      stjerneRad(stjerner, 'reise-popover__stjerner'),
      knappStart(cta, () => startBossKamp(sti, boss, revansje ? 0 : stjerner)),
    );
  }

  const scrim = el('div', { class: 'reise-scrim' });
  scrim.addEventListener('click', lukkPopover);
  wrap.parentElement.append(scrim);
  wrap.append(kort);
  wrap.classList.add('reise-node--aktiv');
  _apenPopover = kort;
  _aktivWrap = wrap;
  requestAnimationFrame(() => kort.classList.add('reise-popover--inn'));
}

// --- Selve kampen: tell push-ups sammen med pandaen, ett nivå om gangen -----
function startBossKamp(sti, boss, startNiva) {
  lukkPopover();
  vibrer('medium');
  const nivaer = boss.nivaer || [];
  if (!nivaer.length) return;
  let niva = Math.max(0, Math.min(startNiva, nivaer.length - 1));
  let stjerner = bossStjerner(sti.id);

  const lukkX = el('button', { class: 'leksjon__lukk', type: 'button', 'aria-label': 'Avslutt', onclick: lukk }, ikon('kryss'));
  const pips = stjerneRad(stjerner, 'kamp__pips');
  const kropp = el('div', { class: 'kamp__kropp' });
  const bunn = el('div', { class: 'leksjon__bunn' });
  const overlay = el('div', { class: 'leksjon kamp' },
    el('div', { class: 'leksjon__topp' }, lukkX, el('span', { class: 'kamp__tittel' }, boss.tittel), pips),
    kropp, bunn,
  );
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('leksjon--apen'));
  tegnRunde();

  function lukk() {
    overlay.classList.add('leksjon--lukker');
    setTimeout(() => overlay.remove(), 200);
    if (_mount) visStiSkjerm(_mount);
  }

  function settPips(n, nySiste = false) {
    pips.querySelectorAll('.stjernerad__stj').forEach((s, i) => {
      const pa = i < n;
      s.classList.toggle('stjernerad__stj--pa', pa);
      s.classList.toggle('stjernerad__stj--ny', pa && nySiste && i === n - 1);
    });
  }

  function tegnRunde() {
    const n = nivaer[niva];
    const maal = n.reps || 10;
    let reps = 0;
    let avgjort = false;

    const panda = pandaAnim('pushup-up', 'pushup-down', 'kamp__panda', 'kamp');
    const tall = el('span', { class: 'kamp__tall' }, '0');
    const pushKnapp = el('button', { class: 'kamp__push', type: 'button' }, 'PUSH');
    let dukkTimer = null;

    function dunk() {
      if (avgjort) return;
      reps = Math.min(maal, reps + 1);
      tall.textContent = String(reps);
      vibrer('lett');
      panda.classList.add('panda-anim--ned');
      clearTimeout(dukkTimer);
      dukkTimer = setTimeout(() => panda.classList.remove('panda-anim--ned'), 200);
      pushKnapp.classList.remove('kamp__push--puls');
      void pushKnapp.offsetWidth;
      pushKnapp.classList.add('kamp__push--puls');
      if (reps >= maal) rundeVunnet();
    }
    pushKnapp.addEventListener('click', dunk);

    tom(kropp); tom(bunn);
    kropp.append(
      el('span', { class: 'kamp__merke' }, `Nivå ${niva + 1} av ${nivaer.length}`),
      el('h1', { class: 'kamp__navn' }, n.navn),
      panda,
      el('p', { class: 'kamp__oppgave' }, n.tekst),
      el('div', { class: 'kamp__teller' }, tall, el('span', { class: 'kamp__maal' }, `/ ${maal}`)),
      el('p', { class: 'kamp__hint dempet' }, 'Pandaen gjør dem sammen med deg. Trykk PUSH for hver.'),
    );
    bunn.append(
      pushKnapp,
      el('button', { class: 'kamp__ferdig-lenke', type: 'button', onclick: rundeVunnet }, 'Jeg klarte runden ✓'),
    );

    function rundeVunnet() {
      if (avgjort) return;
      avgjort = true;
      clearTimeout(dukkTimer);
      vibrer('riktig');
      const vunnet = niva + 1;
      let res = { xp: 0, nyeMerker: [] };
      try {
        res = registrerOgLogg({
          bevegelse: sti.bevegelse || 'bodyweight',
          varighetMin: 3,
          intensitet: 4,
          tittel: `${boss.tittel}: ${n.navn}`,
          kilde: 'laer',
          ekstra: { sti: sti.id, node: 'boss', bossNiva: vunnet },
        });
      } catch (err) { console.warn('Kunne ikke logge boss-runde', err); }
      if (vunnet > stjerner) { stjerner = vunnet; settPips(stjerner, true); }
      if (niva >= nivaer.length - 1) tegnSeier(res);
      else tegnMellom(res);
    }
  }

  function tegnMellom(res) {
    tom(kropp); tom(bunn);
    kropp.append(
      el('div', { class: 'kamp__runde' },
        pandaImg('cheer', 'kamp__runde-panda'),
        el('h1', { class: 'kamp__runde-tittel' }, 'Runde vunnet!'),
        el('div', { class: 'kamp__runde-stjerne' }, ikon('stjerne', 'ikon')),
        el('div', { class: 'leksjon-feiring__xp' }, ikon('lyn', 'ikon'), ` +${res.xp || 0} XP`),
      ),
    );
    bunn.append(leksjonPrimaer('Neste runde', () => { niva += 1; tegnRunde(); }));
    try { overlay.append(lagKonfetti()); } catch { /* valgfri feiring */ }
  }

  function tegnSeier(res) {
    vibrer('feiring');
    lukkX.style.visibility = 'hidden';
    tom(kropp); tom(bunn);
    kropp.append(
      el('div', { class: 'kamp__seier' },
        pandaImg('cheer', 'kamp__seier-panda'),
        stjerneRad(BOSS_MAKS_STJERNER, 'kamp__seier-stjerner'),
        el('h1', { class: 'kamp__seier-tittel' }, 'Pandaen er slått!'),
        el('p', { class: 'kamp__seier-under' }, 'Du er push-up-mester 🐼'),
        el('div', { class: 'leksjon-feiring__xp' }, ikon('lyn', 'ikon'), ` +${res.xp || 0} XP`),
        ...((res.nyeMerker || []).length
          ? [el('div', { class: 'leksjon-feiring__merke' }, ikon('medalje', 'ikon'), ' Nytt merke: ' + res.nyeMerker.map((m) => m.navn).join(', '))]
          : []),
      ),
    );
    bunn.append(leksjonPrimaer('Fortsett', lukk));
    try { overlay.append(lagKonfetti()); } catch { /* valgfri feiring */ }
  }
}
