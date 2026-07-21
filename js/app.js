// App-inngang for Takt.
// Navigasjon: Hjem (dagens dashbord) · Mat · Bevegelse · Ro · Sosialt.
// Kjernemålingen er den blå flammen (js/gnist.js): røde gnist-streaks per
// pilar, og en blå blue zone-streak når alle tennes samme dag — formulert
// som tilbud, aldri skam. Feiringen bor i merkene (js/merker.js), og
// treningsstats/-oppslag er samlet under Trening-området på profilen.
import { lastBibliotek, MODALITET_NAVN, MONSTER_NAVN } from './library.js';
import {
  hentProfil, harProfil, lagreProfil, hentLogg, nullstillAlt,
  planForDato,
} from './store.js';
import { el, tom, chip, ikon, bryter, visArk } from './ui.js';
import { APP_VERSION, APP_NAME, APP_TAGLINE } from './config.js';
import { kjorOnboarding } from './onboarding.js';
import { visReviewSkjerm, visKjoreSkjerm, settOpprinnelse } from './kjor.js';
import { settBib as settBibHist, visAktivitetSkjerm } from './historikk.js';
import { visHurtigSkjerm, visLoggforSkjerm, aktivHurtig, registrerOgLogg } from './beveg.js';
import { slippVaaken } from './vaakenlaas.js';
import { lastOvelsesinfo, settBib as settBibOvelse, visOvelseSkjerm, ovelseInfo } from './ovelse.js';
import { alleØvelser, tonnasje, muskelVolum, lagLinjegraf } from './styrke.js';
import { lastArtikler, visLaerSkjerm, visArtikkelSkjerm } from './laer.js';
import { visLoggInnSkjerm, visRegistrerSkjerm, settEtterInnlogget } from './medlem.js';
import { lastStier, lastKjeder, lastDisipliner, lastSeksjoner, settBib as settBibSti, visStiSkjerm, visDisiplinSkjerm, visSeksjonSkjerm, laerLenke } from './sti.js';
import { visMerkerSkjerm } from './merker.js';
import { settBib as settBibKal, visKalenderSkjerm } from './kalender.js';
import { lagFaneside, fanesideMedTittel, settNavger, settUlestSjekk, dagsfase, lagPullOppdatering } from './banner.js';
import { hentGnistStatus, GNIST_PILARER, hentPilarDager } from './gnist.js';
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
import { visFeedSkjerm, visPostSkjerm, lastFeed, byggFeedPeek } from './feed.js';
import { gjeldendeSprak, settSprak, startOversetter, oversettDom, hentSprakJson } from './i18n.js';
import { VANER, dagensInnslag, veksleVane, kostStatus } from './kosthold.js';
import {
  lastOppskrifter, alleOppskrifter, oppskriftMedId, oppskriftIngredienser, MAALTIDER,
  oppskriftTags, OPPSKRIFT_FILTRE, filtrerOppskrifter, dagensOppskrift,
  lesMatplan, maaltidFor, settMaaltid, autofyllUke, planStatus, ukeDatoer, ukenummer, mandagFor,
  lesHandleliste, settPersoner, leggOppskriftIHandle, fjernOppskriftFraHandle, veksleAvkrysset,
  leggEgenVare, fjernEgenVare, settHar, veksleHar, gjettVarekategori, oppskriftVarer,
  tømAvkrysset, byggHandleliste, handlelisteTekst, handlelisteKilder,
  erFavoritt, veksleFavoritt, VARE_KATEGORIER, isoDag as matIsoDag,
} from './mat.js';
import * as husstand from './husstand.js';
import { SOSIALE_VANER, dagensInnslag as sosDagensInnslag, veksleVane as sosVeksleVane, sosialStatus, lesSosiallogg, leggTilEgen } from './sosialt.js';
import {
  lesKrets, leggTilPerson, oppdaterPerson, slettPerson, registrerKontakt, sorterKrets,
  varmeTekst, dagerSiden, KRETS_EMOJI, RELASJONER, METODER, IGANG_IDEER,
} from './fellesskap.js';
import {
  RO_VANER, MIKRO_OKTER, dagensInnslag as roDagensInnslag, veksleVane as roVeksleVane,
  sikreVane as roSikreVane, roStatus, lesRolog,
} from './ro.js';
import {
  STARTSPORSMAL, lesHvorfor, leggTilHvorfor, slettHvorfor, kanLeggeTil,
  ukensRefleksjon, settRefleksjon, lesRefleksjoner, refleksjonsSporsmal,
  lesKompass, lagreKompass, settKompassPause, slettKompass, settDenneTiden, denneTidenBorSes,
  INNGANGER, PERSONVALG, EVNEVALG, FOLELSESVALG, IDENTITETSVALG, HVERDAGSVALG, TONER, TIDSVALG,
  regnDimensjoner, toppDimensjoner, lagFormuleringer, lagKompassLinje, kompassForklaring, kompassBudskap,
} from './mening.js';
import { streakEtter, blaaEtter } from './feiring.js';

const app = document.getElementById('app');
let bib = null;

// --- Ruter (hash-basert) ---
const ruter = {
  hjem: () => visHjemDashboard(app), // Hjem er dagens dashbord (M53); feeden flyttet til #/feed
  feed: () => visFeedSkjerm(app), // Dagens feed — nås fra ikon oppe venstre / sveip fra Hjem
  utforsk: () => visUtforskSkjerm(app), // Kunnskap & inspirasjon (kuratert oppdagelse)
  post: () => visPostSkjerm(app), // dedikert side for ett feed-innlegg (spillbart)
  trening: visTrening, // Min dag-dashbordet bor på Trening-fanen
  kosthold: () => visKostholdSkjerm(app), // Mat-pilaren: hjem (vaner + oppskrifter + plan/handle)
  oppskrifter: () => visOppskrifterSkjerm(app), // Bla i oppskrifter (søk + filtre)
  oppskrift: () => visOppskriftSkjerm(app), // Oppskrift-detalj (#/oppskrift?id=)
  ukesplan: () => visUkesplanSkjerm(app), // Ukesplan (måltider per dag)
  handleliste: () => visHandlelisteSkjerm(app), // Handleliste (avledet av plan)
  ro: () => visRoSkjerm(app), // Ro-pilaren (daglige ro-vaner + økter)
  rofremgang: () => visRoFremgang(app), // Se logg (Ro)
  sosialt: () => visFellesskapSkjerm(app), // Fellesskap-pilaren (relasjoner + kontakt-logg)
  krets: () => visKretsSkjerm(app), // Din krets — personene du vil holde varmt
  fremgang: () => visFellesskapFremgang(app), // Se fremgang (Fellesskap)
  moteplasser: () => visMoteplasserSkjerm(app), // Finn fellesskap i nærheten
  beveg: () => visOkterSkjerm(app), // Treningsbibliotek-fanen er øktbiblioteket
  'beveg-favoritter': () => visOktFavoritter(app), // Bokmerkede økter
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
  mening: () => visMeningSkjerm(app), // Mitt kompass — meningspilaren (ikke fane)
  kompass: () => visMeningSkjerm(app), // alias — samme skjerm
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
const FOKUS = new Set(['review', 'kjor', 'hurtig', 'loggfor', 'kalender', 'ovelse', 'artikkel', 'oppskrift', 'post', 'logg-inn', 'bli-medlem', 'beveg-favoritter', 'feed', 'varsler']);

// Feed-funksjonen (M38) er SKJULT fra grensesnittet inntil videre — vi vurderer
// om den passer i appens image. Koden, dataene og ruten (#/feed, #/post)
// beholdes urørt; direkte lenker virker fortsatt. Flipp til true for å få
// tilbake feed-ikonet i headeren, Hjem-sveipen og forhåndslastingen.
const VIS_FEED = false;

// Paneler som glir inn over hovedappen (slide-over): feeden kommer fra venstre
// (feed-ikonet ligger til venstre), varsler fra høyre (bjella ligger til høyre).
const SLIDE_VENSTRE = new Set(['feed']);   // panelet ligger til venstre for appen
const SLIDE_HOYRE = new Set(['varsler']);  // panelet ligger til høyre for appen

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
// Bunnlinja = Hjem (Takt) i midten som hevet sirkel, med pilar-modulene rundt:
// Mat · Bevegelse · Hjem · Ro · Fellesskap.
// Profil (#/merker) og Lær (#/laer) er IKKE bunnfaner lenger — de er egne sider
// som nås fra meny-huben (tannhjulet) på samme måte som Innstillinger/Varsler.
const FANER_DEF = [
  { id: 'kosthold', rute: 'kosthold', ikon: 'eple', fyll: 'eplefyll', label: 'Mat',
    barn: ['oppskrifter', 'oppskrift', 'ukesplan', 'handleliste'] },
  { id: 'trening', rute: 'trening', ikon: 'loper', fyll: 'loperfyll', label: 'Bevegelse',
    // Treningsbibliotek (øktbiblioteket) bor under Bevegelse — ett tapp unna via
    // «Se økter»/«Vis alle».
    barn: ['beveg', 'ny', 'okter'] },
  { id: 'hjem', rute: 'hjem', ikon: 'hjem', fyll: 'hjemfyll', label: 'Hjem',
    barn: ['feed', 'post'] }, // feeden (dagens feed) + innleggsside hører til Hjem
  { id: 'ro', rute: 'ro', ikon: 'maane', fyll: null, label: 'Ro',
    barn: ['rofremgang'] },
  { id: 'sosialt', rute: 'sosialt', ikon: 'personer', fyll: null, label: 'Fellesskap',
    barn: ['krets', 'fremgang', 'moteplasser'] },
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
let _droppSlide = false; // settes av feed-dra-gesten så rute-slide ikke dobles
let _nesteSlide = '';    // settes av side-sveipen: tvungen slide-retning på neste navigasjon
let _tegnNr = 0;         // token for utsatte tegninger (fanetrykk): nyeste vinner
// Fanesidene scroller et indre .hjem-scroll; reise-/vanlige skjermer scroller vinduet.
const aktivScroller = () => document.querySelector('.hjem-scroll') || document.querySelector('.hjemdash-scroll > .innhold') || document.scrollingElement || document.documentElement;

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
function gjenopprettScroll(hash) {
  const y = scrollMinne.get(hash) || 0;
  const sett = () => { const s = aktivScroller(); if (s) s.scrollTop = y; };
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
  // #/okter?start=X er en «start denne økta»-kommando, ikke en egen side: den
  // sender rett videre til review. «Tilbake» fra review skal føre til siden man
  // kom FRA (Bevegelse-hjem, favoritter, plan …), ikke til biblioteket. Router-
  // flyten kollapser forrigeHash når startOkt bytter hash, så vi fanger
  // opprinnelsen HER — mens forrigeHash fortsatt peker på avreisesiden.
  if (rute === 'okter' && /[?&]start=/.test(location.hash)) settOpprinnelse(forrigeHash || '#/trening');
  // Et åpent bunnark hører til siden man forlot — lukk det ved ekte navigasjon
  // så det ikke blir hengende som et usynlig overlegg på neste skjerm.
  if (byttet) document.querySelector('.ark')?.remove();
  // Slide-over: feed/varsler glir inn som paneler i stedet for et umiddelbart
  // sidebytte. Feed ligger til venstre, varsler til høyre; på vei UT av et panel
  // kommer hovedappen tilbake fra motsatt side.
  const forrigeRute = (forrigeHash.replace('#/', '') || 'hjem').split('?')[0];
  let slideKlasse = '';
  if (byttet && !REDUSERT() && !_droppSlide) {
    if (_nesteSlide) slideKlasse = _nesteSlide;                 // side-sveip bestemmer retningen
    else if (SLIDE_VENSTRE.has(rute)) slideKlasse = 'side-inn-venstre';
    else if (SLIDE_HOYRE.has(rute)) slideKlasse = 'side-inn-hoyre';
    else if (SLIDE_VENSTRE.has(forrigeRute)) slideKlasse = 'side-inn-hoyre';
    else if (SLIDE_HOYRE.has(forrigeRute)) slideKlasse = 'side-inn-venstre';
  }
  _droppSlide = false; _nesteSlide = ''; // engangsflagg
  if (rute !== 'kjor' && rute !== 'hurtig') slippVaaken(); // timer-skjermene eier låsen

  const tegn = () => {
    // Kroppsklasser ryddes her (ikke før en evt. utsatt tegning): den gamle
    // siden skal stå urørt helt til den nye faktisk tegnes.
    document.body.classList.toggle('fokusmodus', FOKUS.has(rute));
    document.body.classList.remove('fane-laast', 'dash-laast', 'enkeltside'); // settes på nytt av skjermene
    _hovedtoppAktiv = false;
    (ruter[rute] || ruter.hjem)();
    // Den faste headeren vises bare på sider som ba om den under tegningen —
    // øvrige ruter (feed, detaljsider, fokus-flow) skjuler den.
    document.body.classList.toggle('har-hovedtopp', _hovedtoppAktiv);
    document.querySelector('.hjemtopp--fast')?.classList.toggle('hjemtopp--skjult', !_hovedtoppAktiv);
    oppdaterNav(rute);
    oppdaterFaneMinne(rute);
    oversettDom(app); // engelsk-modus: oversett den nettopp tegnede skjermen
    if (byttet) gjenopprettScroll(location.hash);
    // Restart slide-animasjonen (fjern → tvungen reflow → legg på). Body klippes
    // mens panelet glir (så et panel som starter utenfor kanten ikke gir en kort
    // horisontal scroll), og ryddes når animasjonen er ferdig.
    app.classList.remove('side-inn-venstre', 'side-inn-hoyre');
    document.body.classList.remove('sideglir');
    if (slideKlasse) {
      void app.offsetWidth;
      app.classList.add(slideKlasse);
      document.body.classList.add('sideglir');
      app.addEventListener('animationend', () => {
        app.classList.remove('side-inn-venstre', 'side-inn-hoyre');
        document.body.classList.remove('sideglir');
      }, { once: true });
    }
  };
  // Sidebytte er ellers umiddelbart — det eneste som beveger seg er
  // feed/varsler-panelene og logo-krysstoningen i den faste headeren.
  // Fanetrykk mellom hovedsider (ingen slide): aktiv-markeringen og
  // logo-toningen kickes FØR den tunge sidetegningen, som utsettes to frames —
  // første frame maler animasjonsstarten (composited), så lander innholdsbyttet
  // mens logoen toner. Ellers blokkerer tegningen hovedtråden akkurat idet
  // animasjonen skulle startet, og logoen «hakker». Token-vakten dropper en
  // ventende tegning hvis en nyere navigasjon har rukket å ta over.
  const minTegn = ++_tegnNr;
  if (byttet && !slideKlasse && LOGO_FOR_RUTE[rute] && !REDUSERT()) {
    oppdaterNav(rute);
    settHovedtopp(LOGO_FOR_RUTE[rute]);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (minTegn === _tegnNr) tegn(); }));
  } else {
    tegn();
  }
  forrigeHash = location.hash;
}

function oppdaterNav(rute) {
  const tabRute = faneForRute(rute);
  document.querySelectorAll('.tabbar__knapp').forEach((b) => {
    b.classList.toggle('tabbar__knapp--aktiv', b.dataset.rute === tabRute);
  });
}

function skjerm(tittel, ...innhold) {
  tom(app);
  // Korte enkeltsider (Om, Utforsk, …) fyller skjermen: innholdet strekkes og
  // midtstilles vertikalt når det er kortere enn viewporten, så bunnen aldri
  // blir et tomt bakgrunnsfelt over den flytende bunnbaren.
  document.body.classList.add('enkeltside');
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

// Varsler-knapp med uleste-prikk. Lenker til #/varsler, som glir inn som et
// panel fra høyre (slide-over, se ruteren).
function lagVarselknapp() {
  const b = el('a', { class: 'ikonknapp ikonknapp--plain hjemtopp__varsler', href: '#/varsler',
    'aria-label': harUlesteVarsler() ? 'Varsler — nye' : 'Varsler' }, ikon('bjelle'));
  if (harUlesteVarsler()) b.append(el('i', { class: 'varselprikk' }));
  return b;
}

// Standard hovedapp-header (Hjem + alle pilarsidene): feed helt til venstre,
// tannhjul innenfor, wordmark sentrert, og profil + varsler helt til høyre.
// Feed glir inn fra venstre og varsler fra høyre (slide-over via ruteren).
// Headeren er PERSISTENT: ett fast eksemplar ligger utenfor #app og står
// stille når sidene bytter eller glir — bare logoen krysstoner til den nye
// pilarens navn, så det er kun innholdet som «hopper» per side. Sidene
// reserverer høyden med en .hjemtopp-plass i scroll-skallet sitt.
function lagHovedtoppLogo(logoTekst) {
  return el('span', { class: 'hjemtopp__logo', 'data-logo': logoTekst },
    logoTekst, el('span', { class: 'wordmark__prikk' }, '.'));
}
function byggHovedtopp(logoTekst, klasse = '') {
  return el('header', { class: 'hjemtopp' + klasse },
    el('div', { class: 'hjemtopp__side hjemtopp__side--v' },
      VIS_FEED ? el('a', { class: 'ikonknapp ikonknapp--plain hjemtopp__feed', href: '#/feed', 'aria-label': 'Dagens feed' }, ikon('feed')) : null,
      el('a', { class: 'ikonknapp ikonknapp--plain', href: '#/meny', 'aria-label': 'Meny' }, ikon('gir')),
    ),
    el('span', { class: 'hjemtopp__logoboks' }, lagHovedtoppLogo(logoTekst)),
    el('div', { class: 'hjemtopp__side hjemtopp__side--h' },
      el('a', { class: 'ikonknapp ikonknapp--plain', href: '#/merker', 'aria-label': 'Profil' }, ikon('person')),
      lagVarselknapp(),
    ),
  );
}

// Sørger for at den faste headeren finnes og vises, og krysstoner logoen når
// teksten byttet (pilar → pilar). Kalles av sidene under tegning; ruteren
// skjuler headeren igjen for ruter som ikke ba om den i samme tegning.
let _hovedtoppAktiv = false;
function settHovedtopp(logoTekst) {
  _hovedtoppAktiv = true;
  let fast = document.querySelector('.hjemtopp--fast');
  if (!fast) {
    fast = byggHovedtopp(logoTekst, ' hjemtopp--fast');
    document.body.prepend(fast);
    // Plassholder-høyden (--hovedtopp-h) måles fra det ekte elementet: nå
    // (synkront), etter fontlasting og ved resize/rotasjon.
    const mål = () => { const h = fast.offsetHeight; if (h) document.documentElement.style.setProperty('--hovedtopp-h', `${h}px`); };
    mål();
    document.fonts?.ready?.then(mål).catch(() => {});
    window.addEventListener('resize', mål);
  } else {
    // Ulest-status kan ha endret seg siden forrige tegning — fersk varselknapp.
    fast.querySelector('.hjemtopp__varsler')?.replaceWith(lagVarselknapp());
    const boks = fast.querySelector('.hjemtopp__logoboks');
    const gjeldende = boks.querySelector('.hjemtopp__logo:not(.hjemtopp__logo--ut)');
    if (gjeldende && gjeldende.dataset.logo !== logoTekst) {
      const ny = lagHovedtoppLogo(logoTekst);
      boks.querySelectorAll('.hjemtopp__logo--ut').forEach((n) => n.remove()); // maks én utgående om gangen
      if (REDUSERT()) gjeldende.remove();
      else {
        gjeldende.classList.add('hjemtopp__logo--ut');
        ny.classList.add('hjemtopp__logo--inn');
        setTimeout(() => gjeldende.remove(), 400);
      }
      boks.append(ny);
    }
  }
  fast.classList.remove('hjemtopp--skjult');
  document.body.classList.add('har-hovedtopp');
  oversettDom(fast); // engelsk modus: logo og aria-labels følger språket
}

// Sidene kaller denne der headeren før lå i scroll-skallet: oppdaterer den
// faste headeren (kun for den levende appen — aldri for sveipe-peeks, som
// sender live=false) og returnerer plassholderen som reserverer høyden dens.
function lagHovedtopp(logoTekst, live = true) {
  if (live) settHovedtopp(logoTekst);
  return el('div', { class: 'hjemtopp-plass', 'aria-hidden': 'true' });
}

// ===========================================================================
// Hjem (M55) — dagens dashbord: hero med hilsen, tagline og de fire vanene
// som sammenkoblede noder (hver med sin streak-pille), samlet av en «brace»
// ned til «X dag i takt». Deretter «Dagens fokus» og hele Utforsk-innholdet
// (kunnskap & inspirasjon) innfelt. Feeden nås via feed-ikonet oppe til
// venstre eller ved å sveipe til høyre.
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
function visHjemDashboard(mount) {
  const profil = hentProfil();
  if (!profil) { skjerm(APP_NAME, velkommenKort()); return; }

  const fase = dagsfase(new Date().getHours());
  const dagsnr = Math.floor(Date.now() / 86400000);

  // --- Dagens gnister (js/gnist.js): terskler + streaks per pilar ---
  const gs = hentGnistStatus();
  const blaa = gs.blaa;
  const total = GNIST_PILARER.length;

  // --- Topplinje: feed · tannhjul (venstre) · wordmark · profil · varsler (høyre) ---
  const topp = lagHovedtopp(APP_NAME.toLowerCase(), mount === app);

  // --- Hero (M55): hilsen + tagline + fire sammenkoblede pilar-noder ---
  // Hver node lyser fylt når vanen er i boks i dag, med sin egen streak-pille
  // under. En «brace» samler de fire ned til «X dag i takt» (spiller på appnavnet):
  // blå med hake når streaken lever (nådefrist), ellers dempet dagsfremdrift.
  const HERO_IKON = { bevegelse: 'loper', mat: 'eple', ro: 'maane', sosialt: 'personer' };
  const noder = el('div', { class: 'pilarsti' },
    el('span', { class: 'pilarsti__linje', 'aria-hidden': 'true' }),
    ...GNIST_PILARER.map((p) => {
      const st = gs.pilarer[p.id];
      const gjort = st.iDag.naadd;
      const streakTekst = `${st.streak} ${st.streak === 1 ? 'dag' : 'dager'}`;
      return el('a', { class: 'pilarnode' + (gjort ? ' pilarnode--gjort' : ''), href: `#/${p.rute}`,
        'aria-label': `${p.navn}${gjort ? ' — ferdig i dag' : ''}${st.streak ? `, ${streakTekst} på rad` : ''}` },
        el('span', { class: 'pilarnode__disk' }, ikon(HERO_IKON[p.id] || p.ikon)),
        el('span', { class: 'pilarnode__navn' }, p.navn),
        st.streak >= 1
          ? el('span', { class: 'pilarnode__streak' }, ikon('flamme'), streakTekst)
          : el('span', { class: 'pilarnode__streak pilarnode__streak--tom', 'aria-hidden': 'true' }, ikon('flamme'), '0 dag'),
      );
    }),
  );

  const iTakt = blaa.streak >= 1;
  const iTaktTekst = iTakt
    ? `${blaa.streak} ${blaa.streak === 1 ? 'dag' : 'dager'} i takt`
    : `${blaa.tentIDag} av ${total} i dag`;
  const braceBoks = el('div', { class: 'itakt' + (iTakt ? ' itakt--paa' : '') },
    braceSvg(),
    el('a', { class: 'itakt__sum', href: '#/merker', 'aria-label': iTaktTekst },
      iTakt ? el('span', { class: 'itakt__hake' }, ikon('sjekk')) : null,
      el('span', { class: 'itakt__tekst' }, iTaktTekst)),
  );

  const hero = el('section', { class: `hjemdash__hero hjemdash__hero--${fase}`,
    style: `background-image:url('icons/brand/hero-${fase}.webp')` },
    el('div', { class: 'hjemdash__scrim', 'aria-hidden': 'true' }),
    el('div', { class: 'hjemdash__hilsen' },
      el('h1', { class: 'hjemdash__tittel' }, `${HILSEN[fase]}, ${profil.navn || 'du'}.`),
      el('p', { class: 'hjemdash__under' }, 'Fire gode valg. Én dag i takt.')),
    noder,
    braceBoks,
  );

  // --- Dagens fokus — kompassbevisst: har kompasset et relevant budskap for
  // Start (frekvensstyrt, subtilt som standard), brukes det i stedet for den
  // generiske rotasjonen. Retning, aldri press.
  const bud = kompassBudskap('start');
  const dagensFokus = el('section', { class: 'kort hjemdash__fokus' },
    el('span', { class: 'hjemdash__fokusmerke' }, bud ? 'Retningen din' : 'Dagens fokus'),
    el('p', { class: 'hjemdash__fokustekst' }, bud ? bud.tekst : DAGENS_FOKUS[dagsnr % DAGENS_FOKUS.length]),
    bud ? el('a', { class: 'hjemdash__fokuskompass', href: '#/mening', 'aria-label': 'Mitt kompass' }, ikon('kompass')) : null,
  );

  // --- Tilbakekomst («Du trenger ikke ta igjen noe. Du kan begynne der du er.»)
  // Vises når alle gnistene er slukket og ingenting er logget i dag — men bare
  // for brukere som HAR en historikk (aldri som velkomst). Ingen tapte streaks
  // som hovedbudskap; heller: hva ville hjelpe mest nå?
  const harHistorikk = hentLogg().length > 0 || gs.blaa.totaltBlaa > 0;
  const faltUt = harHistorikk && gs.blaa.tentIDag === 0
    && GNIST_PILARER.every((p) => gs.pilarer[p.id].streak === 0);
  const tilbakeKort = faltUt ? el('section', { class: 'kort tilbakekort' },
    el('span', { class: 'tilbakekort__merke' }, 'Begynn der du er'),
    el('p', { class: 'tilbakekort__tekst' },
      kompassBudskap('tilbakekomst')?.tekst || 'Du trenger ikke ta igjen noe. Du kan begynne der du er.'),
    el('p', { class: 'dempet dempet--tett' }, 'Hva ville hjulpet mest nå?'),
    el('div', { class: 'chiprad chiprad--pille tilbakekort__valg' },
      el('a', { class: 'chip', href: '#/trening' }, 'Litt mer energi'),
      el('a', { class: 'chip', href: '#/ro' }, 'Et roligere hode'),
      el('a', { class: 'chip', href: '#/beveg' }, 'Bare noe enkelt'),
      el('a', { class: 'chip', href: '#/sosialt' }, 'Menneskene mine'))) : null;

  tom(mount);
  // Hjem: hero → (tilbakekomst) → dagens fokus → hele Utforsk-innholdet innfelt (M55).
  const hjemMain = el('main', { class: 'innhold hjemdash' }, hero, tilbakeKort, dagensFokus, ...byggUtforskSeksjoner());
  const scroll = el('div', { class: 'hjemdash-scroll' }, topp, hjemMain);
  document.body.classList.add('dash-laast');
  mount.append(scroll, lagPullOppdatering(scroll, { scrollTopFn: () => hjemMain.scrollTop, innhold: hjemMain }));

  // Forhåndslast feed-data så dra-peeken kan vise ekte kort med en gang.
  if (VIS_FEED) lastFeed().catch(() => {});
  // (Sveip mellom sidene håndteres globalt av settOppSideSveip på #app.)
}

// Sveip mellom hovedsidene (Instagram-stil), montert én gang på #app. Stripa
// følger bunnbarens rekkefølge (Mat ← Bevegelse ← Hjem ← Ro ← Fellesskap): en
// horisontal dra mot HØYRE går ett hakk til venstre i stripa, mot VENSTRE ett
// hakk til høyre. Byttene glir over med rute-slide når du slipper forbi
// terskelen. Vi eier den horisontale gesten (preventDefault) så nettleserens
// tilbake-sveip ikke slår inn — det er «tilbake-bug-en» som oppsto fordi appen
// kjører som nettside. Med feeden synlig (VIS_FEED) ligger den ytterst til
// venstre og dras inn med en peek (feeden er «kameraet»).
const SVEIP_STRIP = [...(VIS_FEED ? ['feed'] : []), 'kosthold', 'trening', 'hjem', 'ro', 'sosialt'];
// Logo-ordet i den faste hovedtoppen per hovedside (feed har ingen hovedtopp).
const LOGO_FOR_RUTE = { hjem: APP_NAME.toLowerCase(), kosthold: 'mat', trening: 'bevegelse', ro: 'ro', sosialt: 'fellesskap' };
// Render-funksjon per hovedside (til dra-peeken). Feeden har sin egen (byggFeedPeek).
const SIDE_RENDER = {
  hjem: visHjemDashboard, kosthold: visKostholdSkjerm, trening: visTrening,
  ro: visRoSkjerm, sosialt: visFellesskapSkjerm,
};

// Render en hovedside inn i et løsrevet peek-lag (uten å røre den levende #app).
// Skjermene setter body-klasser (dash-laast osv.) — vi gjenoppretter dem etterpå.
// Peeken er et statisk øyeblikksbilde (ikke-interaktivt); den ekte siden tegnes
// når man slipper.
function byggSidePeek(rute) {
  if (rute === 'feed') return byggFeedPeek();
  const wrap = el('div', { class: 'feedpeek feedpeek--side', 'aria-hidden': 'true' });
  const førBody = document.body.className;
  try { (SIDE_RENDER[rute] || SIDE_RENDER.hjem)(wrap); } catch { /* tom peek ved feil */ }
  document.body.className = førBody;
  // Kommer man fra en side uten den faste headeren (feeden), glir en ikke-
  // interaktiv header-kopi inn med peeken; ellers står den ekte headeren
  // stille over både siden og peeken mens innholdet glir.
  if (!document.body.classList.contains('har-hovedtopp')) {
    const logo = LOGO_FOR_RUTE[rute];
    if (logo) wrap.append(byggHovedtopp(logo, ' hjemtopp--peek'));
  }
  return wrap;
}

// Instagram-stil drag mellom hovedsidene, montert én gang på #app. Stripa
// følger bunnbarens rekkefølge. En horisontal dra FØLGER fingeren: gjeldende
// side skyves til side mens nabosiden (en peek) dras inn fra motsatt kant.
// Mellom to faner står bunnbaren stille (aktiv fane markeres ved slipp); er
// feeden involvert (VIS_FEED) glir bunnbaren bort med sidene. Slipp forbi
// terskelen fullfører (ruten tegnes uten å doble slide); ellers spretter alt
// tilbake. Vi eier den horisontale gesten (preventDefault) så nettleserens
// tilbake-sveip ikke slår inn.
function settOppSideSveip() {
  const bredde = () => window.innerWidth || document.documentElement.clientWidth;
  const naaRute = () => (location.hash.replace('#/', '') || 'hjem').split('?')[0];
  const naboer = (rute) => {
    const i = SVEIP_STRIP.indexOf(rute);
    return { v: i > 0 ? SVEIP_STRIP[i - 1] : null, h: (i >= 0 && i < SVEIP_STRIP.length - 1) ? SVEIP_STRIP[i + 1] : null };
  };
  const iHscroller = (node) => {
    for (let n = node; n && n !== app; n = n.parentElement) {
      if (n.nodeType !== 1) continue;
      const s = getComputedStyle(n);
      if (/(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 2) return true;
    }
    return false;
  };
  const tabbar = () => document.querySelector('.tabbar');

  let sx = null; let sy = null; let retning = null; let aktiv = false; let hoppOver = false;
  let peek = null; let mål = null; let dir = 0; let feedInne = false; let barFolgerPeek = false;

  // Logo-toning i takt med draget (fane→fane): «fade-through» — det gamle
  // ordet er tonet HELT ut idet draget når terskelen (~30 %, samme punkt som
  // fullfører navigasjonen), og det nye er helt inne ved ~60 %. Slik synes
  // byttet i selve bevegelsen, uten at to ord ligger grøtete oppå hverandre,
  // og terskelen kjennes som «vippepunktet» også visuelt. Ved slipp fullfører
  // (eller reverserer) toningen i samme glid som resten. Feed-drag trenger
  // det ikke: feed-peeken dekker headeren / bærer sin egen kopi.
  const DRA_TERSKEL = 0.3; // samme som fullfør-terskelen i slutt()
  let logoDra = null;
  const startLogoDra = (målLogo) => {
    const boks = document.querySelector('.hjemtopp--fast:not(.hjemtopp--skjult) .hjemtopp__logoboks');
    const gammel = boks?.querySelector('.hjemtopp__logo:not(.hjemtopp__logo--ut)');
    if (!boks || !gammel || !målLogo || gammel.dataset.logo === målLogo) return null;
    boks.querySelectorAll('.hjemtopp__logo').forEach((n) => { if (n !== gammel) n.remove(); }); // evt. rester fra tap-bytte/avbrutt dra
    const ny = lagHovedtoppLogo(målLogo);
    // --dra: eget kompositor-lag (will-change) så opasiteten glir jevnt
    // uten tekst-repaint per frame.
    gammel.classList.add('hjemtopp__logo--dra'); ny.classList.add('hjemtopp__logo--dra');
    gammel.style.transition = 'none'; ny.style.transition = 'none'; ny.style.opacity = '0';
    boks.append(ny);
    return { gammel, ny };
  };
  const settLogoDra = (p) => {
    if (!logoDra) return;
    logoDra.gammel.style.opacity = String(Math.max(0, 1 - p / DRA_TERSKEL));
    logoDra.ny.style.opacity = String(Math.min(1, Math.max(0, (p - DRA_TERSKEL) / DRA_TERSKEL)));
  };
  const slippLogoDra = (h, fullfor) => {
    if (!h) return;
    const tr = REDUSERT() ? 'none' : 'opacity 0.36s var(--ease-out)';
    h.gammel.style.transition = tr; h.ny.style.transition = tr;
    void h.ny.offsetWidth; // reflow så transisjonen gjelder fra dra-verdien
    h.gammel.style.opacity = fullfor ? '0' : '1';
    h.ny.style.opacity = fullfor ? '1' : '0';
  };
  const ferdigLogoDra = (h, fullfor) => {
    if (!h) return;
    const igjen = fullfor ? h.ny : h.gammel;
    (fullfor ? h.gammel : h.ny).remove();
    igjen.removeAttribute('style');
    igjen.classList.remove('hjemtopp__logo--dra');
  };

  const settPos = (dxRaw) => {
    const W = bredde();
    const dx = dir > 0 ? Math.max(0, Math.min(W, dxRaw)) : Math.min(0, Math.max(-W, dxRaw));
    app.style.transform = `translateX(${dx}px)`;
    if (peek) peek.style.transform = `translateX(${dx - dir * W}px)`; // peek starter på -dir*W, glir mot 0
    if (feedInne) {
      // Bunnbaren glir i takt med siden den hører til: med #app (Hjem→feed) eller
      // med peeken (feed→Hjem — da må baren vises mens den glir inn).
      const bar = tabbar(); if (bar) bar.style.transform = `translateX(${barFolgerPeek ? (dx - dir * W) : dx}px)`;
    }
    settLogoDra(Math.min(1, Math.abs(dx) / W)); // logoen toner i takt med draget
  };
  const rensTransform = () => {
    app.style.transition = ''; app.style.transform = '';
    const bar = tabbar(); if (bar) { bar.style.transition = ''; bar.style.transform = ''; bar.classList.remove('tabbar--drag'); }
    document.body.classList.remove('sideglir');
  };
  const rydd = () => { peek?.remove(); peek = null; rensTransform(); };
  const animer = (fullfor) => {
    const W = bredde();
    const tr = 'transform 0.36s var(--ease-out)';
    app.style.transition = tr;
    if (peek) peek.style.transition = tr;
    const bar = tabbar();
    if (bar && feedInne) bar.style.transition = tr;
    const hLogo = logoDra; logoDra = null;
    slippLogoDra(hLogo, fullfor); // toningen fullfører/reverserer i samme glid
    if (fullfor) {
      app.style.transform = `translateX(${dir * W}px)`;
      if (peek) peek.style.transform = 'translateX(0)';
      // Baren enten glir bort med #app (Hjem→feed) eller lander på plass med mål-siden (feed→Hjem).
      if (bar && feedInne) bar.style.transform = `translateX(${barFolgerPeek ? 0 : dir * W}px)`;
      setTimeout(() => {
        // Peeken dekker mål-siden. Nullstill #app FØR navigasjon, så den ekte
        // siden tegnes på plass (translateX 0) under peeken; fjern peeken etter.
        ferdigLogoDra(hLogo, true); // én logo igjen FØR settHovedtopp sammenligner
        app.style.transition = ''; app.style.transform = '';
        _droppSlide = true;               // peeken viste alt siden glidende inn
        location.hash = '#/' + mål;
        setTimeout(() => { peek?.remove(); peek = null; rensTransform(); }, 130);
      }, 360);
    } else {
      app.style.transform = 'translateX(0)';
      if (peek) peek.style.transform = `translateX(${-dir * W}px)`;
      if (bar && feedInne) bar.style.transform = `translateX(${barFolgerPeek ? -dir * W : 0}px)`;
      setTimeout(() => { ferdigLogoDra(hLogo, false); rydd(); }, 360);
    }
  };

  app.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || !SVEIP_STRIP.includes(naaRute())) { sx = null; return; }
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
    retning = null; aktiv = false; feedInne = false; barFolgerPeek = false; peek = null; mål = null; dir = 0;
    if (logoDra) { ferdigLogoDra(logoDra, false); logoDra = null; } // hengende dra-toning → tilbakestill
    hoppOver = iHscroller(e.target);
    app.style.transition = '';
  }, { passive: true });

  app.addEventListener('touchmove', (e) => {
    if (sx == null || hoppOver) return;
    const t = e.touches[0]; const dx = t.clientX - sx; const dy = t.clientY - sy;
    if (retning === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.3) { retning = 'v'; return; } // vertikal → la scroll skje
      retning = 'h';
      aktiv = true; // vi eier den horisontale gesten (blokkerer nettleser-tilbake)
      const cur = naaRute(); const nab = naboer(cur);
      dir = dx > 0 ? 1 : -1;
      mål = dir > 0 ? nab.v : nab.h; // dra høyre → venstre-nabo; dra venstre → høyre-nabo
      if (mål) {
        feedInne = (cur === 'feed' || mål === 'feed');
        peek = byggSidePeek(mål);
        peek.style.transform = `translateX(${-dir * bredde()}px)`;
        document.body.appendChild(peek);
        document.body.classList.add('sideglir');
        const bar = tabbar();
        // Slå AV bar-transisjonen under et feed-drag så den følger fingeren 1:1
        // (ellers «henger den etter» pga. sin egen glide-transisjon).
        if (feedInne) {
          barFolgerPeek = (cur === 'feed'); // feed→Hjem: baren følger peeken og må vises
          if (bar) {
            bar.style.transition = 'none';
            if (barFolgerPeek) { bar.classList.add('tabbar--drag'); bar.style.transform = `translateX(${bredde()}px)`; }
          }
        } else {
          logoDra = startLogoDra(LOGO_FOR_RUTE[mål]);
        }
      }
    }
    if (aktiv) { e.preventDefault(); if (mål) settPos(dx); }
  }, { passive: false });

  const slutt = (e) => {
    if (!aktiv) { sx = null; return; }
    const t = e.changedTouches[0]; const dx = t.clientX - sx; sx = null; aktiv = false;
    if (!mål) return; // eide gesten (blokkerte tilbake), men ingen nabo å gå til
    animer(Math.abs(dx) > bredde() * 0.3); // forbi ~30 % → fullfør, ellers sprett tilbake
  };
  app.addEventListener('touchend', slutt, { passive: true });
  app.addEventListener('touchcancel', slutt, { passive: true });
}

// «Brace» som samler de fire pilarene ned mot i-takt-oppsummeringen. Én tynn
// linje fra ytterste node (12,5 %) til ytterste node (87,5 %) med et lite dropp
// i midten. preserveAspectRatio=none + viewBox-høyde = CSS-høyde gjør at bare
// x strekkes (endene lander alltid under ytternodene), mens vector-effect
// holder streken jevn. Fargen arves fra .itakt (blå når streaken lever).
function braceSvg() {
  const wrap = el('div', { class: 'itakt__brace', 'aria-hidden': 'true' });
  wrap.innerHTML = '<svg viewBox="0 0 320 26" preserveAspectRatio="none" class="itakt__bracesvg">'
    + '<path d="M40 2 C40 15 96 17 152 18 C157 18.4 159 21 160 25 C161 21 163 18.4 168 18 C224 17 280 15 280 2" '
    + 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
    + '</svg>';
  return wrap;
}


// ===========================================================================
// Felles pilar-skall (M53) — samme stil som Hjem-dashbordet: hjemtopp-header
// med «<pilar>.»-logo (selve tittelen), naturbilde-hero med kompass-setningen
// + valgfri dags-ring, og en .hjemdash-beholder for modulene. Ingen egen
// hero-tittel — headeren er tittelen, kompasset er setningen. Brukes av
// Mat/Bevegelse/Ro/Sosialt så pilarene føles som ett system.
// ===========================================================================
function pilarSkall(mount, { navn, ring = null, streakStripe = null, heroKort = null }) {
  const fase = dagsfase(new Date().getHours());
  const topp = lagHovedtopp(navn, mount === app);
  const heroBarn = [
    el('div', { class: 'hjemdash__scrim', 'aria-hidden': 'true' }),
  ];
  // Kompasset bakt inn i headeren: budskapsmotoren snakker direkte til pilaren
  // du står på (frekvens-/dimensjonsstyrt) — setningen i samme stil som Hjem-
  // taglinen, med kompasset som sentrert deler ned mot streak-stripa. Har den
  // ingenting relevant å si, blir det et tomt fragment — ingen fyll.
  // Fellesskap → 'sosialt'-modulen.
  const kompassModul = { fellesskap: 'sosialt' }[navn] || navn;
  heroBarn.push(kompassBudKort(kompassModul));
  // Streak-stripe (frostet kort nederst i heroen): flamme + «X dager på rad» +
  // ukesprikker M–S. Fylt prikk = kontakt den dagen, ring rundt = i dag.
  if (streakStripe) {
    const s = streakStripe;
    heroBarn.push(el('a', { class: 'ukestreak', href: s.href || '#/fremgang', 'aria-label': `${s.streak} dager på rad` },
      el('span', { class: 'ukestreak__flamme' + (s.streak > 0 ? ' ukestreak__flamme--paa' : '') }, ikon('flamme')),
      el('span', { class: 'ukestreak__txt' },
        el('b', {}, `${s.streak} ${s.streak === 1 ? 'dag' : 'dager'} på rad`),
        el('span', { class: 'ukestreak__und' }, s.streak > 0 ? 'Fortsett den gode rytmen.' : 'Én kontakt i dag starter rytmen.')),
      el('span', { class: 'ukestreak__uke' }, ...s.dager.map((d) => el('span', { class: 'ukestreak__dag' },
        el('i', { class: 'ukestreak__prikk' + (d.on ? ' ukestreak__prikk--on' : '') + (d.today ? ' ukestreak__prikk--now' : '') }),
        el('span', { class: 'ukestreak__lab' }, d.label))))));
  }
  // Fritt hero-kort (frostet strip nederst i heroen) — brukes av Mat-hjem for
  // sin egen to-tall-stripe (streak + dagens matvalg).
  if (heroKort) heroBarn.push(heroKort);
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
    class: `hjemdash__hero hjemdash__hero--${fase} pilar-hero pilar-hero--${navn}`,
    style: `background-image:url('icons/brand/hero-${fase}.webp')`,
  }, ...heroBarn);
  tom(mount);
  const main = el('main', { class: 'innhold hjemdash' }, hero);
  const scroll = el('div', { class: 'hjemdash-scroll' }, topp, main);
  document.body.classList.add('dash-laast');
  mount.append(scroll, lagPullOppdatering(scroll, { scrollTopFn: () => main.scrollTop, innhold: main }));
  if (settRing) requestAnimationFrame(() => requestAnimationFrame(() => {
    settRing((ring.pst || 0) / 100);
    tallOpp(pstEl, ring.pst || 0, { format: (n) => `${n}%` });
  }));
  return main;
}

// ===========================================================================
// Utforsk (M53) — kuratert oppdagelse: kunnskap & inspirasjon (artikler),
// snarveier per pilar, og inngang til den spillbare feeden. Innholdet bygges
// av byggUtforskSeksjoner() så det kan gjenbrukes både på egen skjerm (fra
// meny-huben) og innfelt nederst på Hjem-dashbordet (M55).
// ===========================================================================
function byggUtforskSeksjoner() {
  const kunnskap = el('div', { class: 'utforsk-grid' }, el('p', { class: 'dempet' }, 'Laster…'));

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

  return [
    el('section', { class: 'utforsk-seksjon' },
      el('h2', { class: 'utforsk-seksjontittel' }, 'Kunnskap & inspirasjon'), kunnskap),
  ];
}

function visUtforskSkjerm(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  skjerm('Utforsk',
    el('p', { class: 'utforsk-under' }, 'Kunnskap og inspirasjon for gode år.'),
    ...byggUtforskSeksjoner(),
  );
}

// ===========================================================================
// Mat (pilar 2) — blue-zones-spising bundet sammen: daglige matvaner («Logg i
// dag») driver mat-gnisten og -streaken; oppskrifter kan legges i en ukesplan
// og/eller handleliste; handlelista utledes av ukesplanen (js/mat.js). Fem
// skjermer: Mat-hjem, Oppskrifter, Oppskrift-detalj, Ukesplan, Handleliste.
// Ingen kalorier — bare handlinger og enkle, gode måltider.
// ===========================================================================
const UKEDAG_KORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const UKEDAG_BOKSTAV = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

// Blue-zones-prinsippene (delt av Mat-hjem og oppskrift-detalj).
const BZ_INFO = {
  planter: { ikon: 'blad', tittel: 'Mest planter', tekst: 'Fyll tallerkenen med grønnsaker, frukt og fullkorn. Kjernen i både norske kostråd (NNR 2023) og blue zones.' },
  belgvekster: { ikon: 'belg', tittel: 'Belgvekster', tekst: 'Proteinrik og mettende — en hjørnestein i kostholdet. Knyttet til lavere kolesterol og hjerterisiko.' },
  fullkorn: { ikon: 'korn', tittel: 'Fullkorn', tekst: 'Rik på fiber som gir jevn energi og metthet. Rundt 90 g om dagen henger sammen med lavere dødelighet (Aune m.fl., 2016).' },
  moderasjon: { pst: '80%', tittel: '80 % mett', tekst: 'Stopp når du er behagelig mett, ikke stappmett. En enkel motvekt mot å overspise.' },
  delmaltid: { ikon: 'personer', tittel: 'Del et måltid', tekst: 'Spis sammen med andre. Sterke sosiale bånd henger sammen med lengre liv (Holt-Lunstad, 2010).' },
};

// Fargeforløp + emoji som bilde-plassholder (vi har ikke matfoto i repoet ennå).
function matBilde(o, klasse = '') {
  return el('span', { class: `matbilde matbilde--${(o && o.farge) || 'lime'}${klasse ? ` ${klasse}` : ''}`, 'aria-hidden': 'true' },
    el('span', { class: 'matbilde__emoji' }, (o && o.emoji) || '🍽️'));
}
function matPille(t) {
  return el('span', { class: 'matpille' }, ikon(t.ikon, 'ikon matpille__ikon'), el('span', {}, t.navn));
}
function prinsippKort(p, klasse = '') {
  return el('div', { class: `matprinsipp__kort${klasse ? ` ${klasse}` : ''}` },
    el('span', { class: 'matprinsipp__disk' }, p.pst ? el('span', { class: 'matprinsipp__pst' }, p.pst) : ikon(p.ikon)),
    el('div', { class: 'matprinsipp__midt' },
      el('span', { class: 'matprinsipp__tittel' }, p.tittel),
      el('span', { class: 'matprinsipp__tekst' }, p.tekst)));
}
// «3 middager, 1 lunsj» av en {frokost,lunsj,middag}-telling.
function beskrivPlan(perType) {
  const NAVN = { middag: ['middag', 'middager'], lunsj: ['lunsj', 'lunsjer'], frokost: ['frokost', 'frokoster'] };
  const deler = [];
  for (const k of ['middag', 'lunsj', 'frokost']) {
    const n = perType[k] || 0;
    if (n) deler.push(`${n} ${NAVN[k][n === 1 ? 0 : 1]}`);
  }
  return deler.join(', ');
}
// Ingredienslinje til detalj: «150 g tørre grønne linser», «2 gulrøtter».
// Navnet får liten forbokstav siden det står inne i en setning (mengde først).
function ingredienstekst(ing) {
  const enhet = (ing.enhet && ing.enhet !== 'stk') ? `${ing.enhet} ` : '';
  const mengde = ing.mengde != null ? `${ing.mengde} ` : '';
  const navn = ing.navn ? ing.navn.charAt(0).toLowerCase() + ing.navn.slice(1) : '';
  return `${mengde}${enhet}${navn}`.trim();
}

// Fane-skall for Mat-undersidene: samme topplinje som pilar-heroene, men uten
// hero — en ren side med stor tittel under.
function matSideSkall(mount) {
  const topp = lagHovedtopp('mat', mount === app);
  tom(mount);
  const main = el('main', { class: 'innhold matside' });
  const scroll = el('div', { class: 'hjemdash-scroll' }, topp, main);
  document.body.classList.add('dash-laast');
  mount.append(scroll, lagPullOppdatering(scroll, { scrollTopFn: () => main.scrollTop, innhold: main }));
  return main;
}

// Ukesprikker (M–S) for en pilar, bygd på de kanoniske gnist-dagene — samme
// kilde som streaken, så prikkene og «X dager på rad» alltid stemmer. Fylt
// prikk = pilaren tent den dagen, ring rundt = i dag. Brukes av streak-stripa
// i pilar-heroen (Mat/Bevegelse/Ro/Fellesskap deler samme header).
function ukestreakPilar(pilarId, nå = Date.now()) {
  const LAB = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
  const aktiv = hentPilarDager(pilarId, nå);
  const idag = new Date(nå); idag.setHours(0, 0, 0, 0);
  const man = new Date(idag.getTime() - ((idag.getDay() + 6) % 7) * 86400000);
  const idagIso = isoDato(idag);
  return LAB.map((label, i) => {
    const iso = isoDato(new Date(man.getTime() + i * 86400000));
    return { label, on: aktiv.has(iso), today: iso === idagIso };
  });
}

// --- Mat-hjem --------------------------------------------------------------
// Myk orddeling: lange norske vanenavn får et usynlig bindestreks-hint (U+00AD)
// ved stavelsesgrenser, så de brytes pent («Belg-vekster») i de smale vane-
// brikkene i stedet for å flyte over. Bindestreken vises kun når ordet faktisk
// må brytes — ellers usynlig. Virker i alle nettlesere (i motsetning til
// hyphens:auto, som mangler norsk ordbok i mange miljøer).
const MYK = '­';
function mykOrddeling(navn) {
  return navn
    .replace(/grønnsaker/g, `grønn${MYK}saker`)
    .replace(/Belgvekster/g, `Belg${MYK}vekster`)
    .replace(/Fullkorn/g, `Full${MYK}korn`);
}

function visKostholdSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { skjerm('Mat', velkommenKort()); return; }

  const gm0 = hentGnistStatus().pilarer.mat;
  const s0 = kostStatus();
  const iDag = () => dagensInnslag() || { vaner: {} };

  // Samme header som Ro/Fellesskap: streak-stripe med flamme, «X dager på rad»
  // og ukesprikker M–S. (Dagens matvalg-antall vises i «Logg i dag»-kortet under.)
  const main = pilarSkall(mount, {
    navn: 'mat',
    streakStripe: { streak: gm0.streak, dager: ukestreakPilar('mat'), href: '#/ukesplan' },
  });
  // Tenner dagens ukesprikk etter en logg (uten full redraw), som ro/fellesskap.
  const merkDagensDot = () => {
    const dot = mount.querySelector('.ukestreak__prikk--now');
    if (dot) dot.classList.add('ukestreak__prikk--on');
  };

  // --- Logg i dag (5 matvaner) ---
  const teller = el('span', { class: 'matkort__teller' }, `${s0.iDagAntall} av ${VANER.length} logget`);
  const oppdater = () => {
    const s = kostStatus();
    teller.textContent = `${s.iDagAntall} av ${VANER.length} logget`;
  };
  const chips = VANER.map((v) => {
    const c = el('button', { class: 'matvane' + (iDag().vaner?.[v.id] ? ' matvane--valgt' : ''), type: 'button',
      onclick: async () => {
        const res = veksleVane(v.id);
        if (!res) return;
        c.classList.toggle('matvane--valgt', res.aktiv);
        if (res.aktiv) { vibrer(); varsle('Godt valg', { ikon: v.ikon }); merkDagensDot(); }
        oppdater();
        await streakEtter(res);
        await blaaEtter();
      } },
      el('span', { class: 'matvane__badge' }, ikon('sjekk', 'ikon matvane__hake')),
      el('span', { class: 'matvane__ikon' }, ikon(v.ikon)),
      el('span', { class: 'matvane__navn' }, mykOrddeling(v.navn)));
    return c;
  });
  const loggKort = el('section', { class: 'kort matkort' },
    el('div', { class: 'matkort__hode' }, el('h2', { class: 'kost__tittel' }, 'Logg i dag'), teller),
    el('div', { class: 'matvaner' }, ...chips),
    el('p', { class: 'matlogg__hint' }, ikon('blad', 'ikon ikon--liten'),
      el('span', {}, 'Små valg, stor forskjell. Du gjør det bra!')));

  // --- For deg i kveld (dagens oppskrift) ---
  const featur = dagensOppskrift();
  const featKort = featur ? (() => {
    const merke = el('button', { class: 'ikonknapp ikonknapp--plain matfeat__merke' + (erFavoritt(featur.id) ? ' er-fav' : ''),
      type: 'button', 'aria-label': 'Lagre',
      onclick: () => { const på = veksleFavoritt(featur.id); merke.classList.toggle('er-fav', på); vibrer(); } }, ikon('bokmerke'));
    return el('section', { class: 'kort matkort' },
      el('div', { class: 'matkort__hode' }, el('h2', { class: 'kost__tittel' }, 'For deg i kveld'), merke),
      el('a', { class: 'matfeat', href: `#/oppskrift?id=${featur.id}` },
        matBilde(featur, 'matfeat__bilde'),
        el('span', { class: 'matfeat__innhold' },
          el('span', { class: 'matmeta matmeta--pille' }, ikon('klokke', 'ikon matmeta__ikon'), `${featur.tidMin} min`),
          el('span', { class: 'matfeat__navn' }, featur.navn),
          el('span', { class: 'matfeat__kort' }, featur.kort || featur.beskrivelse),
          el('span', { class: 'matfeat__cta' }, 'Se oppskrift', ikon('chevron', 'ikon')))));
  })() : null;

  // --- Ukesplan + Handleliste (to halvkort) ---
  const ps = planStatus();
  const hb = byggHandleliste();
  const ukeKort = el('a', { class: 'matmini', href: '#/ukesplan' },
    el('div', { class: 'matmini__hode' }, el('span', { class: 'matmini__tittel' }, 'Ukesplan'), ikon('kalender', 'ikon matmini__ikon')),
    el('span', { class: 'matmini__tall' }, String(ps.antall)),
    el('span', { class: 'matmini__lab' }, ps.antall === 1 ? 'måltid planlagt' : 'måltider planlagt'),
    el('span', { class: 'matmini__sub' }, beskrivPlan(ps.perType) || 'Ingen ennå'));
  const handleKort = el('a', { class: 'matmini', href: '#/handleliste' },
    el('div', { class: 'matmini__hode' }, el('span', { class: 'matmini__tittel' }, 'Handleliste'), ikon('handlepose', 'ikon matmini__ikon')),
    el('span', { class: 'matmini__tall' }, String(hb.totalVarer)),
    el('span', { class: 'matmini__lab' }, hb.totalVarer === 1 ? 'vare å kjøpe' : 'varer å kjøpe'),
    el('span', { class: 'matmini__sub' }, hb.grupper.slice(0, 3).map((g) => g.navn).join(', ') || 'Tom liste'));
  const miniRad = el('div', { class: 'matminirad' }, ukeKort, handleKort);

  // --- Blue Zones-prinsipper ---
  const prinsipper = ['planter', 'moderasjon', 'delmaltid'].map((k) => BZ_INFO[k]);
  const prinsippRad = el('section', { class: 'oppseksjon' },
    el('div', { class: 'seksjonshode seksjonshode--flat' },
      el('h2', { class: 'seksjonstittel' }, 'Blue Zones-prinsipper'),
      el('a', { class: 'seksjonslenke', href: '#/laer' }, 'Se alle', ikon('chevron'))),
    el('div', { class: 'matprinsipp matprinsipp--tre' }, ...prinsipper.map((p) => prinsippKort(p))));

  main.append(loggKort, featKort, miniRad, prinsippRad);
}

// --- Oppskrifter (bla, søk, filtrer) ---------------------------------------
function oppskriftKort(o, stor = false) {
  const merke = el('button', { class: 'oppkort__hjerte' + (erFavoritt(o.id) ? ' oppkort__hjerte--paa' : ''),
    type: 'button', 'aria-label': 'Lagre',
    onclick: (e) => { e.preventDefault(); e.stopPropagation(); const på = veksleFavoritt(o.id); merke.classList.toggle('oppkort__hjerte--paa', på); vibrer(); } },
    ikon('hjerte'));
  return el('a', { class: 'oppkort' + (stor ? ' oppkort--stor' : ''), href: `#/oppskrift?id=${o.id}` },
    el('span', { class: 'oppkort__bilde' }, matBilde(o),
      el('span', { class: 'oppkort__tid' }, ikon('klokke', 'ikon'), `${o.tidMin} min`), merke),
    el('span', { class: 'oppkort__navn' }, o.navn),
    el('span', { class: 'oppkort__kort' }, o.kort || o.beskrivelse),
    el('span', { class: 'matpiller' }, ...oppskriftTags(o, stor ? 2 : 1).map(matPille)));
}
function visOppskrifterSkjerm(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  const main = matSideSkall(mount);

  let sok = '';
  const aktive = new Set();

  // Søkefelt + (dekorativt) filterikon.
  const sokefelt = el('input', { class: 'oppsok__felt', type: 'search', placeholder: 'Søk etter oppskrifter',
    oninput: (e) => { sok = e.target.value; tegn(); } });
  const sokRad = el('div', { class: 'oppsok' },
    ikon('sok', 'ikon oppsok__ikon'), sokefelt, ikon('filter', 'ikon oppsok__filter'));

  const filterRad = el('div', { class: 'oppfiltre' }, ...OPPSKRIFT_FILTRE.map((f) => {
    const c = el('button', { class: 'oppfilter', type: 'button',
      onclick: () => { if (aktive.has(f.id)) aktive.delete(f.id); else aktive.add(f.id); c.classList.toggle('oppfilter--paa'); tegn(); } },
      ikon(f.ikon, 'ikon oppfilter__ikon'), el('span', {}, f.navn));
    return c;
  }));

  // Kuratert (vises uten søk/filter): For deg · Enkle hverdagsretter · Blue Zones.
  const alle = alleOppskrifter();
  const anbefalte = alle.filter((o) => (o.maaltid || []).includes('middag')).slice(0, 2);
  const enkle = alle.filter((o) => (o.tidMin || 99) <= 20).slice(0, 6);
  const bzKort = ['belgvekster', 'fullkorn', 'planter', 'delmaltid'].map((k) => BZ_INFO[k]);
  const seksjon = (tittel, href, ...barn) => el('section', { class: 'oppseksjon' },
    el('div', { class: 'seksjonshode seksjonshode--flat' },
      el('h2', { class: 'seksjonstittel' }, tittel),
      href ? el('a', { class: 'seksjonslenke', href }, 'Se alle', ikon('chevron')) : null),
    ...barn);
  const kuratert = el('div', { class: 'oppkuratert' },
    seksjon('For deg', null, el('div', { class: 'oppdeg' }, ...anbefalte.map((o) => oppskriftKort(o, true)))),
    seksjon('Enkle hverdagsretter', null, el('div', { class: 'opprad' }, ...enkle.map((o) => oppskriftKort(o)))),
    seksjon('Blue Zones-inspirert', '#/laer',
      el('div', { class: 'opprad opprad--bz' }, ...bzKort.map((p) => el('a', { class: 'oppbz', href: '#/laer' },
        el('span', { class: 'oppbz__disk' }, ikon(p.ikon)),
        el('span', { class: 'oppbz__tittel' }, p.tittel),
        el('span', { class: 'oppbz__tekst' }, p.tekst.split('.')[0] + '.'))))));

  const resultat = el('div', { class: 'oppresultat' });

  function tegn() {
    if (sok.trim() || aktive.size) {
      const treff = filtrerOppskrifter(sok, [...aktive]);
      tom(resultat);
      resultat.append(
        el('p', { class: 'dempet oppresultat__teller' }, `${treff.length} ${treff.length === 1 ? 'oppskrift' : 'oppskrifter'}`),
        treff.length
          ? el('div', { class: 'oppgrid' }, ...treff.map((o) => oppskriftKort(o)))
          : el('p', { class: 'dempet' }, 'Ingen treff. Prøv et annet søk eller filter.'));
      kuratert.hidden = true; resultat.hidden = false;
    } else {
      kuratert.hidden = false; resultat.hidden = true;
    }
  }

  main.append(sokRad, filterRad, kuratert, resultat);
  tegn();
}

// --- Oppskrift-detalj ------------------------------------------------------
function visOppskriftSkjerm(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const o = oppskriftMedId(params.get('id') || '');
  if (!o) { location.hash = '#/oppskrifter'; return; }

  const merke = el('button', { class: 'ikonknapp ikonknapp--plain' + (erFavoritt(o.id) ? ' er-fav' : ''),
    type: 'button', 'aria-label': 'Lagre',
    onclick: () => { const på = veksleFavoritt(o.id); merke.classList.toggle('er-fav', på); vibrer(); varsle(på ? 'Lagret' : 'Fjernet', { ikon: 'bokmerke' }); } },
    ikon('bokmerke'));

  tom(mount);
  const topp = el('header', { class: 'hjemtopp hjemtopp--detalj' },
    el('button', { class: 'ikonknapp ikonknapp--plain', type: 'button', 'aria-label': 'Tilbake', onclick: () => history.back() }, ikon('pilvenstre')),
    el('span', { class: 'hjemtopp__logo' }, 'mat', el('span', { class: 'wordmark__prikk' }, '.')),
    merke);
  const main = el('main', { class: 'innhold oppdetalj' });
  mount.append(el('div', { class: 'hjemdash-scroll' }, topp, main));

  // Meta-chips (tid, porsjoner, første tag).
  const metaChips = [
    el('span', { class: 'matmeta matmeta--pille' }, ikon('klokke', 'ikon matmeta__ikon'), `${o.tidMin} min`),
    el('span', { class: 'matmeta matmeta--pille' }, ikon('personer', 'ikon matmeta__ikon'), `${o.porsjoner} porsjoner`),
    ...oppskriftTags(o, 1).map((t) => el('span', { class: 'matmeta matmeta--pille' }, ikon(t.ikon, 'ikon matmeta__ikon'), t.navn)),
  ];

  // Handlingsknapper.
  const planKnapp = el('button', { class: 'knapp oppdetalj__handling', type: 'button',
    onclick: () => leggIUkesplanArk(o) }, ikon('kalender', 'ikon'), el('span', {}, 'Legg i ukesplan'));
  const handleKnapp = el('button', { class: 'knapp knapp--sekundaer oppdetalj__handling', type: 'button',
    onclick: () => leggIHandlelisteArk(o) },
    ikon('handlepose', 'ikon'), el('span', {}, 'Legg til i handleliste'));

  // Ingredienser (2-kolonner) + valgfri dressing.
  const ingRad = (ing) => el('label', { class: 'oppingr__rad' },
    el('input', { type: 'checkbox', class: 'oppingr__boks' }),
    el('span', { class: 'oppingr__hake', 'aria-hidden': 'true' }, ikon('sjekk', 'ikon')),
    el('span', { class: 'oppingr__navn' }, ingredienstekst(ing)));
  const dressing = el('div', { class: 'oppingr oppingr--dressing oppingr--skjul' }, ...(o.dressing || []).map(ingRad));
  const dressingKnapp = (o.dressing && o.dressing.length) ? (() => {
    const b = el('button', { class: 'oppingr__mer', type: 'button', 'aria-expanded': 'false' },
      el('span', {}, 'Vis dressing'), ikon('chevronned', 'ikon oppingr__merikon'));
    b.addEventListener('click', () => {
      const skjult = dressing.classList.toggle('oppingr--skjul');
      b.setAttribute('aria-expanded', String(!skjult));
      b.firstChild.textContent = skjult ? 'Vis dressing' : 'Skjul dressing';
      b.querySelector('.oppingr__merikon').classList.toggle('oppingr__merikon--opp', !skjult);
    });
    return b;
  })() : null;
  const ingrKort = el('section', { class: 'kort oppdetalj__kort' },
    el('div', { class: 'matkort__hode' }, el('h2', { class: 'kost__tittel' }, 'Ingredienser'),
      el('span', { class: 'oppdetalj__porsjoner' }, `${o.porsjoner} porsjoner`)),
    el('div', { class: 'oppingr' }, ...o.ingredienser.map(ingRad)),
    dressing, dressingKnapp);

  // Slik gjør du.
  const stegKort = el('section', { class: 'kort oppdetalj__kort' },
    el('h2', { class: 'kost__tittel' }, 'Slik gjør du'),
    el('ol', { class: 'oppsteg' }, ...o.steg.map((s, i) => el('li', { class: 'oppsteg__rad' },
      el('span', { class: 'oppsteg__nr' }, String(i + 1)),
      el('span', { class: 'oppsteg__tekst' }, s)))));

  // Blue Zones-prinsipper for denne retten.
  const bz = (o.blueZones || []).map((k) => BZ_INFO[k]).filter(Boolean).slice(0, 3);
  const bzRad = bz.length ? el('div', { class: 'matprinsipp matprinsipp--kompakt' }, ...bz.map((p) => prinsippKort(p, 'matprinsipp__kort--kompakt'))) : null;

  main.append(
    el('div', { class: 'oppdetalj__bilde' }, matBilde(o, 'matbilde--hero')),
    el('h1', { class: 'oppdetalj__navn' }, o.navn),
    el('div', { class: 'oppdetalj__meta' }, ...metaChips),
    el('p', { class: 'oppdetalj__beskrivelse' }, o.beskrivelse),
    el('div', { class: 'oppdetalj__handlinger' }, planKnapp, handleKnapp),
    ingrKort, stegKort, bzRad);
}

// Bunnark: legg en oppskrift i ukesplanen (velg uke + måltid + dag).
function leggIUkesplanArk(o) {
  const passer = (o.maaltid && o.maaltid.length) ? MAALTIDER.filter((m) => o.maaltid.includes(m.id)) : MAALTIDER;
  let valgt = passer[0].id;
  let offset = 0;
  const idag = matIsoDag();
  let lukkArk = () => {};

  // Ukevelger i arket, så man kan legge retten i en senere uke.
  const ukeNavn = el('span', { class: 'ukevelger__navn' });
  const forrige = el('button', { class: 'ukevelger__pil ukevelger__pil--forrige', type: 'button', 'aria-label': 'Forrige uke' }, ikon('chevron', 'ikon'));
  const neste = el('button', { class: 'ukevelger__pil', type: 'button', 'aria-label': 'Neste uke' }, ikon('chevron', 'ikon'));
  forrige.addEventListener('click', () => { if (offset > 0) { offset -= 1; tegnDager(); } });
  neste.addEventListener('click', () => { if (offset < UKE_MAKS_OFFSET) { offset += 1; tegnDager(); } });
  const ukevelger = el('div', { class: 'ukevelger ukevelger--nav ukevelger--ark' }, forrige, ukeNavn, neste);

  const dagRad = el('div', { class: 'arkdager' });
  const tegnDager = () => {
    const visTs = Date.now() + offset * UKE_MS;
    ukeNavn.textContent = ukeEtikett(offset, visTs);
    forrige.disabled = offset <= 0;
    neste.disabled = offset >= UKE_MAKS_OFFSET;
    tom(dagRad);
    ukeDatoer(visTs).forEach((iso, i) => {
      const har = maaltidFor(iso)[valgt] === o.id;
      const b = el('button', { class: 'arkdag' + (har ? ' arkdag--valgt' : '') + (iso === idag ? ' arkdag--idag' : ''), type: 'button',
        onclick: () => { settMaaltid(iso, valgt, o.id); vibrer(); varsle('Lagt i ukesplan', { ikon: 'kalender' }); lukkArk(); } },
        el('span', { class: 'arkdag__lab' }, UKEDAG_KORT[i]),
        el('span', { class: 'arkdag__nr' }, String(new Date(`${iso}T12:00:00`).getDate())));
      dagRad.append(b);
    });
  };
  const segRad = el('div', { class: 'arkseg' });
  passer.forEach((m) => {
    const b = el('button', { class: 'arksegknapp' + (m.id === valgt ? ' arksegknapp--paa' : ''), type: 'button',
      onclick: () => { valgt = m.id; [...segRad.children].forEach((c) => c.classList.remove('arksegknapp--paa')); b.classList.add('arksegknapp--paa'); tegnDager(); } },
      m.navn);
    segRad.append(b);
  });
  tegnDager();
  const { lukk } = visArk('Legg i ukesplan',
    el('p', { class: 'dempet dempet--tett' }, o.navn),
    passer.length > 1 ? segRad : null,
    el('div', { class: 'arkukerad' }, el('p', { class: 'arketikett' }, 'Hvilken dag?'), ukevelger),
    dagRad);
  lukkArk = lukk;
}

// Bunnark: review ingrediensene før oppskriften legges i handlelista. Alt er
// huket av («skal kjøpes») som standard — fjern haken på det du har hjemme, så
// legges bare resten til. Det du har hjemme havner i «Har hjemme»-seksjonen.
function leggIHandlelisteArk(o) {
  const varer = oppskriftVarer(o); // {key,navn,mengde,enhet,kategori,har}
  const kjop = new Map(varer.map((v) => [v.key, !v.har])); // key → skal kjøpes?
  let lukkArk = () => {};

  const bekreft = el('button', { class: 'knapp reviewark__bekreft', type: 'button',
    onclick: () => {
      leggOppskriftIHandle(o.id);
      for (const v of varer) settHar(v, !kjop.get(v.key)); // ikke huket = har hjemme
      vibrer(); varsle('Lagt i handlelista', { ikon: 'handlepose' });
      lukkArk();
    } }, el('span', {}, 'Legg til'));
  const oppdater = () => {
    const n = [...kjop.values()].filter(Boolean).length;
    bekreft.firstChild.textContent = n ? `Legg til ${n} ${n === 1 ? 'vare' : 'varer'}` : 'Ingenting å legge til';
    bekreft.disabled = n === 0;
  };
  const rader = varer.map((v) => {
    const rad = el('button', { class: 'reviewvare' + (kjop.get(v.key) ? '' : ' reviewvare--har'), type: 'button',
      onclick: () => { const paa = !kjop.get(v.key); kjop.set(v.key, paa); rad.classList.toggle('reviewvare--har', !paa); oppdater(); } },
      el('span', { class: 'reviewvare__boks' }, ikon('sjekk', 'ikon')),
      el('span', { class: 'reviewvare__navn' }, v.navn),
      el('span', { class: 'reviewvare__mengde' }, v.mengde != null ? `${v.mengde} ${v.enhet}`.trim() : ''));
    return rad;
  });
  const { lukk } = visArk('Legg til i handleliste',
    el('p', { class: 'dempet dempet--tett' }, `${o.navn} · fjern haken på det du har hjemme`),
    el('div', { class: 'reviewvarer' }, ...rader),
    el('div', { class: 'reviewark__fot' }, bekreft));
  lukkArk = lukk;
  oppdater();
}

// --- Ukesplan --------------------------------------------------------------
const UKE_MS = 7 * 86400000;
const UKE_MAKS_OFFSET = 8; // planlegg opptil ~2 måneder fram
function ukeEtikett(offset, ts) {
  if (offset === 0) return 'Denne uka';
  if (offset === 1) return 'Neste uke';
  return `Uke ${ukenummer(ts)}`;
}

function visUkesplanSkjerm(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  const main = matSideSkall(mount);
  let offset = 0;

  // Ukevelger: ‹ Denne uka ›. Storage er datobasert, så alle uker virker.
  const navn = el('span', { class: 'ukevelger__navn' });
  const forrige = el('button', { class: 'ukevelger__pil ukevelger__pil--forrige', type: 'button', 'aria-label': 'Forrige uke' }, ikon('chevron', 'ikon'));
  const neste = el('button', { class: 'ukevelger__pil', type: 'button', 'aria-label': 'Neste uke' }, ikon('chevron', 'ikon'));
  forrige.addEventListener('click', () => { if (offset > 0) { offset -= 1; tegnUke(); } });
  neste.addEventListener('click', () => { if (offset < UKE_MAKS_OFFSET) { offset += 1; tegnUke(); } });
  const velger = el('div', { class: 'ukevelger ukevelger--nav' }, forrige, navn, neste);

  main.append(el('div', { class: 'matside__hode' },
    el('div', {},
      el('h1', { class: 'matside__tittel' }, 'Ukesplan'),
      el('p', { class: 'matside__under' }, 'Planlegg måltidene — denne uka og videre fremover.')),
    velger));
  const kropp = el('div', { class: 'ukesplan-kropp' });
  main.append(kropp);

  function tegnUke() {
    const visTs = Date.now() + offset * UKE_MS;
    navn.textContent = ukeEtikett(offset, visTs);
    forrige.disabled = offset <= 0;
    neste.disabled = offset >= UKE_MAKS_OFFSET;
    tom(kropp);
    kropp.append(...byggUkesplanUke(visTs, tegnUke));
  }
  tegnUke();
}

// Innholdet for én uke (dagsstripe + rader + fot). Skilt ut så ukevelgeren
// kan tegne uka på nytt uten å bygge hele skjermen.
function byggUkesplanUke(visTs, tegnUke) {
  const idag = matIsoDag();
  const datoer = ukeDatoer(visTs);

  const dagstripe = el('div', { class: 'ukedager' }, ...datoer.map((iso, i) => {
    const d = new Date(`${iso}T12:00:00`);
    return el('div', { class: 'ukedag' + (iso === idag ? ' ukedag--idag' : '') },
      el('span', { class: 'ukedag__lab' }, UKEDAG_BOKSTAV[i]),
      el('span', { class: 'ukedag__nr' }, String(d.getDate())));
  }));

  const rader = MAALTIDER.map((m) => {
    const kolonner = datoer.map((iso) => {
      const rid = maaltidFor(iso)[m.id];
      const o = rid ? oppskriftMedId(rid) : null;
      return el('button', { class: 'plandag', type: 'button', onclick: () => planCelleArk(m, iso, tegnUke) },
        o
          ? el('span', { class: 'plandag__fyll' }, matBilde(o, 'plandag__bilde'), el('span', { class: 'plandag__navn' }, o.navn))
          : el('span', { class: 'plandag__tom' }, ikon('pluss', 'ikon')));
    });
    return el('div', { class: 'planrad' },
      el('div', { class: 'planrad__hode' },
        el('span', { class: 'planrad__disk' }, ikon(m.ikon)),
        el('span', { class: 'planrad__tittel' }, m.navn),
        el('span', { class: 'planrad__under' }, m.under)),
      el('div', { class: 'planrad__spor' }, ...kolonner));
  });
  const raderWrap = el('div', { class: 'planrader' }, ...rader);

  // Fot: teller for den viste uka + handlingsknapper + handleliste-lenke
  // (handlelista dekker inneværende uke, som er den man handler for nå).
  const ps = planStatus(visTs);
  const fotTall = el('span', { class: 'planfot__tall' }, String(ps.antall));
  const fotTekst = el('span', { class: 'planfot__tekst' }, ps.dager
    ? `Du har planlagt måltider for ${ps.dager} av 7 dager.`
    : 'Ingen måltider planlagt denne uka ennå.');
  const autofyll = el('button', { class: 'knapp knapp--sekundaer planfot__knapp', type: 'button',
    onclick: () => { autofyllUke(visTs); vibrer(); varsle('Uka er fylt ut', { ikon: 'hexstjerne' }); tegnUke(); } },
    ikon('hexstjerne', 'ikon'), el('span', {}, 'Autofyll uka'));
  const leggTil = el('a', { class: 'knapp planfot__knapp', href: '#/oppskrifter' },
    ikon('pluss', 'ikon'), el('span', {}, 'Legg til måltid'));
  const fot = el('section', { class: 'kort planfot' },
    el('div', { class: 'planfot__sum' },
      el('span', { class: 'planfot__badge' }, fotTall, el('span', { class: 'planfot__badgelab' }, 'måltider planlagt')),
      fotTekst),
    el('div', { class: 'planfot__knapper' }, leggTil, autofyll));

  const hb = byggHandleliste();
  const handleLenke = el('a', { class: 'planhandle', href: '#/handleliste' },
    el('span', { class: 'planhandle__disk' }, ikon('handlepose', 'ikon')),
    el('span', { class: 'planhandle__midt' },
      el('span', { class: 'planhandle__tittel' }, 'Handleliste'),
      el('span', { class: 'planhandle__sub' }, `${hb.totalVarer} ${hb.totalVarer === 1 ? 'vare' : 'varer'} å kjøpe denne uka`),
      el('span', { class: 'planhandle__note' }, ikon('blad', 'ikon ikon--liten'), el('span', {}, 'Følger måltidene for inneværende uke.'))),
    ikon('chevron', 'ikon planhandle__chevron'));

  return [dagstripe, raderWrap, fot, handleLenke];
}

// Bunnark: velg/bytt/fjern oppskrift for én dag + måltid.
function planCelleArk(maaltid, iso, etterpå) {
  const kand = alleOppskrifter().filter((o) => (o.maaltid || []).includes(maaltid.id));
  const naa = maaltidFor(iso)[maaltid.id];
  const d = new Date(`${iso}T12:00:00`);
  const dagNavn = d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
  let lukkArk = () => {};

  const liste = el('div', { class: 'arkvalg' }, ...kand.map((o) => el('button', {
    class: 'arkvalg__rad' + (o.id === naa ? ' arkvalg__rad--valgt' : ''), type: 'button',
    onclick: () => { settMaaltid(iso, maaltid.id, o.id); vibrer(); etterpå(); lukkArk(); } },
    matBilde(o, 'arkvalg__bilde'),
    el('span', { class: 'arkvalg__midt' },
      el('span', { class: 'arkvalg__navn' }, o.navn),
      el('span', { class: 'arkvalg__meta' }, `${o.tidMin} min`)),
    o.id === naa ? ikon('sjekk', 'ikon arkvalg__hake') : null)));

  const fjern = naa ? el('button', { class: 'knapp knapp--sekundaer', type: 'button',
    onclick: () => { settMaaltid(iso, maaltid.id, null); vibrer(); etterpå(); lukkArk(); } },
    ikon('minus', 'ikon'), el('span', {}, 'Fjern fra denne dagen')) : null;

  const { lukk } = visArk(`${maaltid.navn} · ${dagNavn}`, liste, fjern);
  lukkArk = lukk;
}

// --- Handleliste -----------------------------------------------------------
// Delt kollapsbart varegruppe-kort — brukes av både solo- og husstandslista.
// onToggle(key) veksler avkryssing; fjernbar(v)|bool + onFjern(key) styrer om
// en vare kan slettes helt.
function handlegruppeKort(g, { onToggle, fjernbar = false, onFjern = null, tegnPåNytt, startAapen = true }) {
  const teller = el('span', { class: 'handlegruppe__teller' }, `${g.avkrysset} av ${g.antall}`);
  const oppdaterTeller = () => { teller.textContent = `${[...kropp.querySelectorAll('.handlevare--av')].length} av ${g.varer.length}`; };
  const kropp = el('div', { class: 'handlegruppe__kropp' + (startAapen ? '' : ' handlegruppe__kropp--skjul') }, ...g.varer.map((v) => {
    const kanFjern = typeof fjernbar === 'function' ? fjernbar(v) : fjernbar;
    const rad = el('button', { class: 'handlevare' + (v.avkrysset ? ' handlevare--av' : ''), type: 'button',
      onclick: () => { onToggle(v.key); rad.classList.toggle('handlevare--av'); vibrer(); oppdaterTeller(); } },
      el('span', { class: 'handlevare__boks' }, ikon('sjekk', 'ikon handlevare__hake')),
      el('span', { class: 'handlevare__navn' }, v.navn),
      el('span', { class: 'handlevare__mengde' }, v.mengde != null ? `${v.mengde} ${v.enhet}`.trim() : ''),
      kanFjern ? el('span', { class: 'handlevare__slett', role: 'button', 'aria-label': 'Fjern vare',
        onclick: (e) => { e.preventDefault(); e.stopPropagation(); onFjern(v.key); vibrer(); tegnPåNytt(); } }, ikon('kryss', 'ikon')) : null);
    return rad;
  }));
  const hode = el('button', { class: 'handlegruppe__hode', type: 'button', 'aria-expanded': String(startAapen),
    onclick: () => { const skjult = kropp.classList.toggle('handlegruppe__kropp--skjul'); hode.setAttribute('aria-expanded', String(!skjult)); hode.querySelector('.handlegruppe__chevron').classList.toggle('handlegruppe__chevron--lukket', skjult); } },
    el('span', { class: 'handlegruppe__disk' }, ikon(g.ikon)),
    el('span', { class: 'handlegruppe__navn' }, g.navn),
    teller,
    ikon('chevronsopp', 'ikon handlegruppe__chevron' + (startAapen ? '' : ' handlegruppe__chevron--lukket')));
  return el('section', { class: 'kort handlegruppe' }, hode, kropp);
}

function visHandlelisteSkjerm(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const inviteKode = params.get('kode');
  const main = matSideSkall(mount);
  main.append(el('div', { class: 'matside__hode' }, el('h1', { class: 'matside__tittel' }, 'Handleliste')));

  const innhold = el('div', {});
  const tegn = () => { tom(innhold); innhold.append(...(husstand.erIHusstand() ? byggHusstandInnhold(tegn) : byggHandleInnhold(tegn))); };
  tegn();
  main.append(innhold);

  // Delt liste: synk ved åpning (pull → flett → push), tegn på nytt om noe endret.
  if (husstand.erIHusstand()) husstand.synk().then((r) => { if (r && (r.ok || r.borte)) tegn(); });
  // Invitasjonslenke (#/handleliste?kode=XXXX) → åpne bli-med-arket.
  if (inviteKode && !husstand.erIHusstand()) husstandArk(tegn, { forhåndskode: inviteKode });
}

function byggHandleInnhold(tegnPåNytt) {
  const b = byggHandleliste();

  // Toppkort: personer + stepper + del.
  const personTall = el('span', { class: 'handletopp__tall' }, String(b.personer));
  const stepper = (retning) => el('button', { class: 'handletopp__steg', type: 'button', 'aria-label': retning > 0 ? 'Flere' : 'Færre',
    onclick: () => { settPersoner(b.personer + retning); vibrer(); tegnPåNytt(); } }, ikon(retning > 0 ? 'pluss' : 'minus', 'ikon'));
  const del = el('button', { class: 'knapp handletopp__del', type: 'button',
    onclick: async () => {
      const tekst = handlelisteTekst();
      try {
        if (navigator.share) await navigator.share({ title: 'Handleliste', text: tekst });
        else { await navigator.clipboard.writeText(tekst); varsle('Kopiert', { ikon: 'dele' }); }
      } catch { /* avbrutt */ }
    } }, ikon('dele', 'ikon'), el('span', {}, 'Del liste'));
  const toppKort = el('section', { class: 'kort handletopp' },
    el('span', { class: 'handletopp__disk' }, ikon('personer')),
    el('div', { class: 'handletopp__midt' },
      el('span', { class: 'handletopp__navn' }, `For ${b.personer} ${b.personer === 1 ? 'person' : 'personer'}`),
      el('span', { class: 'handletopp__sub' }, beskrivPlan(b.perType) || 'Ingen måltider planlagt')),
    el('div', { class: 'handletopp__stepper' }, stepper(-1), personTall, stepper(1)),
    del);

  // Hurtiglegg-til: skriv en vare og trykk + (eller Enter). Kategori gjettes.
  const felt = el('input', { class: 'hurtigadd__felt', type: 'text', placeholder: 'Legg til en vare…', maxlength: '40', enterkeyhint: 'done' });
  const leggTil = () => {
    if (!leggEgenVare({ navn: felt.value })) return;
    felt.value = ''; vibrer(); varsle('Lagt til', { ikon: 'handlepose' }); tegnPåNytt();
  };
  felt.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); leggTil(); } });
  const hurtig = el('section', { class: 'kort hurtigadd' },
    ikon('handlepose', 'ikon hurtigadd__ikon'),
    felt,
    el('button', { class: 'hurtigadd__knapp', type: 'button', 'aria-label': 'Legg til vare', onclick: leggTil }, ikon('pluss', 'ikon')));
  const deler = [toppKort, hurtig];

  if (!b.totalVarer && !b.har.length) {
    deler.push(el('section', { class: 'kort handletom' },
      el('span', { class: 'handletom__disk' }, ikon('handlepose')),
      el('h2', { class: 'kost__tittel' }, 'Lista er tom'),
      el('p', { class: 'dempet' }, 'Legg oppskrifter i ukesplanen eller skriv inn en vare over — så fyller lista seg.'),
      el('a', { class: 'knapp', href: '#/ukesplan' }, 'Åpne ukesplan')));
  }

  // Varegrupper (kollapsbare). Egne varer kan slettes helt; resten krysses av.
  for (const g of b.grupper) {
    deler.push(handlegruppeKort(g, { onToggle: (key) => veksleAvkrysset(key), fjernbar: (v) => v.egen, onFjern: (key) => fjernEgenVare(key), tegnPåNytt }));
  }

  // Har hjemme (spiskammer): varene du krysset av i review-arket. Starter
  // kollapset. Trykk på en vare for å legge den tilbake i kjøpelista.
  if (b.har.length) {
    const kropp = el('div', { class: 'handlegruppe__kropp handlegruppe__kropp--skjul' },
      el('p', { class: 'handlehar__hint' }, 'Trykk på en vare for å legge den tilbake i lista.'),
      ...b.har.map((v) => el('button', { class: 'handlevare handlevare--harhjemme', type: 'button',
        onclick: () => { settHar(v, false); vibrer(); tegnPåNytt(); } },
        el('span', { class: 'handlevare__boks handlevare__boks--har' }, ikon('sjekk', 'ikon handlevare__hake')),
        el('span', { class: 'handlevare__navn' }, v.navn),
        el('span', { class: 'handlevare__mengde' }, 'Legg tilbake'))));
    const gruppe = el('section', { class: 'kort handlegruppe handlegruppe--har' });
    const hode = el('button', { class: 'handlegruppe__hode', type: 'button', 'aria-expanded': 'false',
      onclick: () => { const skjult = kropp.classList.toggle('handlegruppe__kropp--skjul'); hode.setAttribute('aria-expanded', String(!skjult)); hode.querySelector('.handlegruppe__chevron').classList.toggle('handlegruppe__chevron--lukket', skjult); } },
      el('span', { class: 'handlegruppe__disk' }, ikon('sjekk')),
      el('span', { class: 'handlegruppe__navn' }, 'Har hjemme'),
      el('span', { class: 'handlegruppe__teller' }, String(b.har.length)),
      ikon('chevronsopp', 'ikon handlegruppe__chevron handlegruppe__chevron--lukket'));
    gruppe.append(hode, kropp);
    deler.push(gruppe);
  }

  // Fra oppskrifter (kildene lista bygges på).
  const kildeIder = [...new Set(handlelisteKilder())];
  const kilder = kildeIder.map((id) => oppskriftMedId(id)).filter(Boolean).slice(0, 6);
  if (kilder.length) {
    deler.push(el('section', { class: 'kort handlekilder' },
      el('h2', { class: 'kost__tittel' }, 'Fra oppskrifter'),
      el('div', { class: 'handlekilder__liste' }, ...kilder.map((o) => el('a', { class: 'handlekilde', href: `#/oppskrift?id=${o.id}` },
        matBilde(o, 'handlekilde__bilde'),
        el('span', { class: 'handlekilde__midt' },
          el('span', { class: 'handlekilde__navn' }, o.navn),
          el('span', { class: 'handlekilde__meta' }, `${o.ingredienser.length} varer`)),
        ikon('chevron', 'ikon'))))));
  }

  // Del med husstanden — inngang til opprett/bli-med.
  deler.push(el('section', { class: 'kort husstanddel' },
    el('span', { class: 'husstanddel__disk' }, ikon('personer')),
    el('div', { class: 'husstanddel__midt' },
      el('span', { class: 'husstanddel__tittel' }, 'Del med husstanden'),
      el('span', { class: 'husstanddel__sub' }, 'Én felles liste alle i huset ser og endrer.')),
    el('button', { class: 'knapp knapp--sekundaer husstanddel__knapp', type: 'button', onclick: () => husstandArk(tegnPåNytt) }, 'Kom i gang')));

  return deler;
}

// --- Delt husstandsliste (visning + opprett/bli-med) -----------------------
function byggHusstandInnhold(tegnPåNytt) {
  const h = husstand.hentHusstand();
  const b = husstand.byggGrupper();
  const deler = [];

  // Toppkort: navn + medlemmer + kode + inviter/forlat.
  const undertekst = el('span', { class: 'husstandtopp__sub' }, 'Delt handleliste');
  const medlemRad = el('div', { class: 'husstandtopp__medlemmer' });
  husstand.hentMedlemmer().then((ms) => {
    tom(medlemRad);
    for (const m of ms) medlemRad.append(el('span', { class: 'husstandavatar', title: m.navn || '' }, ((m.navn || '?').trim().charAt(0) || '?').toUpperCase()));
    undertekst.textContent = `Delt · ${ms.length} ${ms.length === 1 ? 'medlem' : 'medlemmer'}`;
  }).catch(() => {});
  const inviter = el('button', { class: 'knapp handletopp__del', type: 'button', onclick: () => delHusstand(h) },
    ikon('dele', 'ikon'), el('span', {}, 'Inviter'));
  const kodePille = el('button', { class: 'husstandkode', type: 'button', title: 'Kopier kode',
    onclick: () => { try { navigator.clipboard?.writeText(h.kode); } catch { /* */ } vibrer(); varsle('Kode kopiert', { ikon: 'dele' }); } },
    el('span', { class: 'husstandkode__lab' }, 'Bli-med-kode'), el('span', { class: 'husstandkode__verdi' }, h.kode));
  const forlat = el('button', { class: 'husstandtopp__forlat', type: 'button', onclick: () => forlatHusstandBekreft(tegnPåNytt) }, 'Forlat');
  deler.push(el('section', { class: 'kort husstandtopp' },
    el('div', { class: 'husstandtopp__hode' },
      el('span', { class: 'husstandtopp__disk' }, ikon('personer')),
      el('div', { class: 'husstandtopp__midt' }, el('span', { class: 'husstandtopp__navn' }, h.navn), undertekst),
      inviter),
    medlemRad,
    el('div', { class: 'husstandtopp__bunn' }, kodePille, forlat)));

  // Hurtiglegg-til (→ delt liste).
  const felt = el('input', { class: 'hurtigadd__felt', type: 'text', placeholder: 'Legg til en vare…', maxlength: '40', enterkeyhint: 'done' });
  const leggTil = () => { if (!husstand.settVare({ navn: felt.value })) return; felt.value = ''; vibrer(); varsle('Lagt til', { ikon: 'handlepose' }); tegnPåNytt(); };
  felt.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); leggTil(); } });
  deler.push(el('section', { class: 'kort hurtigadd' },
    ikon('handlepose', 'ikon hurtigadd__ikon'), felt,
    el('button', { class: 'hurtigadd__knapp', type: 'button', 'aria-label': 'Legg til vare', onclick: leggTil }, ikon('pluss', 'ikon'))));

  // Fyll fra ukesplanen min (importer beregnede varer fra din plan).
  deler.push(el('button', { class: 'knapp knapp--sekundaer husstandfyll', type: 'button',
    onclick: () => {
      const n = husstand.importerVarer(byggHandleliste().grupper.flatMap((g) => g.varer.map((v) => ({ navn: v.navn, mengde: v.mengde, enhet: v.enhet, kategori: g.id }))));
      vibrer(); varsle(n ? `La til ${n} ${n === 1 ? 'vare' : 'varer'}` : 'Alt fra planen er alt med', { ikon: 'kalender' }); tegnPåNytt();
    } }, ikon('kalender', 'ikon'), el('span', {}, 'Fyll fra ukesplanen min')));

  if (!b.totalVarer) {
    deler.push(el('section', { class: 'kort handletom' },
      el('span', { class: 'handletom__disk' }, ikon('handlepose')),
      el('h2', { class: 'kost__tittel' }, 'Lista er tom ennå'),
      el('p', { class: 'dempet' }, 'Skriv inn en vare over, eller hent måltidene fra ukesplanen din.')));
  } else {
    for (const g of b.grupper) {
      deler.push(handlegruppeKort(g, { onToggle: (key) => husstand.veksleAvkrysset(key), fjernbar: true, onFjern: (key) => husstand.fjernVare(key), tegnPåNytt }));
    }
  }
  return deler;
}

// Del bli-med-kode + lenke (Web Share / utklipp).
function delHusstand(h) {
  const url = `${location.origin}${location.pathname}#/handleliste?kode=${h.kode}`;
  const tekst = `Bli med i handlelista «${h.navn}» i Takt.\nKode: ${h.kode}\n${url}`;
  (async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Delt handleliste', text: tekst });
      else { await navigator.clipboard.writeText(tekst); varsle('Invitasjon kopiert', { ikon: 'dele' }); }
    } catch { /* avbrutt */ }
  })();
}

function forlatHusstandBekreft(tegn) {
  const { lukk } = visArk('Forlat husstanden?',
    el('p', { class: 'dempet dempet--tett' }, 'Du kan bli med igjen senere med koden. Lista blir værende for de andre.'),
    el('div', { class: 'arkknapper' },
      el('button', { class: 'knapp knapp--fare', type: 'button', onclick: async () => { await husstand.forlatHusstand(); lukk(); tegn(); varsle('Forlot husstanden'); } }, 'Forlat husstanden'),
      el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: () => lukk() }, 'Avbryt')));
}

// Bunnark: opprett en delt liste eller bli med via kode. Krever innlogging.
function husstandArk(tegn, { forhåndskode = '' } = {}) {
  if (!sync.erInnlogget()) {
    visArk('Delt handleliste',
      el('p', { class: 'dempet dempet--tett' }, 'Logg inn for å dele handlelista med husstanden din — da synker den mellom telefonene deres.'),
      el('div', { class: 'arkknapper' },
        el('a', { class: 'knapp', href: '#/logg-inn' }, 'Logg inn'),
        el('a', { class: 'knapp knapp--sekundaer', href: '#/bli-medlem' }, 'Bli medlem')));
    return;
  }
  let modus = forhåndskode ? 'bli' : 'lag';
  let lukkArk = () => {};
  const navnFelt = el('input', { class: 'arkfelt', type: 'text', placeholder: 'Ditt navn (f.eks. Ada)', maxlength: '20' });
  const husstandsnavnFelt = el('input', { class: 'arkfelt', type: 'text', placeholder: 'Navn på husstanden (f.eks. Hjemme)', maxlength: '30' });
  const kodeFelt = el('input', { class: 'arkfelt arkfelt--kode', type: 'text', placeholder: 'KODE', maxlength: '6', value: (forhåndskode || '').toUpperCase(), autocapitalize: 'characters' });
  const feil = el('p', { class: 'arkfeil', hidden: true });
  const form = el('div', { class: 'husstandform' });
  const send = el('button', { class: 'knapp husstandform__send', type: 'button' }, el('span', {}, 'Lag delt liste'));

  const seg = el('div', { class: 'arkseg' }, ...[['lag', 'Lag ny'], ['bli', 'Bli med']].map(([id, navn]) => {
    const b = el('button', { class: 'arksegknapp' + (id === modus ? ' arksegknapp--paa' : ''), type: 'button',
      onclick: () => { modus = id; [...seg.children].forEach((c) => c.classList.remove('arksegknapp--paa')); b.classList.add('arksegknapp--paa'); tegnForm(); } }, navn);
    return b;
  }));
  function tegnForm() {
    tom(form); feil.hidden = true;
    if (modus === 'lag') { form.append(husstandsnavnFelt, navnFelt); send.firstChild.textContent = 'Lag delt liste'; }
    else { form.append(kodeFelt, navnFelt); send.firstChild.textContent = 'Bli med'; }
  }
  send.addEventListener('click', async () => {
    feil.hidden = true; send.disabled = true;
    try {
      if (modus === 'lag') {
        const start = byggHandleliste().grupper.flatMap((g) => g.varer.map((v) => ({ navn: v.navn, mengde: v.mengde, enhet: v.enhet, kategori: g.id })));
        await husstand.opprettHusstand({ navn: husstandsnavnFelt.value, medlemsnavn: navnFelt.value, startVarer: start });
        varsle('Delt liste opprettet', { ikon: 'personer' });
      } else {
        if ((kodeFelt.value || '').trim().length < 4) { feil.textContent = 'Skriv inn koden du fikk.'; feil.hidden = false; send.disabled = false; return; }
        await husstand.bliMed({ kode: kodeFelt.value, medlemsnavn: navnFelt.value });
        varsle('Du er med i husstanden', { ikon: 'personer' });
      }
      lukkArk(); tegn();
    } catch (e) {
      feil.textContent = (e && e.message && !/REST|\d{3}/.test(e.message)) ? e.message : 'Fant ingen liste med den koden.';
      feil.hidden = false; send.disabled = false;
    }
  });

  tegnForm();
  const { lukk } = visArk('Delt handleliste',
    el('p', { class: 'dempet dempet--tett' }, 'Én felles handleliste for husstanden — alle ser og endrer den samme lista.'),
    seg, form, feil, send);
  lukkArk = lukk;
}

// ===========================================================================
// Ro (pilar 3) — hvile og nervesystem-ro som daglig praksis. Som Fellesskap:
// hero med streak-stripe, en «Hva gjorde du i dag?»-avkryssing (ro-vaner), en
// «Start på 2 minutter»-rad med mikroøkter (egen lett pust-/stillhetsspiller),
// og «For kvelden» med de lange restitusjonsøktene fra biblioteket. Ro-gnisten
// tennes av en avkrysset vane ELLER en fullført restitusjonsøkt.
// ===========================================================================

// Ukesprikker til Ro-stripa (ro-vaner ELLER restitusjonsøkter samme dag).
function ukestreakRo(nå = Date.now()) {
  const LAB = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
  const aktiv = new Set();
  for (const o of lesRolog()) if (o.vaner && Object.values(o.vaner).some(Boolean)) aktiv.add(o.dato);
  for (const o of hentLogg()) if (!o.slettet && loggBevegelseRecovery(o)) { const d = (o.dato || '').slice(0, 10); if (d) aktiv.add(d); }
  const idag = new Date(nå); idag.setHours(0, 0, 0, 0);
  const man = new Date(idag.getTime() - ((idag.getDay() + 6) % 7) * 86400000);
  const idagIso = isoDato(idag);
  return LAB.map((label, i) => {
    const iso = isoDato(new Date(man.getTime() + i * 86400000));
    return { label, on: aktiv.has(iso), today: iso === idagIso };
  });
}
function loggBevegelseRecovery(o) { return (o.bevegelse === 'recovery') || (o.modalitet === 'REST'); }

function visRoSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { skjerm('Ro', velkommenKort()); return; }

  const gro = hentGnistStatus().pilarer.ro;
  const main = pilarSkall(mount, {
    navn: 'ro',
    streakStripe: { streak: gro.streak, dager: ukestreakRo(), href: '#/rofremgang' },
  });

  const merkDagensDot = () => {
    const dot = mount.querySelector('.ukestreak__prikk--now');
    if (dot) dot.classList.add('ukestreak__prikk--on');
  };

  // --- Hva gjorde du i dag? (ro-vaner) ---
  const iDag = () => roDagensInnslag() || { vaner: {} };
  const vaneRader = RO_VANER.map((v) => {
    const på = !!iDag().vaner?.[v.id];
    const c = el('button', { class: 'rovane' + (på ? ' rovane--valgt' : ''), type: 'button',
      onclick: async () => {
        const res = roVeksleVane(v.id);
        if (!res) return;
        c.classList.toggle('rovane--valgt', res.aktiv);
        if (res.aktiv) { vibrer(); varsle('Logget', { ikon: 'maane' }); merkDagensDot(); }
        await streakEtter(res);
        await blaaEtter();
      } },
      el('span', { class: 'rovane__ikon' }, ikon(v.ikon)),
      el('span', { class: 'rovane__navn' }, v.navn),
      el('span', { class: 'rovane__sjekk' }, ikon('sjekk')));
    return c;
  });
  const loggKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Hva gjorde du i dag?'),
    el('p', { class: 'dempet dempet--tett' }, 'Velg det som passet for deg i dag.'),
    el('div', { class: 'rovanegrid' }, ...vaneRader),
    el('a', { class: 'roseLogg', href: '#/rofremgang' }, el('span', {}, 'Se logg'), ikon('chevron')));

  // --- Start på 2 minutter (mikroøkter) ---
  const mikroRad = el('section', {},
    el('div', { class: 'seksjonshode seksjonshode--flat' },
      el('h2', { class: 'seksjonstittel' }, 'Start på 2 minutter'),
      el('a', { class: 'seksjonslenke', href: '#/rofremgang' }, 'Se alle', ikon('chevron'))),
    el('div', { class: 'mikrorad' }, ...MIKRO_OKTER.map((m) =>
      el('button', { class: 'mikrokort', type: 'button', onclick: () => visMikroOkt(m, merkDagensDot) },
        el('span', { class: 'mikrokort__ikon' }, ikon(m.ikon)),
        el('span', { class: 'mikrokort__navn' }, m.navn),
        el('span', { class: 'mikrokort__bunn' },
          el('span', { class: 'mikrokort__min' }, `${m.min} min`),
          ikon('play', 'ikon mikrokort__play'))))));

  // --- For kvelden (lange restitusjonsøkter fra biblioteket) ---
  const RO_TAG = {
    'restitusjon-hoy-intens': 'Dyp avspenning', 'restitusjon-lav-intens': 'Rolig restitusjon',
    'restitusjon-medium-intens': 'Kroppslig ro', 'restitusjon-hoy-lett': 'Rolig pust',
    'restitusjon-medium-lett': 'Rolig pust', 'restitusjon-lav-lett': 'Rolig pust',
  };
  const kveldsokter = hentOkter().filter((o) => o.kategori === 'restitusjon')
    .sort((a, b) => b.varighetMin - a.varighetMin).slice(0, 3);
  const kveldRad = el('section', {},
    el('div', { class: 'seksjonshode seksjonshode--flat' },
      el('h2', { class: 'seksjonstittel' }, 'For kvelden'),
      el('a', { class: 'seksjonslenke', href: '#/okter?kat=restitusjon' }, 'Se alle', ikon('chevron'))),
    el('div', { class: 'roliste' }, ...kveldsokter.map((o) => el('button', { class: 'rokort', type: 'button', onclick: () => aapneOkt(o, { laast: false }) },
      el('span', { class: 'rokort__ikon' }, ikon('maane')),
      el('span', { class: 'rokort__midt' },
        el('span', { class: 'rokort__navn' }, o.navn),
        el('span', { class: 'rokort__meta' }, `${o.varighetMin} min · ${RO_TAG[o.id] || 'Restitusjon'}`)),
      ikon('play', 'ikon rokort__play')))));

  main.append(loggKort, mikroRad, kveldRad);
}

// ===========================================================================
// Mikroøkt-spiller — en rolig fullskjerm-nedtelling for «Start på 2 minutter».
// Pust-varianten viser en pustende ring med «Pust inn / Pust ut»; de andre en
// rolig sirkel + instruksjon. Fullført huker av den tilhørende ro-vanen.
// ===========================================================================
function visMikroOkt(m, merkDot) {
  slippVaaken();
  const total = Math.max(30, Math.round(m.min * 60));
  let igjen = total;
  let ferdig = false;

  const tid = el('div', { class: 'mikro__tid' }, formatMMSS(igjen));
  const fase = m.pust ? el('div', { class: 'mikro__fase' }, 'Pust inn') : el('div', { class: 'mikro__fase' }, ' ');
  const sirkel = el('div', { class: 'mikro__sirkel' + (m.pust ? ' mikro__sirkel--pust' : ' mikro__sirkel--rolig') },
    el('div', { class: 'mikro__kjerne' }));
  if (m.pust) sirkel.style.setProperty('--pustinn', `${m.inn}s`);
  if (m.pust) sirkel.style.setProperty('--pustut', `${m.ut}s`);
  const knapp = el('button', { class: 'streakfeiring__knapp', type: 'button' }, 'Ferdig');

  const overlay = el('div', { class: 'mikro', role: 'dialog', 'aria-label': m.navn },
    el('button', { class: 'mikro__lukk', type: 'button', 'aria-label': 'Lukk', onclick: () => avslutt(false) }, ikon('kryss')),
    el('h1', { class: 'mikro__navn' }, m.navn),
    sirkel, fase, tid,
    el('p', { class: 'mikro__instr' }, m.instr),
    el('div', { class: 'mikro__bunn' }, knapp));
  knapp.addEventListener('click', () => avslutt(true));
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('mikro--pa'));

  // Pust-tekst veksler i takt med inn/ut (kun for pust-økter, uten redusert bevegelse).
  let pustTimer = null;
  if (m.pust && !REDUSERT()) {
    let inn = true;
    fase.textContent = 'Pust inn';
    const veksle = () => { inn = !inn; fase.textContent = inn ? 'Pust inn' : 'Pust ut'; pustTimer = setTimeout(veksle, (inn ? m.inn : m.ut) * 1000); };
    pustTimer = setTimeout(veksle, m.inn * 1000);
  }

  const tikk = setInterval(() => {
    igjen -= 1;
    tid.textContent = formatMMSS(Math.max(0, igjen));
    if (igjen <= 0) avslutt(true);
  }, 1000);

  async function avslutt(fullfort) {
    if (ferdig) return; ferdig = true;
    clearInterval(tikk); if (pustTimer) clearTimeout(pustTimer);
    overlay.classList.add('mikro--ut');
    setTimeout(() => overlay.remove(), 320);
    if (fullfort) {
      const res = roSikreVane(m.vane);
      vibrer(); varsle('Godt gjort — det teller.', { ikon: 'maane' });
      if (merkDot) merkDot();
      await streakEtter(res); await blaaEtter();
    }
  }
}

function formatMMSS(sek) {
  const m = Math.floor(sek / 60); const s = sek % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Se logg (Ro) — streak, ukesrytme og loggen over rolige valg.
function visRoFremgang(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  const gro = hentGnistStatus().pilarer.ro;
  const s = roStatus();
  const stat = (tall, navn) => el('div', { class: 'koststat' },
    el('span', { class: 'koststat__tall' }, String(tall)),
    el('span', { class: 'koststat__navn' }, navn));
  const statusBoks = el('div', { class: 'koststatus' },
    stat(gro.streak, 'dager på rad'),
    stat(s.ukeAktive, 'rolige dager (uke)'),
    stat(s.iDagAntall, 'valg i dag'));

  const dager = ukestreakRo();
  const ukeKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Denne uka'),
    el('div', { class: 'ukestreak__uke ukestreak__uke--stor' }, ...dager.map((d) => el('span', { class: 'ukestreak__dag' },
      el('i', { class: 'ukestreak__prikk' + (d.on ? ' ukestreak__prikk--on' : '') + (d.today ? ' ukestreak__prikk--now' : '') }),
      el('span', { class: 'ukestreak__lab ukestreak__lab--mork' }, d.label)))),
    el('p', { class: 'dempet' }, `${s.ukeAktive} av 7 dager med ro. Én liten pause er nok.`));

  const NAVN = Object.fromEntries(RO_VANER.map((v) => [v.id, v.navn]));
  const logg = lesRolog().filter((o) => o.vaner && Object.values(o.vaner).some(Boolean))
    .sort((a, b) => String(b.dato).localeCompare(String(a.dato))).slice(0, 14);
  const loggKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Logg'),
    logg.length
      ? el('div', { class: 'liste' }, ...logg.map((o) => el('div', { class: 'loggrad' },
          el('span', { class: 'loggrad__dato' }, new Date(`${o.dato}T12:00:00`).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })),
          el('span', { class: 'loggrad__tekst' }, Object.keys(o.vaner).filter((k) => o.vaner[k]).map((k) => NAVN[k] || k).join(' · ')))))
      : el('p', { class: 'dempet' }, 'Ingen rolige valg logget ennå. Huk av på Ro-siden.'));

  skjerm('Ro-logg',
    el('p', { class: 'utforsk-under' }, 'Rytmen din — uten press. Én liten pause om dagen er nok.'),
    statusBoks, ukeKort, loggKort);
}

// ===========================================================================
// Fellesskap (pilar 4) — tilhørighet som daglig praksis. Kjernen i blue zones:
// en liten fast krets («moai») og en jevn rytme av kontakt slår antall
// bekjentskaper. Skjermen har tre soner: RYTMEN (hero + streak-stripe),
// GJØR NOE NÅ (logg dagens kontakt + kom i gang) og HVEM (din krets — «Ta vare
// på noen»). Alt selvrapportert med ett tapp; kretsen bor lokalt (ingen import
// av kontakter). Kontakt-logging tenner fellesskaps-gnisten som all annen vane.
// ===========================================================================

// Ukesprikker til streak-stripa: M–S for inneværende uke, fylt = kontakt.
function ukestreakDager(nå = Date.now()) {
  const LAB = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
  const aktiv = new Set(lesSosiallogg()
    .filter((o) => o.vaner && Object.values(o.vaner).some(Boolean))
    .map((o) => o.dato));
  const idag = new Date(nå); idag.setHours(0, 0, 0, 0);
  const man = new Date(idag.getTime() - ((idag.getDay() + 6) % 7) * 86400000);
  const idagIso = isoDato(idag);
  return LAB.map((label, i) => {
    const iso = isoDato(new Date(man.getTime() + i * 86400000));
    return { label, on: aktiv.has(iso), today: iso === idagIso };
  });
}

function visFellesskapSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { skjerm('Fellesskap', velkommenKort()); return; }

  const gsos = hentGnistStatus().pilarer.sosialt;
  const main = pilarSkall(mount, {
    navn: 'fellesskap',
    streakStripe: { streak: gsos.streak, dager: ukestreakDager() },
  });

  // Merker dagens ukesprikk som tent (uten full redraw) etter en logg.
  const merkDagensDot = () => {
    const dot = mount.querySelector('.ukestreak__prikk--now');
    if (dot) dot.classList.add('ukestreak__prikk--on');
  };

  // --- Logg dagens kontakt (brikker + Annet) ---
  const iDag = () => sosDagensInnslag() || { vaner: {} };
  const chips = SOSIALE_VANER.map((v) => {
    const på = !!iDag().vaner?.[v.id];
    // Haken vises via CSS når brikka har --valgt (robust — ingen hidden-attr).
    const c = el('button', { class: 'kontaktchip' + (på ? ' kontaktchip--valgt' : ''), type: 'button',
      onclick: async () => {
        const res = sosVeksleVane(v.id);
        if (!res) return;
        c.classList.toggle('kontaktchip--valgt', res.aktiv);
        if (res.aktiv) { vibrer(); varsle('Logget', { ikon: 'hjerte' }); merkDagensDot(); }
        await streakEtter(res);
        await blaaEtter();
      } },
      el('span', { class: 'kontaktchip__ikon' }, ikon(v.ikon || 'personer')),
      el('span', { class: 'kontaktchip__navn' }, v.navn),
      el('span', { class: 'kontaktchip__hake' }, ikon('sjekk')));
    return c;
  });

  const loggKort = el('section', { class: 'kort' },
    el('div', { class: 'korthode' },
      el('div', {},
        el('h2', { class: 'kost__tittel' }, 'Logg dagens kontakt'),
        el('p', { class: 'dempet dempet--tett' }, 'Hva gjorde du i dag?')),
      el('a', { class: 'knapp knapp--liten', href: '#/fremgang' }, 'Se fremgang')),
    el('div', { class: 'kontaktgrid' }, ...chips),
    el('div', { class: 'kontaktbunn' },
      el('button', { class: 'annetknapp', type: 'button', onclick: () => annetArk(merkDagensDot) },
        ikon('pluss', 'ikon ikon--liten'), 'Annet'),
      el('a', { class: 'tekstlenke tekstlenke--ikon', href: '#/fremgang' }, ikon('stolper', 'ikon ikon--liten'), 'Vis logg')),
  );

  // --- Ta vare på noen (din krets) ---
  // Endringer (logg kontakt / legg til person) gir en full re-tegning av
  // Fellesskap-skjermen — enkelt og alltid korrekt.
  const reTegnFellesskap = () => visFellesskapSkjerm(mount);
  const krets = sorterKrets();
  let taVareInnhold;
  if (!krets.length) {
    taVareInnhold = el('div', { class: 'kort tomkrets' },
      el('span', { class: 'tomkrets__disk' }, ikon('personer')),
      el('p', { class: 'oppmuntring__tittel' }, 'Legg til noen du vil holde kontakt med'),
      el('p', { class: 'dempet' }, 'Din krets er de få du bryr deg om — som en «moai». Appen minner deg mykt på hvem det har gått en stund med.'),
      el('button', { class: 'knapp', type: 'button', onclick: () => personArk(null, reTegnFellesskap) }, 'Legg til en person'));
  } else {
    taVareInnhold = el('div', { class: 'kretsrail' },
      ...krets.slice(0, 6).map((p) => kretsKort(p, reTegnFellesskap, merkDagensDot)),
      el('button', { class: 'kretskort kretskort--legg', type: 'button', onclick: () => personArk(null, reTegnFellesskap) },
        el('span', { class: 'kretskort__ava kretskort__ava--legg' }, ikon('pluss')),
        el('span', { class: 'kretskort__navn' }, 'Legg til')));
  }
  const taVare = el('section', {},
    el('div', { class: 'seksjonshode seksjonshode--flat' },
      el('h2', { class: 'seksjonstittel' }, 'Ta vare på noen'),
      krets.length ? el('a', { class: 'seksjonslenke', href: '#/krets' }, 'Se alle', ikon('chevron')) : null),
    taVareInnhold);

  // --- Kom i gang (lavterskel-ideer) ---
  const komIGang = el('section', {},
    el('div', { class: 'seksjonshode seksjonshode--flat' },
      el('h2', { class: 'seksjonstittel' }, 'Kom i gang')),
    el('div', { class: 'igangliste' }, ...IGANG_IDEER.map((ide) =>
      el('button', { class: 'igangkort', type: 'button', onclick: () => iGangArk(ide, merkDagensDot) },
        el('span', { class: 'igangkort__ikon' }, ikon(ide.ikon)),
        el('span', { class: 'igangkort__midt' },
          el('span', { class: 'igangkort__tittel' }, ide.tittel),
          el('span', { class: 'igangkort__hint' }, ide.hint)),
        ikon('pilhoyre', 'ikon igangkort__pil')))));

  const moteplass = el('a', { class: 'moteplasslenke', href: '#/moteplasser' },
    el('span', { class: 'moteplasslenke__ikon' }, ikon('kompass')),
    el('span', {}, 'Finn fellesskap i nærheten'), ikon('pilhoyre'));

  main.append(loggKort, taVare, komIGang, moteplass);
}

// Ett personkort i «Ta vare på noen»-railen.
function kretsKort(p, reTegn, merkDot) {
  const met = METODER.find((m) => m.id === p.metode) || METODER[1];
  const handling = el('button', { class: 'kretskort__cta', type: 'button',
    onclick: () => {
      // Åpne telefonens egen app (bevarer trykk-gesten), så logg kontakten.
      if (p.telefon && p.metode === 'ring') location.href = `tel:${p.telefon}`;
      else if (p.telefon && p.metode === 'melding') location.href = `sms:${p.telefon}`;
      const res = registrerKontakt(p.id);
      vibrer(); varsle(`Logget kontakt med ${p.navn}`, { ikon: 'hjerte' });
      if (merkDot) merkDot();
      streakEtter(res).then(() => blaaEtter());
      if (reTegn) reTegn();
    } }, ikon(met.ikon, 'ikon ikon--liten'), met.navn);
  return el('div', { class: 'kretskort' },
    el('button', { class: 'kretskort__topp', type: 'button', 'aria-label': `Rediger ${p.navn}`,
      onclick: () => personArk(p, reTegn) },
      el('span', { class: 'kretskort__ava' }, p.emoji || '🧑'),
      el('span', { class: 'kretskort__navn' }, p.navn),
      el('span', { class: 'kretskort__varme' }, varmeTekst(p))),
    handling);
}

// «+ Annet» — logg en fri kontakt for i dag.
function annetArk(merkDot) {
  const felt = el('input', { class: 'sok', type: 'text', maxlength: '80', placeholder: 'F.eks. «kaffe med en kollega»' });
  const { lukk } = visArk('Logg annen kontakt',
    el('p', { class: 'dempet' }, 'Skriv kort hva du gjorde — alt som er ekte kontakt teller.'),
    felt,
    el('button', { class: 'knapp', type: 'button', onclick: async () => {
      const res = leggTilEgen(felt.value);
      if (!res) { varsle('Skriv noe kort først'); return; }
      lukk(); vibrer(); varsle('Logget', { ikon: 'hjerte' });
      if (merkDot) merkDot();
      await streakEtter(res); await blaaEtter();
    } }, 'Logg kontakt'));
  requestAnimationFrame(() => felt.focus());
}

// «Kom i gang»-ark: ferdig åpningsreplikk du kan dele + markere som gjort.
function iGangArk(ide, merkDot) {
  const idx = Math.floor(Date.now() / 86400000) % ide.forslag.length;
  const felt = el('textarea', { class: 'kostnotat', rows: '3', maxlength: '200' });
  felt.value = ide.forslag[idx];
  const del = el('button', { class: 'knapp', type: 'button', onclick: async () => {
    const tekst = felt.value.trim();
    try {
      if (navigator.share) await navigator.share({ text: tekst });
      else { await navigator.clipboard.writeText(tekst); varsle('Kopiert — lim inn i en melding', { ikon: 'sjekk' }); }
    } catch { /* brukeren avbrøt delingen */ }
  } }, ikon('dele', 'ikon ikon--liten'), 'Del');
  const gjort = el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: async () => {
    const res = leggTilEgen(`${ide.tittel}`);
    lukk(); vibrer(); varsle('Logget', { ikon: 'hjerte' });
    if (merkDot) merkDot();
    if (res) { await streakEtter(res); await blaaEtter(); }
  } }, 'Marker som gjort');
  const { lukk } = visArk(ide.tittel,
    el('p', { class: 'dempet' }, ide.hint + ' Bruk forslaget eller skriv ditt eget.'),
    felt,
    el('div', { class: 'knapprad' }, del, gjort));
}

// ===========================================================================
// Din krets — administrer personene du vil holde varmt (legg til / rediger).
// ===========================================================================
function visKretsSkjerm(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  const krets = sorterKrets();
  const reTegn = () => visKretsSkjerm(mount);

  const rader = krets.map((p) => {
    const met = METODER.find((m) => m.id === p.metode) || METODER[1];
    return el('div', { class: 'kretsrad' },
      el('button', { class: 'kretsrad__midt', type: 'button', onclick: () => personArk(p, reTegn) },
        el('span', { class: 'kretsrad__ava' }, p.emoji || '🧑'),
        el('span', { class: 'kretsrad__tekst' },
          el('span', { class: 'kretsrad__navn' }, p.navn, p.relasjon ? el('span', { class: 'kretsrad__rel' }, ` · ${p.relasjon}`) : null),
          el('span', { class: 'kretsrad__varme' }, varmeTekst(p)))),
      el('button', { class: 'kretsrad__cta', type: 'button', 'aria-label': `${met.navn} ${p.navn}`,
        onclick: () => {
          if (p.telefon && p.metode === 'ring') location.href = `tel:${p.telefon}`;
          else if (p.telefon && p.metode === 'melding') location.href = `sms:${p.telefon}`;
          const res = registrerKontakt(p.id);
          vibrer(); varsle(`Logget kontakt med ${p.navn}`, { ikon: 'hjerte' });
          streakEtter(res).then(() => blaaEtter());
          reTegn();
        } }, ikon(met.ikon)));
  });

  const innhold = krets.length
    ? el('div', { class: 'kort' }, el('div', { class: 'liste' }, ...rader))
    : el('div', { class: 'kort tomkrets' },
        el('span', { class: 'tomkrets__disk' }, ikon('personer')),
        el('p', { class: 'oppmuntring__tittel' }, 'Ingen i kretsen ennå'),
        el('p', { class: 'dempet' }, 'Legg til noen få du vil holde kontakt med. Alt bor på telefonen din — vi henter aldri kontaktlista.'));

  skjerm('Din krets',
    el('p', { class: 'utforsk-under' }, 'De få du vil holde varmt — som en «moai».'),
    innhold,
    el('div', { class: 'knapprad', style: 'margin-top:14px' },
      el('button', { class: 'knapp', type: 'button', onclick: () => personArk(null, reTegn) },
        ikon('pluss', 'ikon ikon--liten'), 'Legg til en person')));
}

// Ark: legg til / rediger en person i kretsen.
function personArk(person, reTegn) {
  const erNy = !person;
  const state = {
    navn: person?.navn || '', emoji: person?.emoji || '🧑', relasjon: person?.relasjon || null,
    metode: person?.metode || 'melding', telefon: person?.telefon || '',
  };

  const navnFelt = el('input', { class: 'sok', type: 'text', maxlength: '40', placeholder: 'Navn', value: state.navn,
    oninput: (e) => { state.navn = e.target.value; } });
  const telFelt = el('input', { class: 'sok', type: 'tel', inputmode: 'tel', placeholder: 'Telefon (valgfritt)', value: state.telefon,
    oninput: (e) => { state.telefon = e.target.value; } });

  const emojiRad = el('div', { class: 'emojirad' }, ...KRETS_EMOJI.map((e) => {
    const b = el('button', { class: 'emojiknapp' + (e === state.emoji ? ' emojiknapp--valgt' : ''), type: 'button',
      onclick: () => { state.emoji = e; emojiRad.querySelectorAll('.emojiknapp').forEach((x) => x.classList.remove('emojiknapp--valgt')); b.classList.add('emojiknapp--valgt'); } }, e);
    return b;
  }));

  const relRad = el('div', { class: 'chiprad chiprad--pille' },
    ...RELASJONER.map((r) => chip(r, { aktiv: state.relasjon === r, onClick: () => {
      state.relasjon = state.relasjon === r ? null : r;
      relRad.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('chip--aktiv', RELASJONER[i] === state.relasjon));
    } })));

  const metRad = el('div', { class: 'chiprad chiprad--pille' },
    ...METODER.map((m) => chip(m.navn, { aktiv: state.metode === m.id, onClick: () => {
      state.metode = m.id;
      metRad.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('chip--aktiv', METODER[i].id === state.metode));
    } })));

  const lagre = el('button', { class: 'knapp', type: 'button', onclick: () => {
    if (!state.navn.trim()) { varsle('Skriv inn et navn'); navnFelt.focus(); return; }
    if (erNy) leggTilPerson(state); else oppdaterPerson(person.id, state);
    lukk(); vibrer(); varsle(erNy ? 'Lagt til i kretsen' : 'Lagret', { ikon: 'sjekk' });
    if (reTegn) reTegn();
  } }, erNy ? 'Legg til' : 'Lagre');

  const knapper = [lagre];
  if (!erNy) {
    knapper.push(el('button', { class: 'knapp knapp--fare knapp--sekundaer', type: 'button', onclick: () => {
      if (confirm(`Fjerne ${person.navn} fra kretsen?`)) { slettPerson(person.id); lukk(); if (reTegn) reTegn(); }
    } }, 'Fjern'));
  }

  visArk(erNy ? 'Legg til en person' : 'Rediger',
    navnFelt,
    el('p', { class: 'arklabel' }, 'Bilde'), emojiRad,
    el('p', { class: 'arklabel' }, 'Relasjon'), relRad,
    el('p', { class: 'arklabel' }, 'Hvordan holder dere kontakt?'), metRad,
    telFelt,
    el('p', { class: 'dempet dempet--tett' }, 'Nummeret lagres bare på telefonen din, og brukes til å åpne ringing/melding.'),
    el('div', { class: 'knapprad' }, ...knapper));
  requestAnimationFrame(() => navnFelt.focus());

  function lukk() { document.querySelector('.ark')?.classList.add('ark--lukker'); setTimeout(() => document.querySelector('.ark')?.remove(), 240); }
}

// ===========================================================================
// Se fremgang (Fellesskap) — rytmen uten skam: streak, ukesaktivitet, hvor
// mange ulike personer du har hatt kontakt med, og loggen.
// ===========================================================================
function visFellesskapFremgang(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  const gsos = hentGnistStatus().pilarer.sosialt;
  const s = sosialStatus();
  const krets = lesKrets();
  const kontaktetSist7 = krets.filter((p) => { const d = dagerSiden(p); return d != null && d <= 7; }).length;

  const stat = (tall, navn) => el('div', { class: 'koststat' },
    el('span', { class: 'koststat__tall' }, String(tall)),
    el('span', { class: 'koststat__navn' }, navn));
  const statusBoks = el('div', { class: 'koststatus' },
    stat(gsos.streak, 'dager på rad'),
    stat(s.ukeAktive, 'dager med kontakt (uke)'),
    stat(kontaktetSist7, 'i kretsen sist uke'));

  // Ukesprikker (samme som stripa) i et kort.
  const dager = ukestreakDager();
  const ukeKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Denne uka'),
    el('div', { class: 'ukestreak__uke ukestreak__uke--stor' }, ...dager.map((d) => el('span', { class: 'ukestreak__dag' },
      el('i', { class: 'ukestreak__prikk' + (d.on ? ' ukestreak__prikk--on' : '') + (d.today ? ' ukestreak__prikk--now' : '') }),
      el('span', { class: 'ukestreak__lab ukestreak__lab--mork' }, d.label)))),
    el('p', { class: 'dempet' }, `${s.ukeAktive} av 7 dager med kontakt. Hver dag teller — også de små.`));

  // Kretsens varme: hvem det har gått lengst med.
  const kalde = sorterKrets(krets).filter((p) => { const d = dagerSiden(p); return d == null || d >= 7; }).slice(0, 4);
  const varmeKort = krets.length ? el('section', { class: 'kort' },
    el('div', { class: 'korthode' },
      el('h2', { class: 'kost__tittel' }, 'Verdt et dult'),
      el('a', { class: 'knapp knapp--liten', href: '#/krets' }, 'Din krets')),
    kalde.length
      ? el('div', { class: 'liste' }, ...kalde.map((p) => el('a', { class: 'listerad', href: '#/krets' },
          el('span', { class: 'listerad__ikon listerad__ikon--emoji' }, p.emoji || '🧑'),
          el('span', { class: 'listerad__navn' }, p.navn, el('span', { class: 'kretsrad__rel' }, ` — ${varmeTekst(p).toLowerCase()}`)),
          el('span', { class: 'listerad__chevron' }, ikon('chevron')))))
      : el('p', { class: 'dempet' }, 'Fin rytme! Du har vært i kontakt med hele kretsen nylig.')) : null;

  // Logg: siste dager med kontakt.
  const logg = lesSosiallogg().filter((o) => o.vaner && Object.values(o.vaner).some(Boolean))
    .sort((a, b) => String(b.dato).localeCompare(String(a.dato))).slice(0, 14);
  const NAVN = Object.fromEntries(SOSIALE_VANER.map((v) => [v.id, v.navn]));
  const loggKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Logg'),
    logg.length
      ? el('div', { class: 'liste' }, ...logg.map((o) => {
          const deler = [...Object.keys(o.vaner).filter((k) => o.vaner[k]).map((k) => NAVN[k] || 'Annet'), ...(o.egne || [])];
          return el('div', { class: 'loggrad' },
            el('span', { class: 'loggrad__dato' }, new Date(`${o.dato}T12:00:00`).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })),
            el('span', { class: 'loggrad__tekst' }, [...new Set(deler)].join(' · ')));
        }))
      : el('p', { class: 'dempet' }, 'Ingen kontakt logget ennå. Logg dagens på Fellesskap-siden.'));

  skjerm('Fremgang',
    el('p', { class: 'utforsk-under' }, 'Rytmen din — uten press. Én ekte kontakt om dagen er nok.'),
    statusBoks, ukeKort, varmeKort, loggKort);
}

// ===========================================================================
// Finn fellesskap — kuraterte, ekte norske møteplasser (offline-cachet data,
// ingen scraping/CORS): frivillig.no, frivilligsentral, DNT, Røde Kors m.fl.
// ===========================================================================
function visMoteplasserSkjerm(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  const holder = el('div', { class: 'roliste sosialkilder' }, el('p', { class: 'dempet' }, 'Laster…'));
  skjerm('Finn fellesskap',
    el('p', { class: 'utforsk-under' }, 'Å bli med i noe fast er en av de sikreste veiene ut av ensomhet. Her er ekte, landsdekkende steder å starte.'),
    el('section', { class: 'kort' }, holder));

  hentSprakJson('arrangement').then((liste) => {
    tom(holder);
    for (const a of liste) {
      const midt = el('span', { class: 'rokort__midt' },
        el('span', { class: 'rokort__navn' }, a.navn),
        el('span', { class: 'rokort__meta' }, a.beskrivelse));
      const ikonBoks = el('span', { class: 'rokort__ikon' }, ikon(a.ikon || 'personer'));
      if (a.url) {
        holder.append(el('a', { class: 'rokort', href: a.url, target: '_blank', rel: 'noopener' },
          ikonBoks, midt, ikon('pilhoyre', 'ikon rokort__play')));
      } else {
        holder.append(el('div', { class: 'rokort rokort--flat' }, ikonBoks, midt));
      }
    }
    oversettDom(holder);
  }).catch(() => { tom(holder); holder.append(el('p', { class: 'dempet' }, 'Kunne ikke laste akkurat nå.')); });
}

// ===========================================================================
// Trening (Min dag) — Mova-dashbord: hvit banner med header + ukeskalender
// (buet underkant — resten av siden ligger som underlag), tre statistikk-kort
// (dagens minutter, ukas aktive dager, gnist-streak) og bevegelsesgrid. Heroen
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

// Bevegelsesgrupper for «Utforsk bevegelse» — hvert filter samler flere
// øktkategorier. Rekkefølgen = chip-rekkefølgen (horisontalt scrollende).
const BEV_GRUPPER = [
  { id: 'rolig', navn: 'Rolig', ikon: 'blad', farge: 'teal', kats: ['yoga', 'toying'] },
  { id: 'hverdag', navn: 'Hverdag', ikon: 'loper', farge: 'lime', kats: ['gatur', 'hverdag'] },
  { id: 'kondisjon', navn: 'Kondisjon', ikon: 'hjerte', farge: 'koral', kats: ['lop', 'sykkel', 'hiit'] },
  { id: 'styrke', navn: 'Styrke', ikon: 'vekt', farge: 'blaa', kats: ['styrke', 'kroppsvekt'] },
  { id: 'mobilitet', navn: 'Mobilitet', ikon: 'yoga', farge: 'lilla', kats: ['mobilitet', 'toying'] },
];
const gruppeForKat = (kat) => BEV_GRUPPER.find((g) => g.kats.includes(kat)) || BEV_GRUPPER[0];

// Øktfavoritter (bokmerker) — egen liste, atskilt fra oppskrift-favorittene.
const OKTFAV_LS = 'trening.oktfavoritter';
function lesOktFav() { try { return JSON.parse(localStorage.getItem(OKTFAV_LS)) || []; } catch { return []; } }
function erOktFav(id) { return lesOktFav().includes(id); }
function vekslOktFav(id) {
  const liste = lesOktFav();
  const i = liste.indexOf(id);
  if (i >= 0) liste.splice(i, 1); else liste.push(id);
  localStorage.setItem(OKTFAV_LS, JSON.stringify(liste));
  return i < 0; // true = ble favoritt nå
}

// Hverdagsbevegelse — husarbeid, hage, pendling og annet dagligliv som også ER
// bevegelse. Logges via «Gjort» (ingen guidet timer). Hver aktivitet har et
// intensitetsnivå som gir multiplikatoren mot bevegelse-minuttene: lett (rolig,
// mye stillestående), moderat (jevn innsats) og hard (tung, får opp pulsen).
// Selv «hard» hverdagsbevegelse er ujevn og delvis stillestående, så en antatt
// standardøkt (HVERDAG_BOUT) ganges ned — et ærlig, men motiverende bidrag.
const HVERDAG_NIVAA = { lett: 0.3, moderat: 0.6, hard: 1.0 };
const HVERDAG_NIVAANAVN = { lett: 'Lett', moderat: 'Moderat', hard: 'Hard' };
const HVERDAG_BOUT = 20; // antatt lengde på én «Gjort»-økt (min) før multiplikator
const hverdagKreditt = (a) => Math.max(1, Math.round((a.varighetMin || HVERDAG_BOUT) * (HVERDAG_NIVAA[a.nivaa] ?? 0.6)));

// Underkategorier for hverdagsbevegelse (vises som et eget filter når «Hverdag»
// er valgt hovedgruppe). Rekkefølgen = chip-rekkefølgen. Hver aktivitet: [navn, nivå].
const HVERDAG_UNDER = [
  { id: 'hjemme', navn: 'Hjemme', ikon: 'hjem', aktiviteter: [
    ['Rydde rom', 'lett'], ['Generell husrydding', 'moderat'], ['Støvsuge', 'moderat'],
    ['Vaske gulv', 'moderat'], ['Vaske bad', 'moderat'], ['Vaske vinduer', 'moderat'],
    ['Tørke støv', 'lett'], ['Skifte sengetøy', 'moderat'], ['Bære og sortere klær', 'moderat'],
    ['Henge opp klær', 'lett'], ['Brette klær', 'lett'], ['Oppvask og kjøkkenrydding', 'lett'],
    ['Lage mat', 'lett'], ['Storrydde kjøkken', 'moderat'], ['Pakke eller organisere', 'moderat'],
    ['Flytte møbler', 'hard'], ['Bære ting mellom etasjer', 'hard'], ['Gå i trapper hjemme', 'moderat'],
  ] },
  { id: 'utehage', navn: 'Ute og hage', ikon: 'tre', aktiviteter: [
    ['Luke', 'moderat'], ['Plante', 'moderat'], ['Grave', 'hard'], ['Rake', 'moderat'],
    ['Klippe plen', 'moderat'], ['Trim busker eller hekk', 'moderat'], ['Vanne', 'lett'],
    ['Bære jord eller planter', 'hard'], ['Stable ved', 'hard'], ['Hugge eller kløyve ved', 'hard'],
    ['Måke snø', 'hard'], ['Koste ute', 'moderat'], ['Vaske terrasse', 'moderat'],
    ['Vaske bil', 'moderat'], ['Male eller olje', 'moderat'], ['Rense takrenner', 'moderat'],
    ['Bære avfall', 'moderat'], ['Generelt vedlikehold ute', 'moderat'],
  ] },
  { id: 'pafarten', navn: 'På farten', ikon: 'sko', aktiviteter: [
    ['Gå til butikk', 'moderat'], ['Gå til jobb eller skole', 'moderat'], ['Sykle til et ærend', 'moderat'],
    ['Gå til kollektivtransport', 'moderat'], ['Gå mellom møter', 'lett'], ['Ta trappene', 'moderat'],
    ['Handle dagligvarer', 'lett'], ['Bære handleposer', 'moderat'], ['Gå på kjøpesenter', 'lett'],
    ['Hente eller levere noe', 'lett'], ['Parkere et stykke unna', 'lett'], ['Gå tur med hund', 'moderat'],
    ['Trille sykkel eller barnevogn', 'moderat'], ['Bære bagasje', 'moderat'],
  ] },
  { id: 'familie', navn: 'Familie og omsorg', ikon: 'personer', aktiviteter: [
    ['Leke aktivt med barn', 'moderat'], ['Leke ute', 'moderat'], ['Leke på gulvet', 'lett'],
    ['Bære barn', 'moderat'], ['Trilletur', 'moderat'], ['Følge barn til skole eller barnehage', 'moderat'],
    ['Bade eller stelle barn', 'lett'], ['Rydde leker', 'lett'], ['Bygge, grave eller ake sammen', 'moderat'],
    ['Familietur', 'moderat'], ['Leke med kjæledyr', 'moderat'], ['Omsorgsarbeid med mye bevegelse', 'moderat'],
  ] },
  { id: 'arbeid', navn: 'Arbeid', ikon: 'vekt', aktiviteter: [
    ['Aktiv arbeidsdag', 'moderat'], ['Stå på jobb', 'lett'], ['Gå mye på jobb', 'moderat'],
    ['Gå i trapper på jobb', 'moderat'], ['Bære varer', 'hard'], ['Fylle på hyller', 'moderat'],
    ['Lagerarbeid', 'moderat'], ['Renholdsarbeid', 'moderat'], ['Håndverksarbeid', 'moderat'],
    ['Hage- eller utearbeid', 'moderat'], ['Pleie- og omsorgsarbeid', 'moderat'], ['Montering', 'moderat'],
    ['Aktiv møte- eller messedag', 'lett'], ['Pendling til fots eller sykkel', 'moderat'],
  ] },
  { id: 'prosjekt', navn: 'Prosjekter og fritid', ikon: 'penn', aktiviteter: [
    ['Male', 'moderat'], ['Pusse opp', 'moderat'], ['Montere møbler', 'moderat'], ['Reparere', 'moderat'],
    ['Bygge', 'moderat'], ['Flytte', 'hard'], ['Pakke ut', 'moderat'], ['Organisere bod', 'moderat'],
    ['Vaske eller vedlikeholde sykkel', 'lett'], ['Fiske fra land', 'lett'], ['Plukke bær eller sopp', 'moderat'],
    ['Fotografering på tur', 'lett'], ['Danse hjemme', 'moderat'], ['Shopping eller loppemarked', 'lett'],
    ['Frivillig arbeid', 'moderat'], ['Arrangement med mye ståing og gåing', 'lett'],
    ['Annen hverdagsbevegelse', 'moderat'],
  ] },
];

// Slug for stabile id-er (favoritter/logg lagres på id). Æ/Ø/Å normaliseres.
const hvSlug = (s) => s.toLowerCase()
  .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Flat liste (samme rolle som før): brukt av finnBevegelse/favoritter/«Gjort».
const HVERDAGSAKTIVITETER = HVERDAG_UNDER.flatMap((u) => u.aktiviteter.map(([navn, nivaa]) => ({
  id: `hv-${u.id}-${hvSlug(navn)}`,
  navn, nivaa,
  varighetMin: HVERDAG_BOUT,
  ikon: u.ikon,
  underkategori: u.id,
  underNavn: u.navn,
  kategori: 'hverdag', bevegelse: 'walk', hverdag: true,
})));

// Finn en økt (bibliotek) ELLER en hverdagsaktivitet på id.
function finnBevegelse(id) {
  return oktMedId(id) || HVERDAGSAKTIVITETER.find((a) => a.id === id) || null;
}
// Hvor mange ganger en økt/aktivitet er logget i dag (for «Gjort ×N»).
function gjortIDag(id) {
  const iso = isoDato(new Date());
  return hentLogg().filter((o) => !o.slettet && (o.dato || '').slice(0, 10) === iso && o.oktId === id).length;
}

function visTrening(mount = app) {
  const profil = hentProfil();
  if (!profil) {
    skjerm(APP_NAME, velkommenKort());
    return;
  }
  const logg = hentLogg();
  const gbev = hentGnistStatus().pilarer.bevegelse;
  // Header som Ro/Fellesskap: naturbilde-hero + streak-stripe. Under: to
  // minuttkort, «Utforsk bevegelse» (filtrerte anbefalinger) og rask tilgang.
  const main = pilarSkall(mount, {
    navn: 'bevegelse',
    streakStripe: { streak: gbev.streak, dager: ukestreakPilar('bevegelse'), href: '#/fremgang' },
  });
  // «Gjort» logger uten full sidetegning: oppdaterer minuttkortene og tenner
  // dagens streak-prikk på stedet (så filter og scroll ikke hopper).
  let minRad = minuttKortRad(profil, logg);
  const oppdaterStatus = () => {
    const ny = minuttKortRad(hentProfil(), hentLogg());
    minRad.replaceWith(ny);
    minRad = ny;
    const dot = mount.querySelector('.ukestreak__prikk--now');
    if (dot) dot.classList.add('ukestreak__prikk--on');
  };
  main.append(
    minRad,
    utforskBevegelse(profil, hentLogg(), oppdaterStatus),
    raskTilgang(),
  );
}

// Tre mål under headeren: (1) personlig dagsmål, (2) ukesmål = WHO-minimumet
// (150 min/uke moderat aktivitet — presisert som minimum), og (3) det daglige
// streak-gulvet som holder rekka i live.
const UKE_MAAL_MIN = 150; // WHO/Helsedirektoratet: minst 150 min moderat i uka
function minuttKortRad(profil, logg) {
  const nå = Date.now();
  const idagIso = isoDato(new Date(nå));
  // Restitusjon/pust (recovery) teller under Ro, ikke som bevegelse-minutter.
  const erBevegelse = (o) => !loggBevegelseRecovery(o);
  const minutter = logg.filter((o) => (o.dato || '').slice(0, 10) === idagIso && erBevegelse(o)).reduce((s, o) => s + (o.varighetMin || 0), 0);
  const maal = DAGSMAAL[profil.varighetsklasse] || 40;
  const beveg = hentGnistStatus().pilarer.bevegelse;
  const sMaal = beveg.iDag.maal;
  const streakTrygg = minutter >= sMaal; // streak-gulvet nådd i dag
  // Ukesminutter man–søn (samme uke som streak-prikkene).
  const idag0 = new Date(nå); idag0.setHours(0, 0, 0, 0);
  const man = new Date(idag0.getTime() - ((idag0.getDay() + 6) % 7) * 86400000);
  const manIso = isoDato(man);
  const sonIso = isoDato(new Date(man.getTime() + 6 * 86400000));
  const ukeMin = logg.filter((o) => { const d = (o.dato || '').slice(0, 10); return d >= manIso && d <= sonIso && erBevegelse(o); }).reduce((s, o) => s + (o.varighetMin || 0), 0);

  // Takt-linje (pace) for uka: du trenger 1 min trening per 67,2 min klokketid
  // for å nå 150 på søndag. Den stiplede «skyggen» viser hvor du bør være akkurat
  // nå — ligger fyllet foran den, er du i forkant.
  const paceMandag = man.getTime();
  const paceFrac = () => Math.min(1, Math.max(0, (Date.now() - paceMandag) / (7 * 86400000)));

  const tallEls = [];
  const barEls = [];
  const kort = (label, verdi, mal, cap, klasse, pace, enhet) => {
    const t = el('b', { class: 'minkort__tall' }, '0');
    const b = el('i', { class: 'minkort__fyll' + (klasse ? ` ${klasse}` : '') });
    tallEls.push([t, verdi]);
    barEls.push([b, Math.min(100, Math.round((verdi / mal) * 100))]);
    const capEl = el('span', { class: 'minkort__cap' }, cap);
    let barOmr;
    if (pace) {
      const paceEl = el('i', { class: 'minkort__pace', 'aria-hidden': 'true' });
      barOmr = el('div', { class: 'minkort__barwrap' }, el('div', { class: 'minkort__bar' }, b), paceEl);
      const settPace = () => {
        const f = paceFrac();
        paceEl.style.left = `${(f * 100).toFixed(1)}%`;
        const skal = Math.round(mal * f);
        capEl.textContent = verdi >= skal ? 'i forkant av takta' : `${skal - verdi} min bak takta`;
      };
      settPace();
      // Oppdater hvert minutt; rydder seg selv når kortet forsvinner (sidebytte).
      const iv = setInterval(() => { if (!document.contains(paceEl)) { clearInterval(iv); return; } settPace(); }, 60000);
    } else {
      barOmr = el('div', { class: 'minkort__bar' }, b);
    }
    return el('section', { class: 'kort minkort' },
      el('span', { class: 'minkort__label' }, label),
      el('div', { class: 'minkort__verdi' }, t, el('span', { class: 'minkort__enhet' }, enhet || `/ ${mal} min`)),
      barOmr,
      capEl);
  };

  // Tallet viser alltid faktiske minutter trent i dag; streak-kortet dropper
  // «/10» når gulvet er nådd (ellers ser «40 / 10» rart ut).
  const rad = el('div', { class: 'minkort-rad minkort-rad--tre' },
    kort('I dag', minutter, maal, minutter >= maal ? 'dagsmålet er nådd' : 'ditt dagsmål'),
    kort('Denne uka', ukeMin, UKE_MAAL_MIN, 'WHO-minimum', null, true),
    kort('Streak', minutter, sMaal, streakTrygg ? 'streaken er trygg' : 'holder streaken',
      'minkort__fyll--gnist', false, streakTrygg ? 'min i dag' : `/ ${sMaal} min`));

  requestAnimationFrame(() => requestAnimationFrame(() => {
    barEls.forEach(([b, pst]) => fyllInn(b, 'width', `${pst}%`));
  }));
  tallEls.forEach(([t, v]) => tallOpp(t, v, { ms: 600 }));
  return rad;
}

// «Utforsk bevegelse»: horisontalt scrollende gruppefilter + de tre mest
// anbefalte øktene i valgt gruppe (scoret av restitusjon/preferanser).
function utforskBevegelse(profil, logg, oppdaterStatus) {
  const scores = regionScores(logg);
  const skaar = skaarOkter(scores, profil);
  let valgt = BEV_GRUPPER[0].id;
  let valgtUnder = HVERDAG_UNDER[0].id; // valgt underkategori når «Hverdag» er på

  const hverdagGruppe = BEV_GRUPPER.find((g) => g.id === 'hverdag');
  const chipsRad = el('div', { class: 'bevfilter' });
  const underRad = el('div', { class: 'bevfilter bevfilter--under', hidden: true }); // underkategori-filter
  const liste = el('div', { class: 'bevanbef' });

  const tegnUnderChips = () => {
    tom(underRad);
    HVERDAG_UNDER.forEach((u) => {
      const chip = el('button', { class: 'bevchip bevchip--liten' + (u.id === valgtUnder ? ' bevchip--paa' : ''), type: 'button',
        onclick: () => { valgtUnder = u.id; tegnUnderChips(); tegnListe(); } },
        el('span', {}, u.navn));
      underRad.append(chip);
    });
  };

  const tegnListe = () => {
    tom(liste);
    if (valgt === 'hverdag') {
      // Hverdag: vis underkategori-filteret og HELE den valgte underkategorien.
      underRad.hidden = false;
      HVERDAGSAKTIVITETER.filter((a) => a.underkategori === valgtUnder)
        .forEach((a) => liste.append(bevAnbefRad(a, hverdagGruppe, oppdaterStatus)));
      return;
    }
    // Andre grupper: de tre høyest scorede bibliotekøktene i gruppen.
    underRad.hidden = true;
    const g = BEV_GRUPPER.find((x) => x.id === valgt);
    const okter = skaar.filter((s) => g.kats.includes(s.okt.kategori)).slice(0, 3).map((s) => s.okt);
    if (!okter.length) { liste.append(el('p', { class: 'dempet dempet--tett' }, 'Ingen forslag akkurat nå.')); return; }
    okter.forEach((okt) => liste.append(bevAnbefRad(okt, g, oppdaterStatus)));
  };

  BEV_GRUPPER.forEach((g) => {
    const chip = el('button', { class: 'bevchip' + (g.id === valgt ? ' bevchip--paa' : ''), type: 'button',
      onclick: () => { valgt = g.id; [...chipsRad.children].forEach((c) => c.classList.remove('bevchip--paa')); chip.classList.add('bevchip--paa'); tegnListe(); } },
      el('span', { class: 'bevchip__ikon' }, ikon(g.ikon)), el('span', {}, g.navn));
    chipsRad.append(chip);
  });
  tegnUnderChips();
  tegnListe();

  return el('section', { class: 'bevutforsk' },
    el('div', { class: 'seksjonshode seksjonshode--flat' },
      el('h2', { class: 'seksjonstittel' }, 'Utforsk bevegelse'),
      el('a', { class: 'seksjonslenke', href: '#/okter' }, 'Se alle', ikon('chevron'))),
    chipsRad,
    underRad,
    liste);
}

// Én rad: miniatyr + tittel/meta/beskrivelse + Start/Gjort/bokmerke. Fungerer
// både for bibliotekøkter og hverdagsaktiviteter (sistnevnte: intensitetsvektet
// kreditt, ingen guidet timer). «Gjort» kan trykkes flere ganger og teller opp (×N).
function bevAnbefRad(okt, gruppe, oppdaterStatus) {
  const hverdag = !!okt.hverdag;
  const kreditt = hverdag ? hverdagKreditt(okt) : okt.varighetMin;
  const desc = (okt.beskrivelse || '').split(/(?<=[.!?])\s/)[0];

  const bokmerke = el('button', { class: 'bevrad__merke' + (erOktFav(okt.id) ? ' bevrad__merke--paa' : ''),
    type: 'button', 'aria-label': 'Lagre', onclick: () => {
      const på = vekslOktFav(okt.id);
      bokmerke.classList.toggle('bevrad__merke--paa', på);
      vibrer(); varsle(på ? 'Lagret' : 'Fjernet', { ikon: 'bokmerke' });
    } }, ikon('bokmerke'));

  const gjortTekst = el('span', {});
  const gjort = el('button', { class: 'knapp knapp--sekundaer knapp--liten bevrad__knapp bevrad__gjort', type: 'button' },
    ikon('sjekk', 'ikon'), gjortTekst);
  const tegnGjort = () => {
    const n = gjortIDag(okt.id);
    gjortTekst.textContent = n > 0 ? `Gjort · ${n}×` : 'Gjort';
    gjort.classList.toggle('bevrad__gjort--paa', n > 0);
  };
  gjort.addEventListener('click', () => {
    registrerOgLogg({ bevegelse: okt.bevegelse || 'walk', varighetMin: kreditt, tittel: okt.navn, kilde: 'manuell', ekstra: { oktId: okt.id } });
    vibrer(); varsle(`Logget · ${kreditt} min bevegelse`, { ikon: 'sjekk' });
    tegnGjort();
    if (oppdaterStatus) oppdaterStatus();
  });
  tegnGjort();

  const meta = el('p', { class: 'bevrad__meta' });
  if (hverdag) {
    // Intensitetsnivå (lett/moderat/hard) + kreditterte minutter — nivået er
    // multiplikatoren brukeren ser: derfor teller «Lett» mindre enn «Hard».
    meta.append(
      el('span', { class: `bevrad__nivaa bevrad__nivaa--${okt.nivaa}` }, HVERDAG_NIVAANAVN[okt.nivaa] || 'Moderat'),
      el('span', { class: 'bevrad__prikk' }, '·'),
      el('span', { class: 'bevrad__vekt' }, `teller ${kreditt} min`));
  } else {
    meta.append(`${okt.varighetMin} min`, el('span', { class: 'bevrad__prikk' }, '·'), ikon(gruppe.ikon, 'ikon ikon--liten'), gruppe.navn);
  }

  return el('div', { class: 'bevrad' },
    oktMiniatyr(okt, gruppe),
    el('div', { class: 'bevrad__midt' },
      el('h3', { class: 'bevrad__tittel' }, okt.navn),
      meta,
      desc ? el('p', { class: 'bevrad__desk' }, desc) : null),
    el('div', { class: 'bevrad__hoyre' },
      hverdag ? null : el('a', { class: 'knapp knapp--sekundaer knapp--liten bevrad__knapp', href: `#/okter?start=${okt.id}` }, 'Start'),
      gjort,
      bokmerke));
}

// Miniatyr uten foto: gruppens farge + øktas eget/kategori-ikon (variasjon per rad).
function oktMiniatyr(okt, gruppe) {
  return el('span', { class: `bevmini bevmini--${gruppe.farge}`, 'aria-hidden': 'true' },
    ikon(okt.ikon || KAT_IKON[okt.kategori] || gruppe.ikon, 'bevmini__ikon'));
}

// Rask tilgang: fire snarveier (timer, logg, favoritter, planlegg).
function raskTilgang() {
  const kort = (ikonNavn, tittel, sub, href) => el('a', { class: 'rasktkort', href },
    el('span', { class: 'rasktkort__ikon' }, ikon(ikonNavn)),
    el('span', { class: 'rasktkort__tittel' }, tittel),
    el('span', { class: 'rasktkort__sub' }, sub));
  return el('section', { class: 'bevutforsk' },
    el('div', { class: 'seksjonshode seksjonshode--flat' }, el('h2', { class: 'seksjonstittel' }, 'Rask tilgang')),
    el('div', { class: 'rasktrad' },
      kort('stoppeklokke', 'Start timer', 'Kom i gang nå.', '#/hurtig'),
      kort('penn', 'Logg aktivitet', 'Noter økt eller tur.', '#/loggfor'),
      kort('hjerte', 'Se favoritter', 'Dine lagrede økter.', '#/beveg-favoritter'),
      kort('kalender', 'Planlegg uke', 'Få oversikt.', '#/kalender')));
}

// Favorittskjerm: øktene man har bokmerket (fra «Se favoritter»/bokmerke-knappen).
function visOktFavoritter(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  tom(mount);
  const topp = el('header', { class: 'hjemtopp hjemtopp--detalj' },
    el('button', { class: 'ikonknapp ikonknapp--plain', type: 'button', 'aria-label': 'Tilbake', onclick: () => history.back() }, ikon('pilvenstre')),
    el('span', { class: 'hjemtopp__logo' }, 'Favoritter'),
    el('span', { style: 'width:40px' }));
  const main = el('main', { class: 'innhold matside' });
  const okter = lesOktFav().map((id) => finnBevegelse(id)).filter(Boolean);
  if (!okter.length) {
    main.append(el('div', { class: 'kort kort--info' },
      el('h2', {}, 'Ingen favoritter ennå'),
      el('p', { class: 'dempet' }, 'Trykk bokmerket på en økt for å lagre den her.'),
      el('a', { class: 'knapp', href: '#/trening' }, 'Utforsk bevegelse')));
  } else {
    main.append(el('div', { class: 'bevanbef' }, ...okter.map((okt) => bevAnbefRad(okt, gruppeForKat(okt.kategori)))));
  }
  const scroll = el('div', { class: 'hjemdash-scroll' }, topp, main);
  document.body.classList.add('dash-laast');
  mount.append(scroll, lagPullOppdatering(scroll, { scrollTopFn: () => main.scrollTop, innhold: main }));
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

// Tre kort: dagens minutter mot dagsmålet, ukas aktive dager, gnist-streaken.
// Med glass=true (i heroen) er kortene frostet hvite så bildet skinner gjennom.
function statKortRad(profil, logg, glass = false) {
  const idagIso = isoDato(new Date());
  const minutter = logg
    .filter((o) => (o.dato || '').slice(0, 10) === idagIso)
    .reduce((s, o) => s + (o.varighetMin || 0), 0);
  const maal = DAGSMAAL[profil.varighetsklasse] || 40;
  const dager = dagerMedAktivitet(logg, Date.now(), 7);
  const aktive = dager.filter((m) => m > 0).length;
  const beveg = hentGnistStatus().pilarer.bevegelse;

  const minBar = el('div', { class: 'xpbar__fyll' });
  fyllInn(minBar, 'width', `${Math.min(100, Math.round((minutter / maal) * 100))}%`);
  const gnistBar = el('div', { class: 'xpbar__fyll xpbar__fyll--gnist' });
  fyllInn(gnistBar, 'width', `${Math.min(100, Math.round((beveg.iDag.verdi / beveg.iDag.maal) * 100))}%`);

  // Tallene teller opp (i takt med at barene fyller) — dashbordet «våkner».
  const minTall = el('span', { class: 'statkort__tall' }, '0');
  const aktiveTall = el('span', { class: 'statkort__tall' }, '0');
  const gnistTall = el('span', { class: 'statkort__tall' }, '0');

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
      el('span', { class: 'statkort__label' }, 'Dager på rad'),
      el('div', { class: 'statkort__midt' },
        gnistTall,
        el('span', { class: 'statkort__ikon statkort__ikon--gnist' + (beveg.iDag.naadd ? ' statkort__ikon--tent' : '') }, ikon('flamme')),
      ),
      el('span', { class: 'statkort__sub' }, beveg.iDag.naadd ? `${beveg.iDag.maal} min nådd i dag` : `${beveg.iDag.verdi} av ${beveg.iDag.maal} min i dag`),
      el('div', { class: 'xpbar statkort__bar' }, gnistBar),
    ),
  );
  tallOpp(minTall, minutter, { ms: 600 });
  tallOpp(aktiveTall, aktive, { ms: 500 });
  tallOpp(gnistTall, beveg.streak, { ms: 700 });
  return rad;
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

// Varsler (bak bjella): en avledet feed av fullførte økter og opptjente
// merker (js/varsler.js). Å åpne skjermen markerer alt som sett, så
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
        el('p', { class: 'dempet' }, 'Fullfør en økt, så dukker den opp her — sammen med nye merker.'),
        el('a', { class: 'knapp', href: '#/beveg' }, 'Finn en økt'),
      );

  // Varsler er et panel som glir inn fra høyre — egen tilbake-header (‹) som
  // fører tilbake til hovedappen (og glir ut igjen).
  tom(app);
  app.append(
    el('header', { class: 'topp topp--kjor' },
      el('button', { class: 'topp__tilbake', type: 'button', 'aria-label': 'Tilbake', onclick: tilbakeTilApp }, '‹'),
      el('div', {}, el('h1', { class: 'topp__tittel' }, 'Varsler')),
    ),
    el('main', { class: 'innhold' }, innhold),
  );
  merkVarslerSett(feed[0]?.ts); // alt som vises nå (feeden er nyeste-først) regnes som sett
}

// Tilbake fra et slide-over-panel (varsler): bruk historikken hvis vi kom fra
// appen (bevarer scroll + gir riktig slide-retning), ellers naviger til Hjem.
function tilbakeTilApp() {
  if (history.length > 1) history.back();
  else location.hash = '#/hjem';
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
        lenke('kompass', 'Mitt kompass', '#/mening'),
        lenke('person', 'Profil', '#/merker'),
        lenke('bok', 'Lær', '#/laer'),
        lenke('gir', 'Innstillinger', '#/innstillinger'),
        lenke('info', `Om ${APP_NAME}`, '#/om'),
      ),
    ),
  );
}

// ===========================================================================
// Mening — «Mitt kompass» (systemdesign 1.0): ikke et stort tekstfelt, men et
// stille personaliseringslag under hele TAKT. Ingen kompass → en rolig femstegs
// oppsettsflyt (progressiv avsløring, brukbart resultat selv om man stopper
// tidlig). Kompass → resultatsiden med kompasskortet, «det jeg vil bevare»,
// «akkurat nå», ukens refleksjon og full kontroll (rediger/pause/slett).
// Retning, ikke press. Personlig, ikke påtrengende.
// ===========================================================================
// Kompasset i pilar-heroene — vises bare når budskapsmotoren har noe relevant
// å si (dimensjons-, tone- og frekvensstyrt). Setningen skrives i samme stil
// som taglinen på Hjem («Fire gode valg. Én dag i takt.»), og kompasset står
// som en sentrert deler mellom setningen og streak-stripa under. Har ikke
// appen et godt budskap, vises ingenting: tomt fragment i stedet for fyll.
function kompassBudKort(modul) {
  const bud = kompassBudskap(modul);
  if (!bud) return document.createDocumentFragment();
  return el('a', { class: 'kompasshero', href: '#/mening', 'aria-label': 'Mitt kompass' },
    el('p', { class: 'hjemdash__under kompasshero__setning' }, bud.tekst),
    el('span', { class: 'kompasshero__deler', 'aria-hidden': 'true' },
      el('i', { class: 'kompasshero__strek' }),
      ikon('kompass', 'ikon kompasshero__ikon'),
      el('i', { class: 'kompasshero__strek' })));
}

function visMeningSkjerm(mount) {
  if (!hentProfil()) { location.hash = '#/hjem'; return; }
  document.body.classList.add('enkeltside'); // fyll skjermen (samme som skjerm())
  const k = lesKompass();
  // Et utkast med redigerer-flagg betyr at brukeren står midt i en redigering
  // av et eksisterende kompass — flyten vises da oppå det (avbrytbar).
  if (k && !lesKompassUtkast().redigerer) visKompassSide(mount, k);
  else visKompassOppsett(mount);
}

// --- Oppsettsutkast: lagres lokalt etter hvert steg, så en avbrutt flyt kan
// plukkes opp igjen — men ingen ferdig livsfortelling presenteres uten at
// brukeren selv har godkjent formuleringen (steg 4–5).
const LS_KOMPASS_UTKAST = 'takt.kompassUtkast';
function lesKompassUtkast() {
  try { return JSON.parse(localStorage.getItem(LS_KOMPASS_UTKAST) || 'null') || { steg: 1 }; } catch { return { steg: 1 }; }
}
function skrivKompassUtkast(u) { try { localStorage.setItem(LS_KOMPASS_UTKAST, JSON.stringify(u)); } catch { /* valgfri */ } }
function slettKompassUtkast() { try { localStorage.removeItem(LS_KOMPASS_UTKAST); } catch { /* valgfri */ } }

// Valgbibliotekene per steg-2-gruppe: spørsmål, hint og tak per inngang.
const KOMPASS_GRUPPER = {
  personer: { sporsmal: 'Hvem vil du ha mer overskudd til?', hint: 'Velg dem som gjør retningen personlig. Dette brukes varsomt — aldri for å gi dårlig samvittighet.', valg: PERSONVALG, maks: 3 },
  evner: { sporsmal: 'Hva vil du kunne gjøre?', hint: 'Velg det du vil bevare eller få mer av.', valg: EVNEVALG, maks: 4 },
  folelser: { sporsmal: 'Hvordan vil du at livet skal kjennes?', hint: 'Velg opptil tre. Ordene hjelper TAKT å finne riktig tone og riktige forslag.', valg: FOLELSESVALG, maks: 3 },
  identiteter: { sporsmal: 'Hvem ønsker du å være?', hint: 'Én stabil retning er nok — uten perfeksjonskrav.', valg: IDENTITETSVALG, maks: 2 },
  hverdag: { sporsmal: 'Hva gjør en vanlig dag god?', hint: 'Små opplevelser teller like mye som store.', valg: HVERDAGSVALG, maks: 4 },
};
// Hvilke grupper steg 2 konkretiserer, per inngang fra steg 1.
const KOMPASS_STEG2 = {
  mennesker: ['personer', 'evner'],
  livet: ['evner'],
  folelse: ['folelser'],
  identitet: ['identiteter'],
  smaating: ['hverdag'],
};

function visKompassOppsett(mount) {
  let utkast = lesKompassUtkast();
  const lagreOgTegn = (endring = {}) => {
    utkast = { ...utkast, ...endring };
    skrivKompassUtkast(utkast);
    tegnSteg();
  };

  const skall = (stegNr, ...innhold) => {
    tom(mount);
    mount.append(
      el('header', { class: 'topp topp--kompass' },
        el('h1', { class: 'topp__tittel' }, 'Mitt kompass'),
        utkast.redigerer ? el('button', { class: 'kompass-avbryt', type: 'button',
          onclick: () => { slettKompassUtkast(); visMeningSkjerm(mount); } }, 'Avbryt') : null,
        stegNr ? el('span', { class: 'kompass-fremdrift' }, `${stegNr} av 5`) : null),
      el('main', { class: 'innhold' }, ...innhold),
    );
  };

  // Flervalg-chips for en gruppe (personer/evner/…): toggler i utkastet.
  const chipVelger = (gruppeId, overSporsmal) => {
    const g = KOMPASS_GRUPPER[gruppeId];
    const valgte = () => new Set(utkast[gruppeId] || []);
    const rad = el('div', { class: 'kompass-chips' },
      ...g.valg.map((v) => {
        const c = el('button', { class: 'chip' + (valgte().has(v.id) ? ' chip--aktiv' : ''), type: 'button',
          onclick: () => {
            const s = valgte();
            if (s.has(v.id)) s.delete(v.id);
            else {
              if (s.size >= g.maks) { varsle(`Velg maks ${g.maks}`, { ikon: 'kompass' }); return; }
              s.add(v.id);
              vibrer();
            }
            utkast[gruppeId] = [...s];
            skrivKompassUtkast(utkast);
            c.classList.toggle('chip--aktiv', s.has(v.id));
            oppdaterPrevu();
          } }, v.tekst);
        return c;
      }));
    return el('div', { class: 'kompassgruppe' },
      el('h2', { class: 'kost__tittel' }, overSporsmal || g.sporsmal),
      el('p', { class: 'dempet dempet--tett' }, g.hint),
      rad);
  };

  // Løpende forhåndsvisning — viser verdien av valgene uten at det blir skjema.
  let prevu = null;
  const byggPrevu = () => {
    const dims = regnDimensjoner(utkast).filter((d) => d.score >= 0.45).slice(0, 3);
    if (!dims.length) return el('div', { class: 'kompassprevu kompassprevu--tom' });
    return el('div', { class: 'kompassprevu' },
      el('span', { class: 'kompassprevu__merke' }, 'Kompasset begynner å ta form'),
      el('p', { class: 'kompassprevu__tekst' }, lagKompassLinje(utkast)),
      el('span', { class: 'kompassprevu__dims' }, dims.map((d) => d.navn).join(' · ')));
  };
  const oppdaterPrevu = () => {
    if (!prevu) return;
    const ny = byggPrevu();
    prevu.replaceWith(ny);
    prevu = ny;
  };

  const navRad = (tilbakeSteg, videreTekst, videreFn) => el('div', { class: 'kompassnav' },
    tilbakeSteg ? el('button', { class: 'knapp knapp--sekundaer', type: 'button',
      onclick: () => lagreOgTegn({ steg: tilbakeSteg }) }, 'Tilbake') : el('span'),
    el('button', { class: 'knapp', type: 'button', onclick: videreFn }, videreTekst));

  // --- Steg 1: Velg inngang — «Hva trekker deg fremover akkurat nå?» ---
  function steg1() {
    const kortListe = el('div', { class: 'valgliste' },
      ...INNGANGER.map((i) => el('button', {
        class: 'valgkort' + (utkast.inngang === i.id ? ' valgkort--valgt' : ''), type: 'button',
        onclick: () => { vibrer(); lagreOgTegn({ inngang: i.id }); },
      },
        el('span', { class: 'valgkort__disk' }, ikon(i.ikon)),
        el('span', { class: 'valgkort__tekst' },
          el('span', { class: 'valgkort__navn' }, i.navn),
          el('span', { class: 'valgkort__hint' }, i.hint)),
        el('span', { class: 'valgkort__radio', 'aria-hidden': 'true' }),
      )));
    skall(1,
      el('section', {},
        el('h2', { class: 'kompass-sporsmal' }, 'Hva trekker deg fremover?'),
        el('p', { class: 'dempet' }, 'Velg det som kjennes nærmest akkurat nå. Du kan endre dette senere.'),
        kortListe,
        el('p', { class: 'dempet kompass-fotnote' }, 'Du kan velge flere senere. Vi begynner med én retning.'),
        el('button', { class: 'knapp' + (utkast.inngang ? '' : ' knapp--av'), type: 'button',
          onclick: () => lagreOgTegn({ steg: 2 }) }, 'Fortsett'),
        el('button', { class: 'kompass-vetikke', type: 'button',
          onclick: () => lagreOgTegn({ steg: 'vetikke' }) }, 'Jeg vet ikke helt'),
      ));
  }

  // --- Alternativ inngang: «Jeg vet ikke helt» → situasjonsvalg. Appen lager
  // et midlertidig kompass for «denne tiden» og inviterer til å utdype senere.
  // Ingen skal møte en blank side og føle at de må skrive en livsfilosofi.
  function stegVetikke() {
    skall(null,
      el('section', {},
        el('h2', { class: 'kompass-sporsmal' }, 'Hva ville hjulpet mest nå?'),
        el('p', { class: 'dempet' }, 'Helt greit å ikke vite. Velg det som ligner mest, så lager vi en retning for denne tiden — du kan utdype når du vil.'),
        el('div', { class: 'valgliste' },
          ...TIDSVALG.map((t) => el('button', { class: 'valgkort', type: 'button',
            onclick: () => {
              vibrer();
              lagreKompass({
                valg: {},
                setning: `Akkurat nå handler det mest om ${t.frase}.`,
                linje: t.tekst,
                tone: 'varm', personnivaa: 'subtil',
                denneTiden: { id: t.id, tekst: t.tekst, satt: new Date().toISOString() },
              });
              slettKompassUtkast();
              varsle('Kompasset ditt er klart', { ikon: 'kompass' });
              visMeningSkjerm(mount);
            } },
            el('span', { class: 'valgkort__tekst' }, el('span', { class: 'valgkort__navn' }, t.tekst)),
            el('span', { class: 'valgkort__radio', 'aria-hidden': 'true' })))),
        el('button', { class: 'kompass-vetikke', type: 'button', onclick: () => lagreOgTegn({ steg: 1 }) }, 'Tilbake til retningene'),
      ));
  }

  // --- Steg 2: Gjør det konkret — grupper avhengig av inngangen ---
  function steg2() {
    const grupper = KOMPASS_STEG2[utkast.inngang] || ['evner'];
    const innhold = grupper.map((g) => chipVelger(g,
      utkast.inngang === 'mennesker' && g === 'evner' ? 'Hva vil du kunne gjøre sammen med dem?' : null));
    prevu = byggPrevu();
    skall(2,
      el('section', {},
        ...innhold,
        prevu,
        navRad(1, 'Videre', () => {
          const noeValgt = grupper.some((g) => (utkast[g] || []).length);
          if (!noeValgt) { varsle('Velg minst én ting', { ikon: 'kompass' }); return; }
          lagreOgTegn({ steg: 3 });
        })));
  }

  // --- Steg 3: Livsfølelse, identitet og tone (det som ikke alt er valgt) ---
  function steg3() {
    const alt2 = KOMPASS_STEG2[utkast.inngang] || [];
    const deler = [];
    if (!alt2.includes('folelser')) deler.push(chipVelger('folelser'));
    if (!alt2.includes('identiteter')) deler.push(chipVelger('identiteter'));
    const toneRad = el('div', { class: 'kompass-chips' },
      ...TONER.map((t) => {
        const c = el('button', { class: 'chip' + ((utkast.tone || 'varm') === t.id ? ' chip--aktiv' : ''), type: 'button',
          onclick: () => {
            utkast.tone = t.id;
            skrivKompassUtkast(utkast);
            toneRad.querySelectorAll('.chip').forEach((x) => x.classList.toggle('chip--aktiv', x === c));
            toneEks.textContent = t.eksempel;
          } }, t.navn);
        return c;
      }));
    const toneEks = el('p', { class: 'dempet dempet--tett kompass-toneeks' },
      (TONER.find((t) => t.id === (utkast.tone || 'varm')) || TONER[0]).eksempel);
    prevu = byggPrevu();
    skall(3,
      el('section', {},
        ...deler,
        el('div', { class: 'kompassgruppe' },
          el('h2', { class: 'kost__tittel' }, 'Hvordan vil du helst bli møtt?'),
          el('p', { class: 'dempet dempet--tett' }, 'Tonen styrer språket i appen — aldri hvilke verdier den tillegger deg.'),
          toneRad, toneEks),
        prevu,
        navRad(2, 'Lag forslag', () => lagreOgTegn({ steg: 4 }))));
  }

  // --- Steg 4: Velg formulering — tre måter å si det samme på. Malbasert
  // (regelstyrt MVP) så kvalitet, tone og personvern er forutsigbart; brukeren
  // kan redigere hvert ord før lagring. Målet er gjenkjennelse, ikke fasit.
  function steg4() {
    const forslag = lagFormuleringer(utkast);
    let valgtId = utkast.formulering || forslag[0].id;
    const gjeldendeTekst = () => (utkast.setning && utkast.formulering === valgtId)
      ? utkast.setning
      : (forslag.find((f) => f.id === valgtId)?.tekst || forslag[0].tekst);

    const ta = el('textarea', { class: 'kostnotat kompass-rediger', rows: '3', maxlength: '200' });
    ta.value = gjeldendeTekst();
    ta.addEventListener('input', () => {
      utkast.setning = ta.value;
      utkast.formulering = valgtId;
      skrivKompassUtkast(utkast);
    });

    const kortForslag = forslag.map((f) => {
      const kort = el('button', { class: 'formulering' + (valgtId === f.id ? ' formulering--valgt' : ''), type: 'button',
        onclick: () => {
          valgtId = f.id;
          utkast.formulering = f.id;
          utkast.setning = f.tekst;
          skrivKompassUtkast(utkast);
          kortForslag.forEach((x) => x.classList.toggle('formulering--valgt', x === kort));
          ta.value = f.tekst;
          vibrer();
        } },
        el('span', { class: 'formulering__merke' }, f.navn),
        el('span', { class: 'formulering__tekst' }, f.tekst));
      return kort;
    });

    skall(4,
      el('section', {},
        el('h2', { class: 'kompass-sporsmal' }, 'Tre måter å si det samme på'),
        el('p', { class: 'dempet' }, 'Velg den som føles mest som deg. Du kan redigere hvert ord før du lagrer.'),
        el('div', { class: 'formuleringsliste' }, ...kortForslag),
        el('div', { class: 'kompassgruppe' },
          el('h2', { class: 'kost__tittel' }, 'Med dine egne ord'),
          ta),
        navRad(3, 'Videre', () => {
          if (!(ta.value || '').trim()) { varsle('Velg eller skriv en formulering', { ikon: 'kompass' }); return; }
          utkast.setning = ta.value;
          utkast.formulering = valgtId;
          lagreOgTegn({ steg: 5 });
        })));
  }

  // --- Steg 5: Lagre kompass og grenser — kompasslinje + hvor direkte appen
  // kan være. Et eksplisitt samtykke til personaliseringsnivå, ikke en skjult
  // innstilling.
  function steg5() {
    const linjeInn = el('input', { class: 'kostnotat kompass-linjeinn', type: 'text', maxlength: '48',
      value: utkast.linje || lagKompassLinje(utkast) });
    linjeInn.addEventListener('input', () => { utkast.linje = linjeInn.value; skrivKompassUtkast(utkast); });

    const NIVAER = [
      { id: 'subtil', navn: 'Subtilt', hint: 'Appen hinter bare om retning — aldri om hvem. Standard.' },
      { id: 'tematisk', navn: 'Tematisk', hint: '«For mer overskudd til dem som betyr mest.»' },
      { id: 'direkte', navn: 'Direkte', hint: 'Dine egne ord — på kompass-siden og ved sjeldne milepæler.' },
    ];
    let nivaa = utkast.personnivaa || 'subtil';
    const nivaaHint = el('p', { class: 'dempet dempet--tett kompass-toneeks' }, NIVAER.find((n) => n.id === nivaa).hint);
    const nivaaRad = el('div', { class: 'kompass-chips' },
      ...NIVAER.map((n) => {
        const c = el('button', { class: 'chip' + (nivaa === n.id ? ' chip--aktiv' : ''), type: 'button',
          onclick: () => {
            nivaa = n.id;
            utkast.personnivaa = n.id;
            skrivKompassUtkast(utkast);
            nivaaRad.querySelectorAll('.chip').forEach((x) => x.classList.toggle('chip--aktiv', x === c));
            nivaaHint.textContent = n.hint;
          } }, n.navn);
        return c;
      }));

    skall(5,
      el('section', {},
        el('h2', { class: 'kompass-sporsmal' }, 'Kompasset ditt'),
        el('div', { class: 'kompasskort kompasskort--prevu' },
          el('span', { class: 'kompasskort__linje' }, (utkast.linje || lagKompassLinje(utkast))),
          el('p', { class: 'kompasskort__setning' }, utkast.setning || '')),
        el('div', { class: 'kompassgruppe' },
          el('h2', { class: 'kost__tittel' }, 'Kort påminnelse i resten av appen'),
          el('p', { class: 'dempet dempet--tett' }, 'Én linje som kan dukke opp der den er relevant — aldri oftere enn én gang i uka.'),
          linjeInn),
        el('div', { class: 'kompassgruppe' },
          el('h2', { class: 'kost__tittel' }, 'Hvor personlig kan appen være?'),
          nivaaRad, nivaaHint),
        navRad(4, 'Lagre kompasset', () => {
          const k = lagreKompass({
            valg: {
              inngang: utkast.inngang || null,
              personer: utkast.personer || [], evner: utkast.evner || [],
              folelser: utkast.folelser || [], identiteter: utkast.identiteter || [],
              hverdag: utkast.hverdag || [],
            },
            setning: utkast.setning,
            linje: linjeInn.value,
            tone: utkast.tone || 'varm',
            personnivaa: nivaa,
          });
          if (!k) { varsle('Skriv en formulering først', { ikon: 'kompass' }); return; }
          slettKompassUtkast();
          vibrer('feiring');
          varsle('Kompasset ditt er lagret', { ikon: 'kompass' });
          visMeningSkjerm(mount);
        })));
  }

  function tegnSteg() {
    if (utkast.steg === 'vetikke') stegVetikke();
    else if (utkast.steg === 2) steg2();
    else if (utkast.steg === 3) steg3();
    else if (utkast.steg === 4) steg4();
    else if (utkast.steg === 5) steg5();
    else steg1();
  }
  tegnSteg();
}

// --- Resultatsiden: kompasset i bruk — siden er ikke lenger et skjema.
// Kompasskortet endres sjelden; «Akkurat nå» kan justeres ofte; refleksjonen
// kan foreslå, men aldri automatisk endre kompasset.
function visKompassSide(mount, k) {
  const tegnPåNytt = () => visMeningSkjerm(mount);
  const paused = k.status === 'pause';
  const dims = toppDimensjoner(k, 3);

  // --- Kompasskortet (mørkegrønt) ---
  const kompassKort = el('section', { class: 'kompasskort' + (paused ? ' kompasskort--pause' : '') },
    el('span', { class: 'kompasskort__linje' }, k.linje),
    el('p', { class: 'kompasskort__setning' }, k.setning),
    dims.length ? el('span', { class: 'kompasskort__dims' }, dims.map((d) => d.navn).join(' · ')) : null,
    paused ? el('span', { class: 'kompasskort__pausemerke' }, 'På pause') : null,
  );

  // Rediger/pause/slett — alltid tilgjengelig fra samme side (personvernmodellen).
  const handlingsRad = el('div', { class: 'kompasshandlinger' },
    el('button', { class: 'kompasshandling', type: 'button',
      onclick: () => {
        skrivKompassUtkast({
          redigerer: true, steg: 1, inngang: k.valg?.inngang || null,
          personer: k.valg?.personer || [], evner: k.valg?.evner || [],
          folelser: k.valg?.folelser || [], identiteter: k.valg?.identiteter || [],
          hverdag: k.valg?.hverdag || [],
          tone: k.tone, personnivaa: k.personnivaa,
          setning: k.setning, linje: k.linje, formulering: 'egen',
        });
        visMeningSkjerm(mount);
      } }, ikon('penn'), 'Rediger'),
    el('button', { class: 'kompasshandling', type: 'button',
      onclick: () => { settKompassPause(!paused); varsle(paused ? 'Kompasset er i gang igjen' : 'Kompasset er satt på pause', { ikon: 'kompass' }); tegnPåNytt(); } },
      ikon(paused ? 'play' : 'pause'), paused ? 'Fortsett' : 'Pause'),
    el('button', { class: 'kompasshandling kompasshandling--fare', type: 'button',
      onclick: () => {
        if (!confirm('Slette kompasset? Egne ord og refleksjoner beholdes.')) return;
        slettKompass();
        slettKompassUtkast();
        varsle('Kompasset er slettet', { ikon: 'kompass' });
        tegnPåNytt();
      } }, ikon('kryss'), 'Slett'),
  );

  // --- Det jeg vil bevare (valgte evner) ---
  const evner = (k.valg?.evner || []).map((id) => EVNEVALG.find((e) => e.id === id)).filter(Boolean);
  const bevareKort = evner.length ? el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Det jeg vil bevare'),
    el('div', { class: 'kompass-chips' }, ...evner.map((e) => el('span', { class: 'bevareflis' }, e.tekst)))) : null;

  // --- Akkurat nå («denne tiden» — justeres ofte, omskriver aldri kjernen) ---
  const dt = k.denneTiden;
  const borSes = denneTidenBorSes();
  const tidChips = el('div', { class: 'kompass-chips' },
    ...TIDSVALG.map((t) => el('button', { class: 'chip' + (dt?.id === t.id ? ' chip--aktiv' : ''), type: 'button',
      onclick: () => { settDenneTiden(dt?.id === t.id ? null : t.id); vibrer(); tegnPåNytt(); } }, t.tekst)));
  const naaKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Akkurat nå'),
    el('p', { class: 'dempet dempet--tett' }, borSes
      ? 'Er dette fortsatt retningen din? Det er en stund siden du valgte den.'
      : 'Denne tiden handler mest om …'),
    tidChips);

  // --- Ukens refleksjon — dynamisk spørsmål fra kompassets toppdimensjoner ---
  const uke = ukensRefleksjon();
  const refl = el('textarea', { class: 'kostnotat', rows: '3', maxlength: '280', placeholder: 'Skriv noen få ord …' });
  refl.value = uke?.tekst || '';
  const reflKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Ukens refleksjon'),
    el('p', { class: 'dempet dempet--tett' }, refleksjonsSporsmal()),
    refl,
    el('div', { class: 'hvorfor__handling' },
      el('button', { class: 'knapp knapp--liten', type: 'button',
        onclick: () => { settRefleksjon(refl.value); vibrer(); varsle('Refleksjon lagret', { ikon: 'blad' }); tegnPåNytt(); } },
        uke ? 'Oppdater' : 'Lagre refleksjonen')));

  // --- Meningsdagbok (tidligere refleksjoner) ---
  const tidligere = lesRefleksjoner().filter((r) => r.uke !== (uke?.uke));
  const dagbokKort = tidligere.length ? el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Meningsdagbok'),
    el('div', { class: 'meningsdagbok' },
      ...tidligere.map((r) => el('div', { class: 'dagbokrad' },
        el('span', { class: 'dagbokrad__uke' },
          el('span', { class: 'dagbokrad__merkelapp' }, 'Uke fra'), ' ', r.uke),
        el('span', { class: 'dagbokrad__tekst' }, r.tekst))))) : null;

  // --- Mine egne ord (frie formuleringer — legacy «Mitt hvorfor») ---
  const hvorfor = lesHvorfor();
  const egneOrdListe = el('div', { class: 'hvorforliste' },
    ...hvorfor.map((h) => el('div', { class: 'hvorforkort' },
      el('span', { class: 'hvorforkort__ikon' }, ikon('kompass')),
      el('span', { class: 'hvorforkort__tekst' }, h.tekst),
      el('button', { class: 'hvorforkort__slett', type: 'button', 'aria-label': 'Fjern',
        onclick: () => { slettHvorfor(h.id); tegnPåNytt(); } }, ikon('kryss')))));
  const egenInn = el('textarea', { class: 'kostnotat hvorfor__inn', rows: '2', maxlength: '120', placeholder: 'Jeg vil …' });
  const egnePrompter = el('div', { class: 'chiprad chiprad--pille hvorfor__prompter' },
    ...STARTSPORSMAL.map((p) => el('button', { class: 'chip chip--dempet', type: 'button',
      onclick: () => { egenInn.placeholder = p.sporsmal; egenInn.focus(); } }, p.sporsmal)));
  const egneOrdKort = el('section', { class: 'kort' },
    el('h2', { class: 'kost__tittel' }, 'Mine egne ord'),
    el('p', { class: 'dempet dempet--tett' }, 'Frie formuleringer du vil ta vare på — de endrer aldri kompasset uten at du gjør det selv.'),
    hvorfor.length ? egneOrdListe : null,
    kanLeggeTil() ? el('div', {}, egnePrompter, egenInn,
      el('div', { class: 'hvorfor__handling' },
        el('button', { class: 'knapp knapp--liten', type: 'button',
          onclick: () => {
            const ny = leggTilHvorfor(egenInn.value);
            if (!ny) { varsle('Skriv noe kort først', { ikon: 'kompass' }); return; }
            vibrer(); varsle('Lagt til', { ikon: 'kompass' });
            tegnPåNytt();
          } }, 'Legg til')))
      : el('p', { class: 'dempet' }, 'Du har nok egne ord for nå — fjern ett for å bytte.'));

  // --- Hvorfor ser jeg dette? (forklarbarhet + etisk standard) ---
  const forklaringKort = el('section', { class: 'kort kort--info' },
    el('h2', { class: 'kost__tittel' }, 'Slik brukes kompasset'),
    el('p', { class: 'dempet' }, kompassForklaring(k)),
    el('p', { class: 'dempet' }, 'Kompasset endres aldri i det skjulte, og en litt mindre personlig melding er alltid bedre enn en presis en som oppleves invaderende.'));

  skjerm('Mitt kompass',
    kompassKort,
    handlingsRad,
    paused ? el('p', { class: 'dempet', style: 'text-align:center' }, 'Kompasset er på pause — appen bruker det ikke i budskap før du fortsetter.') : null,
    bevareKort,
    naaKort,
    reflKort,
    dagbokKort,
    egneOrdKort,
    forklaringKort);
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
      el('p', { class: 'dempet' }, 'Setter opp preferansene på nytt — rører aldri loggen eller streakene.'),
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
        onclick: () => { if (confirm('Slette ALT — profil, logg, streaks og historikk? Kan ikke angres.')) { nullstillAlt(); location.hash = '#/hjem'; location.reload(); } },
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
    const status = el('p', { class: 'dempet' }, 'Del profil, logg og streaks mellom telefon og nettbrett.');
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
      el('p', {}, 'Bevegelse kan være hva som helst du liker — en tur, en økt, en fotballkamp. Alt teller mot gnistene dine, og merkene samler det du får til. PWA i vanilla HTML/CSS/JS.'),
      el('p', { class: 'dempet' }, `Versjon ${APP_VERSION}`),
      el('p', { class: 'dempet' }, `${hentOkter().length} økter i biblioteket · ${bib.exercises.length} øvelser i oppslaget.`),
    ),
    profil && el('div', { class: 'kort' },
      el('h2', {}, 'Profil'),
      el('p', { class: 'dempet' }, `Motivasjon: ${(profil.motivasjon?.valg || []).join(', ') || '–'}`),
      el('p', { class: 'dempet' }, `Ukemål ${profil.ukemaal}`),
    ),
    byggVinduskort(),
  );
}

// Vindusmål på Om-siden: viewport-/safe-area-tall rett fra enheten, til å
// feilsøke plattform-oppførsel (f.eks. iOS-26-gapet under bunnbaren) uten
// devtools — et skjermbilde av kortet er nok.
function byggVinduskort() {
  const kort = el('div', { class: 'kort' }, el('h2', {}, 'Vindusmål'));
  // Probene måler det CSS faktisk resolver: env(safe-area-inset-*) og
  // dvh/svh/lvh kan ikke leses direkte fra JS.
  const probe = el('div', { style: 'position:absolute;visibility:hidden;pointer-events:none;height:0' });
  const mål = [
    ['safe-area topp', 'paddingTop', 'env(safe-area-inset-top)'],
    ['safe-area bunn', 'paddingBottom', 'env(safe-area-inset-bottom)'],
    ['100dvh', 'height', '100dvh'], ['100svh', 'height', '100svh'], ['100lvh', 'height', '100lvh'],
  ];
  const rader = () => {
    const vv = window.visualViewport;
    const ut = [
      `standalone: ${navigator.standalone === true ? 'ja' : 'nei'} · pixelratio ${window.devicePixelRatio}`,
      `screen: ${screen.width} × ${screen.height}`,
      `innerHeight: ${window.innerHeight} · clientHeight: ${document.documentElement.clientHeight}`,
      vv ? `visualViewport: ${Math.round(vv.width)} × ${Math.round(vv.height)} (offsetTop ${Math.round(vv.offsetTop)})` : 'visualViewport: –',
    ];
    for (const [navn, prop, verdi] of mål) {
      probe.style.height = '0'; probe.style.paddingTop = '0'; probe.style.paddingBottom = '0';
      probe.style[prop] = verdi;
      ut.push(`${navn}: ${Math.round(parseFloat(getComputedStyle(probe)[prop]) || 0)}px`);
    }
    const bar = document.querySelector('.tabbar');
    if (bar) {
      const r = bar.getBoundingClientRect();
      ut.push(`bunnbar: topp ${Math.round(r.top)} → bunn ${Math.round(r.bottom)} (vindu ${window.innerHeight})`);
    }
    ut.push(navigator.userAgent);
    return ut;
  };
  document.body.append(probe);
  const liste = el('div', {});
  const tegn = () => { tom(liste); for (const r of rader()) liste.append(el('p', { class: 'dempet dempet--tett', style: 'word-break:break-word' }, r)); };
  tegn();
  // Følg med mens siden er åpen: rotasjon/resize/viewport-endringer oppdaterer
  // tallene live. Ryddes når kortet forlater DOM-en.
  const paa = () => { if (!kort.isConnected) { window.removeEventListener('resize', paa); window.visualViewport?.removeEventListener('resize', paa); probe.remove(); return; } tegn(); };
  window.addEventListener('resize', paa);
  window.visualViewport?.addEventListener('resize', paa);
  kort.append(liste);
  return kort;
}

// --- Tab-bar — klassisk fast bunnbar: hvit flate, hårlinje topp, ikon +
// etikett per fane, aktiv fane i aksentfargen. Hjem (Takt) står i midten som
// en hevet aksent-sirkel, med pilar-modulene rundt. Aktiv fane får det fylte
// ikonet der det finnes (linje-varianten byttes via CSS). ---
function byggTabbar() {
  if (document.querySelector('.tabbar')) return;
  const tab = (f) => el('a', {
    class: 'tabbar__knapp' + (f.id === 'hjem' ? ' tabbar__knapp--stor' : ''),
    href: `#/${f.rute}`, 'data-rute': f.rute, 'aria-label': f.label,
  }, el('span', { class: 'tabbar__ikon' },
    ikon(f.ikon, 'ikon tabikon--linje'),
    f.fyll ? ikon(f.fyll, 'ikon tabikon--fyll') : null,
  ), el('span', { class: 'tabbar__tekst' }, f.label));

  const nav = el('nav', { class: 'tabbar', 'aria-label': 'Hovedmeny' },
    ...FANER_DEF.map(tab),
  );
  document.body.append(nav);
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
// Ingen zoom noe sted i appen. Viewport-metaen (user-scalable=no) og
// touch-action: manipulation dekker dobbelttrykk-zoom, men iOS Safari zoomer
// fortsatt på pinch med mindre gesture-hendelsene stoppes eksplisitt.
function hindreZoom() {
  const stopp = (e) => e.preventDefault();
  document.addEventListener('gesturestart', stopp, { passive: false });
  document.addEventListener('gesturechange', stopp, { passive: false });
  document.addEventListener('gestureend', stopp, { passive: false });
}

async function start() {
  hindreZoom();
  try {
    [bib] = await Promise.all([lastBibliotek(), lastOkter(), lastOvelsesinfo(), lastArtikler(), lastStier(), lastKjeder(), lastDisipliner(), lastSeksjoner(), lastOppskrifter()]);
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
  settOppSideSveip(); // sveip mellom hovedsidene (og feeden) — én gang på #app

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
    husstand.init(); // delt handleliste: synk ved online/synlig
    if (husstand.erIHusstand()) husstand.synk();
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
