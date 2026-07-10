// App-inngang for Mova (M11 — omlagt til Mova-spesifikasjonen).
// Navigasjon: Min dag · Beveg · Min reise · Aktivitet · Meny (spec §3).
// Min dag åpner med Dagens gnist (ett lavterskel-forslag), figuren og
// Momentum-rytmen — formulert som tilbud, aldri skam.
import { lastBibliotek, MODALITET_NAVN, MONSTER_NAVN } from './library.js';
import {
  hentProfil, harProfil, lagreProfil, hentLogg, nullstillAlt,
  planForDato,
} from './store.js';
import { el, tom, chip, ikon } from './ui.js';
import { APP_VERSION } from './config.js';
import { kjorOnboarding } from './onboarding.js';
import { visReviewSkjerm, visKjoreSkjerm } from './kjor.js';
import { settBib as settBibHist, visAktivitetSkjerm } from './historikk.js';
import { settBib as settBibBeveg, visHurtigSkjerm, visLoggforSkjerm } from './beveg.js';
import { settBib as settBibReise, visReiseSkjerm } from './reise.js';
import { settBib as settBibKal, visKalenderSkjerm } from './kalender.js';
import { visTilpassSkjerm, standardFigur } from './figur.js';
import { globaltNiva } from './niva.js';
import { nivaFraTotalXp } from './belonninger.js';
import { dagensGnist, dagerMedAktivitet, startHref, okterHref, MODALITET_TIL_BEVEGELSE } from './bevegelse.js';
import { lastOkter, hentOkter, oktMedId, visOkterSkjerm, tilfeldigOkt, MODALITET_TIL_KATEGORI, KATEGORI_NAVN } from './bibliotek-okter.js';
import { fyllInn } from './animasjon.js';
import * as sync from './sync.js';

const app = document.getElementById('app');
let bib = null;

// --- Ruter (hash-basert) ---
const ruter = {
  hjem: visHjem,
  beveg: () => visOkterSkjerm(app, { lagBanner: bibliotekBanner }), // Beveg-fanen er øktbiblioteket
  hurtig: () => visHurtigSkjerm(app),
  loggfor: () => visLoggforSkjerm(app),
  reise: () => visReiseSkjerm(app),
  tilpass: () => visTilpassSkjerm(app, bib),
  okter: () => visOkterSkjerm(app, { lagBanner: bibliotekBanner }),
  ny: omdirigerGammelNyLenke, // gammel generator-lenke → øktbiblioteket
  plan: () => visKalenderSkjerm(app), // gammel lenke — kalenderen er planen
  kalender: () => visKalenderSkjerm(app),
  review: () => visReviewSkjerm(app),
  kjor: () => visKjoreSkjerm(app),
  aktivitet: () => visAktivitetSkjerm(app),
  historikk: () => visAktivitetSkjerm(app), // gammel lenke — samme skjerm
  meny: visMeny,
  innstillinger: visInnstillinger,
  bibliotek: visBibliotek,
  om: visOm,
};

// Skjermene med egen tilbake-header er fokusmodus (skjuler tab-baren).
const FOKUS = new Set(['review', 'kjor', 'hurtig', 'loggfor', 'tilpass', 'kalender']);

// Banneret til biblioteket: hvitt som på Min dag, men med filterknapp til
// høyre — og dagene i ukeskalenderen får bibliotekets aksjoner.
function bibliotekBanner(hoyre, dagAksjon) {
  hjemUkeOffset = 0;
  return hjemBanner(hentLogg(), { hoyre, dagAksjon });
}

// Gamle #/ny?m=STY-lenker (og bokmerker) sendes til riktig bibliotekkategori.
function omdirigerGammelNyLenke() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const kat = MODALITET_TIL_KATEGORI[params.get('m')] || 'styrke';
  location.hash = `#/okter?kat=${kat}`;
}

function navger() {
  const rute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
  document.body.classList.toggle('fokusmodus', FOKUS.has(rute));
  document.body.classList.remove('hjem-laast'); // settes på nytt av visHjem
  (ruter[rute] || visHjem)();
  oppdaterNav(rute);
}

function oppdaterNav(rute) {
  const tabRute = ({
    innstillinger: 'meny', bibliotek: 'meny', kjeder: 'meny', om: 'meny',
    plan: 'meny', progresjon: 'meny', niva: 'meny',
    historikk: 'aktivitet', ny: 'beveg', okter: 'beveg', tilpass: 'reise',
  })[rute] || rute;
  document.querySelectorAll('.tabbar__knapp').forEach((b) => {
    b.classList.toggle('tabbar__knapp--aktiv', b.dataset.rute === tabRute);
  });
}

function skjerm(tittel, ...innhold) {
  tom(app);
  app.append(
    el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, tittel)),
    el('main', { class: 'innhold' }, ...innhold),
  );
}

// ===========================================================================
// Min dag — Mova-dashbord: hvit banner med header + ukeskalender (buet
// underkant — resten av siden ligger som underlag), tre statistikk-kort
// (dagens minutter, ukas aktive dager, nivå/XP), bevegelsesgrid, dagens
// anbefaling og streak-indikator.
// ===========================================================================
const DAG = 86400000;
const UKEDAG_BOKSTAV = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
const UKEDAG_NAVN = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

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

// Dagsmål i minutter, avledet av foretrukket varighetsklasse.
const DAGSMAAL = { mikro: 10, kort: 20, standard: 40, lang: 60 };

function wordmark() {
  return el('a', { class: 'wordmark', href: '#/hjem', 'aria-label': 'Mova' },
    'mova', el('span', { class: 'wordmark__prikk' }, '.'));
}

function visHjem() {
  const profil = hentProfil();
  if (!profil) {
    skjerm('Mova', velkommenKort());
    return;
  }
  const logg = hentLogg();
  const nå = Date.now();
  hjemUkeOffset = 0;

  const idagIso = isoDato(new Date(nå));
  const planer = planForDato(idagIso);
  const minutterIdag = logg
    .filter((o) => (o.dato || '').slice(0, 10) === idagIso)
    .reduce((s, o) => s + (o.varighetMin || 0), 0);

  // Hjem låser body og scroller innholdet i egen beholder: banneren står
  // helt i ro, og innholdet får naturlig overskroll-sprett (iOS). Selve
  // scrollflaten får himmelfargen til dagsfasen øverst, så overskroll aldri
  // viser grått gap — og et dra ned fra toppen gir oppdaterings-snurren.
  const fase = dagsfase(new Date(nå).getHours());
  const scroll = el('div', {
    class: `hjem-scroll hjem-scroll--${fase}`,
    style: `background:linear-gradient(to bottom, ${HIMMELFARGE[fase]} 0%, ${HIMMELFARGE[fase]} 30%, var(--bg) 70%)`,
  },
    heroVelkomst(profil, logg, nå),
    el('main', { class: 'innhold' },
      seksjonsHode(),
      bevegelsesGrid(),
      // Heroen har alt en CTA når noe er planlagt eller påbegynt — da
      // trengs ikke anbefalingskortet i tillegg.
      !planer.length && minutterIdag === 0 && anbefalingKort(profil, logg, nå),
      streakKort(logg),
    ),
  );

  document.body.classList.add('hjem-laast');
  tom(app);
  app.append(hjemBanner(logg), scroll, lagPullOppdatering(scroll));
}

// Pull-to-refresh: dra ned fra toppen og en gjennomsiktig snurre-sirkel
// glir ut fra bak banneren. Slipp forbi terskelen → den spinner mens vi
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
      oppdaterHjem();
    } else {
      spinn.style.opacity = '0';
    }
  };
  scroll.addEventListener('touchend', slipp, { passive: true });
  scroll.addEventListener('touchcancel', slipp, { passive: true });
  return spinn;
}

// Oppdatering fra pull-to-refresh: sjekk service worker (ny versjon tas i
// bruk automatisk), synk skydata om innlogget, og tegn hjem på nytt.
async function oppdaterHjem() {
  const start = Date.now();
  try { (await navigator.serviceWorker?.getRegistration())?.update(); } catch { /* uten nett: ignorer */ }
  try { if (sync.erInnlogget()) await sync.synk(); } catch { /* uten nett: ignorer */ }
  // La snurren leve lenge nok til å oppfattes, selv når alt går kjapt.
  setTimeout(navger, Math.max(0, 700 - (Date.now() - start)));
}

// ===========================================================================
// Velkomst-hero: dagsfasebilde bak hilsen + budskap, med statkortene delvis
// over bildet som fader ut mot underlaget. Tre budskap: planlagt økt (boks),
// «noe gjort — mer?» (gnist-pille), eller et åpent spørsmål.
// ===========================================================================
function dagsfase(h) {
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

function hilsenTekst(h) {
  if (h < 5 || h >= 23) return 'God natt';
  if (h < 10) return 'God morgen';
  if (h < 17) return 'God dag';
  return 'God kveld';
}

function heroVelkomst(profil, logg, nå) {
  const t = new Date(nå);
  const fase = dagsfase(t.getHours());
  const hilsen = hilsenTekst(t.getHours());
  const navn = (profil.navn || '').trim();

  const idagIso = isoDato(t);
  const minutter = logg
    .filter((o) => (o.dato || '').slice(0, 10) === idagIso)
    .reduce((s, o) => s + (o.varighetMin || 0), 0);
  const maal = DAGSMAAL[profil.varighetsklasse] || 40;
  const planer = planForDato(idagIso);

  let budskap;
  if (planer.length) {
    budskap = heroPlanBoks(planer[0]);
  } else if (minutter >= maal) {
    budskap = el('p', { class: 'hjemhero__melding' },
      `${minutter} minutter i dag — dagsmålet er nådd. Alt videre er bonus.`);
  } else if (minutter > 0) {
    const g = dagensGnist(profil, logg, nå);
    budskap = el('div', {},
      el('p', { class: 'hjemhero__melding' }, `${minutter} minutter i boks. Vil du legge på litt til?`),
      el('a', { class: 'hjemhero__pille', href: g.href }, ikon('lyn', 'ikon ikon--liten'), `${g.tittel} · ≈ +${g.xp} XP`),
    );
  } else {
    budskap = el('p', { class: 'hjemhero__melding' }, 'Hvordan vil du bevege deg i dag?');
  }

  return el('section', { class: `hjemhero hjemhero--${fase}` },
    el('div', { class: 'hjemhero__bilde', style: `background-image:url('icons/brand/hero-${fase}.webp')` }),
    el('div', { class: 'hjemhero__innhold' },
      navn
        ? [el('p', { class: 'hjemhero__hilsen' }, `${hilsen},`), el('h1', { class: 'hjemhero__navn' }, navn)]
        : el('h1', { class: 'hjemhero__navn hjemhero__navn--hilsen' }, hilsen),
      budskap,
    ),
    statKortRad(profil, logg, true),
  );
}

// Viser en planlagt økt: nye planer peker på en bibliotekøkt (oktId), gamle
// bærer modalitet — begge får tittel, varighet og en startlenke.
function planVisning(p) {
  const okt = p.oktId ? oktMedId(p.oktId) : null;
  if (okt) {
    return {
      tittel: `${okt.navn} · ${okt.varighetMin} min`,
      kortTittel: okt.navn,
      href: `#/okter?start=${okt.id}&p=${p.id}`,
    };
  }
  const kat = MODALITET_TIL_KATEGORI[p.modalitet];
  return {
    tittel: `${MODALITET_NAVN[p.modalitet] || KATEGORI_NAVN[kat] || 'Økt'} · ${varighetNavn(p.varighetsklasse)}`,
    kortTittel: MODALITET_NAVN[p.modalitet] || 'Økt',
    href: kat ? `#/okter?kat=${kat}` : '#/okter',
  };
}

function heroPlanBoks(p) {
  const vis = planVisning(p);
  return el('div', { class: 'hjemhero__plan' },
    el('div', { class: 'hjemhero__planrad' },
      el('span', { class: 'hjemhero__plandisk' }, ikon('kalender')),
      el('div', {},
        el('span', { class: 'hjemhero__planeyebrow' }, 'Planlagt i dag'),
        el('span', { class: 'hjemhero__plantittel' }, vis.tittel),
      ),
    ),
    el('div', { class: 'hjemhero__planbunn' },
      el('span', { class: 'hjemhero__plantid' }, ikon('klokke', 'ikon ikon--liten'), 'Start når det passer deg'),
      el('a', { class: 'hjemhero__knapp', href: vis.href }, 'Åpne plan'),
    ),
  );
}

// Banner: profil + bjelle til venstre, sentrert wordmark, kalender til høyre
// — og ukeskalender under, med dagens dato markert. Banneren er sticky og
// ligger foran alt annet; innholdet scroller under den buede underkanten.
// Ukene ligger i et dra-bart spor (forrige · denne · neste): dra med fingeren
// og uka følger med, slipp så glir den over til neste/forrige. Pilene gjør
// det samme. En dag åpner mosjonskalenderen på den datoen — med mindre
// skjermen sender inn sin egen dag-aksjon (biblioteket: logg/start/planlegg).
// `hoyre` bytter ut kalenderknappen til høyre (biblioteket: filter).
let hjemUkeOffset = 0;

function hjemBanner(logg, { hoyre = null, dagAksjon = null } = {}) {
  const aktivSett = new Set(logg.map((o) => (o.dato || '').slice(0, 10)));

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
    spor.append(ukePanel(hjemUkeOffset - 1), ukePanel(hjemUkeOffset), ukePanel(hjemUkeOffset + 1));
    settX(0, false);
  }

  let låst = false;
  function bla(retning) {
    if (låst) return;
    låst = true;
    settX(-retning * vindu.clientWidth, true);
    setTimeout(() => { hjemUkeOffset += retning; tegnUker(); låst = false; }, 300);
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
  return el('div', { class: 'hjembanner' },
    el('div', { class: 'hjembanner__rad' },
      el('a', { class: 'ikonknapp ikonknapp--plain', href: '#/reise', 'aria-label': 'Profil' }, ikon('person')),
      el('a', { class: 'ikonknapp ikonknapp--plain', href: '#/innstillinger', 'aria-label': 'Varsler og innstillinger' }, ikon('bjelle')),
      el('span', { class: 'hjembanner__logo' }, wordmark()),
      hoyre || el('a', { class: 'ikonknapp ikonknapp--plain hjembanner__hoyre', href: '#/kalender', 'aria-label': 'Mosjonskalender' }, ikon('kalender')),
    ),
    uke,
  );
}

// Tre kort: dagens minutter mot dagsmålet, ukas aktive dager, nivå/XP.
// Med glass=true (i heroen) er kortene frostet hvite så bildet skinner gjennom.
function statKortRad(profil, logg, glass = false) {
  const idagIso = isoDato(new Date());
  const minutter = logg
    .filter((o) => (o.dato || '').slice(0, 10) === idagIso)
    .reduce((s, o) => s + (o.varighetMin || 0), 0);
  const maal = DAGSMAAL[profil.varighetsklasse] || 40;
  const dager = dagerMedAktivitet(logg, Date.now(), 7);
  const aktive = dager.filter((m) => m > 0).length;
  const info = nivaFraTotalXp(profil.globalXp || 0);

  const minBar = el('div', { class: 'xpbar__fyll' });
  fyllInn(minBar, 'width', `${Math.min(100, Math.round((minutter / maal) * 100))}%`);
  const xpBar = el('div', { class: 'xpbar__fyll' });
  fyllInn(xpBar, 'width', `${info.pct}%`);

  return el('div', { class: 'statkort-rad' + (glass ? ' statkort-rad--glass' : '') },
    el('div', { class: 'statkort' },
      el('span', { class: 'statkort__label' }, 'Minutter i dag'),
      el('div', { class: 'statkort__midt' },
        el('span', { class: 'statkort__tall' }, String(minutter)),
        el('span', { class: 'statkort__ikon' }, ikon('klokke')),
      ),
      el('span', { class: 'statkort__sub' }, `/${maal} min`),
      el('div', { class: 'xpbar statkort__bar' }, minBar),
    ),
    el('div', { class: 'statkort' },
      el('span', { class: 'statkort__label' }, 'Aktive dager'),
      el('div', { class: 'statkort__midt' },
        el('span', { class: 'statkort__tall' }, String(aktive)),
        el('span', { class: 'statkort__ikon' }, ikon('kalender')),
      ),
      el('span', { class: 'statkort__sub' }, '/7 dager'),
      el('div', { class: 'statkort__prikker' },
        ...dager.map((m) => el('i', { class: 'statkort__prikk' + (m > 0 ? ' statkort__prikk--aktiv' : '') })),
      ),
    ),
    el('a', { class: 'statkort', href: '#/reise' },
      el('span', { class: 'statkort__label' }, `Nivå ${info.niva}`),
      el('div', { class: 'statkort__midt' },
        el('span', { class: 'stathex' }, 'M'),
        el('span', { class: 'statkort__tall statkort__tall--xp' }, String(info.igjen)),
      ),
      el('span', { class: 'statkort__sub' }, 'XP til neste nivå'),
      el('div', { class: 'xpbar statkort__bar' }, xpBar),
    ),
  );
}

// «Velg bevegelse» — fargede fliser rett på underlaget. Starter med profilens
// foretrukne varighet; «Vis alle» går til Beveg med hele flyten.
const HJEM_FLISER = [
  ['walk', 'Gåtur', 'loper', 'lime'],
  ['run', 'Løp', 'lyn', 'koral'],
  ['yoga', 'Yoga', 'yoga', 'teal'],
  ['strength', 'Styrke', 'vekt', 'blaa'],
  ['stretch', 'Tøying', 'blad', 'lilla'],
  ['bike', 'Sykkel', 'sykkel', 'oransje'],
  ['sport', 'Sport', 'ball', 'gul'],
];

function seksjonsHode() {
  return el('div', { class: 'seksjonshode' },
    el('h2', { class: 'seksjonstittel' }, 'Velg bevegelse'),
    el('a', { class: 'seksjonslenke', href: '#/beveg' }, 'Vis alle', ikon('chevron')),
  );
}

function bevegelsesGrid() {
  // Flisinnhold: lite ikon øverst, navn nederst — og samme ikon stort og
  // utvasket bak i hjørnet, delvis utenfor kanten.
  const flisInnhold = (ikonNavn, navn) => [
    el('span', { class: 'movflis__bak' }, ikon(ikonNavn)),
    el('span', { class: 'movflis__ikon' }, ikon(ikonNavn)),
    el('span', { class: 'movflis__navn' }, navn),
  ];
  // Flisene åpner øktbibliotekets kategoriside (sport logges manuelt).
  const flis = (id, navn, ikonNavn, farge) => el('a', {
    class: `movflis movflis--${farge}`,
    href: okterHref(id),
  }, ...flisInnhold(ikonNavn, navn));
  const overrask = el('button', {
    class: 'movflis movflis--indigo', type: 'button',
    onclick: () => {
      const o = tilfeldigOkt();
      if (o) location.hash = `#/okter?start=${o.id}`;
    },
  }, ...flisInnhold('terning', 'Overrask meg'));
  return el('div', { class: 'movgrid' }, ...HJEM_FLISER.map((f) => flis(...f)), overrask);
}

// Dagens anbefaling: planlagt økt hvis den finnes, ellers Dagens gnist (§5.1).
function anbefalingKort(profil, logg, nå) {
  const planer = planForDato(isoDato(new Date()));
  const bilde = el('img', { src: 'icons/brand/shoe-badge.png', alt: '', loading: 'lazy' });
  const disk = el('span', { class: 'anbefaling__disk' }, bilde);
  bilde.addEventListener('error', () => { bilde.remove(); disk.append(ikon('sko')); });

  let tittel, tekst, href, knapp;
  if (planer.length) {
    const p = planer[0];
    const vis = planVisning(p);
    tittel = vis.kortTittel;
    tekst = 'Planlagt økt i dag';
    href = vis.href;
    knapp = 'Åpne plan';
  } else {
    const g = dagensGnist(profil, logg, nå);
    tittel = g.tittel;
    tekst = `${g.undertekst} · ≈ +${g.xp} XP`;
    href = g.href;
    knapp = 'Kjør i gang';
  }

  return el('div', { class: 'anbefaling' },
    disk,
    el('div', { class: 'anbefaling__meta' },
      el('span', { class: 'anbefaling__topp' }, el('strong', {}, 'I dag'), ` · ${tittel}`),
      el('span', { class: 'anbefaling__tekst' }, tekst),
    ),
    el('a', { class: 'anbefaling__knapp', href }, knapp),
  );
}

// Streak: sammenhengende dager med bevegelse. Dagens økt kan fortsatt komme,
// så en aktiv gårsdag holder streaken i live til dagen er omme.
function beregnStreak(logg) {
  const aktivSett = new Set(logg.map((o) => (o.dato || '').slice(0, 10)));
  const idag = new Date();
  idag.setHours(0, 0, 0, 0);
  let t = idag.getTime();
  if (!aktivSett.has(isoDato(new Date(t)))) t -= DAG;
  let streak = 0;
  while (aktivSett.has(isoDato(new Date(t)))) { streak++; t -= DAG; }
  return streak;
}

function streakKort(logg) {
  const streak = beregnStreak(logg);
  const aktivSett = new Set(logg.map((o) => (o.dato || '').slice(0, 10)));
  const idag = new Date();
  idag.setHours(0, 0, 0, 0);
  const idagIso = isoDato(idag);
  const man = mandagFor(idag);

  const uke = [];
  for (let i = 0; i < 7; i++) {
    const iso = isoDato(new Date(man.getTime() + i * DAG));
    const aktiv = aktivSett.has(iso);
    uke.push(el('span', { class: 'streakuke__dag' },
      el('span', { class: 'streakuke__sirkel' + (aktiv ? ' streakuke__sirkel--aktiv' : '') },
        aktiv && ikon('sjekk')),
      el('span', { class: 'streakuke__navn' }, UKEDAG_BOKSTAV[i]),
    ));
  }

  const tittel = streak > 0
    ? `${streak} ${streak === 1 ? 'dags' : 'dagers'} streak`
    : 'Klar for en ny streak?';
  const tekst = streak >= 3 ? 'Flott jobba! Hold trenden i gang.'
    : streak > 0 ? 'God start — hold rytmen i morgen også.'
      : 'Én liten bevegelse i dag starter en ny.';

  return el('div', { class: 'streakrad' },
    el('span', { class: 'streakrad__disk' }, ikon('flamme')),
    el('div', { class: 'streakrad__meta' },
      el('span', { class: 'streakrad__tittel' }, tittel),
      el('span', { class: 'streakrad__tekst' }, tekst),
    ),
    el('div', { class: 'streakuke' }, ...uke),
  );
}

function velkommenKort() {
  return el('div', { class: 'kort kort--info' },
    el('h2', {}, 'Velkommen'),
    el('p', {}, 'Små steg. Stor forskjell. La oss sette opp profilen din — under 2 minutter.'),
    el('button', { class: 'knapp', type: 'button', onclick: startOnboarding }, 'Kom i gang'),
  );
}

function varighetNavn(k) {
  return { mikro: '5–10 min', kort: '15–20 min', standard: '30–40 min', lang: '45–60 min' }[k] || k;
}

// ===========================================================================
// Meny + innstillinger
// ===========================================================================
function visMeny() {
  skjerm('Meny',
    el('div', { class: 'kort' },
      el('div', { class: 'liste' },
        menyrad('kalender', 'Mosjonskalender', '#/kalender'),
        menyrad('bok', 'Øktbiblioteket', '#/okter'),
        menyrad('sok', 'Øvelsesoppslag', '#/bibliotek'),
        menyrad('gir', 'Innstillinger', '#/innstillinger'),
        menyrad('info', 'Om Mova', '#/om'),
      ),
    ),
    el('a', { class: 'oppmuntring', href: '#/plan' },
      el('span', { class: 'oppmuntring__disk' }, ikon('hjerte', 'ikon ikon--fylt')),
      el('span', { class: 'oppmuntring__meta' },
        el('span', { class: 'oppmuntring__tittel' }, 'Gjør bevegelse til en vane'),
        el('span', { class: 'oppmuntring__tekst' }, 'Små steg hver dag gir varige resultater.'),
      ),
      el('span', { class: 'oppmuntring__chevron' }, ikon('chevron')),
    ),
  );
}

function menyrad(ikonNavn, tekst, href) {
  return el('a', { class: 'listerad', href },
    el('span', { class: 'listerad__ikon' }, ikon(ikonNavn)),
    el('span', { class: 'listerad__navn' }, tekst),
    el('span', { class: 'listerad__chevron' }, ikon('chevron')),
  );
}

function visInnstillinger() {
  const profil = hentProfil();
  if (!profil) { location.hash = '#/hjem'; return; }

  function lagre(muter) {
    const p = hentProfil();
    muter(p);
    lagreProfil(p);
    visInnstillinger();
  }

  skjerm('Innstillinger',
    skyKort(),
    el('div', { class: 'kort' },
      el('h2', {}, 'Ukemål'),
      el('div', { class: 'chiprad' },
        ...[2, 3, 4, 5, 6].map((n) => chip(String(n), {
          aktiv: profil.ukemaal === n, onClick: () => lagre((p) => { p.ukemaal = n; }),
        })),
      ),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Profil'),
      el('input', {
        class: 'sok', type: 'text', placeholder: 'Hva skal vi kalle deg?',
        value: profil.navn || '', autocomplete: 'given-name', maxlength: '24',
        onchange: (ev) => lagre((p) => { p.navn = ev.target.value.trim() || null; }),
      }),
      el('p', { class: 'dempet', style: 'margin-top:8px' }, 'Navnet brukes i hilsenen på Min dag.'),
      el('div', { class: 'knapprad' },
        el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: startOnboarding }, 'Ta profilen på nytt'),
      ),
      el('p', { class: 'dempet' }, 'Setter opp preferansene på nytt — rører aldri logg/XP.'),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Faresone'),
      el('button', {
        class: 'knapp knapp--fare', type: 'button',
        onclick: () => { if (confirm('Slette ALT — profil, logg, XP og historikk? Kan ikke angres.')) { nullstillAlt(); location.hash = '#/hjem'; location.reload(); } },
      }, 'Full nullstilling'),
    ),
  );
}

// Sky-synk-kort: magic-link-innlogging + synkstatus.
function skyKort() {
  const kort = el('div', { class: 'kort' }, el('h2', {}, 'Skysync'));
  if (sync.erInnlogget()) {
    const sist = sync.sistSynk();
    kort.append(
      el('p', {}, 'Innlogget som ', el('strong', {}, sync.brukerEpost() || 'ukjent')),
      el('p', { class: 'dempet' }, sist ? `Sist synket ${new Date(sist).toLocaleString('no-NO')}` : 'Ikke synket ennå.'),
      el('div', { class: 'knapprad' },
        el('button', {
          class: 'knapp', type: 'button',
          onclick: async (ev) => { ev.target.textContent = 'Synker…'; await sync.synk(); visInnstillinger(); },
        }, 'Synk nå'),
        el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: () => { sync.loggUt(); visInnstillinger(); } }, 'Logg ut'),
      ),
    );
  } else {
    const epostfelt = el('input', { class: 'sok', type: 'email', inputmode: 'email', placeholder: 'din@epost.no', autocomplete: 'email' });
    const status = el('p', { class: 'dempet' }, 'Del profil, logg og nivå mellom telefon og nettbrett.');
    kort.append(
      epostfelt,
      el('div', { class: 'knapprad', style: 'margin-top:10px' },
        el('button', {
          class: 'knapp', type: 'button',
          onclick: async () => {
            const epost = epostfelt.value.trim();
            if (!epost || !epost.includes('@')) { status.textContent = 'Skriv inn en gyldig e-post.'; status.className = 'varsel'; return; }
            status.textContent = 'Sender lenke…'; status.className = 'dempet';
            try { await sync.sendMagicLink(epost); status.textContent = `Sjekk ${epost} — klikk lenka for å logge inn.`; }
            catch (e) { status.textContent = `Kunne ikke sende: ${e.message}`; status.className = 'varsel'; }
          },
        }, 'Send innloggingslenke'),
      ),
      status,
    );
  }
  return kort;
}

// ===========================================================================
// Øvelsesoppslag / om (fra M1/M3)
// ===========================================================================
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
  );
}

function visOm() {
  const profil = hentProfil();
  skjerm('Om Mova',
    el('div', { class: 'kort' },
      el('h2', {}, 'Mova — Move for Life.'),
      el('p', {}, 'Bevegelse kan være hva som helst du liker — en tur, en økt, en fotballkamp. Alt teller, alt gir XP, og figuren din går videre på reisen sin. PWA i vanilla HTML/CSS/JS.'),
      el('p', { class: 'dempet' }, `Versjon ${APP_VERSION}`),
      el('p', { class: 'dempet' }, `${hentOkter().length} økter i biblioteket · ${bib.exercises.length} øvelser i oppslaget.`),
    ),
    profil && el('div', { class: 'kort' },
      el('h2', {}, 'Profil'),
      el('p', { class: 'dempet' }, `Motivasjon: ${(profil.motivasjon?.valg || []).join(', ') || '–'}`),
      el('p', { class: 'dempet' }, `Ukemål ${profil.ukemaal} · ${profil.ukemiks} · globalt nivå ${globaltNiva(profil.globalXp || 0)}`),
    ),
  );
}

// --- Tab-bar (Mova BottomNav: hvit flate, aktiv fane i aksentfargen) ---
function byggTabbar() {
  if (document.querySelector('.tabbar')) return;
  const tab = (rute, ikonNavn, tekst) => el('a', {
    class: 'tabbar__knapp', href: `#/${rute}`, 'data-rute': rute,
  }, el('span', { class: 'tabbar__ikon' }, ikon(ikonNavn)), el('span', { class: 'tabbar__tekst' }, tekst));

  document.body.append(el('nav', { class: 'tabbar' },
    tab('hjem', 'hjem', 'Min dag'),
    tab('beveg', 'loper', 'Beveg'),
    tab('reise', 'kompass', 'Min reise'),
    tab('aktivitet', 'puls', 'Aktivitet'),
    tab('meny', 'meny', 'Meny'),
  ));
}

// Anvender valgt app-tema (M6). Kalles ved oppstart og når temaet endres.
export function bruksTema(id) {
  if (id && id !== 'standard') document.documentElement.dataset.tema = id;
  else delete document.documentElement.dataset.tema;
}

// Engangsmigrering til M11: eldre profiler får figur, bevegelsestellere
// (bakoverregnet fra loggen) og favoritter utledet fra motivasjonsvektene.
function migrerProfil() {
  const profil = hentProfil();
  if (!profil || (profil.figur && profil.bevegelsesTeller)) return;
  const p = { ...profil };
  if (!p.figur) p.figur = standardFigur();
  if (!p.bevegelsesTeller) {
    const teller = {};
    for (const o of hentLogg()) {
      const b = o.bevegelse || MODALITET_TIL_BEVEGELSE[o.modalitet] || 'custom';
      teller[b] = (teller[b] || 0) + 1;
    }
    p.bevegelsesTeller = teller;
  }
  if (!p.bevegelsesFavoritter) {
    const vekter = p.motivasjon?.vekter || {};
    const rangert = Object.entries(vekter).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([m]) => MODALITET_TIL_BEVEGELSE[m]).filter(Boolean);
    p.bevegelsesFavoritter = [...new Set(['walk', ...rangert])].slice(0, 4);
  }
  lagreProfil(p);
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

// --- Splash (fersk åpning) ---
// Vises av index.html før noe annet er lastet; fades ut når appen er klar,
// men står minst ~700 ms så merket rekker å lande i stedet for å blinke.
function skjulSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const vent = Math.max(0, 700 - performance.now());
  setTimeout(() => {
    splash.classList.add('splash--skjul');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    setTimeout(() => splash.remove(), 800); // fallback (reduced motion o.l.)
  }, vent);
}

// --- Oppstart ---
async function start() {
  try {
    [bib] = await Promise.all([lastBibliotek(), lastOkter()]);
  } catch (e) {
    skjulSplash();
    tom(app);
    app.append(el('div', { class: 'kort kort--info' },
      el('h2', {}, 'Kunne ikke laste biblioteket'),
      el('p', { class: 'dempet' }, e.message),
    ));
    return;
  }
  settBibHist(bib);
  settBibBeveg(bib);
  settBibReise(bib);
  settBibKal(bib);
  migrerProfil();
  bruksTema(hentProfil()?.innstillinger?.tema);
  window.addEventListener('hashchange', navger);

  // Skysync: fang ev. magic-link-retur, og på en ny enhet som nettopp logget
  // inn — hent ned profilen før vi avgjør om onboarding skal kjøre.
  try {
    const { innlogget } = await sync.init();
    if (innlogget && !harProfil()) await sync.synk();
    else if (innlogget) sync.synk();
    sync.påStatus(oppdaterSyncMerke);
  } catch (e) {
    console.warn('Sync utilgjengelig', e);
  }

  if (!harProfil()) {
    startOnboarding();
    skjulSplash();
    return;
  }
  byggTabbar();
  navger();
  skjulSplash();
}

// Oppdaterer et lite synk-merke på Meny-fanen når status endrer seg.
function oppdaterSyncMerke(status) {
  const knapp = document.querySelector('.tabbar__knapp[data-rute="meny"]');
  if (knapp) knapp.classList.toggle('tabbar__knapp--synker', status === 'synker');
  // Hvis brukeren står på en skjerm som viser synket data, tegn på nytt.
  if (status === 'synket') {
    const rute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
    if (['hjem', 'historikk', 'aktivitet', 'niva', 'progresjon', 'reise', 'innstillinger'].includes(rute)) navger();
  }
}

// Service worker med selvoppdatering. iOS-PWA-er sjekker ikke pålitelig etter
// SW-oppdateringer selv, og en ny SW som tar over re-rendrer ikke siden som
// alt vises — begge deler håndteres her, så brukere slipper dobbel-refresh.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // updateViaCache: 'none' — hent alltid fersk sw.js (omgå HTTP-cache).
      const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      reg.update(); // sjekk eksplisitt ved hver oppstart
      // iOS-PWA-er gjenopptas oftere enn de relanseres — sjekk også når
      // appen kommer tilbake i forgrunnen.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
      // Når en ny SW tar over (skipWaiting/claim i sw.js), last siden på nytt
      // én gang så ny CSS/JS faktisk vises. Ikke ved aller første install.
      const haddeKontroller = !!navigator.serviceWorker.controller;
      let lastet = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!haddeKontroller || lastet) return;
        lastet = true;
        location.reload();
      });
    } catch (e) {
      console.warn('SW-registrering feilet', e);
    }
  });
}

start();
