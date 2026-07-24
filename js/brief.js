// Dagens brief (M100) — en rolig start på dagen. Vises ved dagens første
// åpning: et pusterom uten header, banner eller bunnbar. Få ord på skjermen,
// setninger som toner inn én og én: et blikk på dagen, en påminnelse om
// kompasset, og ett spørsmål å ta med seg. Briefen slutter som en invitasjon
// til refleksjon på penn og papir — velger man «Reflekter», mørkner skjermen
// med en gang og våkenlåsen er sluppet, så telefonen får sovne mens man
// skriver. Retning, aldri press: alt kan hoppes over, og briefen kan skrus av
// i Innstillinger.
//
// Logikken (gate + scener + spørsmål) er rene funksjoner over localStorage så
// smoke-testen kan kjøre dem i Node; bare visBriefSkjerm/overlegget rører DOM.
import { el, tom } from './ui.js';
import { hentProfil, hentLogg, planForDato } from './store.js';
import { beregnStreak } from './bevegelse.js';
import { dagsfase } from './banner.js';
import { slippVaaken } from './vaakenlaas.js';
import { REDUSERT } from './animasjon.js';
import {
  isoDag, lesKompass, harKompass, toppDimensjoner, kompassBudskap,
  feiringsHvorfor, denneTidenBorSes,
} from './mening.js';

// Sist viste dag («YYYY-MM-DD», lokal kalenderdag). Visningstilstand per
// enhet — synkes bevisst ikke (samme mønster som trening.varslerSett):
// åpner du appen på to enheter samme morgen, fortjener begge et rolig hei.
const LS_BRIEF = 'takt.briefVist';

// Dagsnummer forankret i lokal kalenderdag (samme grep som feiringsHvorfor) —
// deterministisk rotasjon som står stille hele dagen.
function dagsnr(nå = Date.now()) {
  const d = new Date(nå);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

// --- Gate: første åpning i dag ---------------------------------------------

export function briefVistIdag(nå = Date.now()) {
  try { return localStorage.getItem(LS_BRIEF) === isoDag(nå); } catch { return false; }
}

/** Merker briefen som vist i dag (kalles når skjermen tegnes). */
export function merkBriefVist(nå = Date.now()) {
  try { localStorage.setItem(LS_BRIEF, isoDag(nå)); } catch { /* lagring valgfri */ }
}

/** Skal briefen vises nå? Første åpning i dag + ikke skrudd av i
 *  Innstillinger. Innloggings- og profil-gatene eier oppstarten (app.js). */
export function skalViseBrief(nå = Date.now()) {
  const p = hentProfil();
  if (!p || p.innstillinger?.brief === false) return false;
  return !briefVistIdag(nå);
}

/** Er appen «i ro» slik at dagens brief kan slippes inn? Rene fakta inn (så
 *  smoke-testen dekker regelen); app.js samler DOM-tilstanden. Briefen skal
 *  aldri legge seg oppå en aktiv tur/økt, et åpent overlegg eller en dyplenke
 *  brukeren selv valgte — bare den rolige landingen på Hjem. */
export function briefIRo({ rute, aktivTur = false, fokusmodus = false, harOverlegg = false } = {}) {
  return rute === 'hjem' && !aktivTur && !fokusmodus && !harOverlegg;
}

// --- Dagens spørsmål --------------------------------------------------------
// Morgenspørsmål i kompassets språk: har brukeren et kompass, roterer
// spørsmålet blant toppdimensjonene; ellers en nøytral bank. Spørsmålene
// åpner dagen (framover), i motsetning til ukerefleksjonen (bakover).

const MORGENSPORSMAL = {
  naerhet: [
    'Hvem fortjener litt mer av deg i dag?',
    'Hvem kunne trengt å høre fra deg i dag?',
    'Hva ville det bety å være helt til stede i dag?',
  ],
  livskraft: [
    'Hva gir deg energi — og får det plass i dag?',
    'Hva trenger kroppen din av deg i dag?',
    'Når kjente du deg sist sterk — og hva skal til i dag?',
  ],
  frihet: [
    'Hva ville du gjort i dag om ingenting holdt deg igjen?',
    'Hvilket lite valg kan gjøre dagen friere?',
    'Hva kan du si nei til i dag?',
  ],
  indre_ro: [
    'Hvor i dagen kan du legge inn et pusterom?',
    'Hva kan få vente — helt ærlig?',
    'Hvilket tempo passer deg egentlig i dag?',
  ],
  mestring: [
    'Hva vil du være litt stolt av i kveld?',
    'Hvilket lite steg kan du ta i dag?',
    'Hva øver du på for tiden — og hva er neste steg?',
  ],
  opplevelse: [
    'Hva kan du legge merke til i dag som du vanligvis går forbi?',
    'Hvilket lite øyeblikk kan du skape i dag?',
    'Hva ville gjort i dag verdt å huske?',
  ],
  identitet: [
    'Hvem vil du være i dag — i det små?',
    'Hvilket valg i dag ligner mest på den du vil være?',
    'Hva står du for når dagen setter deg på prøve?',
  ],
  bidrag: [
    'Hvem kan få det litt bedre fordi du finnes i dag?',
    'Hva kan du gi i dag uten at noen ber om det?',
    'Hvilket lite bidrag ville gjort deg glad å gi?',
  ],
  tilhorighet: [
    'Hvem er dine folk — og vet de det?',
    'Når kjente du deg sist som en del av noe — og hva bygger du på i dag?',
    'Hva kan du gjøre i dag for fellesskapet du er glad i?',
  ],
  hverdagsglede: [
    'Hva er det minste som kan gjøre dagen god?',
    'Hva gleder du deg til i dag — finnes det noe lite?',
    'Hvilken liten glede kan du unne deg i dag?',
  ],
};

const NOYTRALE_SPORSMAL = [
  'Hva ville gjort dagen god — helt enkelt?',
  'Hva betyr mest i dag?',
  'Hva trenger du mer av for tiden?',
  'Hva vil du takke deg selv for i kveld?',
  'Hva kan du gjøre i dag som du er glad for i morgen?',
  'Hvilket lite valg kan løfte dagen?',
  'Hva fortjener oppmerksomheten din i dag?',
  'Hva kan du slippe taket i i dag?',
];

/** Dagens spørsmål — deterministisk per dag, kompassbevisst. Banken er
 *  toppdimensjonenes spørsmål pluss de nøytrale, så rotasjonen har god
 *  variasjon også for smale kompass med én sterk dimensjon. */
export function dagensBriefSporsmal(nå = Date.now()) {
  const n = dagsnr(nå);
  const k = lesKompass();
  const topper = k && k.status !== 'pause' ? toppDimensjoner(k, 4) : [];
  const bank = [
    ...topper.flatMap((d) => MORGENSPORSMAL[d.id] || []),
    ...NOYTRALE_SPORSMAL,
  ];
  return bank[n % bank.length];
}

// --- Scener -----------------------------------------------------------------
// Briefen er en sekvens av små scener; hver scene er noen få linjer som toner
// inn én og én. Ren datastruktur (testbar uten DOM): [{ id, linjer }], der
// hver linje er { tekst, stil? } — stil: 'merke' | 'stor' | 'sitat' | 'dempet'.

const HILSEN = { natt: 'God natt', morgen: 'God morgen', formiddag: 'God formiddag', dag: 'God dag', kveld: 'God kveld' };
const LANDING = {
  natt: 'Verden er stille. Ta det med deg.',
  morgen: 'Dagen har så vidt begynt. Pust ut.',
  formiddag: 'Det er god tid. Dagen er fortsatt ung.',
  dag: 'Et lite pusterom midt på dagen.',
  kveld: 'Et rolig blikk før kvelden tar over.',
};

function datolinje(nå, locale) {
  const s = new Date(nå).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function byggBriefScener(nå = Date.now(), { locale = 'nb-NO' } = {}) {
  const scener = [];
  const fase = dagsfase(new Date(nå).getHours());
  const profil = hentProfil();

  // 1 — hilsen: dato, dagsfase-hilsen og en linje som senker skuldrene.
  scener.push({ id: 'hilsen', linjer: [
    { tekst: datolinje(nå, locale), stil: 'merke' },
    { tekst: `${HILSEN[fase]}${profil?.navn ? `, ${profil.navn}` : ''}.`, stil: 'stor' },
    { tekst: LANDING[fase], stil: 'dempet' },
  ] });

  // 2 — et blikk på dagen: streak og plan som rolige fakta, aldri som krav.
  const fakta = [];
  const streak = beregnStreak(hentLogg(), nå);
  if (streak >= 2) fakta.push({ tekst: `${streak} dager på rad i bevegelse.` });
  const planer = planForDato(isoDag(nå));
  if (planer.length === 1) fakta.push({ tekst: 'Én økt står i planen i dag.' });
  else if (planer.length > 1) fakta.push({ tekst: `${planer.length} økter står i planen i dag.` });
  if (!fakta.length) fakta.push({ tekst: 'Ingenting må skje i dag. Dagen er åpen.' });
  scener.push({ id: 'oversikt', linjer: [
    { tekst: 'Et blikk på dagen', stil: 'merke' },
    ...fakta,
  ] });

  // 3 — kompasset: brukerens egen setning (eller egne ord) som påminnelse om
  // retningen. Uten noe erklært hvorfor hoppes scenen stille over.
  const k = lesKompass();
  const hvorfor = harKompass() ? k.setning : feiringsHvorfor(nå);
  if (hvorfor) {
    const linjer = [
      { tekst: 'Kompasset ditt', stil: 'merke' },
      { tekst: `«${hvorfor}»`, stil: 'sitat' },
    ];
    const bud = harKompass() ? kompassBudskap('start', nå) : null;
    if (bud) linjer.push({ tekst: bud.tekst, stil: 'dempet' });
    if (harKompass() && denneTidenBorSes(nå)) {
      linjer.push({ tekst: 'Det er en stund siden du justerte kompasset. Kanskje verdt et blikk i dag.', stil: 'dempet' });
    }
    scener.push({ id: 'kompass', linjer });
  }

  // 4 — dagens spørsmål: ett spørsmål å ta med seg, uten svarfelt.
  scener.push({ id: 'sporsmal', linjer: [
    { tekst: 'Dagens spørsmål', stil: 'merke' },
    { tekst: dagensBriefSporsmal(nå), stil: 'stor' },
    { tekst: 'Ikke svar med en gang. La det ligge i bakhodet.', stil: 'dempet' },
  ] });

  // 5 — refleksjon: invitasjonen til penn og papir. Rendereren legger på valg.
  scener.push({ id: 'refleksjon', linjer: [
    { tekst: 'Før dagen drar i gang', stil: 'merke' },
    { tekst: 'Har du penn og papir i nærheten?', stil: 'stor' },
    { tekst: 'Skriv fritt i noen minutter — eller sitt bare litt med spørsmålet.', stil: 'dempet' },
  ] });

  return scener;
}

// --- Skjermen ---------------------------------------------------------------

const LINJE_KLASSE = {
  merke: 'brief__linje brief__linje--merke',
  stor: 'brief__linje brief__linje--stor',
  sitat: 'brief__linje brief__linje--stor brief__linje--sitat',
  dempet: 'brief__linje brief__linje--dempet',
};

/**
 * Tegner briefen i mount (rute #/brief — fokusmodus, ingen header/tabbar).
 * Trykk hvor som helst går videre; siste scene har valgene Reflekter / Gå
 * videre. `ferdig` kalles når briefen er over (standard: hjem).
 */
export function visBriefSkjerm(mount, { ferdig } = {}) {
  merkBriefVist();
  document.querySelector('.brief-natt')?.remove(); // aldri et hengende natt-lag
  document.querySelector('.brief-farvel')?.remove();
  document.documentElement.classList.remove('brief-natt-lerret');
  const over = ferdig || (() => { location.hash = '#/hjem'; });
  const locale = document.documentElement.lang === 'en' ? 'en' : 'nb-NO';
  const scener = byggBriefScener(Date.now(), { locale });
  const sporsmal = dagensBriefSporsmal();

  const scene = el('div', { class: 'brief__scene', 'aria-live': 'polite' });
  const hint = el('button', { class: 'brief__hint', type: 'button', 'aria-label': 'Neste' }, 'Trykk for å gå videre');
  const rot = el('div', { class: 'brief' }, scene, hint);

  let steg = 0;
  let timere = [];
  let alleInne = false;
  const rydd = () => { for (const t of timere) clearTimeout(t); timere = []; };

  // Linjene toner inn én og én i et rolig tempo; ved redusert bevegelse (eller
  // et utålmodig trykk) vises alt med en gang.
  const visLinjer = () => {
    const linjer = [...scene.querySelectorAll('.brief__linje')];
    const siste = scener[steg].id === 'refleksjon';
    if (REDUSERT()) {
      for (const l of linjer) l.classList.add('brief__linje--inn');
      scene.querySelector('.brief__valg')?.classList.add('brief__valg--inn');
      alleInne = true;
      hint.classList.toggle('brief__hint--inn', !siste);
      return;
    }
    linjer.forEach((l, i) => {
      timere.push(setTimeout(() => l.classList.add('brief__linje--inn'), 500 + i * 1100));
    });
    timere.push(setTimeout(() => {
      alleInne = true;
      scene.querySelector('.brief__valg')?.classList.add('brief__valg--inn');
      if (!siste) hint.classList.add('brief__hint--inn');
    }, 500 + linjer.length * 1100));
  };

  const tegnScene = () => {
    rydd();
    alleInne = false;
    hint.classList.remove('brief__hint--inn');
    tom(scene);
    const s = scener[steg];
    for (const l of s.linjer) scene.append(el('p', { class: LINJE_KLASSE[l.stil] || 'brief__linje' }, l.tekst));
    if (s.id === 'refleksjon') {
      scene.append(el('div', { class: 'brief__valg' },
        el('button', {
          class: 'knapp brief__reflekter', type: 'button',
          onclick: (ev) => { ev.stopPropagation(); visBriefNatt(sporsmal, over); },
        }, 'Reflekter'),
        el('button', {
          class: 'brief__hopp', type: 'button',
          onclick: (ev) => { ev.stopPropagation(); mykOvergang(over); },
        }, 'Gå videre uten'),
      ));
    }
    scene.classList.remove('brief__scene--ut');
    visLinjer();
  };

  const videre = () => {
    if (!alleInne) { rydd(); // utålmodig trykk → vis resten av linjene nå
      const siste = scener[steg].id === 'refleksjon';
      scene.querySelectorAll('.brief__linje').forEach((l) => l.classList.add('brief__linje--inn'));
      scene.querySelector('.brief__valg')?.classList.add('brief__valg--inn');
      alleInne = true;
      if (!siste) hint.classList.add('brief__hint--inn');
      return;
    }
    if (scener[steg].id === 'refleksjon') return; // siste scene styres av valgene
    steg++;
    alleInne = false; // overgangen har startet — svelg trykk til neste scene er tegnet (ingen hopp)
    if (REDUSERT()) { tegnScene(); return; }
    scene.classList.add('brief__scene--ut');
    timere.push(setTimeout(tegnScene, 460));
  };
  rot.addEventListener('click', videre);

  tom(mount);
  mount.append(rot);
  tegnScene();
}

// Myk overgang ut av briefen: et slør i briefens egen bakgrunn legges over,
// hjem tegnes under, og sløret toner bort — briefen «løser seg opp» i dagen
// i stedet for et hardt bytte. Ved redusert bevegelse byttes det rett.
function mykOvergang(over) {
  if (REDUSERT()) { over(); return; }
  const slor = el('div', { class: 'brief-farvel', 'aria-hidden': 'true' });
  document.body.append(slor);
  over(); // hjem tegnes under sløret
  requestAnimationFrame(() => requestAnimationFrame(() => slor.classList.add('brief-farvel--borte')));
  const fjern = () => slor.remove();
  slor.addEventListener('transitionend', fjern, { once: true });
  setTimeout(fjern, 1300); // fallback om transitionend uteblir
}

// Natt-lag: skjermen «sovner» med en gang man velger å reflektere. Helt sort,
// våkenlåsen sluppet (telefonen får slukke skjermen selv), og etter en liten
// stund toner spørsmålet og et hint svakt fram for den som blir sittende med
// skjermen på. Lerretet (html-bakgrunnen) males også sort: i standalone-PWA-er
// klipper WebKit element-tegning ved den falske viewport-bunnen (se
// settOppViewportVakt i app.js), så uten lerret-fargen står en lys stripe
// igjen nederst. Trykk vekker skjermen: hjem tegnes under mørket, og det
// sorte toner rolig bort — som å våkne inn i dagen.
function visBriefNatt(sporsmal, over) {
  slippVaaken();
  document.documentElement.classList.add('brief-natt-lerret');
  const natt = el('div', { class: 'brief-natt', role: 'dialog', 'aria-label': 'Refleksjon' },
    el('div', { class: 'brief-natt__innhold' },
      el('p', { class: 'brief-natt__sporsmal' }, sporsmal),
      el('p', { class: 'brief-natt__hint' }, 'Trykk på skjermen når du er ferdig.'),
    ));
  document.body.append(natt);
  const hintTimer = setTimeout(() => natt.classList.add('brief-natt--hint'), 5000);
  let farvel = false;
  const rydd = () => {
    document.documentElement.classList.remove('brief-natt-lerret');
    natt.remove();
    window.removeEventListener('hashchange', vedHash);
  };
  // Liten vaktperiode så trykket på «Reflekter» (eller et dobbelttrykk) ikke
  // vekker skjermen igjen med en gang.
  const klar = Date.now() + 700;
  natt.addEventListener('click', () => {
    if (Date.now() < klar || farvel) return;
    farvel = true;
    clearTimeout(hintTimer);
    if (REDUSERT()) { rydd(); over(); return; }
    natt.classList.add('brief-natt--vaakner');
    over(); // hjem tegnes under mørket mens det toner bort
    // transitionend bobler også fra __innhold — reager kun på nattas egen fade.
    natt.addEventListener('transitionend', (ev) => { if (ev.target === natt) rydd(); });
    setTimeout(rydd, 1600); // fallback om transitionend uteblir
  });
  // Navigeres det bort på annet vis (ikke vår egen oppvåkning), skal ikke
  // natta bli liggende over appen.
  const vedHash = () => { if (!farvel) { clearTimeout(hintTimer); rydd(); } };
  window.addEventListener('hashchange', vedHash);
}
