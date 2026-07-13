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
import { hentLogg, hentPlan, leggTilPlan, fjernPlan } from './store.js';
import { settSeksjonsstruktur } from './merker.js';
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
let _disipliner = null;
let _seksjoner = null;
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

/** Laster disiplinene (treningsformer) — data/disipliner.json. */
export async function lastDisipliner() {
  if (_disipliner) return _disipliner;
  const res = await fetch('data/disipliner.json');
  if (!res.ok) throw new Error(`Kunne ikke laste disipliner (${res.status})`);
  _disipliner = await res.json();
  return _disipliner;
}

/** Laster seksjonene (nivå-tiers m/ enheter) — data/seksjoner.json. */
export async function lastSeksjoner() {
  if (_seksjoner) return _seksjoner;
  const res = await fetch('data/seksjoner.json');
  if (!res.ok) throw new Error(`Kunne ikke laste seksjoner (${res.status})`);
  _seksjoner = await res.json();
  settSeksjonsstruktur(_seksjoner); // gi merkene enhet-/seksjon-strukturen
  return _seksjoner;
}

export function alleStier() { return _stier || []; }
export function alleDisipliner() { return _disipliner || []; }
function finnSti(id) { return (_stier || []).find((s) => s.id === id) || null; }
function finnKjede(id) { return (_kjeder || []).find((k) => k.id === id) || null; }
function finnDisiplin(id) { return (_disipliner || []).find((d) => d.id === id) || null; }
function finnSeksjon(id) { return (_seksjoner || []).find((s) => s.id === id) || null; }

// Re-tegn den aktive reisen (enkelt-sti eller seksjon) etter en leksjon.
function reTegnReise() {
  if (!_mount) return;
  const rute = (location.hash.replace('#/', '') || '').split('?')[0];
  if (rute === 'seksjon') visSeksjonSkjerm(_mount);
  else visStiSkjerm(_mount);
}

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

/** Stjerner (0–3) tjent på en enhets uteksaminering — maks over alle forsøk i
 *  loggen. 3 stjerner = uteksaminert (traff alle rep-mål med margin). */
function enhetStjerner(seksjonId, enhetId) {
  let maks = 0;
  for (const o of hentLogg()) {
    if (o.kilde === 'laer' && o.sti === seksjonId && o.node === 'graduation'
      && o.enhet === enhetId && typeof o.stjerner === 'number') {
      maks = Math.max(maks, o.stjerner);
    }
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

// --- Disiplin-rad i Lær + disiplin/seksjon-skjermer ----------------------
/** Rad med disiplin-kort til toppen av Lær-feeden. */
export function disiplinRad() {
  const disipliner = alleDisipliner();
  if (!disipliner.length) return null;
  return el('section', { class: 'disiplinrad' },
    el('h2', { class: 'disiplinrad__tittel' }, 'Ferdighetsløp'),
    el('div', { class: 'disiplinliste' }, ...disipliner.map(disiplinKort)),
  );
}

function disiplinKort(d) {
  const aktiv = d.status === 'aktiv';
  const kort = el('a', {
    class: `disiplinkort disiplinkort--${d.farge}` + (aktiv ? '' : ' disiplinkort--laast'),
    href: aktiv ? `#/disiplin?id=${encodeURIComponent(d.id)}` : '#/laer',
    'aria-disabled': aktiv ? null : 'true',
  },
    el('div', { class: 'disiplinkort__ikon' }, ikon(d.ikon || 'vekt')),
    el('div', { class: 'disiplinkort__kropp' },
      el('span', { class: 'disiplinkort__navn' }, d.navn),
      el('span', { class: 'disiplinkort__under' }, aktiv ? d.undertittel : 'Kommer snart'),
    ),
    aktiv ? el('span', { class: 'disiplinkort__pil' }, ikon('chevron'))
      : el('span', { class: 'disiplinkort__las' }, ikon('las')),
  );
  if (!aktiv) kort.addEventListener('click', (ev) => ev.preventDefault());
  return kort;
}

/** #/disiplin?id= — seksjons-oversikt for en disiplin. */
export function visDisiplinSkjerm(mount) {
  _mount = mount;
  mount.style.transition = 'none'; mount.style.transform = ''; mount.style.opacity = '';
  const id = new URLSearchParams(location.hash.split('?')[1] || '').get('id') || '';
  const d = finnDisiplin(id);
  if (!d) { location.hash = '#/laer'; return; }
  const seksjoner = (d.seksjoner || []).map(finnSeksjon).filter(Boolean);

  tom(mount);
  mount.append(
    el('header', { class: 'topp topp--kjor' },
      el('button', { class: 'topp__tilbake', type: 'button', title: 'Tilbake', onclick: () => { location.hash = '#/laer'; } }, '‹'),
      el('div', {},
        el('h1', { class: 'topp__tittel' }, d.navn),
        el('p', { class: 'topp__under' }, d.undertittel),
      ),
    ),
    el('main', { class: 'innhold' },
      ...seksjoner.map((s, i) => seksjonKort(s, i, d)),
      ...(d.kapsteiner || []).map((id) => kapsteinKort(id, d)).filter(Boolean),
      el('p', { class: 'sti-fot dempet' }, seksjoner.length ? 'Velg en variant — flere kommer etter hvert.' : 'Innhold i denne disiplinen er på vei.'),
    ),
  );
}

// Kapstein-kort: en frittstående ferdighetssti (f.eks. push-up-pandaen) som
// bor i disiplinen. Beholder sin egen reise (#/sti?id=) + boss + mester-tema.
function kapsteinKort(stiId, d) {
  const sti = finnSti(stiId);
  if (!sti) return null;
  const stj = sti.boss ? bossStjerner(sti.id) : 0;
  const slaatt = stj >= BOSS_MAKS_STJERNER;
  return el('a', { class: `seksjonkort seksjonkort--kapstein seksjonkort--${d.farge}`, href: `#/sti?id=${encodeURIComponent(sti.id)}` },
    el('div', { class: 'seksjonkort__topp' },
      el('div', { class: 'seksjonkort__snakk' }, slaatt ? 'Mestret!' : 'Bosskamp'),
      pandaImg(slaatt ? 'cheer' : 'flex', 'seksjonkort__panda'),
    ),
    el('div', { class: 'seksjonkort__bunn' },
      el('div', {},
        el('span', { class: 'seksjonkort__merke' }, 'Kapstein'),
        el('h2', { class: 'seksjonkort__tittel' }, sti.tittel),
        el('p', { class: 'seksjonkort__under' }, sti.undertittel),
      ),
      el('div', { class: 'seksjonkort__framdrift' },
        stjerneRad(stj, 'seksjonkort__stjerner'),
        el('span', { class: 'seksjonkort__pil' }, ikon('chevron')),
      ),
    ),
  );
}

function seksjonKort(s, i, d) {
  const enheter = s.enheter || [];
  const gradert = enheter.filter((e) => enhetStjerner(s.id, e.id) >= BOSS_MAKS_STJERNER).length;
  const startet = gradert > 0 || mestredeNoder(s.id).size > 0;
  const ferdig = gradert >= enheter.length && enheter.length;
  return el('a', { class: `seksjonkort seksjonkort--${s.farge || d.farge}`, href: `#/seksjon?id=${encodeURIComponent(s.id)}` },
    el('div', { class: 'seksjonkort__topp' },
      el('div', { class: 'seksjonkort__snakk' }, startet ? 'Fortsett!' : 'La oss starte!'),
      pandaImg(ferdig ? 'cheer' : 'wave', 'seksjonkort__panda'),
    ),
    el('div', { class: 'seksjonkort__bunn' },
      el('div', {},
        el('span', { class: 'seksjonkort__merke' }, 'Variant'),
        el('h2', { class: 'seksjonkort__tittel' }, s.navn),
        el('p', { class: 'seksjonkort__under' }, s.undertittel),
      ),
      el('div', { class: 'seksjonkort__framdrift' },
        el('span', { class: 'seksjonkort__tall' }, startet ? `${gradert}/${enheter.length}` : `${enheter.length} enheter`),
        el('span', { class: 'seksjonkort__pil' }, ikon('chevron')),
      ),
    ),
  );
}

/** #/seksjon?id= — reisen for en seksjon: enheter (headere) + steg-noder. */
export function visSeksjonSkjerm(mount) {
  _mount = mount;
  mount.style.transition = 'none'; mount.style.transform = ''; mount.style.opacity = '';
  const id = new URLSearchParams(location.hash.split('?')[1] || '').get('id') || '';
  const seksjon = finnSeksjon(id);
  if (!seksjon) { location.hash = '#/laer'; return; }
  const disiplin = finnDisiplin(seksjon.disiplin);
  const enheter = seksjon.enheter || [];
  const alleSteg = enheter.flatMap((u) => u.steg);

  // Syntetisk «sti» så hele teknikk-leksjons-/popover-motoren gjenbrukes uendret.
  const syntSti = {
    id: seksjon.id, tittel: seksjon.navn, bevegelse: 'bodyweight',
    ikon: disiplin?.ikon || 'vekt',
    trinn: Object.fromEntries(alleSteg.map((st) => [st.ovelse, st])),
  };
  const mestret = mestredeNoder(seksjon.id); // teknikk lært pr. øvelse
  // Uteksaminerings-stjerner + gradert (3★) pr. enhet — driver opprykk.
  const gradInfo = enheter.map((enhet) => {
    const stjerner = enhetStjerner(seksjon.id, enhet.id);
    return { stjerner, gradert: stjerner >= BOSS_MAKS_STJERNER };
  });
  const antallGradert = gradInfo.filter((g) => g.gradert).length;
  const ferdig = antallGradert >= enheter.length && enheter.length;

  const reise = el('div', { class: 'reise' },
    el('div', { class: 'reise-guide' },
      pandaAnim('idle', 'wave', 'reise-guide__panda', 'idle'),
      el('span', { class: 'reise-guide__snakk' }, ferdig
        ? 'Hele seksjonen er uteksaminert — sterkt jobba! 🐼'
        : 'Lær teknikken på hver øvelse, så uteksaminer enheten med coach-pandaen.'),
    ),
  );

  let gjeldendeFunnet = false;
  let idx = 0;
  let forrigeGradert = true; // enhet 1 er alltid tilgjengelig
  enheter.forEach((enhet, ei) => {
    const { stjerner, gradert } = gradInfo[ei];
    const enhetTilgj = forrigeGradert; // låst opp når forrige enhet er uteksaminert
    const alleTekniskLaert = enhet.steg.every((st) => mestret.has(st.ovelse));

    reise.append(el('div', { class: 'enhet-header' + (gradert ? ' enhet-header--ferdig' : '') + (enhetTilgj ? '' : ' enhet-header--laast') },
      el('span', { class: 'enhet-header__merke' }, `Enhet ${ei + 1}`),
      el('div', { class: 'enhet-header__midt' },
        el('h2', { class: 'enhet-header__navn' }, enhet.navn),
        el('p', { class: 'enhet-header__intro' }, enhet.intro),
      ),
      stjerneRad(stjerner, 'enhet-header__stjerner'),
    ));

    enhet.steg.forEach((st, si) => {
      const laert = mestret.has(st.ovelse);
      let tilstand;
      if (!enhetTilgj) tilstand = 'laast';
      else if (laert) tilstand = 'mestret';
      else {
        const forrigeLaert = si === 0 || mestret.has(enhet.steg[si - 1].ovelse);
        if (forrigeLaert && !gjeldendeFunnet) { tilstand = 'gjeldende'; gjeldendeFunnet = true; }
        else tilstand = 'laast';
      }
      reise.append(reiseNode(syntSti, { l: st, i: idx, tilstand }));
      idx += 1;
    });

    // Uteksaminerings-node (coach-panda) til slutt i enheten.
    let gradTilstand;
    if (gradert) gradTilstand = 'mestret';
    else if (enhetTilgj && alleTekniskLaert && !gjeldendeFunnet) { gradTilstand = 'gjeldende'; gjeldendeFunnet = true; }
    else gradTilstand = 'laast';
    reise.append(reiseGradNode(seksjon, enhet, gradTilstand, stjerner, idx));
    idx += 1;
    forrigeGradert = gradert;
  });

  tom(mount);
  mount.append(
    reiseTopp(syntSti, antallGradert, enheter.length, disiplin?.navn || 'Kroppsvekt',
      () => { location.hash = `#/disiplin?id=${encodeURIComponent(seksjon.disiplin)}`; }),
    el('main', { class: 'innhold innhold--ovelse innhold--reise' },
      reise,
      ferdig
        ? el('p', { class: 'sti-fot sti-fot--ferdig' }, ikon('trofe', 'ikon'), ' Seksjonen er fullført — sterkt jobba!')
        : el('p', { class: 'sti-fot dempet' }, 'Lær teknikken, så uteksaminer enheten for å låse opp neste.'),
    ),
  );
  settOppSkrymping(mount);

  // Feiring: første gang en enhet er uteksaminert (3★) eller hele seksjonen er
  // ferdig. Seksjons-feiringen vinner (vises alene) når begge skjer samtidig;
  // enhets-flaggene settes uansett så de ikke trigges senere.
  let feiret = false;
  if (ferdig && !harFeiret(seksjonNokkel(seksjon.id))) {
    settFeiret(seksjonNokkel(seksjon.id));
    feirSeksjon(seksjon.navn);
    feiret = true;
  }
  enheter.forEach((enhet, ei) => {
    if (gradInfo[ei].gradert && !harFeiret(enhetNokkel(seksjon.id, enhet.id))) {
      settFeiret(enhetNokkel(seksjon.id, enhet.id));
      if (!feiret) { feirEnhet(enhet.navn); feiret = true; }
    }
  });

  // Dyplenke fra en planlagt økt (hjemmesiden): #/seksjon?id=…&uteks=<enhet>
  // åpner rett enhets-uteksaminering. Strip param først så reTegnReise ikke
  // gjenåpner den, og bare hvis enheten finnes og ikke alt er uteksaminert.
  const uteksParam = new URLSearchParams(location.hash.split('?')[1] || '').get('uteks');
  if (uteksParam && !feiret) {
    try { history.replaceState(null, '', `#/seksjon?id=${encodeURIComponent(seksjon.id)}`); } catch { /* ok */ }
    const målEnhet = enheter.find((e) => e.id === uteksParam);
    const alt = målEnhet && enhetStjerner(seksjon.id, målEnhet.id) >= BOSS_MAKS_STJERNER;
    if (målEnhet && målEnhet.uteksaminering && !alt) setTimeout(() => startUteksaminering(seksjon, målEnhet), 320);
  }
}

// Uteksaminerings-node på reisen: coach-pandaen som «enhets-boss». Låst til alle
// teknikk-steg i enheten er lært; deretter utfordrbar; 3★ = uteksaminert.
function reiseGradNode(seksjon, enhet, tilstand, stjerner, i) {
  const laast = tilstand === 'laast';
  const gradert = tilstand === 'mestret';
  const scene = el('button', {
    class: `reise-grad reise-grad--${tilstand}`, type: 'button',
    'aria-label': `${enhet.navn} — uteksaminering, ${stjerner} av ${BOSS_MAKS_STJERNER} stjerner`,
  },
    el('div', { class: 'reise-grad__glow' }),
    tilstand === 'gjeldende' ? el('span', { class: 'reise-node__puls reise-grad__puls' }) : null,
    laast ? el('span', { class: 'reise-grad__laas' }, ikon('las', 'ikon'))
      : gradert ? pandaImg('cheer', 'reise-grad__panda')
        : pandaAnim('pushup-up', 'pushup-down', 'reise-grad__panda', 'pushup'),
    el('span', { class: 'reise-grad__merke' }, gradert ? 'Uteksaminert' : 'Uteksaminering'),
    tilstand === 'gjeldende'
      ? el('div', { class: 'reise-grad__lyn-rad' }, lynSvg('reise-boble__lyn reise-boble__lyn--a'), lynSvg('reise-boble__lyn reise-boble__lyn--b'))
      : null,
    stjerneRad(stjerner, 'reise-grad__stjerner'),
  );
  const wrap = el('div', { class: 'reise-node reise-grad-wrap' });
  wrap.style.setProperty('--reise-forsinkelse', `${i * 55}ms`);
  scene.addEventListener('click', (ev) => {
    ev.stopPropagation();
    lukkPopover();
    if (laast) { vibrer('feil'); return; }
    startUteksaminering(seksjon, enhet);
  });
  wrap.append(scene);
  return wrap;
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

  // Mester-tilstand: bossen slått (3 stjerner) → hele skjermen får gulltema.
  const mester = bossTilstand === 'slaatt';
  const visMesterTema = mester && mesterFeiret(sti.id); // allerede feiret → gulltema med en gang

  const reiseBarn = [];
  if (!mester) {
    // I mester-tema erstattes guide-kortet av selve restylingen.
    const guideSnakk = !boss
      ? (antallMestret >= ledd.length ? 'Wow — hele stien! Sterkt jobba.' : 'Ett trinn om gangen — du fikser dette!')
      : 'Push-up-pandaen står langs stien. Utfordre den når du vil!';
    reiseBarn.push(el('div', { class: 'reise-guide' },
      pandaAnim('idle', 'wave', 'reise-guide__panda', 'idle'),
      el('span', { class: 'reise-guide__snakk' }, guideSnakk),
    ));
  }
  reiseBarn.push(...noder.map((n) => reiseNode(sti, n)));
  const reiseEl = el('div', { class: 'reise' }, ...reiseBarn);
  if (boss) reiseEl.append(reiseBoss(sti, boss, bossTilstand, bossStj));

  const fot = mester
    ? el('p', { class: 'sti-fot sti-fot--mester' }, ikon('trofe', 'ikon'), ' Du er push-up-mester')
    : antallMestret >= ledd.length && ledd.length
      ? el('p', { class: 'sti-fot sti-fot--ferdig' }, ikon('trofe', 'ikon'), ' Hele stien er mestret — sterkt jobba!')
      : el('p', { class: 'sti-fot dempet' }, 'Mestre et trinn for å låse opp det neste.');

  const skjerm = el('div', { class: 'reise-skjerm' + (visMesterTema ? ' reise-skjerm--mester' : '') },
    visMesterTema ? mesterDekor() : null,
    reiseTopp(sti, antallMestret, ledd.length),
    el('main', { class: 'innhold innhold--ovelse innhold--reise' }, reiseEl, fot),
  );

  tom(mount);
  mount.append(skjerm);
  settOppSkrymping(mount);

  // Plasser bossen i høyre rennestein, på høyde med en venstreforskjøvet node
  // (så gutteren er klar). Måles etter at DOM finnes — robust mot tekstbrytning.
  if (boss) {
    const bossEl = reiseEl.querySelector('.reise-boss');
    const nodeEls = reiseEl.querySelectorAll('.reise-node');
    const anker = nodeEls[Math.min(5, nodeEls.length - 1)];
    if (bossEl && anker) bossEl.style.top = `${anker.offsetTop + anker.offsetHeight / 2}px`;
  }

  if (_pendingInngang) avsluttInngang();

  // Første gang skjermen lastes etter at bossen er slått: stor tema-transformasjon.
  if (mester && !mesterFeiret(sti.id)) { settMesterFeiret(sti.id); feirMester(skjerm); }
}

// --- Push-up-mester: gulltema + engangs-transformasjon --------------------
function mesterFeiret(stiId) {
  try { return localStorage.getItem('mova.mesterFeiret.' + stiId) === '1'; } catch { return true; }
}
function settMesterFeiret(stiId) {
  try { localStorage.setItem('mova.mesterFeiret.' + stiId, '1'); } catch { /* privat modus e.l. */ }
}

// Engangs-flagg for enhet-/seksjon-fullført-feiring (som mesterFeiret).
function harFeiret(nokkel) {
  try { return localStorage.getItem(nokkel) === '1'; } catch { return true; }
}
function settFeiret(nokkel) {
  try { localStorage.setItem(nokkel, '1'); } catch { /* privat modus e.l. */ }
}
const enhetNokkel = (seksjonId, enhetId) => `mova.enhetFeiret.${seksjonId}.${enhetId}`;
const seksjonNokkel = (seksjonId) => `mova.seksjonFeiret.${seksjonId}`;

// Liten gull-krone (SVG) — over bossen og i feiringen.
function kroneSvg(klasse) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 48 34');
  svg.setAttribute('class', 'krone' + (klasse ? ' ' + klasse : ''));
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path d="M4 30 L2 11 L15 21 L24 5 L33 21 L46 11 L44 30 Z" fill="#F5C542" stroke="#D9992B" stroke-width="2" stroke-linejoin="round"/>'
    + '<circle cx="2" cy="11" r="3.2" fill="#F5C542" stroke="#D9992B" stroke-width="1.5"/>'
    + '<circle cx="46" cy="11" r="3.2" fill="#F5C542" stroke="#D9992B" stroke-width="1.5"/>'
    + '<circle cx="24" cy="5" r="3.4" fill="#F5C542" stroke="#D9992B" stroke-width="1.5"/>'
    + '<circle cx="24" cy="26" r="2.4" fill="#fff" opacity="0.85"/>';
  return svg;
}

// Flytende gull-glimt-stjerner over hele skjermen (kun i mester-tema).
function mesterDekor() {
  const d = el('div', { class: 'mester-dekor', 'aria-hidden': 'true' });
  const POS = [[8, 15], [23, 40], [41, 11], [58, 31], [75, 17], [89, 45], [15, 66], [34, 82], [52, 60], [71, 75], [87, 66], [27, 24]];
  POS.forEach(([x, y], i) => d.append(
    el('span', { class: 'mester-dekor__stj', style: `left:${x}%;top:${y}%;--d:${(i * 0.31).toFixed(2)}s;--sz:${8 + (i % 3) * 4}px` }, '✦'),
  ));
  return d;
}

// Stor transformasjon: normal → gulltema, med gull-burst, krone, banner,
// stjerner, konfetti og haptikk. Kjøres kun første gang etter seier.
function feirMester(skjerm) {
  vibrer('feiring');
  const overlay = el('div', { class: 'mester-feiring' },
    el('div', { class: 'mester-feiring__glo' }),
    el('div', { class: 'mester-feiring__kort' },
      kroneSvg('mester-feiring__krone'),
      el('h1', { class: 'mester-feiring__tittel' }, 'PUSH-UP-MESTER'),
      el('p', { class: 'mester-feiring__under' }, 'Du slo push-up-pandaen 🐼'),
    ),
  );
  document.body.append(overlay);
  try { overlay.append(lagKonfetti()); } catch { /* valgfri feiring */ }
  requestAnimationFrame(() => overlay.classList.add('mester-feiring--pa'));
  // Morph temaet inn i feiringen, så det er gull når overlegget forsvinner.
  setTimeout(() => { skjerm.classList.add('reise-skjerm--mester'); skjerm.prepend(mesterDekor()); vibrer('riktig'); }, 520);
  setTimeout(() => { overlay.classList.add('mester-feiring--ut'); setTimeout(() => overlay.remove(), 420); }, 2400);
}

// --- Enhet-/seksjon-fullført: fullskjerm-feiring (jubel-panda + konfetti) ---
// Vises én gang idet en enhet eller hele seksjonen blir mestret. `stor` gir
// seksjons-varianten (større, med tre stjerner).
function feirFullfort({ merke, tittel, under, stor = false }) {
  vibrer('feiring');
  const overlay = el('div', { class: 'laer-feiring' + (stor ? ' laer-feiring--stor' : '') },
    el('div', { class: 'laer-feiring__glo' }),
    el('div', { class: 'laer-feiring__kort' },
      pandaImg('cheer', 'laer-feiring__panda'),
      stor ? stjerneRad(BOSS_MAKS_STJERNER, 'laer-feiring__stjerner') : null,
      el('span', { class: 'laer-feiring__merke' }, merke),
      el('h1', { class: 'laer-feiring__tittel' }, tittel),
      el('p', { class: 'laer-feiring__under' }, under),
    ),
  );
  document.body.append(overlay);
  try { overlay.append(lagKonfetti()); } catch { /* valgfri feiring */ }
  requestAnimationFrame(() => overlay.classList.add('laer-feiring--pa'));
  setTimeout(() => vibrer('riktig'), 420);
  const holdMs = stor ? 2700 : 2100;
  setTimeout(() => { overlay.classList.add('laer-feiring--ut'); setTimeout(() => overlay.remove(), 420); }, holdMs);
}
function feirEnhet(navn) {
  feirFullfort({ merke: 'Enhet fullført', tittel: navn, under: 'Alle stegene er mestret — sterkt jobba!' });
}
function feirSeksjon(navn) {
  feirFullfort({ merke: 'Seksjon fullført', tittel: navn, under: 'Du har lagt grunnmuren. På tide med neste seksjon!', stor: true });
}

// Kompakt, klebrig topp-kort (Duolingo-aktig «unit header»): ikon, etikett,
// tittel og en tynn framdriftslinje — mye lettere enn den gamle intro-heroen.
// Dette kortet er også målet for «kortet flyr til toppen»-animasjonen.
function reiseTopp(sti, gjort, av, overtekst = 'Ferdighetssti', tilbake = tilbakeFraReise) {
  const pct = av ? Math.round((gjort / av) * 100) : 0;
  return el('header', { class: 'reise-topp' },
    el('div', { class: 'reise-topp__kort', id: 'reise-topp-kort' },
      el('div', { class: 'reise-topp__glans' }),
      el('div', { class: 'reise-topp__rad' },
        el('button', { class: 'reise-topp__tilbake', type: 'button', title: 'Tilbake', onclick: tilbake }, '‹'),
        el('div', { class: 'reise-topp__ikon' }, ikon(sti.ikon || 'vekt')),
        el('div', { class: 'reise-topp__tekst' },
          el('span', { class: 'reise-topp__over' }, overtekst),
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

// Liten cyan lyn-bolt (SVG) — sprer «energi» rundt START-knappen.
function lynSvg(klasse) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 20 34');
  svg.setAttribute('class', klasse);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path d="M12 1 L3 19 L9 19 L7 33 L18 12 L11 12 Z" fill="#6EE7F9" stroke="#22D3EE" stroke-width="1.4" stroke-linejoin="round"/>';
  return svg;
}

function reiseNode(sti, { l, i, tilstand }) {
  const e = _bib?.ovelse(l.ovelse);
  const navn = e?.navn || l.ovelse;
  const niva = NIVA[l.niva] || NIVA[1];
  const dx = Math.round(REISE_AMP * REISE_MONSTER[i % REISE_MONSTER.length]);
  const gjeldende = tilstand === 'gjeldende';

  const innhold = tilstand === 'mestret' ? ikon('sjekk', 'ikon')
    : tilstand === 'laast' ? ikon('las', 'ikon')
      : ikon('stjerne', 'ikon');

  // Tre lag så tre bevegelser ikke kolliderer: skala (scroll-krymp) → hopp
  // (sprett-animasjon) → knapp (3D-trykk på :active).
  const knapp = el('button', { class: `reise-node__knapp ${niva.klasse}`, type: 'button', 'aria-label': navn, title: navn }, innhold);
  const hopp = el('div', { class: 'reise-node__hopp' }, gjeldende ? el('span', { class: 'reise-node__puls' }) : null, knapp);
  const skala = el('div', { class: 'reise-node__skala' }, hopp);
  const wrap = el('div', { class: `reise-node reise-node--${tilstand}`, style: `transform:translateX(${dx}px)` }, skala);
  wrap.style.setProperty('--reise-forsinkelse', `${i * 55}ms`);
  wrap.style.setProperty('--dx', `${dx}px`);
  // Alle noder deler samme popover (start / øv igjen / låst). Lagre kontekst så
  // scroll-styringen kan auto-åpne den gjeldende når den er i fokus.
  wrap._sti = sti; wrap._ledd = l; wrap._tilstand = tilstand;
  knapp.addEventListener('click', (ev) => { ev.stopPropagation(); apneNodePopover(sti, l, tilstand, wrap); });
  return wrap;
}

// Scroll-krymp: den gjeldende noden (og uteksaminerings-noden) minker mykt når
// den scrolles vekk fra fokus-båndet, som i Duolingo. rAF-throttlet, og forrige
// lytter ryddes før en ny settes opp (unngår lekkasje + arbeid på løsrevne noder).
let _skrympRydd = null;
// Hvor langt en node er fra fokus-båndet: 0 = i fokus, 1 = langt vekk.
function fokusAvstand(node) {
  const h = window.innerHeight;
  const r = node.getBoundingClientRect();
  if (!r.height) return 1;
  const avstand = Math.max(0, Math.abs(r.top + r.height / 2 - h * 0.44) - h * 0.2);
  return Math.min(1, avstand / (h * 0.4));
}
function settOppSkrymping(container) {
  if (_skrympRydd) { _skrympRydd(); _skrympRydd = null; }
  const maal = [...container.querySelectorAll('.reise-node--gjeldende, .reise-grad--gjeldende')];
  const gj = container.querySelector('.reise-node--gjeldende');
  if (!maal.length) return;
  let rafId = null;
  const oppdater = () => {
    rafId = null;
    for (const node of maal) {
      const inner = node.querySelector('.reise-node__skala') || node.querySelector('.reise-grad') || node;
      const t = fokusAvstand(node);
      inner.style.setProperty('--krymp', (1 - t * 0.42).toFixed(3));
      node.classList.toggle('reise-node--krympet', t > 0.12);
    }
    // Popover-styring (én åpen om gangen): lukk den aktive når noden scrolles
    // nær kanten; auto-åpne den gjeldende når den er komfortabelt i synsfeltet.
    // Ulike terskler (hysterese) så den ikke blafrer på kanten.
    const h = window.innerHeight;
    const senter = (n) => { const r = n.getBoundingClientRect(); return r.height ? r.top + r.height / 2 : null; };
    if (_aktivWrap && _aktivWrap.isConnected) {
      const c = senter(_aktivWrap);
      if (c != null && (c < h * 0.1 || c > h * 0.82)) lukkPopover();
    } else if (!_aktivWrap && gj && gj.isConnected && gj._ledd) {
      const c = senter(gj);
      if (c != null && c > h * 0.18 && c < h * 0.72) apneNodePopover(gj._sti, gj._ledd, 'gjeldende', gj, { stille: true });
    }
  };
  const paa = () => { if (!rafId) rafId = requestAnimationFrame(oppdater); };
  window.addEventListener('scroll', paa, { passive: true, capture: true });
  window.addEventListener('resize', paa, { passive: true });
  _skrympRydd = () => {
    window.removeEventListener('scroll', paa, { capture: true });
    window.removeEventListener('resize', paa);
    if (rafId) cancelAnimationFrame(rafId);
  };
  setTimeout(oppdater, 150); // etter inngangs-staggeren; auto-åpner gjeldende i fokus
}

// --- Node-popover (trykk på node → kort med START + XP) -------------------
let _apenPopover = null;
let _aktivWrap = null;

function lukkPopover() {
  const kort = _apenPopover; const wrap = _aktivWrap;
  _apenPopover = null; _aktivWrap = null;
  if (kort) { kort.classList.add('reise-popover--ut'); setTimeout(() => kort.remove(), 180); }
  wrap?.classList.remove('reise-node--aktiv');
}

function knappStart(tekst, onclick, sekundaer = false) {
  const b = el('button', { class: 'reise-popover__start' + (sekundaer ? ' reise-popover__start--sek' : ''), type: 'button' }, tekst);
  b.addEventListener('click', (ev) => { ev.stopPropagation(); onclick(); });
  return b;
}

// Én delt popover for alle noder — start / øv igjen / låst. Bare én åpen om
// gangen (denne lukker forrige), og scroll-styringen lukker/åpner den etter fokus.
function apneNodePopover(sti, ledd, tilstand, wrap, { stille = false } = {}) {
  const alleredeApen = _aktivWrap === wrap;
  lukkPopover();
  if (alleredeApen) return; // andre trykk lukker igjen
  if (!stille) vibrer('lett');

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
    const start = tilstand !== 'mestret'; // gjeldende → START med lyn
    const cta = start ? 'Start' : 'Øv igjen';
    const knapp = knappStart(`${cta} · +${xp} XP`, () => startMedAnimasjon(sti, ledd));
    const ctaEl = start
      ? el('div', { class: 'reise-popover__cta' }, lynSvg('reise-boble__lyn reise-boble__lyn--a'), knapp, lynSvg('reise-boble__lyn reise-boble__lyn--b'))
      : knapp;
    kort = el('div', { class: `reise-popover ${niva.klasse}` + (start ? ' reise-popover--start' : '') },
      el('span', { class: 'reise-popover__tail' }),
      el('h3', { class: 'reise-popover__navn' }, navn),
      el('p', { class: 'reise-popover__meta' }, tilstand === 'mestret' ? 'Mestret' : niva.ord),
      ctaEl,
    );
  }

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

  // Praksis: en lett teknikk-øvelse uten stjernepress — kjenn bevegelsen, så
  // «jeg gjorde det». Reps, stjerner og opprykk hører hjemme i uteksamineringen.
  function tegnPraksis() {
    kropp.append(
      el('span', { class: 'leksjon__merke' }, 'Din tur'),
      el('h2', { class: 'leksjon__sporsmal' }, 'Prøv ' + (data.dose || 'noen rolige reps')),
      heroBilde(),
      el('p', { class: 'leksjon__blurb' }, 'Rolig og kontrollert — bare kjenn på bevegelsen. Nå lærer vi teknikken; styrken tester vi i uteksamineringen.'),
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
        el('h1', { class: 'leksjon-feiring__tittel' }, 'Teknikk lært!'),
        el('p', { class: 'leksjon-feiring__under' }, navn),
        el('div', { class: 'leksjon-feiring__xp' }, ikon('lyn', 'ikon'), ` +${res.xp || 0} XP`),
        ...((res.nyeMerker || []).length
          ? [el('div', { class: 'leksjon-feiring__merke' }, ikon('medalje', 'ikon'), ' Nytt merke: ' + res.nyeMerker.map((m) => m.navn).join(', '))]
          : []),
      ),
    );
    bunn.append(primaer('Fortsett', () => { lukk(); reTegnReise(); }));
    try { overlay.append(lagKonfetti()); } catch { /* valgfri feiring */ }
  }
}

// ===========================================================================
// Uteksaminering: coach-pandaen kjører deg gjennom enhetens øvelser som en
// ekte økt (oppvarming → sett × reps m/ pause → nedtrapping). Reps + følelse
// gir 1–3 stjerner; 3 = uteksaminert (traff alle rep-mål med margin) → opprykk.
// ===========================================================================
// Fjern ev. planlagte revansje-forsøk for en enhet (når den er uteksaminert
// eller når vi legger en ny plan, så vi ikke hoper opp duplikater).
function ryddPlanlagteUteks(seksjonId, enhetId) {
  try {
    for (const p of hentPlan()) {
      if (p.type === 'uteks' && p.sti === seksjonId && p.enhet === enhetId && p.status === 'planlagt') fjernPlan(p.id);
    }
  } catch { /* valgfri */ }
}
function isoLokalDato(d) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

function startUteksaminering(seksjon, enhet) {
  const u = enhet.uteksaminering;
  if (!u || !(u.ovelser || []).length) return;
  vibrer('medium');
  const ovNavn = (id) => _bib?.ovelse(id)?.navn || id;

  // Flat stegliste: oppvarming → (sett, pause)… → nedtrapping → følelse.
  const ovelser = u.ovelser;
  const steg = [];
  if (u.oppvarming) steg.push({ type: 'info', merke: 'Oppvarming', tittel: 'Oppvarming', tekst: u.oppvarming, cta: 'Jeg er varm' });
  ovelser.forEach((o, oi) => {
    const antall = o.sett || 1;
    for (let s = 1; s <= antall; s++) {
      steg.push({ type: o.holdSek ? 'hold' : 'reps', ovelse: o.ovelse, navn: ovNavn(o.ovelse),
        settNr: s, settAv: antall, maal: o.holdSek || o.reps, hold: !!o.holdSek, perSide: !!o.perSide });
      const sisteSett = oi === ovelser.length - 1 && s === antall;
      if (!sisteSett) steg.push({ type: 'pause', sek: o.pauseSek || 60 });
    }
  });
  if (u.nedtrapping) steg.push({ type: 'info', merke: 'Nedtrapping', tittel: 'Nedtrapping', tekst: u.nedtrapping, cta: 'Ferdig' });

  const settSteg = steg.filter((s) => s.type === 'reps' || s.type === 'hold');
  const resultater = []; // { maal, faktisk } pr. fullført sett
  let idx = 0;
  let timer = null;

  const lukkX = el('button', { class: 'leksjon__lukk', type: 'button', 'aria-label': 'Avslutt', onclick: lukk }, ikon('kryss'));
  const framdrift = el('div', { class: 'leksjon__framdrift' });
  const kropp = el('div', { class: 'kamp__kropp' });
  const bunn = el('div', { class: 'leksjon__bunn' });
  const overlay = el('div', { class: 'leksjon kamp uteks' },
    el('div', { class: 'leksjon__topp' }, lukkX, el('span', { class: 'kamp__tittel' }, `${enhet.navn} · uteksaminering`), framdrift),
    kropp, bunn,
  );
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('leksjon--apen'));
  tegnIntro();

  function stopTimer() { clearInterval(timer); timer = null; }
  function lukk() { stopTimer(); overlay.classList.add('leksjon--lukker'); setTimeout(() => overlay.remove(), 200); reTegnReise(); }

  function settFramdrift() {
    const gjort = resultater.length;
    tom(framdrift);
    settSteg.forEach((_, i) => framdrift.append(el('span', { class: 'leksjon__seg' + (i < gjort ? ' leksjon__seg--fyllt' : '') })));
  }
  function neste() { idx += 1; if (idx >= steg.length) fullfor(); else tegnSteg(); }

  function tegnIntro() {
    settFramdrift();
    tom(kropp); tom(bunn);
    kropp.append(
      el('span', { class: 'kamp__merke' }, 'Uteksaminering'),
      el('h1', { class: 'kamp__navn' }, enhet.navn),
      pandaImg('flex', 'kamp__panda'),
      el('p', { class: 'kamp__oppgave' }, 'Coach-pandaen tar deg gjennom hele økta. Treff rep-målet i alle settene → tre stjerner → uteksaminert.'),
      el('ul', { class: 'uteks__liste' }, ...ovelser.map((o) => el('li', { class: 'uteks__rad' },
        el('span', { class: 'uteks__ov' }, ovNavn(o.ovelse)),
        el('span', { class: 'uteks__dose' }, `${o.sett}×${o.holdSek ? o.holdSek + ' s' : o.reps}${o.perSide ? '/side' : ''}`)))),
    );
    bunn.append(leksjonPrimaer('Start økta', () => { idx = 0; tegnSteg(); }));
  }

  function tegnSteg() {
    stopTimer();
    if (idx >= steg.length) return;
    const s = steg[idx];
    settFramdrift();
    tom(kropp); tom(bunn);
    if (s.type === 'info') tegnInfo(s);
    else if (s.type === 'pause') tegnPause(s);
    else tegnSett(s);
    kropp.scrollTop = 0;
  }

  function tegnInfo(s) {
    kropp.append(
      el('span', { class: 'kamp__merke' }, s.merke),
      el('h1', { class: 'kamp__navn' }, s.tittel),
      pandaImg('wave', 'kamp__panda'),
      el('p', { class: 'kamp__oppgave' }, s.tekst),
    );
    bunn.append(leksjonPrimaer(s.cta || 'Videre', neste));
  }

  function tegnSett(s) {
    let bekreftet = false;
    const enhetTekst = s.hold ? 'sek' : (s.perSide ? 'reps/side' : 'reps');
    const maks = Math.max(s.maal + 10, s.maal * 2); // rom for å registrere ekstra
    let val = s.maal; // default = målet; du justerer til det du faktisk klarte
    const panda = s.hold ? pandaImg('flex', 'kamp__panda') : pandaAnim('pushup-up', 'pushup-down', 'kamp__panda', 'pushup');
    const visTall = el('span', { class: 'uteks__just-tall' }, String(val));
    const minus = el('button', { class: 'uteks__just-knapp', type: 'button', 'aria-label': 'Færre' }, '−');
    const pluss = el('button', { class: 'uteks__just-knapp', type: 'button', 'aria-label': 'Flere' }, '+');
    const oppdater = () => {
      visTall.textContent = String(val);
      visTall.classList.toggle('uteks__just-tall--under', val < s.maal);
      minus.disabled = val <= 0; pluss.disabled = val >= maks;
    };
    minus.addEventListener('click', () => { val = Math.max(0, val - 1); vibrer('lett'); oppdater(); });
    pluss.addEventListener('click', () => { val = Math.min(maks, val + 1); vibrer('lett'); oppdater(); });

    kropp.append(
      el('span', { class: 'kamp__merke' }, `${s.navn} · sett ${s.settNr} av ${s.settAv}`),
      el('h1', { class: 'kamp__navn' }, `Mål: ${s.maal} ${enhetTekst}`),
      panda,
      el('p', { class: 'uteks__just-etikett' }, s.hold ? 'Sekunder du holdt' : 'Reps du klarte'),
      el('div', { class: 'uteks__just uteks__just--stor' }, minus,
        el('div', { class: 'uteks__just-midt' }, visTall, el('span', { class: 'uteks__just-enhet' }, s.hold ? 'sek' : 'reps')), pluss),
      el('p', { class: 'kamp__hint dempet' }, 'Juster til antallet du faktisk klarte før du registrerer.'),
    );
    oppdater();
    bunn.append(leksjonPrimaer('Registrer sett', () => {
      if (bekreftet) return; bekreftet = true;
      vibrer('riktig');
      resultater.push({ maal: s.maal, faktisk: val });
      neste();
    }));
  }

  function tegnPause(s) {
    const nesteSteg = steg.slice(idx + 1).find((x) => x.type === 'reps' || x.type === 'hold');
    const nesteTekst = nesteSteg ? `Neste: ${nesteSteg.navn} · sett ${nesteSteg.settNr}` : '';
    const sluttTs = Date.now() + s.sek * 1000;
    const tall = el('span', { class: 'uteks__pause-tall' }, String(s.sek));
    kropp.append(
      el('span', { class: 'kamp__merke' }, 'Pause'),
      el('h1', { class: 'kamp__navn' }, 'Hvil'),
      el('div', { class: 'uteks__pause' }, tall, el('span', { class: 'uteks__pause-enhet' }, 'sek')),
      el('p', { class: 'kamp__hint dempet' }, nesteTekst),
    );
    bunn.append(el('button', { class: 'kamp__ferdig-lenke', type: 'button', onclick: () => { stopTimer(); neste(); } }, 'Hopp over pause'));
    stopTimer();
    timer = setInterval(() => {
      const igjen = Math.max(0, Math.ceil((sluttTs - Date.now()) / 1000));
      tall.textContent = String(igjen);
      if (igjen <= 0) { stopTimer(); vibrer('lett'); neste(); }
    }, 250);
  }

  // Stjerner rent fra registrerte reps/hold: traff du alle mål → 3★ (uteksaminert);
  // ellers ut fra hvor stor andel av det foreskrevne du klarte (hvert sett teller
  // maks sitt eget mål, så et bommet sett kan ikke kjøpes tilbake med ekstra andre).
  function beregnStjerner() {
    if (!resultater.length) return 1;
    if (resultater.every((r) => r.faktisk >= r.maal)) return 3;
    const totMaal = resultater.reduce((n, r) => n + r.maal, 0);
    const totTruffet = resultater.reduce((n, r) => n + Math.min(r.faktisk, r.maal), 0);
    return totMaal && totTruffet / totMaal >= 0.75 ? 2 : 1;
  }

  function fullfor() {
    const stjerner = beregnStjerner();
    vibrer('feiring');
    const totalReps = resultater.reduce((n, r) => n + (r.faktisk || 0), 0);
    let res = { xp: 0, nyeMerker: [] };
    try {
      res = registrerOgLogg({
        bevegelse: 'bodyweight',
        varighetMin: u.varighetMin || 15,
        intensitet: u.intensitet || 3,
        tittel: `${enhet.navn}: uteksaminering`,
        kilde: 'laer',
        ekstra: { sti: seksjon.id, node: 'graduation', enhet: enhet.id, stjerner, reps: totalReps },
      });
    } catch (err) { console.warn('Kunne ikke logge uteksaminering', err); }
    tegnSummary(res, stjerner);
  }

  function tegnSummary(res, stjerner) {
    const bestatt = stjerner >= BOSS_MAKS_STJERNER;
    stopTimer();
    lukkX.style.visibility = 'hidden';
    tom(kropp); tom(bunn);
    settFramdrift();
    if (bestatt) ryddPlanlagteUteks(seksjon.id, enhet.id); // ferdig → dropp ev. planlagt revansje
    const seier = el('div', { class: 'kamp__seier' },
      pandaImg(bestatt ? 'cheer' : 'flex', 'kamp__seier-panda'),
      stjerneRad(stjerner, 'kamp__seier-stjerner'),
      el('h1', { class: 'kamp__seier-tittel' }, bestatt ? 'Uteksaminert!' : 'Bra økt!'),
      el('p', { class: 'kamp__seier-under' }, bestatt
        ? `${enhet.navn} er fullført — neste enhet er åpen! 🐼`
        : 'Ikke helt uteksaminert ennå — traff du rep-målet i alle settene, får du tre stjerner. Legg en plan for neste forsøk?'),
      el('div', { class: 'leksjon-feiring__xp' }, ikon('lyn', 'ikon'), ` +${res.xp || 0} XP`),
      ...((res.nyeMerker || []).length
        ? [el('div', { class: 'leksjon-feiring__merke' }, ikon('medalje', 'ikon'), ' Nytt merke: ' + res.nyeMerker.map((m) => m.navn).join(', '))]
        : []),
    );
    if (!bestatt) seier.append(planleggBlokk());
    kropp.append(seier);
    bunn.append(leksjonPrimaer('Fortsett', lukk));
    try { overlay.append(lagKonfetti()); } catch { /* valgfri feiring */ }
  }

  // «Planlegg neste forsøk»: en enkel dag-velger (default om 2 dager) som legger
  // et uteksaminerings-forsøk i planen — det dukker opp på hjemmesiden den dagen.
  function planleggBlokk() {
    const DAG = 86400000;
    let n = 2;
    const datoTekst = el('span', { class: 'uteks-plan__dato' });
    const minus = el('button', { class: 'uteks__just-knapp', type: 'button', 'aria-label': 'Tidligere' }, '−');
    const pluss = el('button', { class: 'uteks__just-knapp', type: 'button', 'aria-label': 'Senere' }, '+');
    const relTekst = (k) => (k === 1 ? 'I morgen' : `Om ${k} dager`);
    function oppdater() {
      const d = new Date(Date.now() + n * DAG);
      datoTekst.textContent = `${relTekst(n)} · ${d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}`;
      minus.disabled = n <= 1; pluss.disabled = n >= 14;
    }
    minus.addEventListener('click', () => { n = Math.max(1, n - 1); vibrer('lett'); oppdater(); });
    pluss.addEventListener('click', () => { n = Math.min(14, n + 1); vibrer('lett'); oppdater(); });
    const wrap = el('div', { class: 'uteks-plan' },
      el('p', { class: 'uteks-plan__tittel' }, ikon('kalender', 'ikon ikon--liten'), ' Planlegg neste forsøk'),
      el('div', { class: 'uteks-plan__velger' }, minus, datoTekst, pluss),
      leksjonPrimaer('Planlegg forsøket', () => {
        ryddPlanlagteUteks(seksjon.id, enhet.id);
        try {
          leggTilPlan({ dato: isoLokalDato(new Date(Date.now() + n * DAG)), type: 'uteks', sti: seksjon.id, enhet: enhet.id, tittel: `${enhet.navn}: uteksaminering` });
        } catch (err) { console.warn('Kunne ikke planlegge', err); }
        vibrer('riktig');
        const rel = relTekst(n).toLowerCase();
        tom(wrap);
        wrap.append(el('p', { class: 'uteks-plan__bekreftet' }, ikon('sjekk', 'ikon ikon--liten'), ` Planlagt — du finner økta på hjemmesiden ${rel}.`));
      }),
    );
    oppdater();
    return wrap;
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
    el('span', { class: 'reise-boss__krone' }, kroneSvg()), // vises kun i mester-tema (CSS)
    tilstand === 'slaatt'
      ? pandaImg('cheer', 'reise-boss__panda')             // slått → jubel-positur
      : pandaAnim('pushup-up', 'pushup-down', 'reise-boss__panda', 'pushup'),
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
    reTegnReise();
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
