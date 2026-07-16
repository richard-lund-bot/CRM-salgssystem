// Feed (M37) — den spillbare lærings-feeden på Hjem-fanen. Kunnskap som
// scroll-erstatning: hvert innlegg er en kort innholdsbit med et minispill
// rett i kortet (Aha-masterplanen: Preview → Play → Commit → Feedback →
// Continue). Sju spillmoduler deler samme skall, svarmotor og
// tilbakemeldingsstruktur — forklaringen er den egentlige belønningen.
// Innholdet bor i data/feed.json (fiktive redaksjonelle guider, kildelenket).
// XP går inn i profilens globale nivå; per-innlegg-tilstand (spilt/likt/
// lagret) bor lokalt i localStorage, samme offline-first-mønster som ellers.
import { el, tom, ikon } from './ui.js';
import { hentProfil, lagreProfil } from './store.js';
import { fanesideMedTittel } from './banner.js';
import { nivaFraTotalXp } from './niva.js';
import { varsle } from './toast.js';
import { pling, plingSekvens } from './lyd.js';
import { vibrer } from './haptikk.js';
import { REDUSERT } from './animasjon.js';

const LS_FEED = 'trening.feed';
const BATCH = 6; // innlegg per innlastingsrunde (uendelig scroll)

// --- Data -------------------------------------------------------------------
let _feed = null;
let _lasting = null;

/** Laster feeden dovent (første besøk på Hjem) — cache i minne + SW. */
export function lastFeed() {
  if (_feed) return Promise.resolve(_feed);
  if (!_lasting) {
    _lasting = fetch('data/feed.json')
      .then((res) => { if (!res.ok) throw new Error(`Kunne ikke laste feeden (${res.status})`); return res.json(); })
      .then((data) => { _feed = data; return data; })
      .catch((e) => { _lasting = null; throw e; });
  }
  return _lasting;
}

function posterFor(id) {
  return (_feed?.posters || []).find((p) => p.id === id) || null;
}

// --- Tilstand (lokal, per enhet) ---------------------------------------------
function lesTilstand() {
  try {
    const raw = localStorage.getItem(LS_FEED);
    const t = raw ? JSON.parse(raw) : {};
    return { spilt: t.spilt || {}, likt: t.likt || {}, lagret: t.lagret || {} };
  } catch {
    return { spilt: {}, likt: {}, lagret: {} };
  }
}

function skrivTilstand(t) {
  try { localStorage.setItem(LS_FEED, JSON.stringify(t)); } catch { /* valgfri */ }
}

function endreTilstand(muter) {
  const t = lesTilstand();
  muter(t);
  skrivTilstand(t);
  return t;
}

// --- Deterministisk stokking -------------------------------------------------
// Alternativer stokkes per innlegg med frø fra innleggs-id-en, så rekkefølgen
// er stabil på tvers av re-tegninger (og fasit-posisjonen aldri er «alltid A»).
function frø(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function stokk(arr, seedStr) {
  let s = frø(seedStr) || 1;
  const rnd = () => { s = Math.imul(s ^ (s >>> 15), s | 1); s ^= s + Math.imul(s ^ (s >>> 7), s | 61); return ((s ^ (s >>> 14)) >>> 0) / 4294967296; };
  const ut = arr.slice();
  for (let i = ut.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ut[i], ut[j]] = [ut[j], ut[i]];
  }
  return ut;
}

/** Stokk, men aldri identisk med original rekkefølge (viktig for rekkefølge-spillet). */
function stokkUlik(arr, seedStr) {
  let ut = stokk(arr, seedStr);
  if (arr.length > 1 && ut.every((v, i) => v === arr[i])) ut = stokk(arr, seedStr + 'x');
  if (arr.length > 1 && ut.every((v, i) => v === arr[i])) { ut = arr.slice(); ut.push(ut.shift()); }
  return ut;
}

// --- XP-kreditering ----------------------------------------------------------
// Første fullføring gir XP: full pott ved feilfritt spill, halv ved forsøk med
// bom — deltakelse belønnes, men forklaringen er alltid hele poenget. XP går
// rett i profilens globalXp (nivåboblen), synkes som vanlig profilendring.
function giXp(post, perfekt) {
  const t = lesTilstand();
  if (t.spilt[post.id]) return { xp: 0, res: t.spilt[post.id].res };
  const res = perfekt ? 'perfekt' : 'delvis';
  const xp = perfekt ? post.xp : Math.max(10, Math.round(post.xp / 10) * 5);
  endreTilstand((s) => { s.spilt[post.id] = { res, xp, ts: Date.now() }; });

  const profil = hentProfil();
  if (profil) {
    const før = nivaFraTotalXp(profil.globalXp || 0).niva;
    profil.globalXp = (profil.globalXp || 0) + xp;
    lagreProfil(profil);
    const etter = nivaFraTotalXp(profil.globalXp).niva;
    if (etter > før) {
      plingSekvens(3);
      varsle(`Nivå ${etter} — læring teller også!`);
    }
  }
  return { xp, res };
}

// --- Småhjelpere ---------------------------------------------------------------
const VANSKELIGHET = { Beginner: 'Nybegynner', Intermediate: 'Øvet', Advanced: 'Avansert' };

// Etikettene skal aldri kunne misleses som fasit («Riktig svar» med hake så
// ut som feedback) — derfor nøytrale spillnavn.
const SPILLNAVN = {
  'Correct Answer': ['Quiz', 'sjekk'],
  'Match the Terms': ['Koble begrepene', 'bytt'],
  'Order the Events': ['Riktig rekkefølge', 'stolper'],
  'Predict What Happened': ['Hva skjedde?', 'oye'],
  'Fill the Gap': ['Fyll hullet', 'penn'],
  'Fact or Myth': ['Fakta eller myte', 'lyn'],
  'Match the Pairs': ['Finn parene', 'terning'],
};

function formaterTall(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',').replace(',0', '')}k`;
  return String(n);
}

function eksternLenke(k, etikett) {
  if (!k?.url) return null;
  return el('a', { class: 'spillsvar__kilde', href: k.url, target: '_blank', rel: 'noopener' },
    el('span', { class: 'spillsvar__kildeetikett' }, etikett),
    el('span', { class: 'spillsvar__kildenavn' }, `${k.org ? `${k.org} — ` : ''}${k.tittel || k.url}`),
  );
}

// ==========================================================================
// Tilbakemelding (delt av alle modulene): lås svaret, vis riktig/feil
// umiddelbart, forklar hvorfor i én-to setninger, og tilby kilde/dypere
// lesning. XP-merket popper når noe faktisk ble kreditert.
// ==========================================================================
function svarPanel(post, { perfekt, xp, res = null, tittelOverstyr = null }) {
  const r = res || (perfekt ? 'perfekt' : 'delvis');
  const tittel = tittelOverstyr || (r === 'perfekt' ? 'Riktig!' : 'Godt forsøk!');
  return el('div', { class: `spillsvar spillsvar--${r === 'perfekt' ? 'riktig' : 'delvis'}` },
    el('div', { class: 'spillsvar__rad' },
      el('span', { class: 'spillsvar__status' },
        ikon(r === 'perfekt' ? 'sjekk' : 'info', 'ikon ikon--liten'), tittel),
      xp > 0 && el('span', { class: 'spillsvar__xp' }, `+${xp} XP`),
    ),
    el('p', { class: 'spillsvar__forklaring' }, post.spill.explanation),
    el('div', { class: 'spillsvar__kilder' },
      eksternLenke(post.kilde, 'Kilde'),
      eksternLenke(post.lesMer, 'Les mer'),
    ),
  );
}

// Fullfører et spill: lås modulen, krediter XP, vis tilbakemelding og
// oppdater toppstatistikken. `perfekt` = feilfritt førsteforsøk.
function fullfor(post, modul, perfekt, { øvelse = false, tittelOverstyr = null } = {}) {
  modul.classList.add('spill--laast');
  if (perfekt) { vibrer('riktig'); pling(880); } else { vibrer('feil'); pling(392, 0.16); }
  const { xp, res } = øvelse ? { xp: 0, res: perfekt ? 'perfekt' : 'delvis' } : giXp(post, perfekt);
  const panel = svarPanel(post, { perfekt, xp, res: øvelse ? (perfekt ? 'perfekt' : 'delvis') : res, tittelOverstyr });
  if (!REDUSERT()) panel.classList.add('spillsvar--inn');
  modul.append(panel);
  _oppdaterToppstats?.();
}

// ==========================================================================
// Modul 01 + 04 + 06 — ett trykk, ett svar (Correct Answer / Predict What
// Happened / Fact or Myth). Samme svarmotor: valg → lås → fasit + forklaring.
// ==========================================================================
function spillTapValg(post, { øvelse = false } = {}) {
  const g = post.spill;
  const erFaktaMyte = g.game_type === 'Fact or Myth';
  // Fakta/Myte beholder fast rekkefølge (to store knapper); resten stokkes.
  const valg = erFaktaMyte ? g.options.slice() : stokk(g.options, post.id);
  const modul = spillSkall(post);
  let ferdig = false;

  const knapper = valg.map((tekst) => el('button', {
    class: 'spillvalg' + (erFaktaMyte ? ` spillvalg--stor spillvalg--${String(tekst).toLowerCase()}` : ''),
    type: 'button',
    onclick: (ev) => {
      if (ferdig) return;
      ferdig = true;
      const riktig = tekst === g.correct_answer;
      ev.currentTarget.classList.add(riktig ? 'spillvalg--riktig' : 'spillvalg--feil');
      for (const k of knapper) {
        k.disabled = true;
        if (k.textContent === g.correct_answer) k.classList.add('spillvalg--riktig');
      }
      fullfor(post, modul, riktig, { øvelse });
    },
  }, tekst));

  modul.append(el('div', { class: 'spillvalgliste' + (erFaktaMyte ? ' spillvalgliste--rad' : '') }, ...knapper));
  return modul;
}

// ==========================================================================
// Modul 05 — Fyll hullet: setningen står åpen, tre ordbrikker under. Feil
// brikke ristes bort (og teller som bom); riktig brikke lander i hullet.
// ==========================================================================
function spillFyllHullet(post, { øvelse = false } = {}) {
  const g = post.spill;
  const modul = spillSkall(post);
  const deler = String(g.prompt).split(/_{3,}/);
  const hull = el('span', { class: 'gap__hull' }, '…');
  const setning = el('p', { class: 'gap__setning' },
    deler[0], hull, deler.length > 1 ? deler.slice(1).join(' ') : '');

  let bommer = 0;
  let ferdig = false;
  const brikker = stokk(g.options, post.id).map((ord) => el('button', {
    class: 'gapbrikke', type: 'button',
    onclick: (ev) => {
      if (ferdig) return;
      const riktig = ord === g.correct_answer;
      if (!riktig) {
        bommer++;
        vibrer('feil');
        ev.currentTarget.classList.add('gapbrikke--feil');
        ev.currentTarget.disabled = true;
        return; // prøv igjen — setningen skal fortsatt løses
      }
      ferdig = true;
      hull.textContent = ord;
      hull.classList.add('gap__hull--riktig');
      for (const b of brikker) b.disabled = true;
      ev.currentTarget.classList.add('gapbrikke--brukt');
      fullfor(post, modul, bommer === 0, { øvelse });
    },
  }, ord));

  modul.append(setning, el('div', { class: 'gapbrikker' }, ...brikker));
  return modul;
}

// ==========================================================================
// Modul 02 — Koble begrepene: tre begreper til venstre, tre betydninger i
// stokket rekkefølge til høyre. Trykk-for-å-koble (mobilvennlig alternativ
// til dra): riktig kobling låses med parfarge, feil blinker og teller bom.
// ==========================================================================
function spillKoblePar(post, { øvelse = false } = {}) {
  const g = post.spill;
  const modul = spillSkall(post);
  const par = g.options; // [{left, right}]
  const høyreStokket = stokkUlik(par.map((p) => p.right), post.id);

  let valgtVenstre = null;
  let bommer = 0;
  let funnet = 0;

  const venstreKnapper = new Map();
  const høyreKnapper = new Map();

  function sjekkPar(vTekst, hTekst, vKnapp, hKnapp) {
    const fasit = par.find((p) => p.left === vTekst)?.right === hTekst;
    if (fasit) {
      const nr = (funnet % 4) + 1;
      funnet++;
      for (const k of [vKnapp, hKnapp]) {
        k.classList.remove('parknapp--valgt');
        k.classList.add('parknapp--laast', `parknapp--par${nr}`);
        k.disabled = true;
      }
      vibrer('lett');
      if (funnet === par.length) fullfor(post, modul, bommer === 0, { øvelse });
    } else {
      bommer++;
      vibrer('feil');
      for (const k of [vKnapp, hKnapp]) {
        k.classList.add('parknapp--feil');
        setTimeout(() => k.classList.remove('parknapp--feil', 'parknapp--valgt'), 450);
      }
    }
    valgtVenstre = null;
  }

  const venstreKol = el('div', { class: 'par__kol' }, ...par.map((p) => {
    const k = el('button', { class: 'parknapp', type: 'button' }, p.left);
    k.addEventListener('click', () => {
      if (k.disabled) return;
      for (const [, vk] of venstreKnapper) vk.classList.remove('parknapp--valgt');
      valgtVenstre = { tekst: p.left, knapp: k };
      k.classList.add('parknapp--valgt');
    });
    venstreKnapper.set(p.left, k);
    return k;
  }));

  const høyreKol = el('div', { class: 'par__kol' }, ...høyreStokket.map((tekst) => {
    const k = el('button', { class: 'parknapp', type: 'button' }, tekst);
    k.addEventListener('click', () => {
      if (k.disabled || !valgtVenstre) return;
      sjekkPar(valgtVenstre.tekst, tekst, valgtVenstre.knapp, k);
    });
    høyreKnapper.set(tekst, k);
    return k;
  }));

  modul.append(
    el('p', { class: 'spill__hint' }, 'Velg et begrep til venstre, så betydningen til høyre.'),
    el('div', { class: 'par' }, venstreKol, høyreKol),
  );
  return modul;
}

// ==========================================================================
// Modul 03 — Riktig rekkefølge: hendelseskort i stokket rekkefølge flyttes
// med opp/ned-piler (trykk-for-å-flytte iht. masterplanen), «Sjekk» viser
// hva som står riktig — feilfritt førsteforsøk gir full pott.
// ==========================================================================
function spillRekkefolge(post, { øvelse = false } = {}) {
  const g = post.spill;
  const modul = spillSkall(post);
  const fasit = g.correct_answer;
  let rekke = stokkUlik(g.options, post.id);
  let forsøk = 0;
  let ferdig = false;

  const liste = el('div', { class: 'rekkeliste' });

  function flytt(fra, til) {
    if (ferdig || til < 0 || til >= rekke.length) return;
    const [x] = rekke.splice(fra, 1);
    rekke.splice(til, 0, x);
    tegn();
  }

  function tegn(status = null) {
    tom(liste);
    rekke.forEach((tekst, i) => {
      const stRiktig = status && fasit[i] === tekst;
      const stFeil = status && fasit[i] !== tekst;
      liste.append(el('div', { class: 'rekkerad' + (stRiktig ? ' rekkerad--riktig' : '') + (stFeil ? ' rekkerad--feil' : '') },
        el('span', { class: 'rekkerad__nr' }, String(i + 1)),
        el('span', { class: 'rekkerad__tekst' }, tekst),
        !ferdig && el('span', { class: 'rekkerad__piler' },
          el('button', { class: 'rekkerad__pil', type: 'button', 'aria-label': 'Flytt opp', disabled: i === 0, onclick: () => flytt(i, i - 1) }, ikon('chevronsopp', 'ikon ikon--liten')),
          el('button', { class: 'rekkerad__pil', type: 'button', 'aria-label': 'Flytt ned', disabled: i === rekke.length - 1, onclick: () => flytt(i, i + 1) }, ikon('chevronsned', 'ikon ikon--liten')),
        ),
      ));
    });
  }

  const sjekk = el('button', {
    class: 'knapp spill__sjekk', type: 'button',
    onclick: () => {
      if (ferdig) return;
      forsøk++;
      const alleRiktig = rekke.every((t, i) => fasit[i] === t);
      tegn(true);
      if (alleRiktig) {
        ferdig = true;
        sjekk.remove();
        tegn(true);
        fullfor(post, modul, forsøk === 1, { øvelse });
      } else {
        vibrer('feil');
        sjekk.textContent = 'Sjekk igjen';
      }
    },
  }, 'Sjekk rekkefølgen');

  tegn();
  modul.append(liste, sjekk);
  return modul;
}

// ==========================================================================
// Modul 07 — Finn parene: kompakt memory med meningsbærende par (begrep ↔
// beskrivelse), 2×3-rutenett. Trekk teller, men straffer aldri — fullføring
// er alltid full pott (masterplanen: ikke straff langsomme spillere).
// ==========================================================================
function spillMemory(post, { øvelse = false } = {}) {
  const g = post.spill;
  const modul = spillSkall(post);
  const kortdata = stokk(
    g.options.flatMap((p, i) => [{ tekst: p.card_a, par: i }, { tekst: p.card_b, par: i }]),
    post.id,
  );

  let åpne = []; // [{kort, data}]
  let funnet = 0;
  let trekk = 0;
  let venter = false;

  const teller = el('span', { class: 'memory__trekk' }, '0 trekk');

  const kort = kortdata.map((data) => {
    const flate = el('button', { class: 'memkort', type: 'button', 'aria-label': 'Snu kortet' },
      el('span', { class: 'memkort__bak' }, ikon('terning')),
      el('span', { class: 'memkort__frem' }, data.tekst),
    );
    flate.addEventListener('click', () => {
      if (venter || flate.classList.contains('memkort--apen') || flate.classList.contains('memkort--funnet')) return;
      flate.classList.add('memkort--apen');
      åpne.push({ kort: flate, data });
      if (åpne.length < 2) return;
      trekk++;
      teller.textContent = `${trekk} ${trekk === 1 ? 'trekk' : 'trekk'}`;
      const [a, b] = åpne;
      åpne = [];
      if (a.data.par === b.data.par) {
        funnet++;
        vibrer('lett');
        const nr = (a.data.par % 4) + 1;
        for (const x of [a.kort, b.kort]) {
          x.classList.remove('memkort--apen'); // --apen ville overstyrt parfargen
          x.classList.add('memkort--funnet', `memkort--par${nr}`);
          x.disabled = true;
        }
        if (funnet === g.options.length) {
          // Avslutt med alle parene synlige som en liten oppsummering.
          fullfor(post, modul, true, { øvelse, tittelOverstyr: `Fullført på ${trekk} trekk!` });
        }
      } else {
        venter = true;
        vibrer('feil');
        setTimeout(() => {
          for (const x of [a.kort, b.kort]) x.classList.remove('memkort--apen');
          venter = false;
        }, 750);
      }
    });
    return flate;
  });

  modul.append(
    el('div', { class: 'memory__hode' },
      el('p', { class: 'spill__hint' }, 'Snu to og to kort — finn parene som hører sammen.'),
      teller,
    ),
    el('div', { class: 'memory' }, ...kort),
  );
  return modul;
}

// --- Spillskall: felles hode for alle modulene ------------------------------
function spillSkall(post) {
  const [navn, ikonNavn] = SPILLNAVN[post.spill.game_type] || ['Minispill', 'terning'];
  const skall = el('div', { class: 'spill' },
    el('div', { class: 'spill__hode' },
      el('span', { class: 'spill__type' }, ikon(ikonNavn, 'ikon ikon--liten'), navn),
      el('span', { class: 'spill__xp' }, `${post.xp} XP`),
    ),
  );
  // Fakta/Myte og Fyll hullet bærer selve påstanden i spillflaten; de andre
  // stiller spørsmålet som prompt her.
  if (post.spill.game_type !== 'Fill the Gap') {
    skall.append(el('p', { class: 'spill__prompt' }, post.spill.prompt));
  }
  return skall;
}

function byggSpill(post, opts = {}) {
  switch (post.spill.game_type) {
    case 'Match the Terms': return spillKoblePar(post, opts);
    case 'Order the Events': return spillRekkefolge(post, opts);
    case 'Fill the Gap': return spillFyllHullet(post, opts);
    case 'Match the Pairs': return spillMemory(post, opts);
    default: return spillTapValg(post, opts); // Correct Answer / Predict / Fact or Myth
  }
}

// ==========================================================================
// Innleggskort: guide-hode, gradient-hero med hook, tittel + sammendrag,
// spillmodulen, og en sekundær engasjementsrad (masterplanen: lik/lagre/del
// forblir sekundært — spillet og forklaringen er hovedsaken).
// ==========================================================================
function guideAvatar(poster) {
  return el('span', {
    class: 'feedavatar',
    style: `background:linear-gradient(135deg, ${poster.aksentStart}, ${poster.aksentSlutt})`,
  }, (poster.navn || '?').slice(0, 1));
}

function kortHode(post, poster) {
  return el('div', { class: 'feedkort__hode' },
    guideAvatar(poster),
    el('div', { class: 'feedkort__hvem' },
      el('span', { class: 'feedkort__navn' }, poster.navn,
        el('span', { class: 'feedkort__handle' }, ` ${poster.handle}`)),
      el('span', { class: 'feedkort__meta' },
        `${post.kategori} · ${VANSKELIGHET[post.vanskelighet] || post.vanskelighet} · ~${post.estimertSek}s`),
    ),
    el('span', { class: 'feedkort__serie' }, post.serie),
  );
}

function kortHero(post, poster) {
  return el('div', {
    class: 'feedhero',
    style: `background:linear-gradient(135deg, ${poster.aksentStart}, ${poster.aksentSlutt})`,
  },
    el('span', { class: 'feedhero__kategori' }, post.underkategori || post.kategori),
    el('p', { class: 'feedhero__hook' }, post.hook),
  );
}

function delInnlegg(post) {
  const url = post.kilde?.url || location.href.split('#')[0];
  const tekst = `${post.tittel} — ${url}`;
  if (navigator.share) {
    navigator.share({ title: post.tittel, text: post.sammendrag, url }).catch(() => { /* avbrutt */ });
  } else if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(tekst).then(() => varsle('Kopiert til utklippstavlen'));
  }
}

function engasjementsRad(post) {
  const t = lesTilstand();
  const likt = !!t.likt[post.id];
  const lagret = !!t.lagret[post.id];

  const likTall = el('span', { class: 'feedknapp__tall' }, formaterTall((post.seed?.likes || 0) + (likt ? 1 : 0)));
  const likKnapp = el('button', { class: 'feedknapp' + (likt ? ' feedknapp--paa' : ''), type: 'button', 'aria-label': 'Lik' },
    ikon('hjerte', 'ikon ikon--liten'), likTall);
  likKnapp.addEventListener('click', () => {
    const ny = !lesTilstand().likt[post.id];
    endreTilstand((s) => { if (ny) s.likt[post.id] = 1; else delete s.likt[post.id]; });
    likKnapp.classList.toggle('feedknapp--paa', ny);
    likTall.textContent = formaterTall((post.seed?.likes || 0) + (ny ? 1 : 0));
    if (ny) vibrer('lett');
  });

  const lagreKnapp = el('button', { class: 'feedknapp' + (lagret ? ' feedknapp--paa' : ''), type: 'button', 'aria-label': 'Lagre' },
    ikon('bok', 'ikon ikon--liten'), el('span', { class: 'feedknapp__tall' }, 'Lagre'));
  lagreKnapp.addEventListener('click', () => {
    const ny = !lesTilstand().lagret[post.id];
    endreTilstand((s) => { if (ny) s.lagret[post.id] = 1; else delete s.lagret[post.id]; });
    lagreKnapp.classList.toggle('feedknapp--paa', ny);
    if (ny) varsle('Lagret — finn det igjen under «Lagret»-filteret');
  });

  return el('div', { class: 'feedkort__fot' },
    likKnapp,
    el('button', {
      class: 'feedknapp', type: 'button', 'aria-label': 'Kommentarer',
      onclick: () => varsle('Kommentarer kommer snart'),
    }, ikon('konvolutt', 'ikon ikon--liten'), el('span', { class: 'feedknapp__tall' }, formaterTall(post.seed?.comments || 0))),
    lagreKnapp,
    el('button', { class: 'feedknapp', type: 'button', 'aria-label': 'Del', onclick: () => delInnlegg(post) },
      ikon('pilhoyre', 'ikon ikon--liten'), el('span', { class: 'feedknapp__tall' }, 'Del')),
  );
}

// Allerede spilt: kompakt oppsummering med resultat + forklaring, og mulighet
// til å øve på nytt (uten ny XP) — repetisjon er læringens venn.
function spiltOppsummering(post, spilt, kortInnhold) {
  const dato = new Date(spilt.ts).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  const panel = svarPanel(post, { perfekt: spilt.res === 'perfekt', xp: 0, res: spilt.res, tittelOverstyr: spilt.res === 'perfekt' ? 'Riktig!' : 'Godt forsøk!' });
  const boks = el('div', { class: 'spill spill--laast' },
    el('div', { class: 'spill__hode' },
      el('span', { class: 'spill__type' }, ikon('sjekk', 'ikon ikon--liten'), 'Spilt ' + dato),
      el('span', { class: 'spill__xp' }, `+${spilt.xp} XP`),
    ),
    panel,
    el('button', {
      class: 'knapp knapp--sekundaer spill__igjen', type: 'button',
      onclick: (ev) => { ev.currentTarget.closest('.spill').replaceWith(byggSpill(post, { øvelse: true })); },
    }, 'Øv på nytt'),
  );
  kortInnhold.append(boks);
}

function feedKort(post) {
  const poster = posterFor(post.posterId) || { navn: 'Aha', handle: '@aha', aksentStart: '#0BA69F', aksentSlutt: '#4FA9F5' };
  const spilt = lesTilstand().spilt[post.id];

  const kort = el('article', { class: 'feedkort' },
    kortHode(post, poster),
    kortHero(post, poster),
    el('div', { class: 'feedkort__kropp' },
      el('h2', { class: 'feedkort__tittel' }, post.tittel),
      el('p', { class: 'feedkort__sammendrag' }, post.sammendrag),
    ),
  );
  if (spilt) spiltOppsummering(post, spilt, kort);
  else kort.append(byggSpill(post));
  kort.append(engasjementsRad(post));
  return kort;
}

// ==========================================================================
// Selve feeden (#/hjem): toppstats, filterchips (kategori + Lagret), og
// innleggene i redaksjonell rekkefølge med batch-innlasting ved scroll.
// ==========================================================================
let _oppdaterToppstats = null;

function toppStats(antallTotalt) {
  const t = lesTilstand();
  const spilteIder = Object.keys(t.spilt);
  const iDag = new Date(); iDag.setHours(0, 0, 0, 0);
  const dagens = spilteIder.filter((id) => t.spilt[id].ts >= iDag.getTime());
  const dagensXp = dagens.reduce((s, id) => s + (t.spilt[id].xp || 0), 0);
  return {
    venstre: `${spilteIder.length} av ${antallTotalt} spilt`,
    høyre: dagens.length ? `${dagens.length} i dag · +${dagensXp} XP` : 'Ingen spilt i dag — scroll og lær!',
  };
}

export function visFeedSkjerm(mount) {
  const main = fanesideMedTittel(mount, {
    tittel: 'Oppdag',
    under: 'Kunnskap du kan spille — rett i feeden.',
  });

  const laster = el('p', { class: 'dempet' }, 'Laster feeden…');
  main.append(laster);

  lastFeed().then((data) => {
    laster.remove();
    byggFeed(main, data);
  }).catch((e) => {
    laster.remove();
    main.append(el('div', { class: 'kort kort--info' },
      el('h2', {}, 'Kunne ikke laste feeden'),
      el('p', { class: 'dempet' }, e.message),
    ));
  });
}

function byggFeed(main, data) {
  const posts = data.posts.slice().sort((a, b) => a.rekkefolge - b.rekkefolge);

  // --- Toppstats: spilt totalt + dagens fangst -----------------------------
  const statVenstre = el('span', { class: 'feedstats__tekst' });
  const statHøyre = el('span', { class: 'feedstats__tekst feedstats__tekst--hoyre' });
  const statRad = el('div', { class: 'feedstats' },
    ikon('lyn', 'ikon ikon--liten'), statVenstre,
    el('span', { class: 'feedstats__skille' }),
    statHøyre,
  );
  _oppdaterToppstats = () => {
    const s = toppStats(posts.length);
    statVenstre.textContent = s.venstre;
    statHøyre.textContent = s.høyre;
  };
  _oppdaterToppstats();

  // --- Filter: Alle · Lagret · kategoriene i innholdet ----------------------
  const kategorier = [...new Set(posts.map((p) => p.kategori))];
  let filter = 'alle';
  const chips = new Map();
  const chipRad = el('div', { class: 'feedfilter' });
  const leggChip = (id, tekst) => {
    const c = el('button', { class: 'artchip' + (filter === id ? ' artchip--valgt' : ''), type: 'button' }, tekst);
    c.addEventListener('click', () => { filter = id; for (const [k, ch] of chips) ch.classList.toggle('artchip--valgt', k === id); tegnListe(); });
    chips.set(id, c);
    chipRad.append(c);
  };
  leggChip('alle', 'Alle');
  leggChip('lagret', 'Lagret');
  for (const k of kategorier) leggChip(k, k);

  // --- Liste med batch-innlasting -------------------------------------------
  const liste = el('div', { class: 'feedliste' });
  const vaktpost = el('div', { class: 'feed__vaktpost' });
  let synlige = [];
  let vist = 0;

  function leggBatch() {
    const neste = synlige.slice(vist, vist + BATCH);
    vist += neste.length;
    for (const p of neste) liste.append(feedKort(p));
    vaktpost.style.display = vist < synlige.length ? '' : 'none';
    if (!synlige.length) {
      liste.append(el('div', { class: 'kort tomstyrke' },
        el('span', { class: 'tomstyrke__disk' }, ikon('bok')),
        el('p', { class: 'oppmuntring__tittel' }, 'Ingenting her ennå'),
        el('p', { class: 'dempet' }, filter === 'lagret'
          ? 'Trykk «Lagre» på et innlegg for å ta vare på det her.'
          : 'Ingen innlegg i denne kategorien.'),
      ));
    }
  }

  function tegnListe() {
    tom(liste);
    vist = 0;
    const t = lesTilstand();
    synlige = posts.filter((p) => {
      if (filter === 'alle') return true;
      if (filter === 'lagret') return !!t.lagret[p.id];
      return p.kategori === filter;
    });
    leggBatch();
  }

  const observer = new IntersectionObserver((oppf) => {
    if (oppf.some((o) => o.isIntersecting) && vist < synlige.length) leggBatch();
  }, { rootMargin: '600px' });
  observer.observe(vaktpost);

  tegnListe();
  main.append(statRad, chipRad, liste, vaktpost);
}
