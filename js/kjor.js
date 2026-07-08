// Generator-input → review → kjøring (taksonomi §11 steg 1–6). Holder «gjeldende
// økt» i minne mellom skjermene, lar deg bytte øvelser og regenerere før du låser,
// og kjører økta blokk for blokk: klokke-/hold-/pust-/distanseblokker får en timer
// (v1-arven, generalisert), reps/flyt får en guide-modus med neste/forrige.
import { el, tom, chip } from './ui.js';
import { MODALITET_NAVN, MONSTER_NAVN } from './library.js';
import { genererOkt, byttOvelse, regenerer, regenererBlokk } from './generator.js';
import {
  hentProfil, lagreProfil, lagreGenerert, leggTilLogg, nyligeOvelseIder,
  hentSistLokasjon, lagreSistLokasjon,
} from './store.js';
import { registrerOkt, INTENSITET } from './niva.js';
import { avatarBilde, erBildeAvatar, AVATAR_NAVN } from './belonninger.js';

let _bib = null;
let gjeldendeOkt = null;
let aktivInterval = null;

export function settBib(bib) { _bib = bib; }
export function hentØkt() { return gjeldendeOkt; }
export function settØkt(o) { gjeldendeOkt = o; }

function stoppTimer() {
  if (aktivInterval) { clearInterval(aktivInterval); aktivInterval = null; }
}

// Kort pling ved fasebytte — hjelper når mobilen ligger på gulvet.
function pling(frekv = 880, lengde = 0.12) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ac = pling._ac || (pling._ac = new Ctx());
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = frekv;
    o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + lengde);
    o.start(); o.stop(ac.currentTime + lengde);
  } catch { /* stille fallback */ }
}

// ===========================================================================
// Felles skjerm-skall (egen header, ikke tab-bar-styrt)
// ===========================================================================
function monter(mount, ...innhold) {
  stoppTimer();
  tom(mount);
  mount.append(...innhold);
}

function tilbakeTopp(tittel, undertekst, påTilbake) {
  return el('header', { class: 'topp topp--kjor' },
    el('button', { class: 'topp__tilbake', type: 'button', onclick: påTilbake, title: 'Tilbake' }, '‹'),
    el('div', {},
      el('h1', { class: 'topp__tittel' }, tittel),
      undertekst && el('p', { class: 'topp__under' }, undertekst),
    ),
  );
}

// ===========================================================================
// 1) Generator-input
// ===========================================================================
const KLASSER = [['Mikro', 'mikro'], ['Kort', 'kort'], ['Standard', 'standard'], ['Lang', 'lang']];
const INTENSITETER = [['Rolig', 1], ['Lett', 2], ['Moderat', 3], ['Hard', 4], ['Maks', 5]];

export function visGeneratorSkjerm(mount, forhandsvalg = {}) {
  const bib = _bib;
  const profil = hentProfil();
  const modaliteter = [...new Set(bib.templates.map((t) => t.modalitet))];
  const foreslatt = foreslaModalitet(bib, profil);

  const state = {
    modalitet: forhandsvalg.modalitet || foreslatt,
    varighetsklasse: forhandsvalg.varighetsklasse || profil?.varighetsklasse || 'standard',
    intensitet: forhandsvalg.intensitet || standardIntensitet(profil),
    lokasjon: forhandsvalg.lokasjon || hentSistLokasjon() || profil?.aktivLokasjon || 'Hjemme',
  };
  const lokasjoner = (profil?.lokasjoner || []).map((l) => l.navn);

  function tegn() {
    const modChips = el('div', { class: 'chiprad' },
      ...modaliteter.map((m) => chip(MODALITET_NAVN[m] || m, {
        aktiv: state.modalitet === m, onClick: () => { state.modalitet = m; tegn(); },
      })),
    );
    monter(mount,
      tilbakeTopp('Ny økt', 'Sett rammene — generatoren fyller resten.', () => { location.hash = '#/hjem'; }),
      el('main', { class: 'innhold' },
        el('div', { class: 'kort' },
          el('h2', {}, 'Treningsform'),
          foreslatt === state.modalitet && el('p', { class: 'dempet' }, '⭐ Foreslått ut fra profilen din'),
          modChips,
        ),
        el('div', { class: 'kort' },
          el('h2', {}, 'Lengde'),
          el('div', { class: 'chiprad' },
            ...KLASSER.map(([navn, id]) => chip(navn, { aktiv: state.varighetsklasse === id, onClick: () => { state.varighetsklasse = id; tegn(); } })),
          ),
        ),
        el('div', { class: 'kort' },
          el('h2', {}, 'Intensitet'),
          el('div', { class: 'chiprad' },
            ...INTENSITETER.map(([navn, v]) => chip(navn, { aktiv: state.intensitet === v, onClick: () => { state.intensitet = v; tegn(); } })),
          ),
        ),
        lokasjoner.length > 1 && el('div', { class: 'kort' },
          el('h2', {}, 'Sted'),
          el('div', { class: 'chiprad' },
            ...lokasjoner.map((navn) => chip(navn, { aktiv: state.lokasjon === navn, onClick: () => { state.lokasjon = navn; lagreSistLokasjon(navn); tegn(); } })),
          ),
        ),
        el('div', { class: 'fast-bunn' },
          el('button', { class: 'knapp', type: 'button', onclick: () => {
            gjeldendeOkt = genererOkt(bib, profil, {
              ...state,
              nyligeIder: [...nyligeOvelseIder(3)],
              stempel: new Date().toISOString().slice(0, 10),
            });
            location.hash = '#/review';
          } }, 'Generer økt'),
        ),
      ),
    );
  }
  tegn();
}

// Foreslått modalitet = argmax(motivasjonsvekt) blant modaliteter med mal.
function foreslaModalitet(bib, profil) {
  const medMal = new Set(bib.templates.map((t) => t.modalitet));
  const vekter = profil?.motivasjon?.vekter || {};
  let best = 'STY';
  let bestV = -Infinity;
  for (const m of medMal) {
    const v = vekter[m] || 0;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}

function standardIntensitet(profil) {
  const k = profil?.nivaer?.HIIT?.base || 2;
  return k >= 3 ? 3 : 2;
}

// ===========================================================================
// 2) Review
// ===========================================================================
export function visReviewSkjerm(mount) {
  const bib = _bib;
  const profil = hentProfil();
  if (!gjeldendeOkt) { location.hash = '#/ny'; return; }

  function tegn() {
    const okt = gjeldendeOkt;
    monter(mount,
      tilbakeTopp(okt.malNavn, `${okt.varighetMin} min · ${MODALITET_NAVN[okt.modalitet] || okt.modalitet} · ${okt.lokasjon}`, () => { location.hash = '#/ny'; }),
      el('main', { class: 'innhold' },
        el('div', { class: 'knapprad' },
          el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: () => { gjeldendeOkt = regenerer(bib, profil, okt); tegn(); } }, '↻ Regenerer alt'),
        ),
        ...okt.blokker.map((blk, bi) => blokkKort(blk, bi, () => tegn())),
        el('div', { class: 'fast-bunn' },
          el('button', { class: 'knapp', type: 'button', onclick: () => { location.hash = '#/kjor'; } }, 'Start økt ▶'),
        ),
      ),
    );
  }

  function blokkKort(blk, bi, oppdater) {
    const kanRegen = blk.kind === 'ovelser';
    return el('div', { class: 'kort blokk' },
      el('div', { class: 'blokk__topp' },
        el('div', {},
          el('span', { class: 'blokk__rolle blokk__rolle--' + blk.rolle }, rolleNavn(blk.rolle)),
          el('span', { class: 'blokk__format' }, blk.formatNavn),
        ),
        el('div', { class: 'blokk__hoyre' },
          el('span', { class: 'dempet' }, `~${blk.min} min`),
          kanRegen && el('button', { class: 'ikonknapp', type: 'button', title: 'Regenerer blokk', onclick: () => { gjeldendeOkt = regenererBlokk(bib, profil, gjeldendeOkt, bi); oppdater(); } }, '↻'),
        ),
      ),
      el('p', { class: 'blokk__param' }, paramTekst(blk)),
      el('div', { class: 'blokk__ovelser' },
        ...(blk.ovelser.length ? blk.ovelser.map((o, oi) => ovelseRad(blk, o, bi, oi, oppdater)) : [el('p', { class: 'dempet' }, kondisjonTekst(blk))]),
      ),
    );
  }

  function ovelseRad(blk, o, bi, oi, oppdater) {
    const kanBytte = blk.kind === 'ovelser';
    return el('div', { class: 'orad' },
      el('div', { class: 'orad__hoved' },
        el('span', { class: 'orad__navn' }, o.navn),
        o.dose && el('span', { class: 'orad__dose' }, o.dose),
        el('div', { class: 'orad__tags' },
          Number.isFinite(o.niva) && el('span', { class: 'niva' }, ...[1, 2, 3, 4, 5].map((n) => el('i', { class: 'niva__p' + (n <= o.niva ? ' niva__p--på' : '') }))),
          o.unilateral && el('span', { class: 'tag tag--u' }, 'per side'),
          o.impact === 'hoy' && el('span', { class: 'tag tag--impact' }, 'høy impact'),
          o.abBreak && el('span', { class: 'tag' }, 'ab-break'),
        ),
      ),
      kanBytte && el('button', { class: 'ikonknapp', type: 'button', title: 'Bytt øvelse', onclick: () => { gjeldendeOkt = byttOvelse(bib, profil, gjeldendeOkt, bi, oi); oppdater(); } }, '⇄'),
    );
  }

  tegn();
}

// ===========================================================================
// 3) Kjøring
// ===========================================================================
export function visKjoreSkjerm(mount) {
  const bib = _bib;
  if (!gjeldendeOkt) { location.hash = '#/ny'; return; }
  const okt = gjeldendeOkt;
  let idx = 0;

  function fremgang() {
    return el('div', { class: 'kjor-fremgang' },
      ...okt.blokker.map((_, i) => el('i', { class: 'kjor-fremgang__p' + (i < idx ? ' er-ferdig' : i === idx ? ' er-aktiv' : '') })),
    );
  }

  function neste() {
    if (idx < okt.blokker.length - 1) { idx++; tegn(); } else { stoppTimer(); visResultat(mount, okt); }
  }
  function forrige() { if (idx > 0) { idx--; tegn(); } }

  function tegn() {
    stoppTimer();
    const blk = okt.blokker[idx];
    monter(mount,
      el('header', { class: 'topp topp--kjor' },
        el('button', { class: 'topp__tilbake', type: 'button', onclick: () => { if (confirm('Avslutt økta uten å fullføre?')) location.hash = '#/review'; }, title: 'Avbryt' }, '✕'),
        el('div', {},
          el('h1', { class: 'topp__tittel' }, `${rolleNavn(blk.rolle)} · ${blk.formatNavn}`),
          el('p', { class: 'topp__under' }, `Blokk ${idx + 1} av ${okt.blokker.length}`),
        ),
      ),
      el('main', { class: 'innhold innhold--kjor' },
        fremgang(),
        renderBlokk(blk),
        el('div', { class: 'kjor-nav' },
          el('button', { class: 'knapp knapp--sekundaer' + (idx === 0 ? ' knapp--av' : ''), type: 'button', disabled: idx === 0, onclick: forrige }, 'Forrige'),
          el('button', { class: 'knapp', type: 'button', onclick: neste }, idx === okt.blokker.length - 1 ? 'Fullfør økt ✓' : 'Neste blokk →'),
        ),
      ),
    );
  }

  // Velg kjøreflate ut fra blokktype.
  function renderBlokk(blk) {
    if (blk.kind === 'pust' && blk.parametre?.takt) return pustFlate(blk);
    if (blk.kind === 'sekvens') return sekvensFlate(blk);
    if (blk.kind === 'kondisjon' || blk.formatKlasse === 'dist') return timerFlate(blk);
    if (blk.formatKlasse === 'klokke' || blk.formatKlasse === 'hold') return timerFlate(blk);
    return guideFlate(blk); // reps / runde / flyt / oppvarming
  }

  tegn();
}

// --- Kjøreflate: guide (checklist / posisjonsliste) ------------------------
function guideFlate(blk) {
  const wrap = el('div', { class: 'flate' });
  wrap.append(el('p', { class: 'flate__param' }, paramTekst(blk)));
  const liste = el('div', { class: 'guide' });
  blk.ovelser.forEach((o) => {
    const rad = el('button', { class: 'guide__rad', type: 'button' },
      el('span', { class: 'guide__hake' }, '○'),
      el('span', { class: 'guide__navn' }, o.navn + (o.dose ? ` · ${o.dose}` : '')),
      o.unilateral && el('span', { class: 'tag tag--u' }, 'per side'),
    );
    rad.addEventListener('click', () => {
      const på = rad.classList.toggle('guide__rad--ferdig');
      rad.firstChild.textContent = på ? '●' : '○';
    });
    liste.append(rad);
  });
  wrap.append(liste);
  if (!blk.ovelser.length) wrap.append(el('p', { class: 'dempet' }, kondisjonTekst(blk)));
  wrap.append(el('p', { class: 'dempet flate__hint' }, 'Trykk for å hake av. Selvstyrt tempo — start neste blokk når du er klar.'));
  return wrap;
}

// --- Kjøreflate: sekvens (posisjonsstepper) --------------------------------
function sekvensFlate(blk) {
  const seq = blk.ovelser[0];
  const runder = blk.parametre?.runder || 1;
  const posisjoner = seq?.posisjoner?.length ? seq.posisjoner : (seq ? [seq.navn] : []);
  let i = 0;
  const wrap = el('div', { class: 'flate flate--midt' });

  const tittel = el('div', { class: 'flate__stor' });
  const teller = el('p', { class: 'dempet' });
  const beskr = el('p', { class: 'flate__beskr' }, seq?.beskrivelse || '');

  function tegn() {
    tom(tittel); tittel.append(navnTilLesbar(posisjoner[i] || '—'));
    teller.textContent = `${seq?.navn || ''} · posisjon ${i + 1}/${posisjoner.length}${runder > 1 ? ` · ${runder} runder` : ''}`;
  }
  const nav = el('div', { class: 'flate__knapper' },
    el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: () => { i = Math.max(0, i - 1); tegn(); } }, '‹ Forrige'),
    el('button', { class: 'knapp', type: 'button', onclick: () => { i = Math.min(posisjoner.length - 1, i + 1); tegn(); } }, 'Neste ›'),
  );
  wrap.append(teller, tittel, beskr, nav, el('p', { class: 'dempet flate__hint' }, '1 bevegelse per pust. Gjenta hele sekvensen ' + runder + '×.'));
  tegn();
  return wrap;
}

// --- Kjøreflate: pust (pusteguide) -----------------------------------------
function pustFlate(blk) {
  const t = blk.parametre.takt;
  const tidMin = blk.parametre.tidMin || 5;
  const faser = [];
  if (t.inn) faser.push({ navn: 'Pust inn', sek: Math.round(t.inn), type: 'inn' });
  if (t.holdInn) faser.push({ navn: 'Hold', sek: Math.round(t.holdInn), type: 'hold' });
  if (t.ut) faser.push({ navn: 'Pust ut', sek: Math.round(t.ut), type: 'ut' });
  if (t.holdUt) faser.push({ navn: 'Hold', sek: Math.round(t.holdUt), type: 'hold' });
  const perRunde = faser.reduce((s, f) => s + f.sek, 0) || 1;
  const runder = Math.max(1, Math.round((tidMin * 60) / perRunde));
  const plan = [];
  for (let r = 0; r < runder; r++) plan.push(...faser);

  const wrap = el('div', { class: 'flate flate--midt' });
  const ring = el('div', { class: 'pustering' });
  const fasenavn = el('div', { class: 'flate__stor' }, 'Klar?');
  const nedtelling = el('div', { class: 'pust-tall' }, '');
  const igjen = el('p', { class: 'dempet' }, `${blk.ovelser[0]?.navn || 'Pust'} · ${runder} runder`);
  wrap.append(igjen, ring, fasenavn, nedtelling);
  wrap.append(timerKnapper(plan, {
    onFase: (f) => {
      fasenavn.textContent = f.navn;
      ring.className = 'pustering pustering--' + f.type;
      ring.style.setProperty('--pust-sek', f.sek + 's');
      pling(f.type === 'inn' ? 660 : f.type === 'ut' ? 440 : 550, 0.08);
    },
    onSek: (s) => { nedtelling.textContent = String(s); },
    onFerdig: () => { fasenavn.textContent = 'Ferdig 🙏'; nedtelling.textContent = ''; ring.className = 'pustering'; },
  }));
  return wrap;
}

// --- Kjøreflate: timer (intervall / hold / distanse) -----------------------
function timerFlate(blk) {
  const plan = fasePlan(blk);
  const wrap = el('div', { class: 'flate flate--midt' });
  const fasenavn = el('div', { class: 'flate__stor' }, 'Klar?');
  const klokke = el('div', { class: 'kjor-klokke' }, formatTid(plan[0]?.sek || 0));
  const status = el('p', { class: 'dempet' }, plan.length > 1 ? `${plan.length} faser` : paramTekst(blk));
  const neste = el('p', { class: 'flate__neste' }, '');
  wrap.append(el('p', { class: 'flate__param' }, paramTekst(blk)), fasenavn, klokke, neste, status);
  wrap.append(timerKnapper(plan, {
    onFase: (f, i) => {
      fasenavn.textContent = f.navn;
      fasenavn.className = 'flate__stor flate__stor--' + f.type;
      const n = plan[i + 1];
      neste.textContent = n ? `Neste: ${n.navn}` : 'Siste fase';
      pling(f.type === 'arbeid' || f.type === 'hold' ? 880 : 520, 0.1);
    },
    onSek: (s) => { klokke.textContent = formatTid(s); },
    onFerdig: () => { fasenavn.textContent = 'Blokk ferdig ✓'; fasenavn.className = 'flate__stor'; klokke.textContent = '00:00'; neste.textContent = ''; pling(990, 0.2); },
  }));
  return wrap;
}

// Bygger fase-planen (label + sekunder) for en timer-blokk.
function fasePlan(blk) {
  const p = blk.parametre || {};
  const ov = blk.ovelser || [];
  const navn = (i) => ov.length ? ov[i % ov.length].navn : (blk.formatNavn);
  const fmt = blk.format;
  const faser = [];

  if (blk.kind === 'kondisjon' || fmt === 'tid-i-sone' || fmt === 'distanse') {
    faser.push({ navn: `${p.sone || 'Z2'} · rolig`, sek: (p.tidMin || blk.min) * 60, type: 'arbeid' });
    return faser;
  }
  if (fmt === '4x4') {
    for (let r = 0; r < (p.runder || 4); r++) {
      faser.push({ navn: `Z4 hardt (${r + 1}/${p.runder || 4})`, sek: (p.arbeidMin || 4) * 60, type: 'arbeid' });
      if (r < (p.runder || 4) - 1) faser.push({ navn: 'Z2 rolig', sek: (p.hvileMin || 3) * 60, type: 'hvile' });
    }
    return faser;
  }
  if (fmt === 'tabata' || fmt === 'intervall') {
    const runder = p.runder || 8;
    for (let r = 0; r < runder; r++) {
      faser.push({ navn: navn(r) + (ov.length > 1 ? '' : ` (${r + 1}/${runder})`), sek: p.arbeidSek || 20, type: 'arbeid' });
      if (r < runder - 1) faser.push({ navn: 'Hvile', sek: p.hvileSek || 10, type: 'hvile' });
    }
    return faser;
  }
  if (blk.formatKlasse === 'hold') {
    const sett = p.sett || p.posisjoner || Math.max(1, ov.length) || 3;
    if (fmt === 'yin' || (ov.length && !p.tidSek)) {
      // Én posisjon per øvelse.
      const perSek = (p.tidMin || 3) * 60;
      ov.forEach((o, i) => faser.push({ navn: o.navn, sek: perSek, type: 'hold' }));
      if (!ov.length) faser.push({ navn: blk.formatNavn, sek: perSek, type: 'hold' });
      return faser;
    }
    const antall = ov.length || 1;
    for (let s = 0; s < sett; s++) {
      for (let k = 0; k < antall; k++) {
        faser.push({ navn: navn(k) + ` · sett ${s + 1}/${sett}`, sek: p.tidSek || 30, type: 'hold' });
        faser.push({ navn: 'Pause', sek: 20, type: 'hvile' });
      }
    }
    if (faser.length && faser[faser.length - 1].type === 'hvile') faser.pop();
    return faser;
  }
  // Fallback: en enkelt arbeidsperiode.
  faser.push({ navn: blk.formatNavn, sek: (blk.min || 5) * 60, type: 'arbeid' });
  return faser;
}

// Timer-motoren: spiller en fase-plan med pause/hopp. Deler aktivInterval.
function timerKnapper(plan, { onFase, onSek, onFerdig }) {
  let i = 0;
  let igjen = plan[0]?.sek || 0;
  let kjorer = false;

  const startKnapp = el('button', { class: 'knapp', type: 'button' }, 'Start');
  const hoppKnapp = el('button', { class: 'knapp knapp--sekundaer', type: 'button' }, 'Hopp over');

  function visFase() { onFase(plan[i], i); igjen = plan[i].sek; onSek(igjen); }

  function tikk() {
    igjen -= 1;
    if (igjen <= 0) {
      i += 1;
      if (i >= plan.length) { stoppTimer(); kjorer = false; startKnapp.textContent = 'Ferdig'; startKnapp.disabled = true; onFerdig(); return; }
      visFase();
    } else {
      onSek(igjen);
    }
  }

  function start() {
    if (kjorer) { // pause
      stoppTimer(); kjorer = false; startKnapp.textContent = 'Fortsett';
    } else {
      kjorer = true; startKnapp.textContent = 'Pause';
      if (i === 0 && igjen === plan[0]?.sek) visFase();
      stoppTimer();
      aktivInterval = setInterval(tikk, 1000);
    }
  }
  function hopp() {
    stoppTimer(); kjorer = false;
    i += 1;
    if (i >= plan.length) { startKnapp.textContent = 'Ferdig'; startKnapp.disabled = true; onFerdig(); return; }
    visFase(); startKnapp.textContent = 'Fortsett';
  }

  startKnapp.addEventListener('click', start);
  hoppKnapp.addEventListener('click', hopp);
  return el('div', { class: 'flate__knapper' }, startKnapp, hoppKnapp);
}

// ===========================================================================
// Resultat-logging (før ferdig-skjerm) — valgfrie tall for PR-sporing + RPE
// ===========================================================================
function visResultat(mount, okt) {
  const bib = _bib;
  // Loggbare øvelser = hoved-/finisher-øvelser med reps eller hold.
  const loggbare = [];
  const sett = new Set();
  for (const b of okt.blokker) {
    if (b.kind !== 'ovelser' || !['hoved', 'finisher'].includes(b.rolle)) continue;
    for (const o of b.ovelser) {
      if (sett.has(o.id) || !['reps', 'hold'].includes(o.type)) continue;
      sett.add(o.id); loggbare.push(o);
    }
  }
  const felt = {}; // id → { reps?, last?, holdSek? }
  let intensitet = okt.intensitet;

  function tallfelt(o, nokkel, plass, etikett) {
    return el('label', { class: 'loggfelt' },
      el('span', { class: 'loggfelt__etikett' }, etikett),
      el('input', {
        class: 'loggfelt__inn', type: 'number', inputmode: 'numeric', min: '0', placeholder: plass,
        oninput: (ev) => {
          const v = ev.target.value === '' ? undefined : Number(ev.target.value);
          felt[o.id] = { ...(felt[o.id] || {}), [nokkel]: v };
        },
      }),
    );
  }

  function rad(o) {
    const felter = o.type === 'hold'
      ? [tallfelt(o, 'holdSek', 'sek', 'Hold (s)')]
      : [tallfelt(o, 'reps', 'reps', 'Reps'), tallfelt(o, 'last', 'kg', 'Kg')];
    return el('div', { class: 'loggrad' },
      el('span', { class: 'loggrad__navn' }, o.navn),
      el('div', { class: 'loggrad__felter' }, ...felter),
    );
  }

  function fullfor() {
    const profil = hentProfil();
    const resultater = loggbare
      .map((o) => ({ id: o.id, ...(felt[o.id] || {}) }))
      .filter((r) => Number.isFinite(r.reps) || Number.isFinite(r.last) || Number.isFinite(r.holdSek));
    const oktLogget = { ...okt, intensitet };
    const { profil: nyProfil, resultat } = registrerOkt(profil, oktLogget, bib, resultater, Date.now());
    lagreProfil(nyProfil);
    lagreGenerert({ ...okt, kjort: new Date().toISOString() });
    const ovelseIder = [...new Set(okt.blokker.flatMap((b) => (b.ovelser || []).map((o) => o.id)))].filter(Boolean);
    leggTilLogg({
      id: `logg-${Date.now()}`,
      dato: new Date().toISOString(),
      modalitet: okt.modalitet,
      varighetMin: okt.varighetMin,
      intensitet,
      lokasjon: okt.lokasjon,
      seed: okt.seed,
      templateId: okt.templateId,
      ovelseIder,
      resultater,
      xp: resultat.xp,
      fullfort: true,
    });
    visFerdig(mount, okt, resultat);
  }

  monter(mount,
    el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Økt fullført'),
      el('p', { class: 'topp__under' }, 'Logg gjerne tall for PR-sporing — helt valgfritt.')),
    el('main', { class: 'innhold' },
      el('div', { class: 'kort' },
        el('h2', {}, 'Hvor hardt kjentes det?'),
        el('div', { class: 'chiprad' },
          ...INTENSITETER.map(([navn, v]) => chip(navn, { aktiv: intensitet === v, onClick: () => { intensitet = v; oppdaterRpe(v); } })),
        ),
      ),
      loggbare.length > 0 && el('div', { class: 'kort' },
        el('h2', {}, 'Resultater'),
        el('div', { class: 'loggliste' }, ...loggbare.map(rad)),
      ),
      el('div', { class: 'fast-bunn fast-bunn--kol' },
        el('button', { class: 'knapp', type: 'button', onclick: fullfor }, 'Lagre & fullfør ✓'),
      ),
    ),
  );

  function oppdaterRpe(v) {
    document.querySelectorAll('.topp ~ .innhold .chiprad .chip').forEach((c, i) => {
      c.classList.toggle('chip--aktiv', INTENSITETER[i] && INTENSITETER[i][1] === v);
    });
  }
}

// ===========================================================================
// Ferdig-skjerm — viser XP tjent, nivåopprykk, nye PR-er
// ===========================================================================
function visFerdig(mount, okt, resultat) {
  const bib = _bib;
  const navnFor = (id) => bib?.ovelseMap?.get(id)?.navn || id;
  const r = resultat || { xp: 0, nyePrs: [], nivaOpp: [] };

  const belIkon = (b) => (
    b.type === 'avatar' && erBildeAvatar(b.id) ? el('img', { class: 'levelup__avatar', src: avatarBilde(b.id), alt: '' })
      : b.type === 'avatar' ? b.id
        : b.type === 'tema' ? '🎨' : b.type === 'tittel' ? '🏅' : b.type === 'ovelse' ? '🏋️' : '✨');
  const belTekst = (b) => (b.type === 'avatar' ? `Ny avatar: ${AVATAR_NAVN[b.id] || b.id}` : b.type === 'tema' ? `Nytt tema: ${b.navn}` : b.type === 'tittel' ? `Ny tittel: ${b.navn}` : b.type === 'ovelse' ? `Ny øvelse: ${b.navn}` : (b.navn || 'Belønning'));
  const belonninger = r.belonninger || [];

  const feiringer = [];
  for (const n of r.nivaOpp || []) feiringer.push(el('div', { class: 'feiring feiring--niva' }, `⬆️ ${MODALITET_NAVN[n.modalitet] || n.modalitet} opp til nivå ${n.tilNiva}!`));
  for (const pr of r.nyePrs || []) feiringer.push(el('div', { class: 'feiring feiring--pr' }, `🏆 Ny PR: ${navnFor(pr.id)}`));
  if (r.comeback) feiringer.push(el('div', { class: 'feiring' }, '🔥 Comeback — dobbel XP!'));

  monter(mount,
    el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Bra jobba! 🎉')),
    el('main', { class: 'innhold' },
      // Belønningsnivå-opp: stor feiring med opplåste belønninger
      r.globalOpp && el('div', { class: 'kort hero levelup' },
        el('div', { class: 'levelup__glans' }),
        el('p', { class: 'hero__eyebrow' }, 'Level opp!'),
        el('div', { class: 'levelup__niva' }, `Nivå ${r.globalOpp}`),
        el('div', { class: 'levelup__belonninger' },
          ...belonninger.map((b) => el('div', { class: 'levelup__bel' },
            el('span', { class: 'levelup__ikon' }, belIkon(b)),
            el('span', {}, belTekst(b)),
          )),
        ),
      ),
      el('div', { class: 'kort hero' },
        el('p', { class: 'hero__eyebrow' }, 'XP tjent'),
        el('div', { class: 'xp-stor' }, `+${r.xp}`),
        r.bonusXp > 0 && el('p', { class: 'dempet' }, `Inkludert +${r.bonusXp} bonus`),
      ),
      feiringer.length > 0 && el('div', { class: 'kort' }, el('h2', {}, 'Nytt!'), ...feiringer),
      el('div', { class: 'kort kort--info' },
        el('p', {}, `Du fullførte «${okt.malNavn}».`),
        el('div', { class: 'statrad' },
          stat(okt.varighetMin, 'minutter'),
          stat(okt.blokker.length, 'blokker'),
          stat(INTENSITETER.find(([, v]) => v === okt.intensitet)?.[0] || okt.intensitet, 'intensitet'),
          stat((r.nyePrs || []).length, 'PR-er'),
        ),
      ),
      el('div', { class: 'knapprad' },
        el('button', { class: 'knapp', type: 'button', onclick: () => { location.hash = '#/hjem'; } }, 'Til hjem'),
        el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: () => { location.hash = '#/historikk'; } }, 'Se historikk'),
      ),
    ),
  );
}

function stat(tall, tekst) {
  return el('div', { class: 'stat' },
    el('div', { class: 'stat__tall' }, String(tall)),
    el('div', { class: 'stat__tekst' }, tekst),
  );
}

// ===========================================================================
// Hjelpere
// ===========================================================================
function rolleNavn(r) {
  return { oppvarming: 'Oppvarming', hoved: 'Hovedblokk', finisher: 'Finisher', nedtrapping: 'Nedtrapping' }[r] || r;
}

function navnTilLesbar(id) {
  return String(id).replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function formatTid(sek) {
  const m = Math.floor(sek / 60);
  const s = sek % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function kondisjonTekst(blk) {
  const p = blk.parametre || {};
  if (blk.format === '4x4') return `4×4: 4 min hardt (Z4) / 3 min rolig (Z2) × ${p.runder || 4}`;
  if (blk.format === 'distanse') return `${p.distanseKm || 5} km i eget tempo`;
  return `${p.sone || 'Z2'} i ${p.tidMin || blk.min} min — rolig, snakketempo`;
}

function paramTekst(blk) {
  const p = blk.parametre || {};
  switch (blk.format) {
    case 'straight-sets': return `${p.sett} sett × ${p.reps} reps · pause ${p.pauseSek}s`;
    case 'supersett': return `${p.sett} runder × ${p.reps} reps per øvelse · pause ${p.pauseSek}s`;
    case 'tri-set': return `${p.runder} runder · ${p.arbeidSek}s arbeid / ${p.pauseSek}s pause`;
    case 'giant-set': return `${p.runder} runder gjennom alle`;
    case 'pyramide': return `Reps: ${(p.repsstige || []).join('–')}`;
    case 'emom': return `EMOM ${p.minutter} min · ${p.reps} reps hvert minutt`;
    case 'e2mom': return `Annethvert minutt i ${p.minutter} min · ${p.reps} reps`;
    case 'amrap': return `AMRAP ${p.tidMin} min — maks runder`;
    case 'for-time': return `For time · cap ${p.capMin} min`;
    case 'density-block': return `Density ${p.tidMin} min — maks kvalitetsreps`;
    case 'gtg': return `Spredt utover · ${p.reps} submaks-reps per sett`;
    case 'intervall': return `${p.arbeidSek}/${p.hvileSek} × ${p.runder} runder`;
    case 'tabata': return `Tabata 20/10 × ${p.runder}`;
    case 'sirkel': return `${p.stasjoner} stasjoner × ${p.runder} runder`;
    case 'rounds-for-quality': return `${p.runder} runder, rolig kvalitet`;
    case 'styrkehold': return `${p.sett} × ${p.tidSek}s hold`;
    case 'yin': return `${p.posisjoner || blk.ovelser.length} posisjoner · ~${p.tidMin} min hver`;
    case 'statisk-toy': return `${p.sett} × ${p.tidSek || 40}s per område`;
    case 'sekvens-x-n': return `${p.runder} runder av sekvensen`;
    case 'hold-flyt': return `${p.pust || 5} pust per posisjon`;
    case 'box-breathing': return `Box 4-4-4-4 · ${p.tidMin} min`;
    case '4-7-8': return `4-7-8 · pusteguide`;
    case 'koherent': return `Koherent 5,5/min · ${p.tidMin} min`;
    case 'tid-i-sone': return `${p.sone || 'Z2'} i ${p.tidMin} min`;
    case '4x4': return `4×4 intervaller`;
    default: return blk.formatNavn;
  }
}
