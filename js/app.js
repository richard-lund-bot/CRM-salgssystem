// App-inngang for Treningsapp v2.
// M1: PWA-skjelett + bibliotek. M3: onboarding, generator, kjøre-UI.
// M4: logging → XP → nivå (base + momentum/decay), gateways, historikk.
// Hjem er adaptiv: toppkortet styres av motivasjonsprofilen, og momentum-piler
// + kjølige varsler formuleres som tilbud, aldri skam.
import { lastBibliotek, modalitetsoversikt, MODALITET_NAVN, MONSTER_NAVN } from './library.js';
import {
  hentProfil, harProfil, lagreProfil, hentLogg, hentSistLokasjon, lagreSistLokasjon, nullstillAlt,
} from './store.js';
import { el, tom, chip } from './ui.js';
import { APP_VERSION } from './config.js';
import { kjorOnboarding } from './onboarding.js';
import { settBib as settBibKjor, visGeneratorSkjerm, visReviewSkjerm, visKjoreSkjerm } from './kjor.js';
import { settBib as settBibNiva, visNivaSkjerm } from './niva-ui.js';
import { settBib as settBibHist, visHistorikkSkjerm } from './historikk.js';
import {
  effektivBase, raBase, nivaFraBase, momentum, streak, prsFraLogg, globaltNiva,
} from './niva.js';
import * as sync from './sync.js';

const app = document.getElementById('app');
let bib = null;

// --- Ruter (hash-basert) ---
const ruter = {
  hjem: visHjem,
  ny: () => visGeneratorSkjerm(app, lesForhandsvalg()),
  review: () => visReviewSkjerm(app),
  kjor: () => visKjoreSkjerm(app),
  niva: () => visNivaSkjerm(app),
  historikk: () => visHistorikkSkjerm(app),
  meny: visMeny,
  innstillinger: visInnstillinger,
  bibliotek: visBibliotek,
  kjeder: visKjeder,
  om: visOm,
};

const FOKUS = new Set(['ny', 'review', 'kjor']);

function lesForhandsvalg() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const v = {};
  if (params.get('m')) v.modalitet = params.get('m');
  if (params.get('k')) v.varighetsklasse = params.get('k');
  return v;
}

function navger() {
  const rute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
  document.body.classList.toggle('fokusmodus', FOKUS.has(rute));
  (ruter[rute] || visHjem)();
  oppdaterNav(rute);
}

function oppdaterNav(rute) {
  const tabRute = ({ innstillinger: 'meny', bibliotek: 'meny', kjeder: 'meny', om: 'meny' })[rute] || rute;
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
// Hjem (adaptiv)
// ===========================================================================
function visHjem() {
  const profil = hentProfil();
  if (!profil) {
    skjerm('Treningsapp', velkommenKort());
    return;
  }
  const logg = hentLogg();
  const nå = Date.now();

  skjerm('Treningsapp',
    toppkort(profil, logg, nå),
    dagensForslag(profil),
    momentumStrip(profil, nå),
    nivaSammendrag(profil, nå),
    el('div', { class: 'kort' },
      el('h2', {}, 'Snarveier'),
      el('div', { class: 'knapprad' },
        el('a', { class: 'knapp knapp--sekundaer', href: '#/historikk' }, 'Historikk'),
        el('a', { class: 'knapp knapp--sekundaer', href: '#/niva' }, 'Nivå & gateways'),
      ),
    ),
  );
}

function velkommenKort() {
  return el('div', { class: 'kort kort--info' },
    el('h2', {}, 'Velkommen 👋'),
    el('p', {}, 'La oss sette opp profilen din — under 2 minutter.'),
    el('button', { class: 'knapp', type: 'button', onclick: startOnboarding }, 'Kom i gang'),
  );
}

// Toppkort styrt av motivasjon.toppkort (§16).
function toppkort(profil, logg, nå) {
  const kort = profil.motivasjon?.toppkort || 'streak';
  const st = streak(logg, profil.ukemaal || 4, nå);
  if (kort === 'pr') {
    const pr = Object.values(prsFraLogg(logg)).sort((a, b) => Date.parse(b.dato) - Date.parse(a.dato))[0];
    return heltKort('Siste PR', pr ? `${bib.ovelseMap.get(pr.id)?.navn || pr.id}` : 'Logg tall for å bygge PR-tavla', pr ? prTekst(pr) : '#/historikk');
  }
  if (kort === 'skilltre') {
    const antall = (profil.gatewaysPassert || []).length;
    return heltKort('Skill tree', `${antall} gateway${antall === 1 ? '' : 's'} låst opp`, '#/niva', 'Åpne gateways');
  }
  if (kort === 'volum') {
    const denne = logg.filter((o) => Date.parse(o.dato) > nå - 7 * 86400000).reduce((s, o) => s + (o.varighetMin || 0), 0);
    return heltKort('Denne uka', `${denne} minutter trent`, '#/historikk', 'Se volum');
  }
  if (kort === 'kveld') {
    return heltKort('Kveldsro', 'Rolig yoga eller pust før leggetid?', '#/ny?m=REST', 'Start kveldsøkt');
  }
  // streak (default) + overrask
  return el('div', { class: 'kort hero streakkort' },
    el('div', { class: 'streakring' }, el('span', { class: 'streakring__tall' }, String(st.uker)), el('span', { class: 'streakring__lbl' }, 'uker 🔥')),
    el('div', {},
      el('p', { class: 'hero__eyebrow' }, 'Streak'),
      el('p', {}, st.nadd ? `Målet er nådd denne uka (${st.denneUken}/${st.ukemaal}). Sterkt!` : `${st.denneUken} av ${st.ukemaal} økter denne uka.`),
    ),
  );
}

function heltKort(eyebrow, tittel, href, knappTekst) {
  return el('div', { class: 'kort hero' },
    el('p', { class: 'hero__eyebrow' }, eyebrow),
    el('h2', { class: 'hero__tittel' }, tittel),
    href && el('div', { class: 'knapprad' }, el('a', { class: 'knapp knapp--sekundaer', href }, knappTekst || 'Åpne')),
  );
}

function prTekst(pr) {
  const d = [];
  if (Number.isFinite(pr.reps)) d.push(`${pr.reps} reps`);
  if (Number.isFinite(pr.last)) d.push(`${pr.last} kg`);
  if (Number.isFinite(pr.holdSek)) d.push(`${pr.holdSek} s`);
  return d.join(' · ');
}

// Dagens forslag: foreslått modalitet + én-trykks start + lokasjonschips.
function dagensForslag(profil) {
  const modalitet = foreslaModalitet(profil);
  const varighet = profil.varighetsklasse || 'standard';
  const lokasjoner = (profil.lokasjoner || []).map((l) => l.navn);
  const aktiv = hentSistLokasjon() || profil.aktivLokasjon || lokasjoner[0];

  return el('div', { class: 'kort' },
    el('p', { class: 'hero__eyebrow' }, 'Dagens forslag'),
    el('h2', { class: 'hero__tittel' }, `${MODALITET_NAVN[modalitet] || modalitet} · ${varighetNavn(varighet)}`),
    lokasjoner.length > 1 && el('div', { class: 'chiprad hero__lok' },
      ...lokasjoner.map((navn) => chip(navn, {
        aktiv: aktiv === navn,
        onClick: () => { lagreSistLokasjon(navn); visHjem(); },
      })),
    ),
    el('div', { class: 'knapprad' },
      el('button', { class: 'knapp', type: 'button', onclick: () => { location.hash = `#/ny?m=${modalitet}`; } }, 'Sett opp økt ▶'),
    ),
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
  return el('div', { class: 'kort kort--tilbud' },
    el('p', {}, tekst),
    el('div', { class: 'knapprad' },
      el('a', { class: 'knapp knapp--sekundaer', href: `#/ny?m=${x.m}&k=kort` }, 'Kort økt'),
    ),
  );
}

function nivaSammendrag(profil, nå) {
  const rekke = ['STY', 'HIIT', 'CORE', 'YOGA', 'STR'].filter((m) => profil.nivaer?.[m]);
  return el('a', { class: 'kort kort--klikk', href: '#/niva' },
    el('h2', {}, 'Nivå'),
    el('div', { class: 'nivliste' },
      ...rekke.map((m) => {
        const eff = effektivBase(profil, m, nå);
        const mom = momentum(profil, m, nå);
        return el('div', { class: 'nivkort' },
          el('span', { class: 'nivkort__navn' }, `${MODALITET_NAVN[m] || m} `, el('span', { class: 'mom mom--' + mom.tilstand }, mom.pil)),
          el('span', { class: 'niva' }, ...[1, 2, 3, 4, 5].map((k) =>
            el('i', { class: 'niva__p' + (k <= nivaFraBase(eff) ? ' niva__p--på' : '') }))),
        );
      }),
    ),
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
      el('div', { class: 'menyliste' },
        menyrad('📚', 'Bibliotek', '#/bibliotek'),
        menyrad('🪜', 'Progresjonskjeder', '#/kjeder'),
        menyrad('⚙️', 'Innstillinger', '#/innstillinger'),
        menyrad('ℹ️', 'Om', '#/om'),
      ),
    ),
  );
}

function menyrad(ikon, tekst, href) {
  return el('a', { class: 'modrad', href },
    el('span', { class: 'modrad__navn' }, `${ikon}  ${tekst}`),
    el('span', { class: 'dempet' }, '›'),
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
  const kort = el('div', { class: 'kort' }, el('h2', {}, 'Skysync ☁️'));
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
  skjerm('Om',
    el('div', { class: 'kort' },
      el('h2', {}, 'Treningsapp v2'),
      el('p', {}, 'Milepæl 4: logging, XP, nivåsystem, gateways og historikk. PWA i vanilla HTML/CSS/JS.'),
      el('p', { class: 'dempet' }, `Versjon ${APP_VERSION}`),
      el('p', { class: 'dempet' }, `${bib.exercises.length} øvelser · ${bib.chains.length} kjeder · ${bib.formats.length} formater · ${bib.templates.length} maler · ${bib.gateways.length} gateways · ${bib.sequences.length} sekvenser.`),
    ),
    profil && el('div', { class: 'kort' },
      el('h2', {}, 'Profil'),
      el('p', { class: 'dempet' }, `Motivasjon: ${(profil.motivasjon?.valg || []).join(', ') || '–'}`),
      el('p', { class: 'dempet' }, `Ukemål ${profil.ukemaal} · ${profil.ukemiks} · globalt nivå ${globaltNiva(profil.globalXp || 0)}`),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Neste'),
      el('ul', {}, el('li', {}, 'M2/M5: Supabase-sync av brukertilstand på tvers av enheter')),
    ),
  );
}

// --- Tab-bar ---
function byggTabbar() {
  if (document.querySelector('.tabbar')) return;
  const tab = (rute, ikon, tekst) => el('a', {
    class: 'tabbar__knapp', href: `#/${rute}`, 'data-rute': rute,
  }, el('span', { class: 'tabbar__ikon' }, ikon), el('span', { class: 'tabbar__tekst' }, tekst));

  document.body.append(el('nav', { class: 'tabbar' },
    tab('hjem', '🏠', 'Hjem'),
    tab('ny', '⚡', 'Trene'),
    tab('niva', '📈', 'Nivå'),
    tab('historikk', '📅', 'Historikk'),
    tab('meny', '☰', 'Meny'),
  ));
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
  const knapp = document.querySelector('.tabbar__knapp[data-rute="meny"] .tabbar__ikon');
  if (!knapp) return;
  knapp.textContent = status === 'synker' ? '🔄' : '☰';
  // Hvis brukeren står på en skjerm som viser synket data, tegn på nytt.
  if (status === 'synket') {
    const rute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
    if (['hjem', 'historikk', 'niva', 'innstillinger'].includes(rute)) navger();
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW-registrering feilet', e));
  });
}

start();
