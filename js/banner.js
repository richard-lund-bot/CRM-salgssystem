// Faneside-skallet (M15) — delt av alle hovedfanene: det hvite banneret
// (tannhjul til Innstillinger, bjelle, wordmark, høyre-knapp, ukeskalender),
// dagsfase-bakgrunnsbildet som fader mot underlaget, og pull-to-refresh.
// Banneret ligger fast; innholdet scroller i egen beholder under den buede
// kanten, akkurat som på Min dag. Ukene ligger i et dra-bart spor (forrige ·
// denne · neste). En dag åpner mosjonskalenderen på den datoen — med mindre
// skjermen sender inn sin egen dag-aksjon (biblioteket: logg/start/planlegg).
import { el, tom, ikon } from './ui.js';
import { hentLogg } from './store.js';
import * as sync from './sync.js';

const DAG = 86400000;
const UKEDAG_NAVN = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

// --- Dagsfase: styrer bakgrunnsbildet og himmelfargen -----------------------
export function dagsfase(h) {
  if (h >= 22 || h < 5) return 'natt';
  if (h < 9) return 'morgen';
  if (h < 12) return 'formiddag';
  if (h < 17) return 'dag';
  return 'kveld';
}

// Snittfargen øverst i hvert fasebilde — brukes som scrollflatens topp så
// overskroll fortsetter i samme himmel i stedet for å vise grått gap.
const HIMMELFARGE = {
  morgen: '#c0dbd0', formiddag: '#9fd0e2', dag: '#b2d5e1',
  kveld: '#c3d0cb', natt: '#1c3c64',
};

// Skjermtegneren (navger i app.js) — kobles opp ved oppstart så
// pull-to-refresh kan tegne gjeldende side på nytt uten syklisk import.
let _navger = () => {};
export function settNavger(fn) { _navger = fn; }

// Uleste-sjekk for bjella (harUlesteVarsler i varsler.js) — injiseres ved
// oppstart av samme grunn: banner.js slipper å importere varsler-modulen
// (som selv importerer merker/banner) og vi unngår syklisk import.
let _harUleste = () => false;
export function settUlestSjekk(fn) { _harUleste = fn; }

function isoDato(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dg = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dg}`;
}

function mandagFor(d) {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  return new Date(m.getTime() - ((m.getDay() + 6) % 7) * DAG);
}

function wordmark() {
  return el('a', { class: 'wordmark', href: '#/hjem', 'aria-label': 'Mova' },
    'mova', el('span', { class: 'wordmark__prikk' }, '.'));
}

// Tannhjul til Innstillinger oppe til venstre. Profil (med nivå og merker) bor
// nå som midt-fanen, så headeren trenger ikke lenger et eget profilikon.
function innstillingerKnapp() {
  return el('a', { class: 'ikonknapp ikonknapp--plain', href: '#/innstillinger', 'aria-label': 'Innstillinger' },
    ikon('gir'),
  );
}

export function lagBanner({ hoyre = null, dagAksjon = null } = {}) {
  const logg = hentLogg();
  const aktivSett = new Set(logg.map((o) => (o.dato || '').slice(0, 10)));
  let ukeOffset = 0;

  // Ukedagsnavnene står stille — bare datotallene ligger i det dra-bare sporet.
  function ukePanel(offset) {
    const panel = el('div', { class: 'hjemuke__dager' });
    const idagIso = isoDato(new Date());
    const man = mandagFor(new Date(Date.now() + offset * 7 * DAG));
    for (let i = 0; i < 7; i++) {
      const dato = new Date(man.getTime() + i * DAG);
      const iso = isoDato(dato);
      const erIdag = iso === idagIso;
      const lenke = el('a', { class: 'hjemuke__dag', href: `#/kalender?d=${iso}` },
        el('span', { class: 'hjemuke__tall' + (erIdag ? ' hjemuke__tall--idag' : '') }, String(dato.getDate())),
        el('i', { class: 'hjemuke__prikk' + (aktivSett.has(iso) && !erIdag ? ' hjemuke__prikk--aktiv' : '') }),
      );
      if (dagAksjon) lenke.addEventListener('click', (ev) => { ev.preventDefault(); dagAksjon(iso, erIdag); });
      panel.append(lenke);
    }
    return panel;
  }

  const spor = el('div', { class: 'hjemuke__spor' });
  const vindu = el('div', { class: 'hjemuke__vindu' }, spor);

  // Sporet er 300 % bredt med midtpanelet synlig; dra forskyver i px oppå
  // grunnposisjonen, og en blaing glir ett helt panel før ukene bygges på nytt.
  function settX(dxPx, anim) {
    spor.classList.toggle('hjemuke__spor--anim', anim);
    spor.style.transform = `translateX(calc(-33.3333% + ${dxPx}px))`;
  }

  function tegnUker() {
    tom(spor);
    spor.append(ukePanel(ukeOffset - 1), ukePanel(ukeOffset), ukePanel(ukeOffset + 1));
    settX(0, false);
  }

  let låst = false;
  function bla(retning) {
    if (låst) return;
    låst = true;
    settX(-retning * vindu.clientWidth, true);
    setTimeout(() => { ukeOffset += retning; tegnUker(); låst = false; }, 300);
  }

  // Dra med finger eller mus (pointer events; touch-action: pan-y i CSS lar
  // vertikal scroll gå til nettleseren mens horisontale drag havner her).
  let startX = null;
  let dratt = false;
  spor.addEventListener('pointerdown', (ev) => {
    if (låst || !ev.isPrimary) return;
    startX = ev.clientX;
    dratt = false;
  });
  spor.addEventListener('pointermove', (ev) => {
    if (startX == null || låst) return;
    const dx = ev.clientX - startX;
    if (!dratt) {
      if (Math.abs(dx) < 6) return;
      // Først når draget faktisk starter fanges pekeren — ellers ville
      // capture-retargeting spist vanlige tapp på dagene.
      dratt = true;
      spor.setPointerCapture(ev.pointerId);
    }
    settX(Math.max(-vindu.clientWidth, Math.min(vindu.clientWidth, dx)), false);
  });
  spor.addEventListener('pointerup', (ev) => {
    if (startX == null) return;
    const dx = ev.clientX - startX;
    startX = null;
    if (!dratt) return;
    const terskel = Math.min(70, vindu.clientWidth / 4);
    if (dx <= -terskel) bla(1);
    else if (dx >= terskel) bla(-1);
    else settX(0, true);
  });
  spor.addEventListener('pointercancel', () => {
    if (startX == null) return;
    startX = null;
    if (dratt) settX(0, true);
  });
  // Et drag skal ikke samtidig utløse klikk på dagen under fingeren.
  spor.addEventListener('click', (ev) => {
    if (!dratt) return;
    ev.preventDefault();
    ev.stopPropagation();
    dratt = false;
  }, true);

  const uke = el('div', { class: 'hjemuke' },
    el('div', { class: 'hjemuke__navner' },
      ...UKEDAG_NAVN.map((n) => el('span', { class: 'hjemuke__navn' }, n)),
    ),
    vindu,
  );
  tegnUker();

  if (hoyre) hoyre.classList.add('hjembanner__hoyre');
  const ulest = _harUleste();
  return el('div', { class: 'hjembanner' },
    el('div', { class: 'hjembanner__rad' },
      innstillingerKnapp(),
      el('a', {
        class: 'ikonknapp ikonknapp--plain ikonknapp--bjelle', href: '#/varsler',
        'aria-label': ulest ? 'Varsler — nye' : 'Varsler',
      }, ikon('bjelle'), ulest && el('i', { class: 'varselprikk' })),
      el('span', { class: 'hjembanner__logo' }, wordmark()),
      hoyre || el('a', { class: 'ikonknapp ikonknapp--plain hjembanner__hoyre', href: '#/kalender', 'aria-label': 'Mosjonskalender' }, ikon('kalender')),
    ),
    uke,
  );
}

// Sidehode for fanene under banneret: stor Fredoka-tittel + undertekst i
// samme stil som biblioteket — alle hovedskjermer deler samme førsteinntrykk.
export function sideHero(tittel, under) {
  return el('div', { class: 'sidehero' },
    el('h1', { class: 'sidehero__tittel' }, tittel),
    under && el('p', { class: 'sidehero__under' }, under),
  );
}

// ===========================================================================
// Faneside-skallet: låser body, legger banneret fast øverst, og gir en egen
// scrollflate med dagsfasebilde bak innholdet og pull-to-refresh — samme
// oppsett som Min dag, på alle hovedfanene.
// ===========================================================================
export function lagFaneside(mount, { hoyre = null, dagAksjon = null } = {}) {
  const fase = dagsfase(new Date().getHours());
  // Gradienten bak bildet går over i underlaget der bildet fader ut
  // (bildet er ~693px høyt med fade fra ~493px) — faste px, så korte og
  // lange sider får samme overgang og innhold under sonen alltid står på
  // underlagsfargen.
  const scroll = el('div', {
    class: `hjem-scroll fane-scroll fane-scroll--${fase}`,
    style: `background:linear-gradient(to bottom, ${HIMMELFARGE[fase]} 0px, ${HIMMELFARGE[fase]} 300px, var(--bg) 660px)`,
  },
    el('div', { class: 'fanebilde', 'aria-hidden': 'true', style: `background-image:url('icons/brand/hero-${fase}.webp')` }),
  );
  document.body.classList.add('fane-laast');
  tom(mount);
  mount.append(lagBanner({ hoyre, dagAksjon }), scroll, lagPullOppdatering(scroll));
  return scroll;
}

/** Faneside med standard sidetittel — returnerer main-elementet for innhold. */
export function fanesideMedTittel(mount, { tittel, under = null, hoyre = null, dagAksjon = null } = {}) {
  const scroll = lagFaneside(mount, { hoyre, dagAksjon });
  const main = el('main', { class: 'innhold side__innhold' });
  scroll.append(el('div', { class: 'side' }, sideHero(tittel, under), main));
  return main;
}

// Pull-to-refresh: dra ned fra toppen og en gjennomsiktig snurre-sirkel
// glir ut fra bak banneret. Slipp forbi terskelen → den spinner mens vi
// sjekker etter ny app-versjon, synker skydata og tegner skjermen på nytt.
function lagPullOppdatering(scroll) {
  const spinn = el('div', { class: 'pullspinn', 'aria-hidden': 'true' },
    el('i', { class: 'pullspinn__ring' }));
  let startY = null;
  let dratt = 0;
  let opptatt = false;

  const bannerBunn = () => {
    const banner = document.querySelector('.hjembanner');
    return banner ? banner.getBoundingClientRect().bottom : 90;
  };

  scroll.addEventListener('touchstart', (ev) => {
    if (opptatt || scroll.scrollTop > 0) { startY = null; return; }
    startY = ev.touches[0].clientY;
    dratt = 0;
  }, { passive: true });

  scroll.addEventListener('touchmove', (ev) => {
    if (startY == null || opptatt) return;
    const dy = ev.touches[0].clientY - startY;
    if (dy <= 0 || scroll.scrollTop > 0) { dratt = 0; spinn.style.opacity = '0'; return; }
    dratt = dy;
    spinn.style.opacity = String(Math.min(1, dy / 70));
    spinn.style.top = `${bannerBunn() - 46 + Math.min(1, dy / 130) * 72}px`;
    spinn.style.setProperty('--vri', `${Math.round(dy * 1.6)}deg`);
  }, { passive: true });

  const slipp = () => {
    if (startY == null || opptatt) return;
    startY = null;
    if (dratt >= 110) {
      opptatt = true;
      spinn.classList.add('pullspinn--aktiv');
      spinn.style.top = `${bannerBunn() + 16}px`;
      oppdaterSide();
    } else {
      spinn.style.opacity = '0';
    }
  };
  scroll.addEventListener('touchend', slipp, { passive: true });
  scroll.addEventListener('touchcancel', slipp, { passive: true });
  return spinn;
}

// Oppdatering fra pull-to-refresh: sjekk service worker (ny versjon tas i
// bruk automatisk), synk skydata om innlogget, og tegn siden på nytt.
async function oppdaterSide() {
  const start = Date.now();
  try { (await navigator.serviceWorker?.getRegistration())?.update(); } catch { /* uten nett: ignorer */ }
  try { if (sync.erInnlogget()) await sync.synk(); } catch { /* uten nett: ignorer */ }
  // La snurren leve lenge nok til å oppfattes, selv når alt går kjapt.
  setTimeout(() => _navger(), Math.max(0, 700 - (Date.now() - start)));
}
