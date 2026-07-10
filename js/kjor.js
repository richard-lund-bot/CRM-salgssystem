// Øktspilleren (M13): review → kjøring av bibliotekøkter. Holder «gjeldende
// økt» i minne mellom skjermene og kjører økta blokk for blokk: kondisjon-/
// hold-/pust-blokker får en timer, reps/flyt får en guide-modus. Fullføring
// registreres som bevegelse (XP via registrerBevegelse) — samme varme
// ferdigskjerm som all annen bevegelse.
import { el, tom, ikon } from './ui.js';
import { settPlanStatus } from './store.js';
import { registrerOgLogg, visBevegelseFerdig } from './beveg.js';
import { lagRing } from './animasjon.js';

let gjeldendeOkt = null;
let aktivInterval = null;

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
// 1) Review — oversikt over valgt bibliotekøkt før start
// ===========================================================================
export function visReviewSkjerm(mount) {
  if (!gjeldendeOkt) { location.hash = '#/okter'; return; }
  const okt = gjeldendeOkt;

  monter(mount,
    tilbakeTopp(okt.navn, `${okt.varighetMin} min${okt.utstyr?.length ? ' · ' + okt.utstyr.join(', ') : ''}`,
      () => { location.hash = okt.kategori ? `#/okter?kat=${okt.kategori}` : '#/okter'; }),
    el('main', { class: 'innhold' },
      okt.beskrivelse && el('p', { class: 'dempet' }, okt.beskrivelse),
      ...okt.blokker.map((blk) => blokkKort(blk)),
      okt.kilde?.navn && el('p', { class: 'dempet' }, `Basert på: ${okt.kilde.navn}`),
      el('div', { class: 'fast-bunn' },
        el('button', { class: 'knapp', type: 'button', onclick: () => { location.hash = '#/kjor'; } }, 'Start økt'),
      ),
    ),
  );

  function blokkKort(blk) {
    return el('div', { class: 'kort blokk' },
      el('div', { class: 'blokk__topp' },
        el('div', {},
          el('span', { class: 'blokk__rolle blokk__rolle--' + blk.rolle }, rolleNavn(blk.rolle)),
          el('span', { class: 'blokk__format' }, blk.formatNavn),
        ),
        el('div', { class: 'blokk__hoyre' },
          el('span', { class: 'dempet' }, `~${blk.min} min`),
        ),
      ),
      !!paramTekst(blk) && el('p', { class: 'blokk__param' }, paramTekst(blk)),
      el('div', { class: 'blokk__ovelser' },
        ...((blk.ovelser || []).length
          ? blk.ovelser.map((o) => ovelseRad(o))
          : [el('p', { class: 'dempet' }, kondisjonTekst(blk))]),
      ),
    );
  }

  function ovelseRad(o) {
    return el('div', { class: 'orad' },
      el('div', { class: 'orad__hoved' },
        el('span', { class: 'orad__navn' }, o.navn),
        o.dose && el('span', { class: 'orad__dose' }, o.dose),
        o.unilateral && el('div', { class: 'orad__tags' }, el('span', { class: 'tag tag--u' }, 'per side')),
      ),
    );
  }
}

// ===========================================================================
// 2) Kjøring
// ===========================================================================
export function visKjoreSkjerm(mount) {
  if (!gjeldendeOkt) { location.hash = '#/okter'; return; }
  const okt = gjeldendeOkt;
  let idx = 0;

  function fremgang() {
    return el('div', { class: 'kjor-fremgang' },
      ...okt.blokker.map((_, i) => el('i', { class: 'kjor-fremgang__p' + (i < idx ? ' er-ferdig' : i === idx ? ' er-aktiv' : '') })),
    );
  }

  function neste() {
    if (idx < okt.blokker.length - 1) { idx++; tegn(); } else { stoppTimer(); fullfor(mount, okt, false); }
  }
  function forrige() { if (idx > 0) { idx--; tegn(); } }

  // Avslutte tidlig? Delvis gjennomføring teller (spec §7) — tilby å logge
  // blokkene som er gjort i stedet for å forkaste alt.
  function avbryt() {
    const gjortMin = okt.blokker.slice(0, idx).reduce((s, b) => s + (b.min || 0), 0);
    if (gjortMin < 1) {
      if (confirm('Avslutte økta? Du kan starte igjen når du vil.')) location.hash = '#/review';
      return;
    }
    if (confirm(`Avslutte her? Du har beveget deg i ~${gjortMin} min — vil du telle det med?\n\nOK = logg det du rakk · Avbryt = fortsett økta`)) {
      stoppTimer();
      fullfor(mount, { ...okt, varighetMin: gjortMin }, true);
    }
  }

  function tegn() {
    stoppTimer();
    const blk = okt.blokker[idx];
    monter(mount,
      el('header', { class: 'topp topp--kjor' },
        el('button', { class: 'topp__tilbake', type: 'button', onclick: avbryt, title: 'Avbryt' }, ikon('kryss')),
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
  const paramT = paramTekst(blk);
  if (paramT) wrap.append(el('p', { class: 'flate__param' }, paramT));
  const liste = el('div', { class: 'guide' });
  blk.ovelser.forEach((o) => {
    const rad = el('button', { class: 'guide__rad', type: 'button' },
      el('span', { class: 'guide__hake' }, ikon('sjekk')),
      el('span', { class: 'guide__navn' }, o.navn + (o.dose ? ` · ${o.dose}` : '')),
      o.unilateral && el('span', { class: 'tag tag--u' }, 'per side'),
    );
    rad.addEventListener('click', () => {
      rad.classList.toggle('guide__rad--ferdig');
      rad.classList.remove('guide__rad--puls'); void rad.offsetWidth; rad.classList.add('guide__rad--puls');
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
  const { svg: ringSvg, sett: ringSett } = lagRing();
  const klokkeWrap = el('div', { class: 'kjor-klokke-wrap' }, ringSvg, klokke);
  const paramT = paramTekst(blk);
  const status = el('p', { class: 'dempet' }, plan.length > 1 ? `${plan.length} faser` : paramT);
  const neste = el('p', { class: 'flate__neste' }, '');
  if (paramT) wrap.append(el('p', { class: 'flate__param' }, paramT));
  wrap.append(fasenavn, klokkeWrap, neste, status);
  let totalSek = plan[0]?.sek || 1;
  wrap.append(timerKnapper(plan, {
    onFase: (f, i) => {
      fasenavn.textContent = f.navn;
      fasenavn.className = 'flate__stor flate__stor--' + f.type;
      const n = plan[i + 1];
      neste.textContent = n ? `Neste: ${n.navn}` : 'Siste fase';
      totalSek = f.sek || 1;
      ringSett(1);
      pling(f.type === 'arbeid' || f.type === 'hold' ? 880 : 520, 0.1);
    },
    onSek: (s) => { klokke.textContent = formatTid(s); ringSett(s / totalSek); },
    onFerdig: () => { fasenavn.textContent = 'Blokk ferdig ✓'; fasenavn.className = 'flate__stor'; klokke.textContent = '00:00'; neste.textContent = ''; ringSett(0); pling(990, 0.2); },
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

  // Generisk intervallform fra øktbiblioteket: {runder, faser:[{navn,sek,type}]}.
  // Ekspanderer runder × faser og dropper siste hvilefase.
  if (Array.isArray(p.faser) && p.faser.length) {
    const runder = p.runder || 1;
    for (let r = 0; r < runder; r++) {
      for (const f of p.faser) {
        faser.push({ navn: f.navn, sek: f.sek, type: f.type === 'hvile' ? 'hvile' : 'arbeid' });
      }
    }
    while (faser.length > 1 && faser[faser.length - 1].type === 'hvile') faser.pop();
    return faser;
  }

  if (blk.kind === 'kondisjon' || fmt === 'tid-i-sone' || fmt === 'distanse') {
    faser.push({ navn: p.sone ? `${p.sone}` : blk.formatNavn, sek: (p.tidMin || blk.min) * 60, type: 'arbeid' });
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
// Fullføring — registreres som bevegelse (XP via registrerBevegelse) og
// feires med samme varme ferdigskjerm som all annen bevegelse.
// ===========================================================================
function fullfor(mount, okt, delvis) {
  const resultat = registrerOgLogg({
    bevegelse: okt.bevegelse || 'custom',
    varighetMin: okt.varighetMin,
    intensitet: okt.intensitet || 3,
    tittel: okt.navn,
    kilde: 'bibliotek',
    ekstra: { oktId: okt.bibliotekId, delvis: !!delvis },
  });
  if (okt.planId && !delvis) settPlanStatus(okt.planId, 'gjort');
  gjeldendeOkt = null;
  visBevegelseFerdig(mount, resultat, {
    bevegelse: okt.bevegelse, varighetMin: okt.varighetMin, tittel: okt.navn, delvis,
  });
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
  if (Array.isArray(p.faser) && p.faser.length) {
    const tid = (sek) => (sek >= 60 && sek % 60 === 0 ? `${sek / 60} min` : `${sek} s`);
    const deler = p.faser.map((f) => `${f.navn} ${tid(f.sek)}`).join(' → ');
    return (p.runder || 1) > 1 ? `${p.runder} × [${deler}]` : deler;
  }
  return `${p.sone ? p.sone + ' · ' : ''}${p.tidMin || blk.min} min`;
}

function paramTekst(blk) {
  const p = blk.parametre || {};
  switch (blk.format) {
    case 'straight-sets': return `${p.sett} sett × ${p.reps} reps · pause ${p.pauseSek}s`;
    case 'styrkehold': return `${p.sett} × ${p.tidSek}s hold`;
    case 'yin': return `Lange, rolige hold · ~${p.tidMin} min totalt`;
    case 'statisk-toy': return `Statiske hold · ~${p.tidMin} min totalt`;
    default: return '';
  }
}
