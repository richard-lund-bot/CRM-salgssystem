// App-inngang for Mova (M37 — feeden er hjem).
// Navigasjon: Hjem (lærings-feed) · Trening (Min dag) · Profil · Treningsbibliotek · Lær.
// Hjem er den spillbare kunnskaps-feeden (js/feed.js); Min dag-dashbordet
// (hilsen, dagens statkort, bevegelsesgrid) bor på Trening-fanen — formulert
// som tilbud, aldri skam. Nivået bor som en liten boble på profilikonet;
// feiringen bor i merkene (js/merker.js), og treningsstats/-oppslag er samlet
// under Trening-området på profilen.
import { lastBibliotek, MODALITET_NAVN, MONSTER_NAVN } from './library.js';
import {
  hentProfil, harProfil, lagreProfil, hentLogg, nullstillAlt,
  planForDato,
} from './store.js';
import { el, tom, chip, ikon, bryter } from './ui.js';
import { APP_VERSION, APP_NAME, APP_TAGLINE } from './config.js';
import { kjorOnboarding } from './onboarding.js';
import { visReviewSkjerm, visKjoreSkjerm } from './kjor.js';
import { settBib as settBibHist, visAktivitetSkjerm } from './historikk.js';
import { visHurtigSkjerm, visLoggforSkjerm, aktivHurtig } from './beveg.js';
import { slippVaaken } from './vaakenlaas.js';
import { lastOvelsesinfo, settBib as settBibOvelse, visOvelseSkjerm, ovelseInfo } from './ovelse.js';
import { alleØvelser, tonnasje, muskelVolum, lagLinjegraf } from './styrke.js';
import { lastArtikler, visLaerSkjerm, visArtikkelSkjerm } from './laer.js';
import { visLoggInnSkjerm, visRegistrerSkjerm, settEtterInnlogget } from './medlem.js';
import { lastStier, lastKjeder, lastDisipliner, lastSeksjoner, settBib as settBibSti, visStiSkjerm, visDisiplinSkjerm, visSeksjonSkjerm, laerLenke } from './sti.js';
import { visMerkerSkjerm } from './merker.js';
import { settBib as settBibKal, visKalenderSkjerm } from './kalender.js';
import { lagFaneside, fanesideMedTittel, settNavger, settUlestSjekk, dagsfase } from './banner.js';
import { nivaFraTotalXp } from './niva.js';
import { dagerMedAktivitet, okterHref, beregnStreak } from './bevegelse.js';
import { lastOkter, hentOkter, oktMedId, visOkterSkjerm, aapneOkt, tilfeldigOkt, MODALITET_TIL_KATEGORI, KATEGORI_NAVN, KATEGORIER, settLaerLenke } from './bibliotek-okter.js';
import { settBib as settBibOpp, settOkterKilde, erAdminEpost, adminModusPaa, settAdminModus } from './opplasing.js';
import { fyllInn, tallOpp, REDUSERT, lagRing } from './animasjon.js';
import { settLydAv } from './lyd.js';
import { settHaptikkAv, vibrer } from './haptikk.js';
import { regionScores, anbefalingFraRegioner, regionAndelForOkt, REGION_NAVN } from './kroppskart.js';
import { prefMult, prefNiva, PREF_NIVAER } from './preferanser.js';
import * as sync from './sync.js';
import { krediterNye, stravaKort } from './strava.js';
import { byggVarsler, merkVarslerSett, varselKort, harUlesteVarsler } from './varsler.js';
import { varsle } from './toast.js';
import { visFeedSkjerm, visPostSkjerm } from './feed.js';
import { gjeldendeSprak, settSprak, startOversetter, oversettDom, hentSprakJson } from './i18n.js';
import { VANER, dagensInnslag, veksleVane, kostStatus, settNotat } from './kosthold.js';
import { SOSIALE_VANER, dagensInnslag as sosDagensInnslag, veksleVane as sosVeksleVane, sosialStatus } from './sosialt.js';
import {
  STARTSPORSMAL, lesHvorfor, leggTilHvorfor, slettHvorfor, kanLeggeTil,
  ukensRefleksjon, settRefleksjon, lesRefleksjoner,
} from './mening.js';
import { streakEtter } from './feiring.js';

const app = document.getElementById('app');
let bib = null;

// --- Ruter (hash-basert) ---
const ruter = {
  hjem: () => visHjemDashboard(app), // Hjem er dagens dashbord (M53); feeden flyttet til #/feed
  feed: () => visFeedSkjerm(app), // Dagens feed — nås fra ikon oppe venstre / sveip fra Hjem
  utforsk: () => visUtforskSkjerm(app), // Kunnskap & inspirasjon (kuratert oppdagelse)
  post: () => visPostSkjerm(app), // dedikert side for ett feed-innlegg (spillbart)
  trening: visTrening, // Min dag-dashbordet bor på Trening-fanen
  kosthold: () => visKostholdSkjerm(app), // Kosthold-pilaren (blue-zones-vaner)
  ro: () => visRoSkjerm(app), // Ro-pilaren (pust + rolige økter)
  sosialt: () => visSosialtSkjerm(app), // Sosialt-pilaren (kommer — Fase 5)
  beveg: () => visOkterSkjerm(app), // Treningsbibliotek-fanen er øktbiblioteket
  hurtig: () => visHurtigSkjerm(app),
  loggfor: () => visLoggforSkjerm(app),
  merker: () => visMerkerSkjerm(app),
  reise: () => { location.hash = '#/merker'; },   // gammel lenke — reisen ble merker
  tilpass: () => { location.hash = '#/merker'; }, // gammel lenke — figuren er pensjonert
  okter: () => visOkterSkjerm(app),
  ny: omdirigerGammelNyLenke, // gammel generator-lenke → øktbiblioteket
  plan: () => visKalenderSkjerm(app), // gammel lenke — kalenderen er planen
  kalender: () => visKalenderSkjerm(app),
  review: () => visReviewSkjerm(app),
  kjor: () => visKjoreSkjerm(app),
  aktivitet: () => visAktivitetSkjerm(app),
  historikk: () => visAktivitetSkjerm(app), // gammel lenke — samme skjerm
  meny: visMeny, // hub bak tannhjulet — snarveier + inngang til innstillinger
  mening: () => visMeningSkjerm(app), // Mitt hvorfor — meningspilaren (ikke fane)
  varsler: visVarsler,
  innstillinger: visInnstillinger,
  bibliotek: visBibliotek,
  ovelse: () => visOvelseSkjerm(app),
  styrke: visStyrke,
  laer: () => visLaerSkjerm(app),
  artikkel: () => visArtikkelSkjerm(app),
  sti: () => visStiSkjerm(app),
  disiplin: () => visDisiplinSkjerm(app),
  seksjon: () => visSeksjonSkjerm(app),
  om: visOm,
  'logg-inn': () => visLoggInnSkjerm(app),
  'bli-medlem': () => visRegistrerSkjerm(app),
};

// Skjermene med egen tilbake-header er fokusmodus (skjuler tab-baren).
// «sti» (ferdighetsreisen) er bevisst IKKE fokus: bunnbaren blir stående helt
// til man går inn i en leksjon/kamp (som er egne fullskjerm-overlegg).
const FOKUS = new Set(['review', 'kjor', 'hurtig', 'loggfor', 'kalender', 'ovelse', 'artikkel', 'post', 'logg-inn', 'bli-medlem']);

// Medlemssidene (auth). Uinnloggede sendes hit; innloggede slippes forbi.
const AUTH_RUTER = new Set(['logg-inn', 'bli-medlem']);

// --- Fane-register (én kilde til sannhet) --------------------------------
// Bunnfanene defineres ett sted: id/rute, ikonene, etiketten og hvilke
// under-ruter fanen «eier» (barn). Alt annet (FANER-listen, under-rute→fane-
// kartet, per-fane-minnet og selve tab-baren i byggTabbar) utledes herfra, så
// en ny pilar-fane legges til med én oppføring i stedet for fem redigeringer.
//
// Hver bunnfane husker hvor den var (full hash + scroll), så et fanebytte og
// tilbake ikke nullstiller til fane-roten (som i vanlige apper). meny/
// innstillinger/varsler er bevisst IKKE barn av noen fane: de er egne sider
// (nås fra tannhjulet/bjella), lyser ingen fane og huskes aldri som fane-mål —
// ellers ville f.eks. Profil-fanen «låst» seg til Varsler.
// Bunnlinja = de fem blue-zones-pilarene: Feed · Mat · Bevegelse · Ro · Sosialt.
// Profil (#/merker) og Lær (#/laer) er IKKE bunnfaner lenger — de er egne sider
// som nås fra meny-huben (tannhjulet) på samme måte som Innstillinger/Varsler.
const FANER_DEF = [
  { id: 'hjem', rute: 'hjem', ikon: 'hjem', fyll: 'hjemfyll', label: 'Hjem',
    barn: ['feed', 'post'] }, // feeden (dagens feed) + innleggsside hører til Hjem
  { id: 'kosthold', rute: 'kosthold', ikon: 'eple', fyll: 'eplefyll', label: 'Mat',
    barn: [] },
  { id: 'trening', rute: 'trening', ikon: 'loper', fyll: 'loperfyll', label: 'Bevegelse',
    // Treningsbibliotek (øktbiblioteket) bor under Bevegelse — ett tapp unna via
    // «Se økter»/«Vis alle».
    barn: ['beveg', 'ny', 'okter'] },
  { id: 'ro', rute: 'ro', ikon: 'maane', fyll: null, label: 'Ro',
    barn: [] },
  { id: 'sosialt', rute: 'sosialt', ikon: 'snakke', fyll: null, label: 'Sosialt',
    barn: [] },
];
const FANER = FANER_DEF.map((f) => f.id);
// Under-rute → eier-fane, utledet av barn-listene.
const FANE_AV_RUTE = Object.fromEntries(
  FANER_DEF.flatMap((f) => f.barn.map((b) => [b, f.id])),
);
const faneForRute = (rute) => FANE_AV_RUTE[rute] || rute;
const faneMinne = Object.fromEntries(FANER_DEF.map((f) => [f.id, `#/${f.rute}`]));
const scrollMinne = new Map();
let forrigeHash = '';
// Fanesidene scroller et indre .hjem-scroll; reise-/vanlige skjermer scroller vinduet.
const aktivScroller = () => document.querySelector('.hjem-scroll') || document.scrollingElement || document.documentElement;

// Husk hvor fanen var, og speil minnet inn i fane-lenkene så et trykk går rett
// dit du var. Bare skjermer som beholder bunnbaren huskes (ikke fokus-flow).
function oppdaterFaneMinne(rute) {
  const fane = faneForRute(rute);
  // Feeden er Hjem-fanens sveip/ikon-destinasjon, ikke dens «hjemsted»: et trykk
  // på Hjem-fanen skal alltid lande på dashbordet (#/hjem), ikke gjenåpne feeden.
  if (FANER.includes(fane) && !FOKUS.has(rute) && rute !== 'feed') faneMinne[fane] = location.hash;
  document.querySelectorAll('.tabbar__knapp').forEach((a) => {
    if (faneMinne[a.dataset.rute]) a.href = faneMinne[a.dataset.rute];
  });
}

// Gjenopprett scroll for en hash (default topp). Re-apply etter layout og litt
// senere for skjermer som fyller innhold async (f.eks. seksjon henter JSON).
// Scroll-hendelsene dette utløser er programmatiske: krymp-lytteren
// (settOppTabKrymp) må ikke tolke dem som «scroll ned» og krympe baren —
// et fanebytte skal ALLTID vise baren i full størrelse, uansett hvor dypt
// fanen sto. Derfor dempes krympingen et lite vindu rundt gjenopprettingen.
let krympStilleTil = 0;
function gjenopprettScroll(hash) {
  const y = scrollMinne.get(hash) || 0;
  const sett = () => { const s = aktivScroller(); if (s) s.scrollTop = y; };
  // Bare dype gjenopprettinger utløser scroll-ned-hendelser som må dempes;
  // y=0 (fersk side / til toppen) fyrer ingen eller en ufarlig opp-hendelse,
  // og skal ikke stjele brukerens første ekte scroll.
  if (y > 0) krympStilleTil = performance.now() + 250; // dekker sett() nå + rAF + 120ms
  sett();
  if (y > 0) { requestAnimationFrame(sett); setTimeout(sett, 120); }
}

// Gamle #/ny?m=STY-lenker (og bokmerker) sendes til riktig bibliotekkategori.
function omdirigerGammelNyLenke() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const kat = MODALITET_TIL_KATEGORI[params.get('m')] || 'styrke';
  location.hash = `#/okter?kat=${kat}`;
}

function navger() {
  const rute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
  // Medlemsgate: uinnlogget → send til innlogging; innlogget som står på en
  // auth-side → slippes videre inn i appen.
  if (!sync.erInnlogget() && !AUTH_RUTER.has(rute)) { location.hash = '#/logg-inn'; return; }
  if (sync.erInnlogget() && AUTH_RUTER.has(rute)) { location.hash = '#/hjem'; return; }
  // Ekte navigasjon (hash endret) lagrer/gjenoppretter scroll; programmatiske
  // redraws (samme hash, f.eks. etter synk) rører den ikke.
  const byttet = location.hash !== forrigeHash;
  if (byttet && forrigeHash) scrollMinne.set(forrigeHash, aktivScroller().scrollTop);
  document.body.classList.toggle('fokusmodus', FOKUS.has(rute));
  document.body.classList.remove('fane-laast'); // settes på nytt av fanesidene
  // Navigasjon vekker en kompakt bar: den vokser tilbake til full størrelse
  // mens linsen glir til ny fane (som Instagram). Å bli stående krympet ga
  // også et origin-hopp når strekk-animasjonen byttet transform-origin.
  vekkTabbar();
  if (rute !== 'kjor' && rute !== 'hurtig') slippVaaken(); // timer-skjermene eier låsen

  const tegn = () => {
    (ruter[rute] || ruter.hjem)();
    oppdaterNav(rute);
    oppdaterFaneMinne(rute);
    oversettDom(app); // engelsk-modus: oversett den nettopp tegnede skjermen
    if (byttet) gjenopprettScroll(location.hash);
  };
  // Sidebytte skal være umiddelbart — ingen skjermanimasjon på innholdet.
  // Det eneste som beveger seg ved navigasjon er slideren i tab-baren nederst,
  // som glir til aktiv fane via sin egen CSS-transisjon (oppdaterNav →
  // flyttTabIndikator inne i tegn()).
  tegn();
  forrigeHash = location.hash;
}

function oppdaterNav(rute) {
  const tabRute = faneForRute(rute);
  document.querySelectorAll('.tabbar__knapp').forEach((b) => {
    b.classList.toggle('tabbar__knapp--aktiv', b.dataset.rute === tabRute);
  });
  flyttTabIndikator();
}

function skjerm(tittel, ...innhold) {
  tom(app);
  app.append(
    el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, tittel)),
    el('main', { class: 'innhold' }, ...innhold),
  );
}

// Fane-skall: banner + dagsfasebilde + pull-to-refresh + stor sidetittel —
// samme førsteinntrykk som Min dag på alle hovedfanene.
function fane(tittel, under, ...innhold) {
  fanesideMedTittel(app, { tittel, under }).append(...innhold);
}

// ===========================================================================
// Hjem (M53) — dagens dashbord. Erstatter feeden som hjem: hilsen, DAGENS TAKT-
// ring (dagens rytme på tvers av pilarene), pilar-brikker, «dagens valg» og
// «dagens fokus». Feeden («dagens feed») nås via feed-ikonet oppe til venstre
// eller ved å sveipe til venstre fra hjem-skjermen.
// ===========================================================================
const HILSEN = { natt: 'God natt', morgen: 'God morgen', formiddag: 'God formiddag', dag: 'God dag', kveld: 'God kveld' };
const DAGENS_FOKUS = [
  'Ta en gåtur ute i naturen i dag.',
  'Spis noe grønt til hvert måltid.',
  'Ring en du er glad i.',
  'Ta fem rolige pust før du står opp.',
  'Stopp ved 80 % metthet i dag.',
  'Kjenn etter: hva gir mening akkurat nå?',
  'Del et måltid med noen.',
];
function isoIdagLokal(nå = Date.now()) {
  const d = new Date(nå);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function visHjemDashboard(mount) {
  const profil = hentProfil();
  if (!profil) { skjerm(APP_NAME, velkommenKort()); return; }

  const fase = dagsfase(new Date().getHours());
  const iDag = isoIdagLokal();
  const dagsnr = Math.floor(Date.now() / 86400000);

  // --- Dagens signaler per pilar ---
  const bevegDag = hentLogg().some((o) => (o.dato || '').slice(0, 10) === iDag);
  const kost = kostStatus();
  const sos = sosialStatus();
  const reflektert = !!ukensRefleksjon();
  const harHvorforNaa = lesHvorfor().length > 0;

  const valg = [
    { rute: 'trening', ikon: 'loper', navn: 'Bevegelse', hint: 'Beveg deg litt', gjort: bevegDag },
    { rute: 'kosthold', ikon: 'eple', navn: 'Mat', hint: 'Mest planter, litt fisk', gjort: kost.iDagAntall > 0 },
    { rute: 'ro', ikon: 'maane', navn: 'Ro', hint: 'Pust, senk skuldrene', gjort: false },
    { rute: 'sosialt', ikon: 'snakke', navn: 'Sosialt', hint: 'Ta kontakt med noen', gjort: sos.iDagAntall > 0 },
    { rute: 'mening', ikon: 'kompass', navn: 'Mening', hint: 'Kjenn ditt hvorfor', gjort: reflektert || harHvorforNaa },
  ];
  // DAGENS TAKT — granulær: snitt av pilarenes dags-fyllingsgrad.
  const grader = [
    bevegDag ? 1 : 0,
    kost.antallVaner ? kost.iDagAntall / kost.antallVaner : 0,
    sos.antallVaner ? sos.iDagAntall / sos.antallVaner : 0,
    reflektert ? 1 : (harHvorforNaa ? 0.5 : 0),
  ];
  const takt = Math.round((grader.reduce((a, b) => a + b, 0) / grader.length) * 100);
  const gjortAntall = valg.filter((v) => v.gjort).length;
  const taktOrd = takt >= 80 ? 'Sterk rytme!' : takt >= 50 ? 'God fremdrift!' : takt > 0 ? 'Godt i gang.' : 'Ny dag, ny takt.';

  // --- Topplinje: feed-ikon (venstre), wordmark, meny (høyre) ---
  const topp = el('header', { class: 'hjemtopp' },
    el('a', { class: 'ikonknapp ikonknapp--plain hjemtopp__feed', href: '#/feed', 'aria-label': 'Dagens feed' },
      ikon('feed')),
    el('span', { class: 'hjemtopp__logo' }, APP_NAME.toLowerCase(), el('span', { class: 'wordmark__prikk' }, '.')),
    el('a', { class: 'ikonknapp ikonknapp--plain', href: '#/meny', 'aria-label': 'Meny' }, ikon('gir')),
  );

  // --- Hilsen + DAGENS TAKT-ring (på dagsfase-bilde) ---
  const pst = el('span', { class: 'taktring__pst' }, '0%');
  const ring = lagRing(52);
  const ringBoks = el('div', { class: 'taktring' }, ring.svg,
    el('div', { class: 'taktring__midt' }, pst, el('span', { class: 'taktring__merkelapp' }, 'Dagens takt')));
  const hero = el('section', { class: `hjemdash__hero hjemdash__hero--${fase}`,
    style: `background-image:url('icons/brand/hero-${fase}.webp')` },
    el('div', { class: 'hjemdash__scrim', 'aria-hidden': 'true' }),
    el('div', { class: 'hjemdash__hilsen' },
      el('h1', { class: 'hjemdash__tittel' }, `${HILSEN[fase]}, ${profil.navn || 'du'}.`),
      el('p', { class: 'hjemdash__under' }, 'God rytme i dag!')),
    ringBoks,
    el('p', { class: 'hjemdash__taktord' }, taktOrd),
  );

  // --- Tre nøkkelbrikker ---
  const brikke = (tall, navn) => el('div', { class: 'taktbrikke' },
    el('span', { class: 'taktbrikke__tall' }, tall),
    el('span', { class: 'taktbrikke__navn' }, navn));
  const brikker = el('div', { class: 'taktbrikker' },
    brikke(`${gjortAntall}/5`, 'pilarer i dag'),
    brikke(`${kost.iDagAntall}/${kost.antallVaner}`, 'mat i dag'),
    brikke(`${sos.iDagAntall}/${sos.antallVaner}`, 'sosialt i dag'),
  );

  // --- Dagens valg (pilar-sjekkliste, hver rad lenker til pilaren) ---
  const valgRader = valg.map((v) => el('a', { class: 'valgrad' + (v.gjort ? ' valgrad--gjort' : ''), href: `#/${v.rute}` },
    el('span', { class: 'valgrad__ikon' }, ikon(v.ikon)),
    el('span', { class: 'valgrad__midt' },
      el('span', { class: 'valgrad__navn' }, v.navn),
      el('span', { class: 'valgrad__hint' }, v.hint)),
    el('span', { class: 'valgrad__sjekk' }, ikon(v.gjort ? 'sjekk' : 'chevron')),
  ));
  const dagensValg = el('section', { class: 'kort hjemdash__valg' },
    el('div', { class: 'hjemdash__valgtopp' },
      el('h2', { class: 'kost__tittel' }, 'Dagens valg'),
      el('span', { class: 'dempet' }, 'Små valg. Stor forskjell.')),
    el('div', { class: 'valgliste' }, ...valgRader),
  );

  // --- Dagens fokus ---
  const dagensFokus = el('section', { class: 'kort hjemdash__fokus' },
    el('span', { class: 'hjemdash__fokusmerke' }, 'Dagens fokus'),
    el('p', { class: 'hjemdash__fokustekst' }, DAGENS_FOKUS[dagsnr % DAGENS_FOKUS.length]),
  );

  // --- Feed-hint + sammensetning ---
  const feedHint = el('a', { class: 'hjemdash__feedhint', href: '#/utforsk' },
    ikon('sok'), el('span', {}, 'Utforsk kunnskap & inspirasjon'), ikon('pilhoyre'));

  tom(mount);
  const scroll = el('div', { class: 'hjemdash-scroll' },
    topp,
    el('main', { class: 'innhold hjemdash' }, hero, brikker, dagensValg, dagensFokus, feedHint),
  );
  mount.append(scroll);

  // Sveip til venstre → dagens feed (uten å stjele vertikal scroll).
  let sx = null; let sy = null;
  scroll.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
  scroll.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const t = e.changedTouches[0]; const dx = t.clientX - sx; const dy = t.clientY - sy; sx = null;
    if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) location.hash = '#/feed';
  }, { passive: true });

  // Animer ring + prosent inn.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ring.sett(takt / 100);
    tallOpp(pst, takt, { format: (n) => `${n}%` });
  }));
}

// ===========================================================================
// Felles pilar-skall (M53) — samme stil som Hjem-dashbordet: hjemtopp-header
// med «<pilar>.»-logo, naturbilde-hero med serif-tittel + valgfri dags-ring,
// og en .hjemdash-beholder for modulene. Brukes av Mat/Bevegelse/Ro/Sosialt så
// pilarene føles som ett system.
// ===========================================================================
function pilarSkall(mount, { navn, tittel, under = null, ring = null }) {
  const fase = dagsfase(new Date().getHours());
  const topp = el('header', { class: 'hjemtopp' },
    el('a', { class: 'ikonknapp ikonknapp--plain hjemtopp__feed', href: '#/feed', 'aria-label': 'Dagens feed' }, ikon('feed')),
    el('span', { class: 'hjemtopp__logo' }, navn, el('span', { class: 'wordmark__prikk' }, '.')),
    el('a', { class: 'ikonknapp ikonknapp--plain', href: '#/meny', 'aria-label': 'Meny' }, ikon('gir')),
  );
  const heroBarn = [
    el('div', { class: 'hjemdash__scrim', 'aria-hidden': 'true' }),
    el('div', { class: 'hjemdash__hilsen' },
      el('h1', { class: 'hjemdash__tittel pilar-hero__tittel' }, tittel),
      under ? el('p', { class: 'hjemdash__under' }, under) : null),
  ];
  let settRing = null; let pstEl = null;
  if (ring) {
    const r = lagRing(46);
    pstEl = el('span', { class: 'taktring__pst' }, '0%');
    heroBarn.push(el('div', { class: 'taktring taktring--pilar' }, r.svg,
      el('div', { class: 'taktring__midt' }, pstEl,
        el('span', { class: 'taktring__merkelapp' }, ring.merkelapp || 'I dag'))));
    settRing = r.sett;
  }
  const hero = el('section', {
    class: `hjemdash__hero hjemdash__hero--${fase} pilar-hero`,
    style: `background-image:url('icons/brand/hero-${fase}.webp')`,
  }, ...heroBarn);
  tom(mount);
  const main = el('main', { class: 'innhold hjemdash' }, hero);
  mount.append(el('div', { class: 'hjemdash-scroll' }, topp, main));
  if (settRing) requestAnimationFrame(() => requestAnimationFrame(() => {
    settRing((ring.pst || 0) / 100);
    tallOpp(pstEl, ring.pst || 0, { format: (n) => `${n}%` });
  }));
  return main;
}

// ===========================================================================
// Utforsk (M53) — kuratert oppdagelse: kunnskap & inspirasjon (artikler),
// snarveier per pilar, og inngang til den spillbare feeden. Nås fra Hjem-
// dashbordet og meny-huben (ikke en egen fane).
// ===========================================================================
function visUtforskSkjerm(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }

  const PILAR_LENKER = [
    { rute: 'kosthold', ikon: 'eple', navn: 'Mat' },
    { rute: 'trening', ikon: 'loper', navn: 'Bevegelse' },
    { rute: 'ro', ikon: 'maane', navn: 'Ro' },
    { rute: 'sosialt', ikon: 'snakke', navn: 'Sosialt' },
    { rute: 'mening', ikon: 'kompass', navn: 'Mening' },
  ];
  const pilarRad = el('div', { class: 'utforsk-pilarer' },
    ...PILAR_LENKER.map((p) => el('a', { class: 'utforsk-pilar', href: `#/${p.rute}` },
      el('span', { class: 'utforsk-pilar__ikon' }, ikon(p.ikon)),
      el('span', { class: 'utforsk-pilar__navn' }, p.navn))));

  const feedInngang = el('a', { class: 'utforsk-feed', href: '#/feed' },
    el('span', { class: 'utforsk-feed__ikon' }, ikon('feed')),
    el('span', { class: 'utforsk-feed__midt' },
      el('span', { class: 'utforsk-feed__navn' }, 'Dagens feed'),
      el('span', { class: 'utforsk-feed__hint' }, 'Spillbar kunnskap — ett kort av gangen')),
    ikon('pilhoyre'));

  const kunnskap = el('div', { class: 'utforsk-grid' }, el('p', { class: 'dempet' }, 'Laster…'));

  skjerm('Utforsk',
    el('p', { class: 'utforsk-under' }, 'Kunnskap og inspirasjon for gode år.'),
    el('section', { class: 'kort' }, el('h2', { class: 'kost__tittel' }, 'Les etter pilar'), pilarRad),
    el('section', { class: 'utforsk-seksjon' },
      el('h2', { class: 'utforsk-seksjontittel' }, 'Kunnskap & inspirasjon'), kunnskap),
    el('section', { class: 'kort' }, el('h2', { class: 'kost__tittel' }, 'Dagens feed'), feedInngang),
  );

  hentSprakJson('artikler').then((data) => {
    const arr = Array.isArray(data) ? data : (data?.artikler || []);
    const sortert = arr.slice().sort((a, b) => String(b.dato).localeCompare(String(a.dato)));
    tom(kunnskap);
    for (const a of sortert.slice(0, 6)) {
      const bg = a.bilde ? `background-image:url('bilder/artikler/${a.bilde}.webp')` : '';
      kunnskap.append(el('a', { class: 'utforsk-art', href: `#/artikkel?id=${encodeURIComponent(a.id)}` },
        el('span', { class: 'utforsk-art__bilde', style: bg, 'aria-hidden': 'true' }),
        el('span', { class: 'utforsk-art__skygge', 'aria-hidden': 'true' }),
        el('span', { class: 'utforsk-art__tekst' },
          el('span', { class: 'utforsk-art__tag' }, (a.tags && a.tags[0]) || 'Les'),
          el('span', { class: 'utforsk-art__tittel' }, a.tittel))));
    }
    oversettDom(kunnskap);
  }).catch(() => { tom(kunnskap); kunnskap.append(el('p', { class: 'dempet' }, 'Kunne ikke laste akkurat nå.')); });
}

// ===========================================================================
// Kosthold (Fase 3) — blue-zones-spising som daglige HANDLINGER, ikke tall.
// Dagens gode vaner hukes av (grønt/belgvekster/fullkorn/fisk/måtehold), gir XP
// og bygger en egen kosthold-streak (atskilt fra bevegelse). Valgfritt kort
// måltidsnotat. Gjenbruker XP-nivået, flammefeiringen og «Lær»-artiklene.
// ===========================================================================
function visKostholdSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { skjerm('Kosthold', velkommenKort()); return; }
  const iDag = dagensInnslag() || { vaner: {}, notat: '' };

  const tegnStatus = () => {
    const s = kostStatus();
    const stat = (tall, navn) => el('div', { class: 'koststat' },
      el('span', { class: 'koststat__tall' }, String(tall)),
      el('span', { class: 'koststat__navn' }, navn));
    return el('div', { class: 'koststatus' },
      stat(s.streak, 'dager på rad'),
      stat(`${s.iDagAntall}/${s.antallVaner}`, 'gode valg i dag'),
      stat(s.ukeAktive, 'aktive dager'));
  };
  let statusBoks = tegnStatus();

  const chips = VANER.map((v) => {
    const c = el('button', {
      class: 'intchip' + (iDag.vaner?.[v.id] ? ' intchip--valgt' : ''), type: 'button',
      onclick: async () => {
        const res = veksleVane(v.id);
        if (!res) return;
        c.classList.toggle('intchip--valgt', res.aktiv);
        if (res.aktiv) { vibrer(); varsle(`+${res.xp} XP`, { ikon: 'blad' }); }
        const ny = tegnStatus(); statusBoks.replaceWith(ny); statusBoks = ny;
        if (res.streakØkte > 0) await streakEtter(res); // flammefeiring, én gang/dag
      },
    }, v.navn);
    return c;
  });

  const vaneKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Gode valg i dag'),
    el('p', { class: 'dempet' }, 'Blue zones-kjøkkenet: mest planter, litt fisk, og stopp når du er rundt 80 % mett.'),
    el('div', { class: 'kostchips' }, ...chips));

  const notat = el('textarea', { class: 'kostnotat', rows: '2', placeholder: 'Hva spiste du i dag? (valgfritt)' });
  notat.value = iDag.notat || '';
  notat.addEventListener('blur', (e) => settNotat(e.target.value));
  const notatKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Dagens måltider'),
    notat);

  const laerLenke = el('a', { class: 'kostlenke', href: '#/laer' },
    ikon('bok', 'ikon ikon--liten'), el('span', {}, 'Lær mer om blue zones-kosthold'));

  const s0 = kostStatus();
  const main = pilarSkall(mount, {
    navn: 'mat', tittel: 'Mest planter. Litt fisk.', under: 'Måtehold — stopp ved 80 %.',
    ring: { pst: s0.antallVaner ? Math.round((s0.iDagAntall / s0.antallVaner) * 100) : 0, merkelapp: 'gode valg i dag' },
  });
  main.append(statusBoks, vaneKort, notatKort, laerLenke);
}

// ===========================================================================
// Ro (Fase 4) — mindfulness/pust som egen pilar. Samler de rolige øktene
// (pust + restitusjon) og starter dem i den vanlige øktspilleren (kjor.js), så
// pust, tempo og lyd virker som ellers. Feeden dekker «ro»-pilaren via mind-
// innleggene; her er de kroppslige øvelsene.
// ===========================================================================
const RO_PUST = new Set(['restitusjon-lav-lett', 'restitusjon-medium-lett', 'restitusjon-hoy-lett']);
function visRoSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { skjerm('Ro', velkommenKort()); return; }
  const okter = hentOkter()
    .filter((o) => o.kategori === 'restitusjon')
    .sort((a, b) => (RO_PUST.has(b.id) - RO_PUST.has(a.id)) || (a.varighetMin - b.varighetMin));

  const intro = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Pust deg rolig'),
    el('p', { class: 'dempet' }, 'Noen minutter bevisst pust senker stress og roer nervesystemet. Velg en øvelse — den spilles med rolig tempo og lyd.'));

  // Rolige økter/pust skal alltid kunne startes fritt (aldri låst bak «lær
  // øvelsene først»), så vi sender en ulåst status til aapneOkt.
  const kort = okter.map((o) => el('button', { class: 'rokort', type: 'button', onclick: () => aapneOkt(o, { laast: false }) },
    el('span', { class: 'rokort__ikon' }, ikon(RO_PUST.has(o.id) ? 'hjerte' : 'maane')),
    el('span', { class: 'rokort__midt' },
      el('span', { class: 'rokort__navn' }, o.navn),
      el('span', { class: 'rokort__meta' }, `${o.varighetMin} min`)),
    ikon('play', 'ikon rokort__play')));

  const main = pilarSkall(mount, {
    navn: 'ro', tittel: 'Pust. Senk skuldrene.', under: 'Vær her — noen rolige minutter.',
  });
  main.append(intro, el('div', { class: 'roliste' }, ...kort));
}

// ===========================================================================
// Sosialt (Fase 5, kommer) — tilhørighet er en av de sterkeste blue-zones-
// faktorene. Foreløpig en «kommer snart»-flate som holder pilaren synlig i
// bunnlinja; ekte arrangementer (frivillig.no/kommune/DNT) + nudges bygges senere.
// ===========================================================================
function visSosialtSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { skjerm('Sosialt', velkommenKort()); return; }
  const iDag = sosDagensInnslag() || { vaner: {} };

  const tegnStatus = () => {
    const s = sosialStatus();
    const stat = (tall, navn) => el('div', { class: 'koststat' },
      el('span', { class: 'koststat__tall' }, String(tall)),
      el('span', { class: 'koststat__navn' }, navn));
    return el('div', { class: 'koststatus' },
      stat(s.streak, 'dager på rad'),
      stat(`${s.iDagAntall}/${s.antallVaner}`, 'gode valg i dag'),
      stat(s.ukeAktive, 'aktive dager'));
  };
  let statusBoks = tegnStatus();

  const chips = SOSIALE_VANER.map((v) => {
    const c = el('button', { class: 'intchip' + (iDag.vaner?.[v.id] ? ' intchip--valgt' : ''), type: 'button',
      onclick: async () => {
        const res = sosVeksleVane(v.id);
        if (!res) return;
        c.classList.toggle('intchip--valgt', res.aktiv);
        if (res.aktiv) { vibrer(); varsle(`+${res.xp} XP`, { ikon: 'hjerte' }); }
        const ny = tegnStatus(); statusBoks.replaceWith(ny); statusBoks = ny;
        if (res.streakØkte > 0) await streakEtter(res);
      } }, v.navn);
    return c;
  });

  const intro = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Tilhørighet holder deg frisk'),
    el('p', { class: 'dempet' }, 'På Okinawa kalles det «moai» — en fast gjeng du hører til hele livet. Sterke bånd til andre er blant de kraftigste faktorene for et langt liv. Huk av de gode sosiale valgene dine i dag.'),
    el('div', { class: 'kostchips' }, ...chips));

  const kilderBoks = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Finn møteplasser i nærheten'),
    el('div', { class: 'roliste sosialkilder' }, el('p', { class: 'dempet' }, 'Laster…')));

  const s0 = sosialStatus();
  const main = pilarSkall(mount, {
    navn: 'sosialt', tittel: 'Vi lever lengre sammen.', under: 'Tilhørighet holder deg frisk.',
    ring: { pst: s0.antallVaner ? Math.round((s0.iDagAntall / s0.antallVaner) * 100) : 0, merkelapp: 'gode valg i dag' },
  });
  main.append(statusBoks, intro, kilderBoks);

  // Kuraterte, ekte norske møteplass-kilder (offline-cachet data, ingen scraping
  // eller CORS): frivillig.no, DNT, frisklivssentral, kommunekalender + dytt.
  hentSprakJson('arrangement').then((liste) => {
    const holder = kilderBoks.querySelector('.sosialkilder');
    if (!holder) return;
    tom(holder);
    for (const a of liste) {
      const midt = el('span', { class: 'rokort__midt' },
        el('span', { class: 'rokort__navn' }, a.navn),
        el('span', { class: 'rokort__meta' }, a.beskrivelse));
      const ikonBoks = el('span', { class: 'rokort__ikon' }, ikon(a.ikon || 'snakke'));
      if (a.url) {
        holder.append(el('a', { class: 'rokort', href: a.url, target: '_blank', rel: 'noopener' },
          ikonBoks, midt, ikon('pilhoyre', 'ikon rokort__play')));
      } else {
        holder.append(el('div', { class: 'rokort rokort--flat' }, ikonBoks, midt));
      }
    }
    oversettDom(holder);
  }).catch(() => { const h = kilderBoks.querySelector('.sosialkilder'); if (h) tom(h); });
}

// ===========================================================================
// Trening (Min dag) — Mova-dashbord: hvit banner med header + ukeskalender
// (buet underkant — resten av siden ligger som underlag), tre statistikk-kort
// (dagens minutter, ukas aktive dager, nivå/XP) og bevegelsesgrid. Heroen
// samler dagens budskap: planlagt økt, positiv kvittering, eller «Vi
// anbefaler»-boksen fra anbefalingsmotoren; streaken vises som kompakt flamme.
// Bodde på Hjem-fanen frem til M37 — nå er feeden hjem og dette Trening.
// ===========================================================================

function isoDato(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dg = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dg}`;
}

// Dagsmål i minutter, avledet av foretrukket varighetsklasse.
const DAGSMAAL = { mikro: 10, kort: 20, standard: 40, lang: 60 };

function visTrening() {
  const profil = hentProfil();
  if (!profil) {
    skjerm(APP_NAME, velkommenKort());
    return;
  }
  const logg = hentLogg();
  const nå = Date.now();
  const idagIso = isoDato(new Date(nå));
  const minutter = logg
    .filter((o) => (o.dato || '').slice(0, 10) === idagIso)
    .reduce((s, o) => s + (o.varighetMin || 0), 0);
  const maal = DAGSMAAL[profil.varighetsklasse] || 40;
  const planer = planForDato(idagIso);

  // Samme skall som Hjem: «bevegelse.»-header + naturbilde-hero med en ring for
  // dagens minutter mot dagsmålet. Modulene (plan/anbefaling, statkort, øvelses-
  // grid) beholder all funksjonalitet.
  const main = pilarSkall(app, {
    navn: 'bevegelse', tittel: 'Beveg deg litt hver dag.',
    under: minutter > 0 ? `${minutter} minutter i dag — bra jobba.` : 'Små økter teller.',
    ring: { pst: Math.min(100, Math.round((minutter / maal) * 100)), merkelapp: 'av dagsmålet' },
  });
  main.append(
    el('section', { class: 'kort hjemdash__beveg' },
      planer.length ? heroPlanBoks(planer[0]) : heroAnbefalBoks(logg, profil)),
    statKortRad(profil, logg),
    el('section', {}, seksjonsHode(), bevegelsesGrid()),
  );
}

const KAT_IKON = Object.fromEntries(KATEGORIER.map((k) => [k.id, k.ikon]));

// Scorer alle synlige bibliotekøkter ut fra restitusjon + preferanser, sortert
// best først. `fit` = deknings-vektet snitt-ferskhet av øktas målmuskler, MINUS
// en straff for hvor stor del av økta som treffer allerede-røde muskler (>0.5
// belastning). Slik unngår vi at en helkropps-/bein-økt som hamrer trette ben
// vinner bare fordi den også så vidt treffer ferske muskler. Ganges med
// preferanse-multiplikator + varighets-/skill-vekt. Skjulte former (mult 0)
// hoppes over; økter uten muskeldekning (kondisjon) får nøytral fit så de kan
// løftes av mult.
function skaarOkter(scores, profil) {
  const malMin = DAGSMAAL[profil?.varighetsklasse] || 40;
  const ut = [];
  for (const okt of hentOkter()) {
    const mult = prefMult(profil, okt.kategori);
    if (mult === 0) continue; // skjult form
    const andel = regionAndelForOkt(okt);
    let wsum = 0;
    let dekning = 0;
    let roedDekning = 0;
    for (const r in andel) {
      const load = scores[r] ?? 0;
      wsum += andel[r] * (1 - load);
      dekning += andel[r];
      if (load > 0.5) roedDekning += andel[r];
    }
    // Deknings-vektet snitt-ferskhet minus rød-straff; nøytral 0.35 for økter
    // uten muskeldekning (kondisjon) — lavere enn en fersk-fokusert økt, så de
    // vinner bare når alt er rødt (da faller de muskeldekkede mot 0).
    const fit = dekning > 0
      ? Math.max(0, wsum / dekning - 0.5 * (roedDekning / dekning))
      : 0.35;
    const varfit = 0.6 + 0.4 * (1 - Math.min(1, Math.abs((okt.varighetMin || malMin) - malMin) / malMin));
    const skillvekt = okt.skill === 'hoy' ? 0.7 : 1; // mild «unngå Erfaren» (ingen bruker-skill finnes)
    ut.push({ okt, score: fit * mult * varfit * skillvekt });
  }
  return ut.sort((a, b) => b.score - a.score);
}

// Topp-n anbefalte økter med ÉN økt per kategori — så man blar mellom ulike
// treningsformer (variasjon), ikke tre varianter av samme form.
function anbefalteOkter(scores, profil, n = 3) {
  const sett = new Set();
  const ut = [];
  for (const { okt } of skaarOkter(scores, profil)) {
    if (sett.has(okt.kategori)) continue;
    sett.add(okt.kategori);
    ut.push(okt);
    if (ut.length === n) break;
  }
  return ut;
}

function anbefaltOkt(scores, profil) {
  return anbefalteOkter(scores, profil, 1)[0] || null;
}

// Begrunnelse tett på valgt økt: navngi de ferske musklene økta treffer mest.
function oktBegrunnelse(okt, scores, anbef) {
  const andel = regionAndelForOkt(okt);
  const ferske = Object.entries(andel)
    .filter(([r, a]) => a >= 0.5 && (scores[r] ?? 0) < 0.4)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 2)
    .map(([r]) => (REGION_NAVN[r] || r).toLowerCase());
  if (ferske.length === 2) return `Treffer ${ferske[0]} og ${ferske[1]}, som er klare i dag.`;
  if (ferske.length === 1) return `Treffer ${ferske[0]}, som er klar i dag.`;
  return anbef.tekst; // kondisjon/mobilitet eller lite muskelsignal → fall tilbake
}

// ===========================================================================
// Velkomst-hero: hilsen + budskap oppå dagsfasebildet, med statkortene
// delvis over bildet som fader ut mot underlaget. Tre budskap: planlagt økt
// (boks), «noe gjort — mer?» (gnist-pille), eller et åpent spørsmål.
// ===========================================================================
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
    // Trent litt, men ikke nådd dagsmålet → samme anbefaling (karusellen) som ved
    // 0 min, med en positiv kvittering over. Aldri skam — alltid anerkjenn innsats.
    budskap = el('div', {},
      el('p', { class: 'hjemhero__melding' }, `${minutter} minutter i boks. Vil du legge på litt til?`),
      heroAnbefalBoks(logg, profil),
    );
  } else {
    // Ingenting planlagt og ingenting påbegynt → anbefalingsmotoren fyller
    // heroen med den samme «Vi anbefaler»-karusellen.
    budskap = heroAnbefalBoks(logg, profil);
  }

  // Kompakt streak øverst til høyre: flamme + tall. Skjules ved 0. En svak puls
  // når man ikke har trent i dag (streaken «i fare») dulter mot å holde den i live.
  const streak = beregnStreak(logg);
  const trentIdag = minutter > 0;

  return el('section', { class: `hjemhero hjemhero--${fase}` },
    el('div', { class: 'hjemhero__innhold' },
      streak >= 1 && el('a', {
        class: 'streakflamme' + (trentIdag ? '' : ' streakflamme--fare'),
        href: '#/merker',
        'aria-label': `${streak} ${streak === 1 ? 'dags' : 'dagers'} streak`,
      }, ikon('flamme'), el('span', { class: 'streakflamme__tall' }, String(streak))),
      navn
        ? [el('p', { class: 'hjemhero__hilsen' }, hilsen, ','), el('h1', { class: 'hjemhero__navn' }, navn)]
        : el('h1', { class: 'hjemhero__navn hjemhero__navn--hilsen' }, hilsen),
      budskap,
    ),
    statKortRad(profil, logg, true),
  );
}

// «Vi anbefaler»-boks i heroen: speiler heroPlanBoks (frostet glass). Viser de
// tre beste øktene fra anbefalingsmotoren (restitusjonsbehov + preferanser) som
// en sveipbar karusell med nummererte sirkler (1-2-3). Hver slide har sin egen
// info-«i» som lenker (blått) til restitusjons-widgeten og prioriteringene.
function anbefalingSlide(okt, scores, anbef) {
  const hjelp = el('p', { class: 'restitusjonskort__hjelp', hidden: true },
    'Valgt ut fra ',
    el('a', { class: 'tekstlenke', href: '#/merker?vis=restitusjon' }, 'restitusjonsbehov'),
    ' og preferansene dine. Juster ',
    el('a', { class: 'tekstlenke', href: '#/innstillinger' }, 'prioriteringene'),
    ' i Innstillinger.');
  const info = el('button', {
    class: 'restitusjonskort__info hjemhero__planinfo', type: 'button', 'aria-label': 'Hvorfor denne økta?',
    onclick: () => { hjelp.hidden = !hjelp.hidden; },
  }, ikon('info'));

  return el('div', { class: 'hjemhero__slide' },
    el('div', { class: 'hjemhero__planrad' },
      el('span', { class: 'hjemhero__plandisk' }, ikon(KAT_IKON[okt.kategori] || 'vekt')),
      el('div', { class: 'hjemhero__planmeta' },
        el('span', { class: 'hjemhero__planeyebrow' }, 'Vi anbefaler'),
        el('span', { class: 'hjemhero__plantittel' }, okt.navn),
        el('span', { class: 'hjemhero__planbegrunn' }, oktBegrunnelse(okt, scores, anbef)),
      ),
      info,
    ),
    hjelp,
    el('div', { class: 'hjemhero__planbunn' },
      el('span', { class: 'hjemhero__plantid' }, ikon('klokke', 'ikon ikon--liten'),
        `${okt.varighetMin} min · ${KATEGORI_NAVN[okt.kategori]}`),
      el('a', { class: 'hjemhero__knapp', href: `#/okter?start=${okt.id}` }, 'Start økt'),
    ),
  );
}

function heroAnbefalBoks(logg, profil) {
  const scores = regionScores(logg);
  const anbef = anbefalingFraRegioner(scores); // fallback-tekst når ingen økt
  const okter = anbefalteOkter(scores, profil, 3);

  // Ingen synlig økt (alt skjult) → samme fallback som før: tekst + «Se økter».
  if (!okter.length) {
    return el('div', { class: 'hjemhero__plan' },
      el('div', { class: 'hjemhero__planrad' },
        el('span', { class: 'hjemhero__plandisk' }, ikon('vekt')),
        el('div', { class: 'hjemhero__planmeta' },
          el('span', { class: 'hjemhero__planeyebrow' }, 'Vi anbefaler'),
          el('span', { class: 'hjemhero__plantittel' }, anbef.tekst),
        ),
      ),
      el('div', { class: 'hjemhero__planbunn' },
        el('span', { class: 'hjemhero__plantid' }, ikon('klokke', 'ikon ikon--liten'), anbef.varighet),
        el('a', { class: 'hjemhero__knapp', href: `#/okter?kat=${anbef.kat}` }, 'Se økter'),
      ),
    );
  }

  // Bare én synlig form → én slide, ingen karusell/prikker.
  if (okter.length === 1) {
    return el('div', { class: 'hjemhero__plan' }, anbefalingSlide(okter[0], scores, anbef));
  }

  const karusell = el('div', { class: 'hjemhero__karusell' },
    ...okter.map((okt) => anbefalingSlide(okt, scores, anbef)));
  const prikker = okter.map((_, i) => el('button', {
    class: 'hjemhero__prikk' + (i === 0 ? ' hjemhero__prikk--aktiv' : ''),
    type: 'button', 'aria-label': `Vis anbefaling ${i + 1}`,
    onclick: () => karusell.scrollTo({ left: i * karusell.clientWidth, behavior: REDUSERT() ? 'auto' : 'smooth' }),
  }, String(i + 1)));
  karusell.addEventListener('scroll', () => {
    const i = Math.round(karusell.scrollLeft / karusell.clientWidth);
    prikker.forEach((p, j) => p.classList.toggle('hjemhero__prikk--aktiv', j === i));
  });

  return el('div', { class: 'hjemhero__plan hjemhero__plan--karusell' },
    karusell,
    el('div', { class: 'hjemhero__prikker' }, ...prikker),
  );
}

// Viser en planlagt økt: nye planer peker på en bibliotekøkt (oktId), gamle
// bærer modalitet — begge får tittel, varighet og en startlenke.
function planVisning(p) {
  // Lær-modul (f.eks. et nytt uteksaminerings-forsøk) — peker inn i reisen og
  // åpner rett enhets-økt via &uteks=.
  if (p.type === 'uteks' && p.sti) {
    return {
      tittel: p.tittel || 'Uteksaminering',
      kortTittel: p.tittel || 'Uteksaminering',
      href: `#/seksjon?id=${encodeURIComponent(p.sti)}${p.enhet ? `&uteks=${encodeURIComponent(p.enhet)}` : ''}`,
    };
  }
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

  // Tallene teller opp (i takt med at barene fyller) — dashbordet «våkner».
  const minTall = el('span', { class: 'statkort__tall' }, '0');
  const aktiveTall = el('span', { class: 'statkort__tall' }, '0');
  const xpTall = el('span', { class: 'statkort__tall statkort__tall--xp' }, '0');

  const rad = el('div', { class: 'statkort-rad' + (glass ? ' statkort-rad--glass' : '') },
    el('div', { class: 'statkort' },
      el('span', { class: 'statkort__label' }, 'Minutter i dag'),
      el('div', { class: 'statkort__midt' },
        minTall,
        el('span', { class: 'statkort__ikon' }, ikon('klokke')),
      ),
      el('span', { class: 'statkort__sub' }, `/${maal} min`),
      el('div', { class: 'xpbar statkort__bar' }, minBar),
    ),
    el('div', { class: 'statkort' },
      el('span', { class: 'statkort__label' }, 'Aktive dager'),
      el('div', { class: 'statkort__midt' },
        aktiveTall,
        el('span', { class: 'statkort__ikon' }, ikon('kalender')),
      ),
      el('span', { class: 'statkort__sub' }, '/7 dager'),
      el('div', { class: 'statkort__prikker' },
        ...dager.map((m) => el('i', { class: 'statkort__prikk' + (m > 0 ? ' statkort__prikk--aktiv' : '') })),
      ),
    ),
    el('a', { class: 'statkort', href: '#/merker' },
      el('span', { class: 'statkort__label' }, `Nivå ${info.niva}`),
      el('div', { class: 'statkort__midt' },
        el('span', { class: 'stathex' }, 'M'),
        xpTall,
      ),
      el('span', { class: 'statkort__sub' }, 'XP til neste nivå'),
      el('div', { class: 'xpbar statkort__bar' }, xpBar),
    ),
  );
  tallOpp(minTall, minutter, { ms: 600 });
  tallOpp(aktiveTall, aktive, { ms: 500 });
  tallOpp(xpTall, info.igjen, { ms: 700 });
  return rad;
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
      location.hash = o ? `#/okter?start=${o.id}` : '#/okter';
    },
  }, ...flisInnhold('terning', 'Overrask meg'));
  const grid = el('div', { class: 'movgrid' }, ...HJEM_FLISER.map((f) => flis(...f)), overrask);
  return grid; // fliser vises umiddelbart — ingen inngangsanimasjon ved sidebytte
}

// Streak (sammenhengende dager med bevegelse) bor nå i js/bevegelse.js —
// beregnStreak deles med feiringslaget (streak-økning → «Jeg er dedikert»).

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
// Styrke & fremgang — oversikt på tvers av alle løft (M17)
// ===========================================================================
function visStyrke() {
  const alle = alleØvelser();
  const t = tonnasje();
  if (!alle.length) {
    fane('Styrke', 'Vekt, sett og fremgang — samlet.',
      el('div', { class: 'kort tomstyrke' },
        el('span', { class: 'tomstyrke__disk' }, ikon('vekt')),
        el('p', { class: 'oppmuntring__tittel' }, 'Ingen løft logget ennå'),
        el('p', { class: 'dempet' }, 'Kjør en styrkeøkt og skriv inn vekt og reps underveis — så dukker fremgangen din opp her.'),
        el('a', { class: 'knapp', href: '#/okter?kat=styrke' }, 'Finn en styrkeøkt'),
      ),
    );
    return;
  }
  const muskel = muskelVolum((n) => ovelseInfo(n)?.muskler || []);
  const maxMuskel = Math.max(...muskel.map((m) => m.kg), 1);
  fane('Styrke', `${t.total.toLocaleString('nb-NO')} kg løftet totalt`,
    el('div', { class: 'kort' },
      el('h2', {}, 'Tonnasje per økt'),
      el('div', { class: 'histgraf' }, lagLinjegraf(t.serie.map((s) => s.volum), { hoyde: 110 })),
      el('p', { class: 'histgraf__merk' }, `${t.okter} økter · ${t.total.toLocaleString('nb-NO')} kg til sammen`),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Rekorder (est. 1RM)'),
      el('div', { class: 'prvegg' }, ...alle.slice(0, 8).map((o) => el('a', { class: 'prkort', href: `#/ovelse?n=${encodeURIComponent(o.navn)}` },
        el('span', { class: 'prkort__verdi' }, `${o.e1rm} kg`),
        el('span', { class: 'prkort__navn' }, o.navn),
        el('span', { class: 'prkort__sub' }, `tyngste ${o.toppVekt} kg · ${o.okter} ${o.okter === 1 ? 'økt' : 'økter'}`),
      ))),
    ),
    muskel.length > 0 && el('div', { class: 'kort' },
      el('h2', {}, 'Volum per muskelgruppe'),
      ...muskel.slice(0, 8).map((m) => el('div', { class: 'muskelrad' },
        el('span', { class: 'muskelrad__navn' }, m.navn),
        el('span', { class: 'muskelrad__bar' }, el('i', { class: 'muskelrad__fyll', style: `width:${Math.round((m.kg / maxMuskel) * 100)}%` })),
        el('span', { class: 'muskelrad__kg' }, `${m.kg.toLocaleString('nb-NO')} kg`),
      )),
    ),
  );
}

// --- Temaer (CSS-paletter, se app.css) — alle fritt tilgjengelige -----------
const TEMAER = [
  { id: 'standard', navn: `${APP_NAME} (standard)`, prikk: '#008382' },
  { id: 'mork', navn: 'Marine', prikk: '#11264D' },
  { id: 'midnatt', navn: 'Midnatt', prikk: '#2E8FE0' },
  { id: 'glod', navn: 'Glød', prikk: '#E8853D' },
  { id: 'oliven', navn: 'Oliven', prikk: '#7E9C2E' },
  { id: 'nordlys', navn: 'Nordlys', prikk: '#8B5CF6' },
  { id: 'rodglod', navn: 'Rødglød', prikk: '#FF6F61' },
  { id: 'papir', navn: 'Papir (varm)', prikk: '#E8E2D9' },
  { id: 'mono', navn: 'Mono', prikk: '#3C4660' },
  { id: 'gull', navn: 'Gull', prikk: '#B08D2A' },
];

// Varsler (bak bjella): en avledet feed av fullførte økter, nivå-opp og
// opptjente merker (js/varsler.js). Å åpne skjermen markerer alt som sett, så
// prikken på bjella forsvinner ved neste tegning.
function visVarsler() {
  const profil = hentProfil();
  if (!profil) { location.hash = '#/hjem'; return; }
  const feed = byggVarsler();

  const innhold = feed.length
    ? el('div', { class: 'varselliste' }, ...feed.map(varselKort))
    : el('div', { class: 'kort tomstyrke' },
        el('span', { class: 'tomstyrke__disk' }, ikon('bjelle')),
        el('p', { class: 'oppmuntring__tittel' }, 'Ingen varsler ennå'),
        el('p', { class: 'dempet' }, 'Fullfør en økt, så dukker den opp her — sammen med nivå-opp og nye merker.'),
        el('a', { class: 'knapp', href: '#/beveg' }, 'Finn en økt'),
      );

  skjerm('Varsler', innhold);
  merkVarslerSett(feed[0]?.ts); // alt som vises nå (feeden er nyeste-først) regnes som sett
}

// Meny-hub bak tannhjulet: bare en liste med snarveier. «Innstillinger» her er
// en vanlig lenke til innstillings-kortene (#/innstillinger), som nå er en
// subside av denne huben. Full faneside (banner) så tannhjulet kan vises aktivt.
function visMeny() {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  const lenke = (ikonNavn, tekst, href) => el('a', { class: 'listerad', href },
    el('span', { class: 'listerad__ikon' }, ikon(ikonNavn)),
    el('span', { class: 'listerad__navn' }, tekst),
    el('span', { class: 'listerad__chevron' }, ikon('chevron')),
  );
  // Treningssnarveiene (styrke, øvelsesoppslag, aktivitet) bor nå under
  // Trening-området på Profil — menyen er kun innstillinger og oppslag om appen.
  fane('Meny', 'Innstillinger og om appen.',
    el('div', { class: 'kort' },
      el('div', { class: 'liste' },
        lenke('sok', 'Utforsk', '#/utforsk'),
        lenke('kompass', 'Mitt hvorfor', '#/mening'),
        lenke('person', 'Profil', '#/merker'),
        lenke('bok', 'Lær', '#/laer'),
        lenke('gir', 'Innstillinger', '#/innstillinger'),
        lenke('info', `Om ${APP_NAME}`, '#/om'),
      ),
    ),
  );
}

// ===========================================================================
// Mening (Fase 6) — «Mitt hvorfor» som motivasjons-spine, ikke en fane. Her
// erklærer du 1–3 personlige grunner (ikigai/nordstjerner) som pakker inn hele
// belønningsloopen: feiringen refererer til ditt hvorfor, og en rolig ukentlig
// refleksjon bygger en privat meningsdagbok. Nås fra meny-huben og Profil.
// ===========================================================================
function visMeningSkjerm(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  const tegnPåNytt = () => visMeningSkjerm(mount);

  const hvorfor = lesHvorfor();

  // --- Mine hvorfor ---
  const hvorforListe = el('div', { class: 'hvorforliste' },
    ...hvorfor.map((h) => el('div', { class: 'hvorforkort' },
      el('span', { class: 'hvorforkort__ikon' }, ikon('kompass')),
      el('span', { class: 'hvorforkort__tekst' }, h.tekst),
      el('button', {
        class: 'hvorforkort__slett', type: 'button', 'aria-label': 'Fjern',
        onclick: () => { slettHvorfor(h.id); tegnPåNytt(); },
      }, ikon('kryss')),
    )),
    hvorfor.length ? null : el('p', { class: 'dempet' }, 'Skriv ned grunnen din — det du kommer tilbake til når dagen er tung.'),
  );

  const komponerKort = () => {
    const ta = el('textarea', { class: 'kostnotat hvorfor__inn', rows: '2', maxlength: '120', placeholder: 'Jeg vil …' });
    const promptRad = el('div', { class: 'chiprad chiprad--pille hvorfor__prompter' },
      ...STARTSPORSMAL.map((p) => el('button', {
        class: 'chip chip--dempet', type: 'button',
        onclick: () => { ta.placeholder = p.sporsmal; ta.focus(); },
      }, p.sporsmal)));
    const knapp = el('button', { class: 'knapp', type: 'button',
      onclick: () => {
        const ny = leggTilHvorfor(ta.value);
        if (!ny) { varsle('Skriv noe kort først', { ikon: 'kompass' }); return; }
        vibrer(); varsle('Lagt til', { ikon: 'kompass' });
        tegnPåNytt();
      } }, 'Legg til');
    return el('section', { class: 'kort' },
      el('h2', { class: 'kost__tittel' }, hvorfor.length ? 'Legg til et hvorfor til' : 'Skriv ditt hvorfor'),
      el('p', { class: 'dempet', style: 'margin-top:-4px' }, 'La deg inspirere av et spørsmål — eller skriv helt fritt.'),
      promptRad, ta, el('div', { class: 'hvorfor__handling' }, knapp));
  };

  const mineKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Mitt hvorfor'),
    el('p', { class: 'dempet', style: 'margin-top:-4px' },
      'På Okinawa kaller de det ikigai — grunnen til at du står opp om morgenen. Et tydelig hvorfor er blant de sterkeste kreftene for et langt, godt liv. De små valgene dine peker hit.'),
    hvorforListe);

  // --- Ukens refleksjon ---
  const uke = ukensRefleksjon();
  const refl = el('textarea', { class: 'kostnotat', rows: '3', maxlength: '280',
    placeholder: 'Hva føltes mest meningsfullt denne uka?' });
  refl.value = uke?.tekst || '';
  const reflLagre = el('button', { class: 'knapp', type: 'button',
    onclick: () => {
      settRefleksjon(refl.value);
      vibrer(); varsle('Refleksjon lagret', { ikon: 'blad' });
      tegnPåNytt();
    } }, uke ? 'Oppdater' : 'Lagre refleksjonen');
  const reflKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Ukens refleksjon'),
    el('p', { class: 'dempet', style: 'margin-top:-4px' },
      'Ett rolig øyeblikk i uka — ikke en oppgave. Hva av det du gjorde betydde noe?'),
    refl, el('div', { class: 'hvorfor__handling' }, reflLagre));

  // --- Meningsdagbok (tidligere refleksjoner) ---
  const tidligere = lesRefleksjoner().filter((r) => r.uke !== (uke?.uke));
  const dagbokKort = tidligere.length ? el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Meningsdagbok'),
    el('div', { class: 'meningsdagbok' },
      ...tidligere.map((r) => el('div', { class: 'dagbokrad' },
        el('span', { class: 'dagbokrad__uke' },
          el('span', { class: 'dagbokrad__merkelapp' }, 'Uke fra'), ' ', r.uke),
        el('span', { class: 'dagbokrad__tekst' }, r.tekst))))) : null;

  skjerm('Mitt hvorfor',
    mineKort,
    kanLeggeTil() ? komponerKort() : el('p', { class: 'dempet', style: 'text-align:center' }, 'Du har nok hvorfor for nå — fjern ett for å bytte.'),
    reflKort,
    dagbokKort);
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
  // Som lagre(), men uten å tegne skjermen på nytt — brukt av væske-bryterne så
  // de får animere vekslingen i stedet for å bli bygget om i endelig tilstand.
  function lagreStille(muter) {
    const p = hentProfil();
    muter(p);
    lagreProfil(p);
  }

  const valgtTema = profil.innstillinger?.tema || 'standard';
  const valgtSprak = gjeldendeSprak();

  skjerm('Innstillinger',
    // Språk: hele appen på norsk eller engelsk. Bytte laster appen på nytt.
    el('div', { class: 'kort' },
      el('h2', {}, 'Språk'),
      el('p', { class: 'dempet', style: 'margin-top:-4px' },
        'Velg språk for hele appen — grensesnitt og innhold.'),
      el('div', { class: 'chiprad chiprad--pille' },
        chip('Norsk', { aktiv: valgtSprak === 'nb', onClick: () => { if (valgtSprak !== 'nb') settSprak('nb'); } }),
        chip('English', { aktiv: valgtSprak === 'en', onClick: () => { if (valgtSprak !== 'en') settSprak('en'); } }),
      ),
    ),
    skyKort(),
    stravaKort(visInnstillinger),
    el('div', { class: 'kort' },
      el('h2', {}, 'Ukemål'),
      el('div', { class: 'chiprad chiprad--pille' },
        ...[2, 3, 4, 5, 6].map((n) => chip(String(n), {
          aktiv: profil.ukemaal === n, onClick: () => lagre((p) => { p.ukemaal = n; }),
        })),
      ),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Treningspreferanser'),
      el('p', { class: 'dempet', style: 'margin-top:-4px' },
        'Skjul former du ikke vil ha, og løft favorittene — det styrer anbefalingene dine.'),
      el('div', { class: 'prefliste' },
        ...KATEGORIER.map((kat) => {
          const naa = prefNiva(profil, kat.id);
          return el('div', { class: 'prefrad' },
            el('div', { class: 'prefrad__hode' },
              el('span', { class: 'prefrad__ikon' }, ikon(kat.ikon)),
              el('span', { class: 'prefrad__navn' }, kat.navn),
            ),
            el('div', { class: 'chiprad prefrad__valg chiprad--pille' },
              ...PREF_NIVAER.map((niv) => chip(niv.navn, {
                aktiv: naa === niv.id,
                onClick: () => lagre((p) => {
                  const t = { ...(p.treningsPreferanser || {}) };
                  if (niv.id === 'noytral') delete t[kat.id]; else t[kat.id] = niv.id;
                  p.treningsPreferanser = t;
                }),
              })),
            ),
          );
        }),
      ),
    ),
    el('div', { class: 'kort' },
      el('h2', {}, 'Tema'),
      el('div', { class: 'temaliste' },
        ...TEMAER.map((t) => el('button', {
          class: 'temaknapp' + (valgtTema === t.id ? ' temaknapp--valgt' : ''),
          type: 'button',
          onclick: () => lagre((p) => {
            p.innstillinger = p.innstillinger || {};
            p.innstillinger.tema = t.id;
            bruksTema(t.id);
          }),
        },
          el('span', { class: 'temaknapp__prikk', style: `background:${t.prikk}` }),
          el('span', { class: 'temaknapp__navn' }, t.navn),
          el('span', { class: 'temaknapp__status' }, valgtTema === t.id ? ikon('sjekk') : null),
        )),
      ),
    ),
    // Fargemodus: auto (systemvalg) / lys / mørk (skogsgrønn).
    (() => {
      const valgtModus = lesFargemodus();
      return el('div', { class: 'kort' },
        el('h2', {}, 'Fargemodus'),
        el('p', { class: 'dempet', style: 'margin-top:-4px' },
          'Lys papir eller skogsgrønn mørk modus. «Auto» følger systemet ditt.'),
        el('div', { class: 'chiprad chiprad--pille' },
          ...[['auto', 'Auto'], ['lys', 'Lys'], ['mork', 'Mørk']].map(([id, navn]) =>
            chip(navn, { aktiv: valgtModus === id, onClick: () => { bruksFargemodus(id); visInnstillinger(); } })),
        ),
      );
    })(),
    el('div', { class: 'kort' },
      el('h2', {}, 'Lyd og vibrasjon'),
      el('p', { class: 'dempet', style: 'margin-top:-4px' },
        'Små pling og vibrasjoner i feiringene og øktspilleren.'),
      el('div', { class: 'prefliste' },
        el('div', { class: 'prefrad bryterrad' },
          el('div', { class: 'prefrad__hode' },
            el('span', { class: 'prefrad__ikon' }, ikon('bjelle')),
            el('span', { class: 'prefrad__navn' }, 'Lyd'),
          ),
          bryter({
            på: profil.innstillinger?.lyd !== false, etikett: 'Lyd',
            onEndre: (på) => { settLydAv(!på); lagreStille((p) => { p.innstillinger = p.innstillinger || {}; p.innstillinger.lyd = på; }); },
          }),
        ),
        el('div', { class: 'prefrad bryterrad' },
          el('div', { class: 'prefrad__hode' },
            el('span', { class: 'prefrad__ikon' }, ikon('puls')),
            el('span', { class: 'prefrad__navn' }, 'Vibrasjon'),
          ),
          bryter({
            på: profil.innstillinger?.haptikk !== false, etikett: 'Vibrasjon',
            onEndre: (på) => { settHaptikkAv(!på); lagreStille((p) => { p.innstillinger = p.innstillinger || {}; p.innstillinger.haptikk = på; }); },
          }),
        ),
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
    sync.erInnlogget() ? el('div', { class: 'kort' },
      el('h2', {}, 'Konto'),
      el('p', { class: 'dempet', style: 'margin-top:-4px' },
        'Logget inn som ', el('strong', {}, sync.brukerEpost() || 'medlem'), '.'),
      el('div', { class: 'knapprad' },
        el('button', {
          class: 'knapp knapp--sekundaer', type: 'button',
          onclick: () => { sync.loggUt(); location.hash = '#/logg-inn'; },
        }, 'Logg ut'),
      ),
    ) : null,
    adminKort(),
    el('div', { class: 'kort' },
      el('h2', {}, 'Faresone'),
      el('button', {
        class: 'knapp knapp--fare', type: 'button',
        onclick: () => { if (confirm('Slette ALT — profil, logg, XP og historikk? Kan ikke angres.')) { nullstillAlt(); location.hash = '#/hjem'; location.reload(); } },
      }, 'Full nullstilling'),
    ),
  );
}

// Admin-kort: vises kun for admin-e-poster. Bryter for å oppleve appen som et
// vanlig medlem (av → låste økter forblir låst, ingen admin-bypass).
function adminKort() {
  if (!erAdminEpost()) return null;
  const paa = adminModusPaa();
  return el('div', { class: 'kort' },
    el('h2', {}, 'Admin'),
    el('p', { class: 'dempet', style: 'margin-top:-4px' },
      'Med admin på kan du åpne låste økter for testing. Skru av for å se appen slik et vanlig medlem opplever den — da forblir låste økter låst.'),
    el('div', { class: 'prefliste' },
      el('div', { class: 'prefrad bryterrad' },
        el('div', { class: 'prefrad__hode' },
          el('span', { class: 'prefrad__ikon' }, ikon(paa ? 'lasopp' : 'las')),
          el('span', { class: 'prefrad__navn' }, 'Admin-modus'),
        ),
        bryter({
          på: paa, etikett: 'Admin-modus',
          onEndre: (på) => { settAdminModus(på); varsle(på ? 'Admin-modus på' : 'Ser appen som et vanlig medlem'); },
        }),
      ),
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
          onclick: async (ev) => { ev.target.textContent = 'Synker…'; await sync.synk(); varsle('Synkronisert'); visInnstillinger(); },
        }, 'Synk nå'),
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

  // Hele kortet åpner øvelsessiden — (i)-ikonet viser at det er mer å se.
  return el('a', { class: 'ovelse', href: `#/ovelse?n=${encodeURIComponent(e.navn)}` },
    el('div', { class: 'ovelse__topp' },
      el('span', { class: 'ovelse__navn' }, e.navn),
      el('span', { class: 'ovelse__hoyre' }, nivaPrikker, ikon('info', 'ikon ikon--liten')),
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
  skjerm(`Om ${APP_NAME}`,
    el('div', { class: 'kort' },
      el('h2', {}, `${APP_NAME} — ${APP_TAGLINE}.`),
      el('p', {}, 'Bevegelse kan være hva som helst du liker — en tur, en økt, en fotballkamp. Alt teller, alt gir XP, og merkene samler det du får til. PWA i vanilla HTML/CSS/JS.'),
      el('p', { class: 'dempet' }, `Versjon ${APP_VERSION}`),
      el('p', { class: 'dempet' }, `${hentOkter().length} økter i biblioteket · ${bib.exercises.length} øvelser i oppslaget.`),
    ),
    profil && el('div', { class: 'kort' },
      el('h2', {}, 'Profil'),
      el('p', { class: 'dempet' }, `Motivasjon: ${(profil.motivasjon?.valg || []).join(', ') || '–'}`),
      el('p', { class: 'dempet' }, `Ukemål ${profil.ukemaal} · nivå ${nivaFraTotalXp(profil.globalXp || 0).niva}`),
    ),
  );
}

// --- Tab-bar (Mova BottomNav: hvit flate, aktiv fane i aksentfargen).
// Profil står i midten, litt større enn de andre. ---
// Sjekker om motoren faktisk rendrer SVG-forvrengning i backdrop-filter.
// Chromium gjør det; WebKit/Safari (inkl. iOS) gjør det ikke — der beholder vi
// frost-fallbacken. Kalles én gang; setter .kan-glassrefraksjon på <html>.
function settGlassrefraksjonFlagg() {
  const ua = navigator.userAgent || '';
  const erWebKit = /\bSafari\b/.test(ua) && !/\b(Chrome|Chromium|CriOS|Edg|OPR|SamsungBrowser)\b/.test(ua);
  const stotter = !erWebKit && (
    (window.CSS && CSS.supports && (
      CSS.supports('backdrop-filter', 'url(#x)') ||
      CSS.supports('-webkit-backdrop-filter', 'url(#x)')
    )) || false
  );
  document.documentElement.classList.toggle('kan-glassrefraksjon', stotter);
  return stotter;
}

// Legger inn SVG-filteret som driver glass-refraksjonen (feDisplacementMap på en
// myk fraktalstøy). Skjult, 0×0, injiseres kun én gang.
function leggInnGlassFilter() {
  if (document.getElementById('takt-glass')) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `
    <filter id="takt-glass" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="stoy" />
      <feGaussianBlur in="stoy" stdDeviation="2" result="mykStoy" />
      <feDisplacementMap in="SourceGraphic" in2="mykStoy" scale="16" xChannelSelector="R" yChannelSelector="G" />
    </filter>`;
  document.body.append(svg);
}

function byggTabbar() {
  if (document.querySelector('.tabbar')) return;
  settGlassrefraksjonFlagg();
  leggInnGlassFilter();
  // Flytende liquid-glass-bar à la Instagram: kun ikoner (etiketten blir aria-
  // label for skjermlesere), en glidende glass-linse bak aktiv fane, og aktiv
  // fane får det fylte, svarte ikonet (linje-varianten byttes via CSS).
  const tab = (rute, ikonNavn, fyllNavn, tekst) => el('a', {
    class: 'tabbar__knapp', href: `#/${rute}`, 'data-rute': rute, 'aria-label': tekst,
  }, el('span', { class: 'tabbar__ikon' },
    ikon(ikonNavn, 'ikon tabikon--linje'),
    fyllNavn ? ikon(fyllNavn, 'ikon tabikon--fyll') : null,
  ));

  const nav = el('nav', { class: 'tabbar', 'aria-label': 'Hovedmeny' },
    el('span', { class: 'tabbar__refraksjon', 'aria-hidden': 'true' }),
    el('span', { class: 'tabbar__linse', 'aria-hidden': 'true' }),
    ...FANER_DEF.map((f) => tab(f.rute, f.ikon, f.fyll, f.label)),
    el('span', { class: 'tabbar__flash', 'aria-hidden': 'true' }),
  );
  document.body.append(nav);
  settOppTabTrykk(nav);
  settOppTabKrymp();
  settOppReTapp(nav);
}

// Trykk på fanen man ALLEREDE står i → tilbakestill fanen til førstesiden
// (rot), scroll til topp, spill reload-animasjonen (samme spinner som pull-to-
// refresh på Min dag) og last innholdet på nytt. Et trykk på en ANNEN fane
// beholder per-fane-minnet (går dit man var). Vi lytter i fangst-fasen så vi
// rekker å avbryte hash-navigasjonen før den skjer.
function settOppReTapp(nav) {
  nav.addEventListener('click', (ev) => {
    const knapp = ev.target.closest('.tabbar__knapp');
    if (!knapp) return;
    const tab = knapp.dataset.rute;
    const naaRute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
    if (faneForRute(naaRute) !== tab) return; // annen fane → vanlig navigasjon
    ev.preventDefault();
    refreshFane(tab);
  }, true);
}

// Spinner-overlegg à la pull-to-refresh: glir inn øverst, spinner mens
// innholdet lastes på nytt, og fjernes etterpå. Ligger på <body> så en
// re-tegning av #app ikke rører den. `reload` kalles midtveis (mens den
// spinner) og gjør den ferske tegningen.
function spillReload(reload) {
  const spinn = el('div', { class: 'pullspinn pullspinn--aktiv reloadspinn', 'aria-hidden': 'true' },
    el('i', { class: 'pullspinn__ring' }));
  spinn.style.top = 'calc(env(safe-area-inset-top) + 22px)';
  document.body.append(spinn);
  // Glir ned til hvileposisjon (top-transisjonen ligger i .pullspinn--aktiv).
  requestAnimationFrame(() => { spinn.style.top = 'calc(env(safe-area-inset-top) + 72px)'; });
  const ferdig = () => {
    spinn.classList.remove('pullspinn--aktiv');
    spinn.addEventListener('transitionend', () => spinn.remove(), { once: true });
    setTimeout(() => spinn.remove(), 400);
  };
  if (REDUSERT()) { reload(); setTimeout(ferdig, 200); return; }
  // La spinneren snurre et øyeblikk, last på nytt, og fade den ut litt etter.
  setTimeout(() => { reload(); setTimeout(ferdig, 260); }, 620);
}

// Nullstiller fanen til roten, scroller til topp og spiller reload-animasjonen
// med en fersk tegning. Virker både når man står dypt inne (går til rot først)
// og når man alt står på roten (samme hash → tegn på nytt manuelt).
function refreshFane(tab) {
  const rot = `#/${tab}`;
  faneMinne[tab] = rot;
  scrollMinne.set(rot, 0);
  const kjør = () => {
    const s = aktivScroller();
    if (s) s.scrollTo({ top: 0, behavior: REDUSERT() ? 'auto' : 'smooth' });
    spillReload(() => {
      navger(); // fersk tegning (feeden re-rangeres, dashbord re-leses)
      const s2 = aktivScroller();
      if (s2) s2.scrollTop = 0;
    });
  };
  if (location.hash === rot) {
    kjør();
  } else {
    // Dypt inne → gå til rot; når roten er tegnet, spill reload over den.
    window.addEventListener('hashchange', () => requestAnimationFrame(kjør), { once: true });
    location.hash = rot;
  }
}

// Trykk-effekt: ved pointerdown lysner hele baren (screen-flash) og pulser
// et hakk. Klassen fjernes/legges på igjen med tvungen reflow så effekten kan
// re-trigges raskt. (Trykk-sirkelen på fingerpunktet er fjernet.)
function settOppTabTrykk(nav) {
  nav.addEventListener('pointerdown', () => {
    // Berøring vekker baren umiddelbart — veksten starter allerede på
    // pointerdown, før navigasjonen, så den er godt i gang når linsen glir.
    vekkTabbar(nav);
    nav.classList.remove('tabbar--trykk', 'tabbar--puls');
    void nav.offsetWidth;
    nav.classList.add('tabbar--trykk', 'tabbar--puls');
  });
  // Rydd bort ferdige bar-animasjoner så klassene ikke blir hengende og
  // påvirker transform-origin (strekk) eller re-trigges av cascade-bytter.
  nav.addEventListener('animationend', (ev) => {
    if (ev.animationName === 'bar-strekk') nav.classList.remove('tabbar--strekk-hoyre', 'tabbar--strekk-venstre');
    else if (ev.animationName === 'bar-puls') nav.classList.remove('tabbar--puls');
  });
  // Sprett-veksten (vekkTabbar) er ferdig → tilbake til nøytral easing, så
  // neste scroll-krymp ikke arver bouncen.
  nav.addEventListener('transitionend', (ev) => {
    if (ev.target === nav && ev.propertyName === 'transform') nav.classList.remove('tabbar--vekst');
  });
}

// Vekker en kompakt bar med sprett: tilbakeveksten får bounce-easing via
// .tabbar--vekst (vokser et hint forbi full størrelse og lander), i stedet for
// den nøytrale scroll-easingen. Klassen ryddes når transform-transisjonen er
// ferdig (lytteren settes i byggTabbar), så scroll-krympingen forblir rolig.
function vekkTabbar(nav = document.querySelector('.tabbar')) {
  if (!nav || !nav.classList.contains('tabbar--kompakt')) return;
  nav.classList.remove('tabbar--kompakt');
  nav.classList.add('tabbar--vekst');
}

// Instagram-aktig: baren krymper litt når man scroller nedover og vokser tilbake
// når man scroller oppover (eller er nær toppen). Lytter i fangst-fasen så både
// dokument-scroll og fanesidenes egne scrollflater fanges. Idempotent.
let _tabKrympSatt = false;
function settOppTabKrymp() {
  if (_tabKrympSatt) return;
  const bar = document.querySelector('.tabbar');
  if (!bar) return;
  _tabKrympSatt = true;
  let sisteY = 0;
  let venter = false;
  const lesY = (t) => {
    const s = (t && t !== document && typeof t.scrollTop === 'number') ? t : (document.scrollingElement || document.documentElement);
    return s.scrollTop || 0;
  };
  const paa = (ev) => {
    if (venter) return;
    venter = true;
    const y = lesY(ev.target);
    requestAnimationFrame(() => {
      venter = false;
      const dy = y - sisteY;
      sisteY = y; // følg alltid posisjonen — også når krympingen er dempet
      // Programmatisk scroll-restore (fanebytte) skal aldri krympe baren;
      // neste ekte scroll måles da mot den gjenopprettede posisjonen.
      if (performance.now() < krympStilleTil) return;
      if (y < 32) bar.classList.remove('tabbar--kompakt');       // nær toppen → full
      else if (dy > 3) bar.classList.add('tabbar--kompakt');     // ned → litt mindre
      else if (dy < -3) bar.classList.remove('tabbar--kompakt'); // opp → større
    });
  };
  window.addEventListener('scroll', paa, { passive: true, capture: true });
}

// Glir glass-linsen bak den aktive fanen (sammenheng mellom faner).
function flyttTabIndikator() {
  const nav = document.querySelector('.tabbar');
  const ind = nav?.querySelector('.tabbar__linse');
  const aktiv = nav?.querySelector('.tabbar__knapp--aktiv');
  if (!ind) return;
  if (!aktiv) { ind.style.opacity = '0'; return; }
  const knapper = nav.querySelectorAll('.tabbar__knapp');
  const erYtterst = aktiv === knapper[0] || aktiv === knapper[knapper.length - 1];
  const x = aktiv.offsetLeft + aktiv.offsetWidth / 2;
  const forrige = Number(ind.dataset.x ?? NaN);
  ind.dataset.x = String(x);
  // Ytterfanene: rett easing så pillen bremser inn mot enden i stedet for å
  // sprette forbi målet og utenfor kapselen. Innerfaner beholder spretten.
  ind.classList.toggle('tabbar__linse--rett', erYtterst);
  ind.style.opacity = '1';
  ind.style.transform = `translateX(${x}px) translateX(-50%)`;
  // Strekk baren kun ved lange hopp til en ytterfane — det er der pillen
  // ellers ville truffet kanten. Puls-klassen fjernes så bar-animasjonene
  // ikke kjemper om scale-egenskapen. Strekken droppes mens baren vokser fra
  // kompakt (transform ≠ identitet): strekk-klassenes transform-origin-bytte
  // ville re-ankret krympe-skalaen og fått hele baren til å hoppe.
  const mt = getComputedStyle(nav).transform;
  const fullStorrelse = mt === 'none' || mt === 'matrix(1, 0, 0, 1, 0, 0)';
  if (Number.isFinite(forrige) && erYtterst && fullStorrelse && Math.abs(x - forrige) > aktiv.offsetWidth * 1.5) {
    nav.classList.remove('tabbar--puls', 'tabbar--strekk-hoyre', 'tabbar--strekk-venstre');
    void nav.offsetWidth;
    nav.classList.add(x > forrige ? 'tabbar--strekk-hoyre' : 'tabbar--strekk-venstre');
  }
}

// Anvender valgt app-tema (M6). Kalles ved oppstart og når temaet endres.
export function bruksTema(id) {
  if (id && id !== 'standard') document.documentElement.dataset.tema = id;
  else delete document.documentElement.dataset.tema;
}

// Fargemodus (M53): auto (systemvalg) / lys / mørk. Setter data-mork på <html>
// så mørk-blokken i CSS slår inn. Egen LS-nøkkel (som språk) leses også av et
// inline-script i index.html for å unngå FOUC ved oppstart.
const LS_FARGEMODUS = 'trening.fargemodus';
function lesFargemodus() {
  try { return localStorage.getItem(LS_FARGEMODUS) || 'auto'; } catch { return 'auto'; }
}
function bruksFargemodus(modus) {
  const m = ['auto', 'lys', 'mork'].includes(modus) ? modus : 'auto';
  try { localStorage.setItem(LS_FARGEMODUS, m); } catch { /* ignorer */ }
  const systemMork = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (m === 'mork' || (m === 'auto' && systemMork)) document.documentElement.setAttribute('data-mork', '');
  else document.documentElement.removeAttribute('data-mork');
}
// Følg systemets endringer når modus er «auto».
try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (lesFargemodus() === 'auto') bruksFargemodus('auto');
  });
} catch { /* eldre nettlesere */ }

// --- Onboarding ---
function startOnboarding() {
  document.body.classList.add('fokusmodus');
  kjorOnboarding(app, () => {
    document.body.classList.remove('fokusmodus');
    byggTabbar();
    location.hash = '#/hjem';
    navger();
  });
}

// --- Etter innlogging/registrering (fra medlem.js) ---
// Ny sesjon: hent ev. skyprofil før vi avgjør onboarding vs. appen. Nye
// medlemmer uten profil sendes til onboarding; ellers rett inn i Min dag.
async function fullførInnlogging() {
  document.body.classList.remove('fokusmodus');
  try { await sync.synk(); } catch (e) { console.warn('Synk etter innlogging feilet', e); }
  if (!harProfil()) { startOnboarding(); return; }
  byggTabbar();
  if (location.hash === '#/hjem') navger(); else location.hash = '#/hjem';
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
    [bib] = await Promise.all([lastBibliotek(), lastOkter(), lastOvelsesinfo(), lastArtikler(), lastStier(), lastKjeder(), lastDisipliner(), lastSeksjoner()]);
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
  settBibKal(bib);
  settBibOvelse(bib);
  settBibSti(bib);
  settBibOpp(bib);
  settOkterKilde(hentOkter); // opplåsnings-diff (feiring.js) trenger øktlista
  settLaerLenke(laerLenke);  // «Låst økt»-arket dyplenker øvelser rett til Lær
  settNavger(navger); // pull-to-refresh (banner.js) tegner siden på nytt
  settUlestSjekk(harUlesteVarsler); // uleste-prikk på bjella (banner.js)
  bruksTema(hentProfil()?.innstillinger?.tema);
  bruksFargemodus(lesFargemodus());
  // Språk: engelsk-modus starter DOM-oversetteren (norsk er standard, ingen
  // oversetting). Observatøren fanger alt som tegnes fra nå av.
  document.documentElement.lang = gjeldendeSprak();
  startOversetter();
  // Lyd + haptikk: begge på som standard, styres fra Innstillinger.
  const lydHapt = hentProfil()?.innstillinger || {};
  settLydAv(lydHapt.lyd === false);
  settHaptikkAv(lydHapt.haptikk === false);
  // Navigasjon håndterer scroll selv (navger → gjenopprettScroll): nye skjermer
  // starter på toppen, mens en fane man kommer tilbake til gjenoppretter posisjon.
  window.addEventListener('hashchange', navger);

  // Skysync: fang ev. magic-link-retur, og på en ny enhet som nettopp logget
  // inn — hent ned profilen før vi avgjør om onboarding skal kjøre.
  // Strava-krediteringen kjører mellom pull og push i hver synk-runde.
  sync.settEtterPull(krediterNye);
  settEtterInnlogget(fullførInnlogging);
  try {
    const { innlogget } = await sync.init();
    if (innlogget && !harProfil()) await sync.synk();
    else if (innlogget) sync.synk();
    sync.påStatus(oppdaterSyncMerke);
  } catch (e) {
    console.warn('Sync utilgjengelig', e);
  }

  // Medlemsgate: uten innlogging møter du «Velkommen tilbake» / «Bli medlem».
  if (!sync.erInnlogget()) {
    const rute = (location.hash.replace('#/', '') || '').split('?')[0];
    if (AUTH_RUTER.has(rute)) navger(); else location.hash = '#/logg-inn';
    skjulSplash();
    return;
  }

  if (!harProfil()) {
    startOnboarding();
    skjulSplash();
    return;
  }
  byggTabbar();
  // En pågående hurtigstart-tur (skjermen slukket / appen ble lukket)
  // gjenopptas rett i timeren — tida har uansett telt videre.
  if (aktivHurtig() && !location.hash.startsWith('#/hurtig')) location.hash = '#/hurtig';
  navger();
  skjulSplash();
}

// Oppdaterer et lite synk-merke på Meny-fanen når status endrer seg.
function oppdaterSyncMerke(status) {
  const knapp = document.querySelector('.tabbar__knapp[data-rute="meny"]');
  if (knapp) knapp.classList.toggle('tabbar__knapp--synker', status === 'synker');
  // Hvis brukeren står på en skjerm som viser synket data, tegn på nytt.
  // «hjem» (feeden) tegnes bevisst IKKE på nytt ved synk — en redraw midt i
  // et påbegynt minispill ville nullstilt spillet under fingrene på folk.
  if (status === 'synket') {
    const rute = (location.hash.replace('#/', '') || 'hjem').split('?')[0];
    if (['trening', 'historikk', 'aktivitet', 'merker', 'innstillinger'].includes(rute)) navger();
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
