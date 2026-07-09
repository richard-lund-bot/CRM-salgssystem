// App-inngang for Treningsapp v2.
// M1: PWA-skjelett + bibliotek. M3: onboarding, generator, kjøre-UI.
// M4: logging → XP → nivå (base + momentum/decay), gateways, historikk.
// Hjem er adaptiv: toppkortet styres av motivasjonsprofilen, og momentum-piler
// + kjølige varsler formuleres som tilbud, aldri skam.
import { lastBibliotek, modalitetsoversikt, MODALITET_NAVN, MONSTER_NAVN } from './library.js';
import {
  hentProfil, harProfil, lagreProfil, hentLogg, nullstillAlt,
  planForDato,
} from './store.js';
import { el, tom, chip, ikon } from './ui.js';
import { APP_VERSION } from './config.js';
import { kjorOnboarding } from './onboarding.js';
import { settBib as settBibKjor, visGeneratorSkjerm, visReviewSkjerm, visKjoreSkjerm } from './kjor.js';
import { settBib as settBibNiva, visNivaSkjerm } from './niva-ui.js';
import { settBib as settBibHist, visAktivitetSkjerm } from './historikk.js';
import { settBib as settBibPlan, visPlanSkjerm } from './plan.js';
import { momentum, streak, globaltNiva } from './niva.js';
import { nivaFraTotalXp, tittelFor, tierBadge, avatarBilde, erBildeAvatar, STANDARD_AVATAR } from './belonninger.js';
import { fyllInn } from './animasjon.js';
import * as sync from './sync.js';

const app = document.getElementById('app');
let bib = null;

// --- Ruter (hash-basert) ---
const ruter = {
  hjem: visHjem,
  plan: () => visPlanSkjerm(app),
  ny: () => visGeneratorSkjerm(app, lesForhandsvalg()),
  review: () => visReviewSkjerm(app),
  kjor: () => visKjoreSkjerm(app),
  aktivitet: () => visAktivitetSkjerm(app),
  historikk: () => visAktivitetSkjerm(app), // gammel lenke — samme skjerm
  niva: () => visNivaSkjerm(app),
  meny: visMeny,
  innstillinger: visInnstillinger,
  bibliotek: visBibliotek,
  kjeder: visKjeder,
  om: visOm,
};

// Kun selve kjøringen (review + aktiv timer/guide) er fokusmodus — «Ny økt»
// beholder navigasjonen siden det bare er et oppsett-skjema.
const FOKUS = new Set(['review', 'kjor']);

function lesForhandsvalg() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const v = {};
  if (params.get('m')) v.modalitet = params.get('m');
  if (params.get('k')) v.varighetsklasse = params.get('k');
  if (params.get('p')) v.planId = params.get('p');
  return v;
}

function navger() {
  const rute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
  document.body.classList.toggle('fokusmodus', FOKUS.has(rute));
  (ruter[rute] || visHjem)();
  oppdaterNav(rute);
}

function oppdaterNav(rute) {
  const tabRute = ({
    innstillinger: 'meny', bibliotek: 'meny', kjeder: 'meny', om: 'meny', historikk: 'aktivitet',
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
// Min dag — Mova-hjemskjerm (mal: templates/mova-min-dag/MovaMinDag.dc.html)
// Wordmark + bjelle, «Min dag» + dato, HeroCard (dagens bevegelse),
// «Planlagt i dag» med øktrad, oppmuntringsbanner. Momentum-tilbud og
// profilstripe beholdes under — formulert som tilbud, aldri skam.
// ===========================================================================
const DAG = 86400000;

function isoDato(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dg = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dg}`;
}

// Dagsmål i minutter, avledet av foretrukket varighetsklasse.
const DAGSMAAL = { mikro: 10, kort: 20, standard: 40, lang: 60 };

function wordmark() {
  return el('a', { class: 'wordmark', href: '#/hjem', 'aria-label': 'Mova' },
    'mova', el('span', { class: 'wordmark__prikk' }, '.'));
}

function movaHode() {
  return el('div', { class: 'mova-hode' },
    wordmark(),
    el('a', { class: 'ikonknapp', href: '#/innstillinger', 'aria-label': 'Innstillinger og varsler' }, ikon('bjelle')),
  );
}

function visHjem() {
  const profil = hentProfil();
  if (!profil) {
    skjerm('Mova', velkommenKort());
    return;
  }
  const logg = hentLogg();
  const nå = Date.now();
  const rådato = new Date().toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });
  const datoTekst = rådato.charAt(0).toUpperCase() + rådato.slice(1);

  tom(app);
  app.append(
    el('main', { class: 'innhold' },
      movaHode(),
      el('div', {},
        el('h1', { class: 'mova-tittel' }, 'Min dag'),
        el('p', { class: 'mova-dato' }, datoTekst),
      ),
      heroKort(profil, logg),
      planlagtKort(profil),
      oppmuntringsBanner(profil, logg, nå),
      momentumStrip(profil, nå),
      profilstripe(profil),
    ),
  );
}

// HeroCard — «Dagens bevegelse»: illustrasjon, hvit fremdriftsring (min/mål).
function heroKort(profil, logg) {
  const idagIso = isoDato(new Date());
  const minutter = logg
    .filter((o) => (o.dato || '').slice(0, 10) === idagIso)
    .reduce((s, o) => s + (o.varighetMin || 0), 0);
  const maal = DAGSMAAL[profil.varighetsklasse] || 40;
  const pct = Math.max(0, Math.min(1, maal ? minutter / maal : 0));
  const storrelse = 62, strek = 5;
  const r = (storrelse - strek) / 2;
  const c = 2 * Math.PI * r;

  const planer = planForDato(idagIso);
  const href = planer.length
    ? `#/ny?m=${planer[0].modalitet}&k=${planer[0].varighetsklasse}&p=${planer[0].id}`
    : `#/ny?m=${foreslaModalitet(profil)}`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', storrelse);
  svg.setAttribute('height', storrelse);
  svg.setAttribute('viewBox', `0 0 ${storrelse} ${storrelse}`);
  svg.innerHTML =
    `<circle cx="${storrelse / 2}" cy="${storrelse / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="${strek}"/>`
    + `<circle cx="${storrelse / 2}" cy="${storrelse / 2}" r="${r}" fill="none" stroke="#fff" stroke-width="${strek}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/>`;

  const bilde = el('img', { class: 'herokort__bilde', src: 'icons/brand/hero-min-dag.png', alt: '', loading: 'lazy' });
  bilde.addEventListener('error', () => bilde.remove());

  return el('a', { class: 'herokort', href },
    bilde,
    el('span', { class: 'herokort__band' },
      el('span', { class: 'herokort__ringwrap' },
        svg,
        el('span', { class: 'herokort__ringtall' },
          el('span', { class: 'herokort__verdi' }, String(minutter)),
          el('span', { class: 'herokort__enhet' }, 'min'),
        ),
      ),
      el('span', { class: 'herokort__meta' },
        el('span', { class: 'herokort__tittel' }, 'Dagens bevegelse'),
        el('span', { class: 'herokort__under' }, `Målet ditt: ${maal} min`),
      ),
      el('span', { class: 'herokort__pil' }, ikon('chevron')),
    ),
  );
}

// «Planlagt i dag» — øktrader med Start-knapp, eller tilbud om å planlegge.
function planlagtKort(profil) {
  const idagIso = isoDato(new Date());
  const planer = planForDato(idagIso);

  const hode = el('div', { class: 'kort__hode' },
    el('h2', {}, 'Planlagt i dag'),
    el('span', { class: 'badge' }, planer.length ? `${planer.length} økt${planer.length === 1 ? '' : 'er'}` : 'ingen økt'),
  );

  if (!planer.length) {
    const modalitet = foreslaModalitet(profil);
    return el('div', { class: 'kort' },
      hode,
      el('p', { class: 'dempet' }, 'Ingen planlagt økt denne dagen.'),
      el('div', { class: 'knapprad' },
        el('a', { class: 'knapp', href: `#/ny?m=${modalitet}` }, 'Start spontanøkt'),
        el('a', { class: 'knapp knapp--sekundaer', href: '#/plan' }, 'Planlegg'),
      ),
    );
  }

  return el('div', { class: 'kort' },
    hode,
    el('div', { class: 'plandag__liste' }, ...planer.map((p) => oktRad(p))),
  );
}

function oktRad(p) {
  const bilde = el('img', { src: 'icons/brand/shoe-badge.png', alt: '', loading: 'lazy' });
  const disk = el('span', { class: 'oktrad__disk' }, bilde);
  bilde.addEventListener('error', () => { bilde.remove(); disk.append(ikon('sko')); });
  return el('div', { class: 'oktrad' },
    disk,
    el('span', { class: 'oktrad__meta' },
      el('span', { class: 'oktrad__tittel' }, MODALITET_NAVN[p.modalitet] || p.modalitet),
      el('span', { class: 'oktrad__varighet' }, varighetNavn(p.varighetsklasse)),
    ),
    el('a', { class: 'knapp knapp--liten', href: `#/ny?m=${p.modalitet}&k=${p.varighetsklasse}&p=${p.id}` }, 'Start økten'),
  );
}

// Oppmuntringsbanner — varm, lavmælt: fremgang, ikke perfeksjon.
function oppmuntringsBanner(profil, logg, nå) {
  const st = streak(logg, profil.ukemaal || 4, nå);
  let tittel = 'Du er på vei!';
  let tekst = 'Fortsett med det gode arbeidet.';
  if (st.nadd) {
    tittel = 'Målet er nådd denne uka!';
    tekst = `${st.denneUken} av ${st.ukemaal} økter. Sterkt jobba.`;
  } else if (st.denneUken > 0) {
    tekst = `${st.denneUken} av ${st.ukemaal} økter denne uka. Hvert steg teller.`;
  }
  return el('div', { class: 'oppmuntring' },
    el('span', { class: 'oppmuntring__meta' },
      el('span', { class: 'oppmuntring__tittel' }, tittel),
      el('span', { class: 'oppmuntring__tekst' }, tekst),
    ),
    el('span', { class: 'oppmuntring__disk' }, ikon('hjerte', 'ikon ikon--fylt')),
  );
}

function velkommenKort() {
  return el('div', { class: 'kort kort--info' },
    el('h2', {}, 'Velkommen'),
    el('p', {}, 'Små steg. Stor forskjell. La oss sette opp profilen din — under 2 minutter.'),
    el('button', { class: 'knapp', type: 'button', onclick: startOnboarding }, 'Kom i gang'),
  );
}

// Profilstripe: avatar + tittel + belønningsnivå, lenker til Nivå.
function profilstripe(profil) {
  const info = nivaFraTotalXp(profil.globalXp || 0);
  const avatar = profil.innstillinger?.avatar || STANDARD_AVATAR;
  const avatarInnhold = erBildeAvatar(avatar)
    ? el('img', { class: 'profilstripe__avatarbilde', src: avatarBilde(avatar), alt: '', loading: 'lazy' })
    : avatar;
  const fyll = el('div', { class: 'xpbar__fyll' });
  fyllInn(fyll, 'width', `${info.pct}%`);
  return el('a', { class: 'profilstripe', href: '#/niva' },
    el('span', { class: 'profilstripe__avatar' }, avatarInnhold),
    el('div', { class: 'profilstripe__meta' },
      el('span', { class: 'profilstripe__navn' }, tittelFor(info.niva)),
      el('span', { class: 'profilstripe__niva' }, `Nivå ${info.niva}`),
    ),
    el('div', { class: 'profilstripe__bar' }, el('div', { class: 'xpbar' }, fyll)),
    el('img', { class: 'profilstripe__crest', src: tierBadge(info.niva), alt: '', loading: 'lazy' }),
    el('span', { class: 'profilstripe__pil' }, ikon('chevron')),
  );
}

// Momentum-piler + kjølige tilbud (aldri skam-språk).
function momentumStrip(profil, nå) {
  const trente = Object.keys(profil.nivaer || {}).filter((m) => profil.nivaer[m].sisteOkt);
  const kjolige = trente
    .map((m) => ({ m, mom: momentum(profil, m, nå) }))
    .filter((x) => x.mom.tilstand === 'kjolig' || x.mom.tilstand === 'comeback');
  if (!kjolige.length) return null;
  const x = kjolige.sort((a, b) => b.mom.dagerSiden - a.mom.dagerSiden)[0];
  const navn = MODALITET_NAVN[x.m] || x.m;
  const tekst = x.mom.tilstand === 'comeback'
    ? `${navn} har hvilt ${x.mom.dagerSiden} dager. Velkommen tilbake — dobbel XP venter.`
    : `${navn} er litt kjølig (${x.mom.dagerSiden} d). 15 min vedlikehold?`;
  return el('a', { class: 'oppmuntring oppmuntring--teal', href: `#/ny?m=${x.m}&k=kort` },
    el('span', { class: 'oppmuntring__disk' }, ikon('flamme')),
    el('span', { class: 'oppmuntring__meta' },
      el('span', { class: 'oppmuntring__tittel' }, 'Et lite tilbud'),
      el('span', { class: 'oppmuntring__tekst' }, tekst),
    ),
    el('span', { class: 'oppmuntring__chevron' }, ikon('chevron')),
  );
}

function foreslaModalitet(profil) {
  const medMal = new Set(bib.templates.map((t) => t.modalitet));
  const vekter = profil.motivasjon?.vekter || {};
  let best = 'STY';
  let bestV = -Infinity;
  for (const m of medMal) {
    const v = vekter[m] || 0;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
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
        menyrad('bok', 'Bibliotek', '#/bibliotek'),
        menyrad('trend', 'Progresjonskjeder', '#/kjeder'),
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
  const nå = Date.now();
  const pauseAktiv = profil.innstillinger?.pauseTil && Date.parse(profil.innstillinger.pauseTil) > nå;

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
      el('h2', {}, 'Pause-modus'),
      el('p', { class: 'dempet' }, pauseAktiv ? `Aktiv til ${new Date(Date.parse(profil.innstillinger.pauseTil)).toLocaleDateString('no-NO')} — decay er frosset.` : 'Frys nedlevling ved ferie eller sykdom (30 dager).'),
      el('button', {
        class: 'knapp knapp--sekundaer', type: 'button',
        onclick: () => lagre((p) => {
          p.innstillinger = p.innstillinger || {};
          p.innstillinger.pauseTil = pauseAktiv ? null : new Date(nå + 30 * 86400000).toISOString();
        }),
      }, pauseAktiv ? 'Avslutt pause' : 'Start pause (30 d)'),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Manuell nivåoverstyring'),
      el('p', { class: 'dempet' }, 'Lås opp øvelsesnivåer manuelt. «Auto» følger base + gateways.'),
      el('div', { class: 'overstyr' },
        ...['STY', 'CORE', 'SKILL', 'YOGA', 'HIIT'].map((m) => overstyrRad(m, profil, lagre)),
      ),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Bruk jern'),
      el('label', { class: 'bryter' },
        el('span', {}, 'Foretrekk vekt-varianter når tilgjengelig'),
        el('input', {
          type: 'checkbox', checked: profil.innstillinger?.brukJern !== false,
          onchange: (ev) => lagre((p) => { p.innstillinger = p.innstillinger || {}; p.innstillinger.brukJern = ev.target.checked; }),
        }),
      ),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Profil'),
      el('div', { class: 'knapprad' },
        el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: startOnboarding }, 'Ta profilen på nytt'),
      ),
      el('p', { class: 'dempet' }, 'Nullstiller vekter og startnivå — rører aldri logg/XP.'),
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

function overstyrRad(m, profil, lagre) {
  const gjeldende = profil.innstillinger?.nivaOverstyr?.[m];
  const auto = !Number.isFinite(gjeldende);
  const vis = auto ? '—' : String(gjeldende);
  const sett = (v) => lagre((p) => {
    p.innstillinger = p.innstillinger || {};
    p.innstillinger.nivaOverstyr = p.innstillinger.nivaOverstyr || {};
    if (v == null) delete p.innstillinger.nivaOverstyr[m];
    else p.innstillinger.nivaOverstyr[m] = v;
  });
  return el('div', { class: 'overstyr__rad' },
    el('span', { class: 'overstyr__navn' }, MODALITET_NAVN[m] || m),
    el('div', { class: 'overstyr__knapper' },
      el('button', { class: 'ikonknapp', type: 'button', onclick: () => sett(auto ? 1 : Math.max(1, gjeldende - 1)) }, '−'),
      el('span', { class: 'overstyr__verdi' + (auto ? ' dempet' : '') }, auto ? 'auto' : `nv ${vis}`),
      el('button', { class: 'ikonknapp', type: 'button', onclick: () => sett(auto ? 3 : Math.min(5, gjeldende + 1)) }, '+'),
      !auto && el('button', { class: 'ikonknapp', type: 'button', title: 'Auto', onclick: () => sett(null) }, '↺'),
    ),
  );
}

// ===========================================================================
// Bibliotek / kjeder / om (fra M1/M3)
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
  const profil = hentProfil();
  skjerm('Om Mova',
    el('div', { class: 'kort' },
      el('h2', {}, 'Mova — Move for Life.'),
      el('p', {}, 'Små steg. Stor forskjell. Din vennlige følgesvenn for mer bevegelse i hverdagen — med økter, nivåer, belønninger og historikk. PWA i vanilla HTML/CSS/JS.'),
      el('p', { class: 'dempet' }, `Versjon ${APP_VERSION}`),
      el('p', { class: 'dempet' }, `${bib.exercises.length} øvelser · ${bib.chains.length} kjeder · ${bib.formats.length} formater · ${bib.templates.length} maler · ${bib.gateways.length} gateways · ${bib.sequences.length} sekvenser.`),
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
    tab('plan', 'kalender', 'Plan'),
    tab('aktivitet', 'puls', 'Aktivitet'),
    tab('niva', 'graf', 'Nivå'),
    tab('meny', 'meny', 'Meny'),
  ));
}

// Anvender valgt app-tema (M6). Kalles ved oppstart og når temaet endres.
export function bruksTema(id) {
  if (id && id !== 'standard') document.documentElement.dataset.tema = id;
  else delete document.documentElement.dataset.tema;
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
  settBibKjor(bib);
  settBibNiva(bib);
  settBibHist(bib);
  settBibPlan(bib);
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
    return;
  }
  byggTabbar();
  navger();
}

// Oppdaterer et lite synk-merke på Meny-fanen når status endrer seg.
function oppdaterSyncMerke(status) {
  const knapp = document.querySelector('.tabbar__knapp[data-rute="meny"]');
  if (knapp) knapp.classList.toggle('tabbar__knapp--synker', status === 'synker');
  // Hvis brukeren står på en skjerm som viser synket data, tegn på nytt.
  if (status === 'synket') {
    const rute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
    if (['hjem', 'historikk', 'aktivitet', 'niva', 'innstillinger'].includes(rute)) navger();
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
