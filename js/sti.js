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
  const href = `#/sti?id=${encodeURIComponent(sti.id)}`;
  const kort = el('a', { class: 'stikort', href },
    el('span', { class: 'stikort__merke' }, mestret > 0 ? 'Fortsett' : 'Nytt'),
    el('div', { class: 'stikort__ikon' }, ikon(sti.ikon || 'vekt')),
    el('div', { class: 'stikort__kropp' },
      el('span', { class: 'stikort__over' }, 'Ferdighetssti'),
      el('h2', { class: 'stikort__tittel' }, sti.tittel),
      el('p', { class: 'stikort__under' }, under),
    ),
    el('span', { class: 'stikort__pil' }, ikon('chevron')),
  );
  kort.addEventListener('click', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return; // ny fane som normalt
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return; // la lenken navigere
    if (_pendingInngang) { ev.preventDefault(); return; }
    ev.preventDefault();
    try { flyvInn(kort, href, sti, mestret, antall); } catch { location.hash = href; }
  });
  return kort;
}

// --- «Kortet flyr til toppen»-animasjon ----------------------------------
// Ved trykk på Lær-kortet: kortet glir opp og blir reise-headeren, mens Lær-
// skjermen (mova-header + innhold) sklir ut oppover. Bunnbaren blir stående
// (den ligger på body, ikke i #app). Første leksjon/kamp skjuler alt via egne
// fullskjerm-overlegg. Degraderer til vanlig navigasjon ved redusert bevegelse.
let _inngangKlon = null;
let _pendingInngang = false;

function safeTop() {
  try {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top);';
    document.body.appendChild(p);
    const h = p.offsetHeight; p.remove();
    return h || 0;
  } catch { return 0; }
}

function ryddInngang() {
  _pendingInngang = false;
  _inngangKlon?.remove();
  _inngangKlon = null;
  const app = document.getElementById('app');
  if (app) { app.style.transition = ''; app.style.transform = ''; app.style.opacity = ''; }
}

// Måler nøyaktig hvor (og hvor stort) reise-topp-kortet lander, ved å rendre
// headeren skjult og lese størrelsen — så klonen morphes til eksakt samme boks.
function maalHeaderRect(sti, gjort, av) {
  let h = 84;
  try {
    const bar = reiseTopp(sti, gjort, av);
    Object.assign(bar.style, { position: 'fixed', left: '0', top: '0', width: `${window.innerWidth}px`, visibility: 'hidden', pointerEvents: 'none', zIndex: '-1' });
    document.body.appendChild(bar);
    const kort = bar.querySelector('.reise-topp__kort');
    if (kort) h = kort.getBoundingClientRect().height;
    bar.remove();
  } catch { /* fallback-høyde */ }
  return { left: 12, top: safeTop() + 8, width: window.innerWidth - 24, height: h };
}

// Felles morph-oppsett på en klon: fast plassert, myk overgang på boksen.
function settOppKlon(klon, fra, ms = 0.44) {
  Object.assign(klon.style, {
    position: 'fixed', margin: '0', boxSizing: 'border-box',
    left: `${fra.left}px`, top: `${fra.top}px`, width: `${fra.width}px`, height: `${fra.height}px`,
    zIndex: '4000', pointerEvents: 'none', overflow: 'hidden',
    transition: `left ${ms}s var(--ease-standard), top ${ms}s var(--ease-standard), width ${ms}s var(--ease-standard), height ${ms}s var(--ease-standard), border-radius ${ms}s var(--ease-standard)`,
    boxShadow: '0 16px 38px rgba(1,63,64,0.3)',
  });
}

function flyvInn(kortEl, href, sti, gjort, av) {
  const fra = kortEl.getBoundingClientRect();
  const to = maalHeaderRect(sti, gjort, av);
  const klon = kortEl.cloneNode(true);
  klon.removeAttribute('href');
  settOppKlon(klon, fra);
  document.body.appendChild(klon);
  kortEl.style.visibility = 'hidden';
  _inngangKlon = klon;
  _pendingInngang = true;

  const app = document.getElementById('app');
  if (app) {
    app.style.transformOrigin = 'top center';
    app.style.transition = 'transform 0.4s var(--ease-standard), opacity 0.32s ease';
  }

  requestAnimationFrame(() => {
    Object.assign(klon.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, borderRadius: '20px' });
    if (app) { app.style.transform = 'translateY(-46px)'; app.style.opacity = '0'; }
  });

  setTimeout(() => { location.hash = href; }, 320);
  setTimeout(() => { if (_pendingInngang) ryddInngang(); }, 1300); // sikkerhetsnett
}

// Revers: fra reisen tilbake til Lær — headeren morphes ned til Lær-kortet
// mens Lær-skjermen glir inn ovenfra. Kalles fra tilbake-knappen i headeren.
function tilbakeFraReise() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { history.back(); return; }
  const kort = document.getElementById('reise-topp-kort');
  if (!kort) { history.back(); return; }
  const fra = kort.getBoundingClientRect();
  const klon = kort.cloneNode(true);
  settOppKlon(klon, fra, 0.42);
  document.body.appendChild(klon);
  let ferdig = false;
  const rydd = () => { if (ferdig) return; ferdig = true; klon.remove(); };

  window.addEventListener('hashchange', function once() {
    window.removeEventListener('hashchange', once);
    requestAnimationFrame(() => {
      const maal = document.querySelector('.stikort');
      const app = document.getElementById('app');
      if (app) {
        app.style.transition = 'none';
        app.style.transformOrigin = 'top center';
        app.style.transform = 'translateY(-40px)';
        app.style.opacity = '0';
        requestAnimationFrame(() => {
          app.style.transition = 'transform 0.4s var(--ease-standard), opacity 0.34s ease';
          app.style.transform = '';
          app.style.opacity = '';
        });
      }
      if (maal) {
        const to = maal.getBoundingClientRect();
        maal.style.visibility = 'hidden';
        requestAnimationFrame(() => {
          Object.assign(klon.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, borderRadius: getComputedStyle(maal).borderRadius });
          klon.style.transition += ', opacity 0.18s ease 0.3s';
          klon.style.opacity = '0';
        });
        setTimeout(() => { maal.style.visibility = ''; rydd(); }, 560);
      } else { rydd(); }
    });
  }, { once: true });

  setTimeout(rydd, 1500); // sikkerhetsnett
  history.back();
}

// Kalles fra visStiSkjerm når en inngangsanimasjon er i gang: reisen er alt
// tegnet på rett plass (transform nullstilt i toppen), så vi bare toner klonen
// ut idet den lander — headeren under avsløres.
function avsluttInngang() {
  _pendingInngang = false;
  const klon = _inngangKlon; _inngangKlon = null;
  if (!klon) return;
  setTimeout(() => {
    klon.style.transition = 'opacity 0.2s ease';
    klon.style.opacity = '0';
    setTimeout(() => klon.remove(), 220);
  }, 150);
}

// --- Sti-skjerm (#/sti?id=) ----------------------------------------------
export function visStiSkjerm(mount) {
  _mount = mount;
  // Nullstill ev. «flyv inn»-transform på #app så reisen tegnes på rett plass.
  mount.style.transition = 'none';
  mount.style.transform = '';
  mount.style.opacity = '';
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

  // Boss: push-up-pandaen kan utfordres til enhver tid (ingen låsing) — klar,
  // eller slått (tre stjerner). Han står på siden av stien og gjør push-ups
  // der han står; posisjoneres etter render (måles mot en node).
  const boss = sti.boss || null;
  const bossStj = boss ? bossStjerner(sti.id) : 0;
  const bossTilstand = !boss ? null : (bossStj >= BOSS_MAKS_STJERNER ? 'slaatt' : 'klar');

  const guideSnakk = !boss
    ? (antallMestret >= ledd.length ? 'Wow — hele stien! Sterkt jobba.' : 'Ett trinn om gangen — du fikser dette!')
    : bossTilstand === 'slaatt'
      ? 'Push-up-pandaen er slått — du er offisielt push-up-mester 🐼'
      : 'Push-up-pandaen står langs stien. Utfordre den når du vil!';

  const reiseEl = el('div', { class: 'reise' },
    el('div', { class: 'reise-guide' },
      pandaAnim('idle', 'wave', 'reise-guide__panda', 'idle'),
      el('span', { class: 'reise-guide__snakk' }, guideSnakk),
    ),
    ...noder.map((n) => reiseNode(sti, n)),
  );
  if (boss) reiseEl.append(reiseBoss(sti, boss, bossTilstand, bossStj));

  tom(mount);
  mount.append(
    reiseTopp(sti, antallMestret, ledd.length),
    el('main', { class: 'innhold innhold--ovelse innhold--reise' },
      reiseEl,
      bossTilstand === 'slaatt'
        ? el('p', { class: 'sti-fot sti-fot--ferdig' }, ikon('trofe', 'ikon'), ' Push-up-pandaen er slått — du er push-up-mester!')
        : antallMestret >= ledd.length && ledd.length
          ? el('p', { class: 'sti-fot sti-fot--ferdig' }, ikon('trofe', 'ikon'), ' Hele stien er mestret — sterkt jobba!')
          : el('p', { class: 'sti-fot dempet' }, 'Mestre et trinn for å låse opp det neste.'),
    ),
  );

  // Plasser bossen i høyre rennestein, på høyde med en venstreforskjøvet node
  // (så gutteren er klar). Måles etter at DOM finnes — robust mot tekstbrytning.
  if (boss) {
    const bossEl = reiseEl.querySelector('.reise-boss');
    const nodeEls = reiseEl.querySelectorAll('.reise-node');
    const anker = nodeEls[Math.min(5, nodeEls.length - 1)];
    if (bossEl && anker) bossEl.style.top = `${anker.offsetTop + anker.offsetHeight / 2}px`;
  }

  if (_pendingInngang) avsluttInngang();
}

// Kompakt, klebrig topp-kort (Duolingo-aktig «unit header»): ikon, etikett,
// tittel og en tynn framdriftslinje — mye lettere enn den gamle intro-heroen.
// Dette kortet er også målet for «kortet flyr til toppen»-animasjonen.
function reiseTopp(sti, gjort, av) {
  const pct = av ? Math.round((gjort / av) * 100) : 0;
  return el('header', { class: 'reise-topp' },
    el('div', { class: 'reise-topp__kort', id: 'reise-topp-kort' },
      el('div', { class: 'reise-topp__glans' }),
      el('div', { class: 'reise-topp__rad' },
        el('button', { class: 'reise-topp__tilbake', type: 'button', title: 'Tilbake', onclick: tilbakeFraReise }, '‹'),
        el('div', { class: 'reise-topp__ikon' }, ikon(sti.ikon || 'vekt')),
        el('div', { class: 'reise-topp__tekst' },
          el('span', { class: 'reise-topp__over' }, 'Ferdighetssti'),
          el('h1', { class: 'reise-topp__tittel' }, sti.tittel),
        ),
        el('span', { class: 'reise-topp__tall' }, `${gjort}/${av}`),
      ),
      el('div', { class: 'reise-topp__spor' }, el('div', { class: 'reise-topp__fyll', style: `width:${pct}%` })),
    ),
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
  // Ingen tittel/plate — bare pandaen (som gjør push-ups) og tre stjerner under.
  const scene = el('button', {
    class: 'reise-boss__scene', type: 'button',
    'aria-label': `Push-up-pandaen — ${stjerner} av ${BOSS_MAKS_STJERNER} stjerner. Utfordre til push-up-kamp.`,
  },
    el('div', { class: 'reise-boss__glow' }),
    pandaAnim('pushup-up', 'pushup-down', 'reise-boss__panda', 'pushup'),
    stjerneRad(stjerner, 'reise-boss__stjerner'),
  );

  const wrap = el('div', { class: `reise-boss reise-boss--${tilstand}` }, scene);
  scene.addEventListener('click', (ev) => {
    ev.stopPropagation();
    apneBossModal(sti, boss, stjerner);
  });
  return wrap;
}

// Utfordrings-modal (sentrert): bossen står i rennesteinen, så en tail-popover
// ville klippe mot kanten — vi bruker et lite midtstilt kort i stedet.
let _bossModal = null;
function lukkBossModal() {
  const m = _bossModal;
  _bossModal = null;
  if (!m) return;
  m.classList.add('bosskort-lag--ut');
  setTimeout(() => m.remove(), 180);
}

function apneBossModal(sti, boss, stjerner) {
  lukkPopover();
  if (_bossModal) { lukkBossModal(); return; }
  vibrer('lett');
  const revansje = stjerner >= BOSS_MAKS_STJERNER;
  const cta = revansje ? 'Ta en revansje'
    : stjerner === 0 ? 'Utfordre pandaen'
      : `Nivå ${stjerner + 1} av ${BOSS_MAKS_STJERNER}`;
  const kort = el('div', { class: 'bosskort' },
    pandaImg('flex', 'bosskort__panda'),
    stjerneRad(stjerner, 'bosskort__stjerner'),
    el('p', { class: 'bosskort__tekst' },
      revansje ? 'Push-up-mester! Alle tre stjerner er dine — tør du en revansje?' : boss.innbydelse),
    knappStart(cta, () => { lukkBossModal(); startBossKamp(sti, boss, revansje ? 0 : stjerner); }),
    el('button', { class: 'bosskort__avbryt', type: 'button', onclick: lukkBossModal }, 'Ikke nå'),
  );
  const scrim = el('div', { class: 'bosskort__scrim' });
  scrim.addEventListener('click', lukkBossModal);
  const lag = el('div', { class: 'bosskort-lag' }, scrim, kort);
  document.body.append(lag);
  _bossModal = lag;
  requestAnimationFrame(() => lag.classList.add('bosskort-lag--inn'));
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
