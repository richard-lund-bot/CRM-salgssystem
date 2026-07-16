// Feed (M38) — den spillbare lærings-feeden på Hjem-fanen, i sosial-feed-drakt:
// ingen banner/bakgrunnsbilde, kun en slank topplinje med «For deg»-dropdown
// (kategorier + Lagret), kalender til venstre og bjelle til høyre. Hvert
// innlegg er et fullbredde gradientkort med avrundede hjørner og hvitt
// mellomrom, minispillet rett i kortet (Aha-masterplanen: Preview → Play →
// Commit → Feedback → Continue) og aksjonene (lik/kommenter/lagre/del) som
// en vertikal rail til høyre. Varslene bor i et Instagram-aktig skyvepanel
// (gruppert per dag, sveip bort for å lukke); kommentarfeltet skyver inn fra
// høyre og legger seg halvveis over. Innholdet bor i data/feed.json.
// XP går inn i profilens globale nivå; per-innlegg-tilstand (spilt/likt/
// lagret/kommentarer) bor lokalt i localStorage, offline-first som ellers.
import { el, tom, ikon } from './ui.js';
import { hentProfil, lagreProfil } from './store.js';
import { nivaFraTotalXp } from './niva.js';
import { varsle } from './toast.js';
import { pling, plingSekvens } from './lyd.js';
import { vibrer } from './haptikk.js';
import { REDUSERT } from './animasjon.js';
import { byggVarsler, varselKort, merkVarslerSett, harUlesteVarsler, tidSiden } from './varsler.js';

const LS_FEED = 'trening.feed';
const BATCH = 5; // innlegg per innlastingsrunde (uendelig scroll)

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
    return { spilt: t.spilt || {}, likt: t.likt || {}, lagret: t.lagret || {}, komm: t.komm || {} };
  } catch {
    return { spilt: {}, likt: {}, lagret: {}, komm: {} };
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

// Fullfører et spill: lås modulen, krediter XP, vis tilbakemelding.
// `perfekt` = feilfritt førsteforsøk.
function fullfor(post, modul, perfekt, { øvelse = false, tittelOverstyr = null } = {}) {
  modul.classList.add('spill--laast');
  if (perfekt) { vibrer('riktig'); pling(880); } else { vibrer('feil'); pling(392, 0.16); }
  const { xp, res } = øvelse ? { xp: 0, res: perfekt ? 'perfekt' : 'delvis' } : giXp(post, perfekt);
  const panel = svarPanel(post, { perfekt, xp, res: øvelse ? (perfekt ? 'perfekt' : 'delvis') : res, tittelOverstyr });
  if (!REDUSERT()) panel.classList.add('spillsvar--inn');
  modul.append(panel);
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
      teller.textContent = `${trekk} trekk`;
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

// --- Spillskall: felles hode for alle modulene (mørkt glass på gradientkortet)
function spillSkall(post) {
  const [navn, ikonNavn] = SPILLNAVN[post.spill.game_type] || ['Minispill', 'terning'];
  const skall = el('div', { class: 'spill spill--mork' },
    el('div', { class: 'spill__hode' },
      el('span', { class: 'spill__type' }, ikon(ikonNavn, 'ikon ikon--liten'), navn),
      el('span', { class: 'spill__xp' }, `${post.xp} XP`),
    ),
  );
  // Fyll hullet bærer selve påstanden i spillflaten; de andre stiller
  // spørsmålet som prompt her.
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

// Allerede spilt: kompakt oppsummering med resultat + forklaring, og mulighet
// til å øve på nytt (uten ny XP) — repetisjon er læringens venn.
function spiltOppsummering(post, spilt) {
  const dato = new Date(spilt.ts).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  const panel = svarPanel(post, { perfekt: spilt.res === 'perfekt', xp: 0, res: spilt.res });
  return el('div', { class: 'spill spill--mork spill--laast' },
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
}

// ==========================================================================
// Skyvepaneler — Instagram-språket: en side som glir inn fra høyre og
// sveipes bort igjen (eller lukkes med pila). Delt gest for varsler (full
// bredde) og kommentarer (halvveis over).
// ==========================================================================
function skyvGest(panel, lukk) {
  let startX = null;
  let startY = null;
  let drar = false;
  panel.addEventListener('pointerdown', (ev) => {
    if (!ev.isPrimary) return;
    startX = ev.clientX;
    startY = ev.clientY;
    drar = false;
  });
  panel.addEventListener('pointermove', (ev) => {
    if (startX == null) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!drar) {
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return; // vertikal scroll vinner
      drar = true;
      panel.setPointerCapture(ev.pointerId);
      panel.classList.add('skyv--drar');
    }
    panel.style.transform = `translateX(${Math.max(0, dx)}px)`;
  });
  const slipp = (ev) => {
    if (startX == null) return;
    const dx = ev.clientX - startX;
    startX = null;
    if (!drar) return;
    drar = false;
    panel.classList.remove('skyv--drar');
    panel.style.transform = '';
    if (dx > 90) lukk();
  };
  panel.addEventListener('pointerup', slipp);
  panel.addEventListener('pointercancel', slipp);
}

function lukkPanel(panel, bakteppe = null) {
  panel.classList.remove('skyv--apen');
  bakteppe?.classList.remove('kommbak--apen');
  const fjern = () => { panel.remove(); bakteppe?.remove(); };
  if (REDUSERT()) fjern();
  else {
    panel.addEventListener('transitionend', fjern, { once: true });
    setTimeout(fjern, 500); // fallback
  }
}

function åpnePanel(panel, bakteppe = null) {
  if (REDUSERT()) { panel.classList.add('skyv--apen'); bakteppe?.classList.add('kommbak--apen'); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.classList.add('skyv--apen');
    bakteppe?.classList.add('kommbak--apen');
  }));
}

// --- Varsler: fullbredde skyveside gruppert per dag (I dag / I går / …) -----
function dagGruppe(ts, nå = new Date()) {
  const start = new Date(nå); start.setHours(0, 0, 0, 0);
  if (ts >= start.getTime()) return 'I dag';
  if (ts >= start.getTime() - 86400000) return 'I går';
  if (ts >= start.getTime() - 7 * 86400000) return 'Siste 7 dager';
  return 'Tidligere';
}

function åpneVarsler(vert, påLukket) {
  const feed = byggVarsler();
  const innhold = el('div', { class: 'skyvepanel__innhold' });
  if (!feed.length) {
    innhold.append(el('div', { class: 'kort tomstyrke' },
      el('span', { class: 'tomstyrke__disk' }, ikon('bjelle')),
      el('p', { class: 'oppmuntring__tittel' }, 'Ingen varsler ennå'),
      el('p', { class: 'dempet' }, 'Fullfør en økt eller spill i feeden, så dukker det opp her.'),
    ));
  } else {
    let forrigeGruppe = null;
    for (const v of feed) {
      const gruppe = dagGruppe(v.ts);
      if (gruppe !== forrigeGruppe) {
        forrigeGruppe = gruppe;
        innhold.append(el('h2', { class: 'skyvepanel__dag' }, gruppe));
      }
      innhold.append(varselKort(v));
    }
  }

  const panel = el('div', { class: 'skyvepanel', role: 'dialog', 'aria-label': 'Varsler' },
    el('header', { class: 'skyvepanel__topp' },
      el('button', {
        class: 'ikonknapp ikonknapp--plain', type: 'button', 'aria-label': 'Tilbake',
        onclick: () => lukk(),
      }, ikon('chevron', 'ikon ikon--flip')),
      el('h1', { class: 'skyvepanel__tittel' }, 'Varsler'),
    ),
    innhold,
  );
  const lukk = () => { lukkPanel(panel); påLukket?.(); };
  skyvGest(panel, lukk);
  vert.append(panel);
  åpnePanel(panel);
  merkVarslerSett(feed[0]?.ts); // alt som vises nå regnes som sett
}

// --- Kommentarer: halvside som skyver inn fra høyre --------------------------
// Fellesskapskommentarer finnes ikke ennå (seed-tallet vises som kontekst);
// egne kommentarer lagres lokalt på enheten så feltet faktisk virker.
function åpneKommentarer(post, vert, påEndret) {
  const liste = el('div', { class: 'kommpanel__liste' });

  function tegnListe() {
    tom(liste);
    const mine = lesTilstand().komm[post.id] || [];
    if (!mine.length) {
      liste.append(el('p', { class: 'kommpanel__tom' },
        `${formaterTall(post.seed?.comments || 0)} kommentarer fra fellesskapet kommer snart. Dine notater lagres bare hos deg.`));
    } else {
      for (const k of mine.slice().reverse()) {
        liste.append(el('div', { class: 'kommentar' },
          el('span', { class: 'kommentar__hvem' }, 'Du', el('span', { class: 'kommentar__tid' }, ` · ${tidSiden(k.ts)}`)),
          el('p', { class: 'kommentar__tekst' }, k.tekst),
        ));
      }
      liste.append(el('p', { class: 'kommpanel__tom' },
        `${formaterTall(post.seed?.comments || 0)} kommentarer fra fellesskapet kommer snart.`));
    }
  }
  tegnListe();

  const felt = el('input', { class: 'kommpanel__felt', type: 'text', placeholder: 'Skriv en kommentar…', maxlength: '280' });
  const send = () => {
    const tekst = felt.value.trim();
    if (!tekst) return;
    endreTilstand((s) => {
      s.komm[post.id] = s.komm[post.id] || [];
      s.komm[post.id].push({ tekst, ts: Date.now() });
    });
    felt.value = '';
    vibrer('lett');
    tegnListe();
    påEndret?.();
  };
  felt.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') send(); });

  const bakteppe = el('div', { class: 'kommbak' });
  const panel = el('div', { class: 'kommpanel', role: 'dialog', 'aria-label': 'Kommentarer' },
    el('header', { class: 'kommpanel__topp' },
      el('h2', { class: 'kommpanel__tittel' }, 'Kommentarer'),
      el('span', { class: 'kommpanel__antall' }, formaterTall((post.seed?.comments || 0) + (lesTilstand().komm[post.id] || []).length)),
    ),
    liste,
    el('div', { class: 'kommpanel__fot' },
      felt,
      el('button', { class: 'kommpanel__send', type: 'button', 'aria-label': 'Send', onclick: send }, ikon('send')),
    ),
  );
  const lukk = () => lukkPanel(panel, bakteppe);
  bakteppe.addEventListener('click', lukk);
  skyvGest(panel, lukk);
  vert.append(bakteppe, panel);
  åpnePanel(panel, bakteppe);
}

// ==========================================================================
// Innleggskortet: fullbredde gradientkort med avrundede hjørner («fullside
// bakgrunn» per innlegg), innhold rett på flaten uten delere, minispillet i
// mørkt glass, aksjonsrail til høyre og guide + postet-tid nederst.
// ==========================================================================
function guideAvatar(poster) {
  return el('span', {
    class: 'feedavatar',
    style: `background:linear-gradient(135deg, ${poster.aksentStart}, ${poster.aksentSlutt})`,
  }, (poster.navn || '?').slice(0, 1));
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

// Vertikal aksjonsrail (som referansen): lik, kommenter, lagre, del — hvite
// sirkler med tall under, til høyre for spillmodulen.
function aksjonsRail(post, vert) {
  const t = lesTilstand();

  const railKnapp = (ikonNavn, tall, etikett, onClick, påOverride = false) => {
    const tallEl = el('span', { class: 'rail__tall' }, tall);
    const knapp = el('button', {
      class: 'rail__knapp' + (påOverride ? ' rail__knapp--paa' : ''),
      type: 'button', 'aria-label': etikett, onclick: onClick,
    }, ikon(ikonNavn));
    return { rot: el('div', { class: 'rail__punkt' }, knapp, tallEl), knapp, tallEl };
  };

  const lik = railKnapp('hjerte', formaterTall((post.seed?.likes || 0) + (t.likt[post.id] ? 1 : 0)), 'Lik', () => {
    const ny = !lesTilstand().likt[post.id];
    endreTilstand((s) => { if (ny) s.likt[post.id] = 1; else delete s.likt[post.id]; });
    lik.knapp.classList.toggle('rail__knapp--paa', ny);
    lik.tallEl.textContent = formaterTall((post.seed?.likes || 0) + (ny ? 1 : 0));
    if (ny) vibrer('lett');
  }, !!t.likt[post.id]);

  const kommTall = () => formaterTall((post.seed?.comments || 0) + (lesTilstand().komm[post.id] || []).length);
  const komm = railKnapp('snakke', kommTall(), 'Kommentarer', () => {
    åpneKommentarer(post, vert, () => { komm.tallEl.textContent = kommTall(); });
  });

  const lagre = railKnapp('bokmerke', formaterTall((post.seed?.saves || 0) + (t.lagret[post.id] ? 1 : 0)), 'Lagre', () => {
    const ny = !lesTilstand().lagret[post.id];
    endreTilstand((s) => { if (ny) s.lagret[post.id] = 1; else delete s.lagret[post.id]; });
    lagre.knapp.classList.toggle('rail__knapp--paa', ny);
    lagre.tallEl.textContent = formaterTall((post.seed?.saves || 0) + (ny ? 1 : 0));
    if (ny) varsle('Lagret — finn det igjen under «Lagret» i For deg-menyen');
  }, !!t.lagret[post.id]);

  const del = railKnapp('dele', formaterTall(post.seed?.shares || 0), 'Del', () => delInnlegg(post));

  return el('div', { class: 'rail' }, lik.rot, komm.rot, lagre.rot, del.rot);
}

function feedKort(post, vert) {
  const poster = posterFor(post.posterId) || { navn: 'Aha', handle: '@aha', aksentStart: '#0BA69F', aksentSlutt: '#4FA9F5' };
  const spilt = lesTilstand().spilt[post.id];
  const ts = Date.parse(post.opprettet || '') || Date.now();

  const spillsone = el('div', { class: 'fkort__spillsone' },
    spilt ? spiltOppsummering(post, spilt) : byggSpill(post));

  return el('article', {
    class: 'fkort',
    style: `background:linear-gradient(165deg, ${poster.aksentStart}, ${poster.aksentSlutt})`,
  },
    el('div', { class: 'fkort__hode' },
      el('span', { class: 'fkort__kategori' }, post.underkategori || post.kategori),
      el('span', { class: 'fkort__vansk' }, VANSKELIGHET[post.vanskelighet] || post.vanskelighet),
    ),
    el('p', { class: 'fkort__hook' }, post.hook),
    el('h2', { class: 'fkort__tittel' }, post.tittel),
    el('p', { class: 'fkort__sammendrag' }, post.sammendrag),
    el('div', { class: 'fkort__midt' },
      spillsone,
      aksjonsRail(post, vert),
    ),
    el('div', { class: 'fkort__bunn' },
      guideAvatar(poster),
      el('div', { class: 'fkort__hvem' },
        el('span', { class: 'fkort__navn' }, poster.navn,
          el('span', { class: 'fkort__handle' }, ` ${poster.handle}`)),
        el('span', { class: 'fkort__serie' }, `${post.serie} · ${tidSiden(ts)}`),
      ),
    ),
  );
}

// ==========================================================================
// Selve feeden (#/hjem): slank topplinje (kalender · «For deg»-dropdown ·
// bjelle), fullbredde innlegg uten delere, og batch-innlasting ved scroll.
// Ingen banner, ikke noe bakgrunnsbilde — innholdet ER siden.
// ==========================================================================
export function visFeedSkjerm(mount) {
  document.body.classList.add('fane-laast'); // egen scrollflate, som fanesidene
  tom(mount);

  const scroll = el('div', { class: 'hjem-scroll feedscroll' });
  const laster = el('p', { class: 'dempet feedscroll__laster' }, 'Laster feeden…');
  scroll.append(laster);

  lastFeed().then((data) => {
    laster.remove();
    byggFeed(mount, scroll, data);
  }).catch((e) => {
    laster.remove();
    scroll.append(el('div', { class: 'kort kort--info' },
      el('h2', {}, 'Kunne ikke laste feeden'),
      el('p', { class: 'dempet' }, e.message),
    ));
  });

  mount.append(scroll);
}

function byggFeed(mount, scroll, data) {
  const posts = data.posts.slice().sort((a, b) => a.rekkefolge - b.rekkefolge);
  const kategorier = [...new Set(posts.map((p) => p.kategori))];

  // --- Topplinje: kalender · «For deg» med dropdown · bjelle ----------------
  let filter = 'alle';
  const fordegTekst = el('span', { class: 'fordeg__tekst' }, 'For deg');
  const drop = el('div', { class: 'feeddrop', hidden: true });

  const fordeg = el('button', {
    class: 'fordeg', type: 'button', 'aria-haspopup': 'true',
    onclick: (ev) => { ev.stopPropagation(); drop.hidden = !drop.hidden; },
  }, fordegTekst, ikon('chevronned', 'ikon fordeg__pil'));

  function velgFilter(id, navn) {
    filter = id;
    fordegTekst.textContent = navn;
    drop.hidden = true;
    tegnDropdown();
    tegnListe();
    scroll.scrollTop = 0;
  }

  function tegnDropdown() {
    tom(drop);
    const rad = (id, navn) => el('button', {
      class: 'feeddrop__rad' + (filter === id ? ' feeddrop__rad--valgt' : ''), type: 'button',
      onclick: () => velgFilter(id, id === 'alle' ? 'For deg' : navn),
    }, el('span', {}, navn), filter === id && ikon('sjekk', 'ikon ikon--liten'));
    drop.append(
      rad('alle', 'For deg'),
      rad('lagret', 'Lagret'),
      el('div', { class: 'feeddrop__strek' }),
      ...kategorier.map((k) => rad(k, k)),
    );
  }
  tegnDropdown();
  document.addEventListener('click', (ev) => {
    if (!drop.hidden && !drop.contains(ev.target) && !fordeg.contains(ev.target)) drop.hidden = true;
  });

  const bjelle = el('button', {
    class: 'ikonknapp ikonknapp--plain ikonknapp--bjelle', type: 'button',
    'aria-label': harUlesteVarsler() ? 'Varsler — nye' : 'Varsler',
  }, ikon('bjelle'));
  const prikk = () => {
    bjelle.querySelector('.varselprikk')?.remove();
    if (harUlesteVarsler()) bjelle.append(el('i', { class: 'varselprikk' }));
  };
  prikk();
  bjelle.addEventListener('click', () => åpneVarsler(mount, prikk));

  const topp = el('div', { class: 'feedtopp' },
    el('a', { class: 'ikonknapp ikonknapp--plain', href: '#/kalender', 'aria-label': 'Mosjonskalender' }, ikon('kalender')),
    fordeg,
    bjelle,
    drop,
  );

  // --- Liste med batch-innlasting -------------------------------------------
  const liste = el('div', { class: 'feedliste' });
  const vaktpost = el('div', { class: 'feed__vaktpost' });
  let synlige = [];
  let vist = 0;

  function leggBatch() {
    const neste = synlige.slice(vist, vist + BATCH);
    vist += neste.length;
    for (const p of neste) liste.append(feedKort(p, mount));
    vaktpost.style.display = vist < synlige.length ? '' : 'none';
    if (!synlige.length) {
      liste.append(el('div', { class: 'kort tomstyrke' },
        el('span', { class: 'tomstyrke__disk' }, ikon('bokmerke')),
        el('p', { class: 'oppmuntring__tittel' }, 'Ingenting her ennå'),
        el('p', { class: 'dempet' }, filter === 'lagret'
          ? 'Trykk bokmerket på et innlegg for å ta vare på det her.'
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
  }, { rootMargin: '900px' });
  observer.observe(vaktpost);

  tegnListe();
  scroll.append(liste, vaktpost);
  mount.prepend(topp);
}
