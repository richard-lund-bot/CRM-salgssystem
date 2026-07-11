// Øktspilleren (M13, «now playing»-oppsett M16.1): review → kjøring av
// bibliotekøkter. Holder «gjeldende økt» i minne mellom skjermene. Kjøringa
// flater hver blokk ut til en stegliste (lagSteg) og spiller ett steg om
// gangen: tidsstyrte steg teller ned og går videre av seg selv, reps får en
// romslig gjettet tid, og selvstyrte flyt-steg venter på «Hopp over». En
// sesjonsklokke teller total tid, og både den og stegtimeren regner med
// veggklokke-tid (ikke tellende intervaller), så alt løper riktig videre selv
// om skjermen låses eller appen legges i bakgrunnen — og våkenlåsen holder
// skjermen på. Fullføring registreres som bevegelse (XP via
// registrerBevegelse) — samme varme ferdigskjerm som all annen bevegelse.
import { el, tom, ikon } from './ui.js';
import { settPlanStatus, hentProfil } from './store.js';
import { registrerOgLogg, visBevegelseFerdig } from './beveg.js';
import { beregnXp } from './bevegelse.js';
import { nivaFraTotalXp } from './niva.js';
import { lagRing } from './animasjon.js';
import { holdVaaken, slippVaaken } from './vaakenlaas.js';
import { infoKnapp, ovelseInfo, ovelseBilde, visOvelseArk } from './ovelse.js';

let gjeldendeOkt = null;
let aktivInterval = null;
let vedSynlig = null; // kalles når appen kommer i forgrunnen igjen

export function settØkt(o) { gjeldendeOkt = o; }

function stoppTimer() {
  if (aktivInterval) { clearInterval(aktivInterval); aktivInterval = null; }
  vedSynlig = null;
}

// Når appen våkner fra bakgrunnen: oppdater timervisningen umiddelbart —
// veggklokke-regningen har alt flyttet fasene dit de skal være.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') vedSynlig?.();
  });
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
// 1) Review — oversikt over valgt bibliotekøkt før start. Blokkene rendres
// strukturert (Runna-stil): seksjon per blokk med ikon, rolle, tittel og
// gjentakelses-merke — og under: én rad per steg med farget stolpe (arbeid),
// grå stolpe (pause/hvile) og tid/dose. Ingen løpende pil-tekster.
// ===========================================================================
export function visReviewSkjerm(mount) {
  if (!gjeldendeOkt) { location.hash = '#/okter'; return; }
  const okt = gjeldendeOkt;

  monter(mount,
    tilbakeTopp(okt.navn, `${okt.varighetMin} min${okt.utstyr?.length ? ' · ' + okt.utstyr.join(', ') : ''}`,
      () => { location.hash = okt.kategori ? `#/okter?kat=${okt.kategori}` : '#/okter'; }),
    el('main', { class: 'innhold' },
      okt.beskrivelse && el('p', { class: 'dempet' }, okt.beskrivelse),
      ...okt.blokker.map((blk) => blokkSeksjon(blk)),
      okt.kilde?.navn && el('p', { class: 'dempet' }, `Basert på: ${okt.kilde.navn}`),
      el('div', { class: 'fast-bunn' },
        el('button', { class: 'knapp', type: 'button', onclick: () => { location.hash = '#/kjor'; } }, 'Start økt'),
      ),
    ),
  );
}

// --- Strukturert blokkvisning (deles av review) -----------------------------
const ROLLE_IKON = { oppvarming: 'chevronsopp', nedtrapping: 'chevronsned' };
const KIND_IKON = { kondisjon: 'loper', ovelser: 'vekt', sekvens: 'yoga', pust: 'hjerte' };

function tidTekst(sek) {
  return sek >= 60 && sek % 60 === 0 ? `${sek / 60} min` : `${sek} s`;
}

// Én rad per steg i review — med (i) til øvelsessiden når vi har innhold.
function stegRad({ navn, sub = null, tid = null, type = 'arbeid' }) {
  return el('div', { class: 'rsteg rsteg--' + type },
    el('i', { class: 'rsteg__bar' }),
    el('div', { class: 'rsteg__tekst' },
      el('span', { class: 'rsteg__navn' }, navn),
      sub && el('span', { class: 'rsteg__sub' }, sub),
    ),
    infoKnapp(navn, { dose: sub, somSide: true }),
    tid && el('span', { class: 'rsteg__tid' }, tid),
  );
}

function faseSteg(f) {
  return stegRad({ navn: f.navn, tid: tidTekst(f.sek), type: f.type === 'hvile' ? 'hvile' : 'arbeid' });
}

// Finner den korteste enheten som gjentas fra starten av en faseliste, slik
// at «30s → 20s → 10s ×3 + seriepause» vises som mønsteret én gang med et
// «Gjenta 3 ganger»-merke — ikke alle fasene utskrevet.
function grupperFaser(faser) {
  const lik = (a, b) => a && b && a.navn === b.navn && a.sek === b.sek && a.type === b.type;
  for (let k = 1; k <= Math.floor(faser.length / 2); k++) {
    let reps = 1;
    while ((reps + 1) * k <= faser.length
      && faser.slice(reps * k, (reps + 1) * k).every((f, j) => lik(f, faser[j]))) reps++;
    if (reps >= 2) return { enhet: faser.slice(0, k), reps, rest: faser.slice(reps * k) };
  }
  return null;
}

function blokkSeksjon(blk) {
  const p = blk.parametre || {};
  const rader = [];
  let merke = null;   // gjentakelses-pille ved tittelen
  let detalj = null;  // liten parameterlinje under hodet

  if (blk.kind === 'kondisjon' && Array.isArray(p.faser) && p.faser.length) {
    if ((p.runder || 1) > 1) merke = `Gjentas ${p.runder} ganger`;
    const g = grupperFaser(p.faser);
    if (g) {
      if (g.reps > 1) rader.push(el('span', { class: 'rgruppe' }, `Gjenta ${g.reps} ganger`));
      g.enhet.forEach((f) => rader.push(faseSteg(f)));
      g.rest.forEach((f) => rader.push(faseSteg(f)));
    } else {
      p.faser.forEach((f) => rader.push(faseSteg(f)));
    }
  } else if (blk.kind === 'kondisjon') {
    const rolig = blk.rolle === 'oppvarming' || blk.rolle === 'nedtrapping';
    rader.push(stegRad({
      navn: p.sone || blk.formatNavn, tid: `${p.tidMin || blk.min} min`,
      type: rolig ? 'jevn' : 'arbeid',
    }));
  } else if (blk.kind === 'sekvens') {
    const seq = blk.ovelser?.[0];
    if ((p.runder || 1) > 1) merke = `${p.runder} runder`;
    const posisjoner = seq?.posisjoner?.length ? seq.posisjoner : (seq ? [seq.navn] : []);
    posisjoner.forEach((pos) => rader.push(stegRad({ navn: navnTilLesbar(pos), type: 'flyt' })));
  } else if (blk.kind === 'pust') {
    const t = p.takt || {};
    merke = `~${p.tidMin || blk.min} min`;
    if (t.inn) rader.push(stegRad({ navn: 'Pust inn', tid: `${t.inn} s`, type: 'arbeid' }));
    if (t.holdInn) rader.push(stegRad({ navn: 'Hold', tid: `${t.holdInn} s`, type: 'hold' }));
    if (t.ut) rader.push(stegRad({ navn: 'Pust ut', tid: `${t.ut} s`, type: 'hvile' }));
    if (t.holdUt) rader.push(stegRad({ navn: 'Hold', tid: `${t.holdUt} s`, type: 'hold' }));
  } else { // ovelser: én rad per øvelse med dosen som undertekst
    detalj = paramTekst(blk) || null;
    if (p.sett) merke = `${p.sett} sett`;
    else if (p.runder) merke = `${p.runder} runder`;
    (blk.ovelser || []).forEach((o) => rader.push(stegRad({
      navn: o.navn,
      sub: [o.dose, o.unilateral && !/per side/i.test(o.dose || '') && 'per side']
        .filter(Boolean).join(' · ') || null,
      type: blk.formatKlasse === 'hold' ? 'hold' : 'arbeid',
    })));
  }

  return el('div', { class: 'kort rblokk' },
    el('div', { class: 'rblokk__hode' },
      el('span', { class: 'rblokk__ikon' }, ikon(ROLLE_IKON[blk.rolle] || KIND_IKON[blk.kind] || 'lyn')),
      el('div', { class: 'rblokk__titler' },
        el('span', { class: 'rblokk__rolle' }, rolleNavn(blk.rolle)),
        el('span', { class: 'rblokk__tittel' },
          blk.formatNavn,
          merke && el('span', { class: 'rmerke' }, merke),
        ),
      ),
      el('span', { class: 'rblokk__tid' }, `~${blk.min} min`),
    ),
    detalj && el('p', { class: 'rblokk__detalj' }, detalj),
    el('div', { class: 'rblokk__steg' }, ...rader),
  );
}

// ===========================================================================
// 2) Kjøring — «now playing»-oppsett: dagsfase-topp, sesjonsklokke med
// sentral pauseknapp, NÅ-kort med illustrasjon + nedtelling, neste øvelse,
// forhåndsvisning av neste blokk og momentum-stripe. Ett steg om gangen;
// tidsstyrte steg teller ned (veggklokke) og går videre av seg selv, mens
// bunnlinja (hopp/pause/ferdig) styrer flyten globalt.
// ===========================================================================
const TYPE_ORD = { arbeid: 'Arbeid', hvile: 'Hvile', hold: 'Hold', flyt: 'Flyt', inn: 'Pust inn', ut: 'Pust ut', reps: '' };

function dagsfaseNaa() {
  const h = new Date().getHours();
  if (h >= 22 || h < 5) return 'natt';
  if (h < 9) return 'morgen';
  if (h < 12) return 'formiddag';
  if (h < 17) return 'dag';
  return 'kveld';
}

// Romslig gjettet arbeidstid for et reps-steg, så guiden flyter av seg selv
// som i mockupen — «Hopp over» tar deg videre med en gang du er ferdig.
function gjettTid(dose, unilateral) {
  const reps = parseInt(String(dose || '').match(/\d+/)?.[0] || '', 10);
  const base = Number.isFinite(reps) ? reps * 3.5 : 45;
  return Math.round(Math.min(120, Math.max(30, base * (unilateral ? 1.7 : 1))));
}

// Flater en blokk ut til en stegliste: {navn, dose, sek, type, bilde?}.
// sek === null ⇒ selvstyrt steg (flyt) som venter på «Hopp over».
function lagSteg(blk) {
  const p = blk.parametre || {};
  if (blk.kind === 'pust' && p.takt) {
    const t = p.takt; const en = [];
    if (t.inn) en.push({ navn: 'Pust inn', sek: Math.round(t.inn), type: 'inn' });
    if (t.holdInn) en.push({ navn: 'Hold', sek: Math.round(t.holdInn), type: 'hold' });
    if (t.ut) en.push({ navn: 'Pust ut', sek: Math.round(t.ut), type: 'ut' });
    if (t.holdUt) en.push({ navn: 'Hold', sek: Math.round(t.holdUt), type: 'hold' });
    const per = en.reduce((s, f) => s + f.sek, 0) || 1;
    const runder = Math.max(1, Math.round(((p.tidMin || 5) * 60) / per));
    const pustNavn = blk.ovelser?.[0]?.navn || 'Pust';
    const steg = [];
    for (let r = 0; r < runder; r++) for (const f of en) steg.push({ ...f, dose: null, bilde: pustNavn });
    return steg;
  }
  if (blk.kind === 'sekvens') {
    const seq = blk.ovelser?.[0];
    const runder = p.runder || 1;
    const pos = seq?.posisjoner?.length ? seq.posisjoner : (seq ? [seq.navn] : []);
    const steg = [];
    for (let r = 0; r < runder; r++) pos.forEach((po) => steg.push({
      navn: navnTilLesbar(po), dose: runder > 1 ? `Runde ${r + 1}/${runder}` : null, sek: null, type: 'flyt',
    }));
    return steg;
  }
  if (blk.kind === 'kondisjon' || blk.formatKlasse === 'dist' || blk.formatKlasse === 'klokke' || blk.formatKlasse === 'hold') {
    return fasePlan(blk).map((f) => ({ navn: f.navn, dose: null, sek: f.sek, type: f.type }));
  }
  return (blk.ovelser || []).map((o) => ({
    navn: o.navn,
    dose: [o.dose, o.unilateral && !/per side/i.test(o.dose || '') && 'per side'].filter(Boolean).join(' · ') || null,
    sek: gjettTid(o.dose, o.unilateral),
    type: blk.formatKlasse === 'hold' ? 'hold' : 'reps',
  }));
}

export function visKjoreSkjerm(mount) {
  if (!gjeldendeOkt) { location.hash = '#/okter'; return; }
  const okt = gjeldendeOkt;
  stoppTimer();

  const blokkMin = okt.blokker.reduce((s, b) => s + (b.min || 0), 0);
  const totalSek = Math.max(1, (okt.varighetMin || blokkMin || 1) * 60);
  const profil = hentProfil() || {};
  const nivaInfo = nivaFraTotalXp(profil.globalXp || 0);
  const momentXp = Math.max(1, beregnXp(okt.varighetMin || 1, okt.bevegelse || 'custom', okt.intensitet || 3));

  // --- tilstand ---
  let bIdx = 0;
  let steg = lagSteg(okt.blokker[0]);
  let sIdx = 0;
  let spiller = false;
  let startet = false;
  let sesjonAkkumMs = 0;
  let sesjonStart = null;
  let stegSlutt = null;   // ts når tidsstyrt steg er ferdig (kjørende)
  let stegIgjenMs = 0;    // gjenstår (pauset / utimet)
  let sisteTikk = null;

  const sesjonMs = () => sesjonAkkumMs + (sesjonStart ? Date.now() - sesjonStart : 0);
  const gj = () => steg[sIdx];
  const nesteSteg = () => steg[sIdx + 1] || (okt.blokker[bIdx + 1] ? lagSteg(okt.blokker[bIdx + 1])[0] : null);
  const gjortMin = () => okt.blokker.slice(0, bIdx).reduce((s, b) => s + (b.min || 0), 0)
    + Math.round((okt.blokker[bIdx]?.min || 0) * (sIdx / Math.max(1, steg.length)));

  function stegBilde(g) {
    const slug = g && ovelseBilde(g.bilde || g.navn);
    return slug ? el('img', { src: `bilder/ovelser/${slug}.webp`, alt: '', loading: 'lazy' })
      : ikon(g && g.type === 'hvile' ? 'klokke' : g && (g.type === 'inn' || g.type === 'ut') ? 'hjerte' : 'vekt');
  }
  const doseTekst = (g) => (g ? (g.dose || TYPE_ORD[g.type] || '') : '');

  // --- topp (dagsfase-bakgrunn) ---
  const fase = dagsfaseNaa();
  const bg = el('div', { class: 'kjor2__bg', 'aria-hidden': 'true', style: `background-image:url('icons/brand/hero-${fase}.webp')` });
  const topp = el('header', { class: 'kjor2__topp' },
    el('div', { class: 'kjor2__titler' },
      el('h1', { class: 'kjor2__tittel' }, okt.navn),
      el('p', { class: 'kjor2__under' }, okt.beskrivelse || `${okt.varighetMin} min`),
    ),
    el('button', { class: 'kjor2__lukk', type: 'button', 'aria-label': 'Avslutt', onclick: () => lukk() }, ikon('kryss')),
  );

  // --- sesjonskort ---
  const elForlopt = el('div', { class: 'kjor2-tid__stor' }, '00:00');
  const elTotal = el('div', { class: 'kjor2-tid__stor' }, formatTid(totalSek));
  const { svg: sesjRingSvg, sett: sesjRingSett } = lagRing(50);
  const pauseGlyph = el('span', { class: 'kjor2-tid__glyph' }, ikon('play'));
  const sentralPause = el('button', { class: 'kjor2-tid__pause', type: 'button', 'aria-label': 'Start', onclick: () => settSpill(!spiller) }, sesjRingSvg, pauseGlyph);
  const barFyll = el('i', { class: 'kjor2-bar__fyll' });
  const blokkTeller = el('p', { class: 'kjor2-tid__blokk' }, `Blokk 1 av ${okt.blokker.length}`);
  const sesjonKort = el('div', { class: 'kort kjor2-tid' },
    el('div', { class: 'kjor2-tid__rad' },
      el('div', { class: 'kjor2-tid__kol' }, elForlopt, el('span', { class: 'kjor2-tid__merk' }, 'forløpt tid')),
      sentralPause,
      el('div', { class: 'kjor2-tid__kol' }, elTotal, el('span', { class: 'kjor2-tid__merk' }, 'total tid')),
    ),
    el('div', { class: 'kjor2-bar' }, barFyll),
    blokkTeller,
  );

  // --- NÅ-kort ---
  const naBilde = el('div', { class: 'kjor2-na__bilde' });
  const naNavn = el('h2', { class: 'kjor2-na__navn' }, '');
  const naDose = el('p', { class: 'kjor2-na__dose' }, '');
  const naTipTekst = el('span', {}, '');
  const naTip = el('p', { class: 'kjor2-na__tip' }, ikon('lyn', 'ikon ikon--liten'), naTipTekst);
  const naInfoWrap = el('span', { class: 'kjor2-na__info' });
  const naRingTall = el('div', { class: 'kjor2-ring__tall' }, '');
  const { svg: naRingSvg, sett: naRingSett } = lagRing(50);
  const naRing = el('div', { class: 'kjor2-ring' }, naRingSvg,
    el('div', { class: 'kjor2-ring__inn' }, naRingTall, el('span', { class: 'kjor2-ring__enhet' }, 'sek')));
  const naKort = el('div', { class: 'kort kjor2-na' },
    el('div', { class: 'kjor2-na__topp' }, el('span', { class: 'kjor2-na__merke' }, 'NÅ'), naInfoWrap, naRing),
    naBilde, naNavn, naDose, naTip,
  );

  // --- neste øvelse ---
  const nesteBilde = el('div', { class: 'kjor2-neste__bilde' });
  const nesteMerke = el('span', { class: 'kjor2-neste__merke' }, 'Neste øvelse');
  const nesteNavn = el('span', { class: 'kjor2-neste__navn' }, '');
  const nesteDose = el('span', { class: 'kjor2-neste__dose' }, '');
  const nesteKort = el('button', { class: 'kort kjor2-neste', type: 'button', onclick: () => { if (nesteKort._navn) visOvelseArk(nesteKort._navn); } },
    nesteBilde,
    el('span', { class: 'kjor2-neste__tekst' }, nesteMerke, nesteNavn, nesteDose),
    ikon('chevron', 'ikon kjor2-neste__pil'),
  );

  // --- neste blokk ---
  const nbTeller = el('span', { class: 'kjor2-nb__teller' }, '');
  const nbRolle = el('span', { class: 'kjor2-nb__rolle' }, '');
  const nbListe = el('div', { class: 'kjor2-nb__liste' });
  const nesteBlokkKort = el('div', { class: 'kort kjor2-nb' },
    el('div', { class: 'kjor2-nb__hode' }, el('span', { class: 'kjor2-nb__merke' }, 'Neste blokk'), nbTeller),
    nbRolle, nbListe,
  );

  // --- momentum ---
  const momBar = el('i', { class: 'kjor2-mom__fyll', style: `width:${nivaInfo.pct}%` });
  const momentumKort = el('div', { class: 'kort kjor2-mom' },
    el('span', { class: 'kjor2-mom__flamme' }, ikon('flamme')),
    el('div', { class: 'kjor2-mom__midt' },
      el('div', { class: 'kjor2-mom__rad' },
        el('span', { class: 'kjor2-mom__tekst' }, `Momentum +${momentXp}`),
        el('span', { class: 'kjor2-mom__xp' }, `${nivaInfo.inne} / ${nivaInfo.tilNeste} XP`),
      ),
      el('div', { class: 'kjor2-mom__bar' }, momBar),
    ),
    el('span', { class: 'kjor2-mom__niva' }, ikon('lyn', 'ikon ikon--liten'), `Nivå ${nivaInfo.niva}`),
  );

  // --- bunnlinje ---
  const bunnPauseGlyph = el('span', { class: 'kjor2-bunn__glyph' }, ikon('play'));
  const bunnPauseTekst = el('span', {}, 'Start');
  const bunn = el('div', { class: 'kjor2__bunn' },
    el('button', { class: 'kjor2-bunn__knapp', type: 'button', onclick: () => hopp() }, ikon('hoppover', 'ikon ikon--liten'), 'Hopp over'),
    el('button', { class: 'kjor2-bunn__knapp', type: 'button', onclick: () => settSpill(!spiller) }, bunnPauseGlyph, bunnPauseTekst),
    el('button', { class: 'kjor2-bunn__knapp kjor2-bunn__knapp--primar', type: 'button', onclick: () => ferdigTrykk() }, ikon('sjekk', 'ikon ikon--liten'), 'Ferdig'),
  );

  monter(mount,
    el('section', { class: 'kjor2' }, bg, topp,
      el('div', { class: 'kjor2__stabel' }, sesjonKort, naKort, nesteKort, nesteBlokkKort, momentumKort),
    ),
    bunn,
  );

  // --- oppdatering ---
  function tegnSteg() {
    const g = gj();
    tom(naBilde); naBilde.append(stegBilde(g));
    naNavn.textContent = g ? g.navn : '';
    naDose.textContent = doseTekst(g);
    const tip = g && ovelseInfo(g.navn)?.tips?.[0];
    naTip.style.display = tip ? '' : 'none';
    naTipTekst.textContent = tip ? ` ${tip}` : '';
    tom(naInfoWrap);
    const ik = g && infoKnapp(g.navn);
    if (ik) naInfoWrap.append(ik);
    naRing.style.visibility = g && g.sek ? '' : 'hidden';

    const n = nesteSteg();
    if (n) {
      nesteKort.style.display = '';
      tom(nesteBilde); nesteBilde.append(stegBilde(n));
      nesteNavn.textContent = n.navn;
      nesteDose.textContent = doseTekst(n);
      nesteMerke.textContent = steg[sIdx + 1] ? 'Neste øvelse' : 'Neste blokk';
      nesteKort._navn = ovelseInfo(n.navn) ? n.navn : null;
      nesteKort.classList.toggle('kjor2-neste--laas', !nesteKort._navn);
    } else {
      nesteKort.style.display = 'none';
    }

    const nb = okt.blokker[bIdx + 1];
    if (!nb) { nesteBlokkKort.style.display = 'none'; } else {
      nesteBlokkKort.style.display = '';
      nbTeller.textContent = `Blokk ${bIdx + 2} av ${okt.blokker.length}`;
      nbRolle.textContent = `${rolleNavn(nb.rolle)} · ${nb.formatNavn}`;
      tom(nbListe);
      const vist = [];
      for (const x of lagSteg(nb)) { if (!vist.some((v) => v.navn === x.navn)) vist.push(x); if (vist.length >= 4) break; }
      vist.forEach((x) => nbListe.append(el('div', { class: 'kjor2-nb__rad' },
        el('span', { class: 'kjor2-nb__ikon' }, ikon(x.type === 'reps' ? 'vekt' : x.type === 'flyt' ? 'yoga' : 'stoppeklokke')),
        el('span', { class: 'kjor2-nb__navn' }, x.navn),
        el('span', { class: 'kjor2-nb__tid' }, x.dose || (x.sek ? tidTekst(x.sek) : '')),
      )));
    }
    blokkTeller.textContent = `Blokk ${bIdx + 1} av ${okt.blokker.length}`;
  }

  function oppdaterPause() {
    const glyph = (startet && spiller) ? 'pause' : 'play';
    tom(pauseGlyph); pauseGlyph.append(ikon(glyph));
    tom(bunnPauseGlyph); bunnPauseGlyph.append(ikon(glyph));
    const ord = !startet ? 'Start' : spiller ? 'Pause' : 'Fortsett';
    bunnPauseTekst.textContent = ord;
    sentralPause.setAttribute('aria-label', ord);
    naKort.classList.toggle('kjor2-na--pause', startet && !spiller);
  }

  function tikk() {
    const spent = sesjonMs();
    elForlopt.textContent = formatTid(Math.floor(spent / 1000));
    const sp = Math.min(1, spent / (totalSek * 1000));
    sesjRingSett(sp);
    barFyll.style.width = `${(sp * 100).toFixed(1)}%`;

    const g = gj();
    if (!(g && g.sek)) { naRingTall.textContent = '—'; return; }

    let rem;
    if (spiller && stegSlutt != null) {
      if (stegSlutt - Date.now() <= 0) { if (!framAuto()) return; nyTiming(); return; }
      rem = Math.max(0, Math.round((stegSlutt - Date.now()) / 1000));
    } else {
      rem = Math.round((stegIgjenMs || g.sek * 1000) / 1000);
    }
    naRingTall.textContent = String(rem);
    naRingSett(rem / (g.sek || 1));
    const teller = spiller && !!nesteSteg() && rem >= 1 && rem <= 5;
    naKort.classList.toggle('kjor2-na--teller', teller);
    if (teller && rem !== sisteTikk) { sisteTikk = rem; pling(700, 0.05); }
    if (rem > 5) sisteTikk = null;
  }

  function nyTiming() {
    const g = gj();
    stegIgjenMs = g && g.sek ? g.sek * 1000 : 0;
    stegSlutt = (spiller && g && g.sek) ? Date.now() + g.sek * 1000 : null;
    sisteTikk = null;
  }

  function bytt() {
    if (sIdx < steg.length - 1) { sIdx += 1; return true; }
    if (bIdx < okt.blokker.length - 1) { bIdx += 1; steg = lagSteg(okt.blokker[bIdx]); sIdx = 0; return true; }
    avsluttNaturlig();
    return false;
  }

  function framAuto() {
    if (!bytt()) return false;
    tegnSteg();
    const g = gj();
    pling(g && g.type === 'hvile' ? 520 : g && g.type === 'hold' ? 660 : 880, 0.12);
    return true;
  }

  function hopp() {
    if (!startet) { startet = true; }
    if (!bytt()) return;
    tegnSteg();
    nyTiming();
    oppdaterPause();
    tikk();
  }

  function settSpill(på) {
    if (på === spiller) return;
    const na = Date.now();
    if (på) {
      if (!startet) { startet = true; nyTiming(); }
      spiller = true; sesjonStart = na;
      const g = gj();
      if (g && g.sek) stegSlutt = na + stegIgjenMs;
      if (!aktivInterval) { aktivInterval = setInterval(tikk, 250); vedSynlig = tikk; }
      holdVaaken();
    } else {
      spiller = false;
      sesjonAkkumMs += na - (sesjonStart || na); sesjonStart = null;
      if (stegSlutt != null) { stegIgjenMs = Math.max(0, stegSlutt - na); stegSlutt = null; }
      slippVaaken();
    }
    oppdaterPause();
    tikk();
  }

  function avsluttNaturlig() { stoppTimer(); fullfor(mount, okt, false); }

  function ferdigTrykk() {
    if (bIdx >= okt.blokker.length - 1) { stoppTimer(); fullfor(mount, okt, false); return; }
    const min = Math.max(1, gjortMin());
    if (confirm(`Avslutte økta nå? Vi teller ~${min} min du har gjort.`)) {
      stoppTimer();
      fullfor(mount, { ...okt, varighetMin: min }, true);
    }
  }

  function lukk() {
    if (!startet && bIdx === 0 && sIdx === 0) {
      if (confirm('Avslutte økta? Du kan starte igjen når du vil.')) { stoppTimer(); slippVaaken(); location.hash = '#/review'; }
      return;
    }
    ferdigTrykk();
  }

  tegnSteg();
  oppdaterPause();
  tikk();
}

// Leser holdetid ut av en dosetekst: «3 min» → 180, «45 s» → 45. Faller
// tilbake til `fallback` når dosen ikke har en tid.
function doseTilSek(dose, fallback) {
  const s = String(dose || '');
  const min = s.match(/(\d+)\s*min/i);
  if (min) return parseInt(min[1], 10) * 60;
  const sek = s.match(/(\d+)\s*s\b/i);
  if (sek) return parseInt(sek[1], 10);
  return fallback;
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
      // Én posisjon per øvelse — holdetida hentes fra øvelsens egen dose
      // («3 min», «2 min»), ikke fra blokkens totaltid (p.tidMin). «per side»
      // blir to hold (venstre/høyre) med samme tid.
      const fallback = Math.round(((p.tidMin || 3) * 60) / Math.max(1, ov.length || 1));
      ov.forEach((o) => {
        const sek = doseTilSek(o.dose, fallback);
        if (o.unilateral || /per side/i.test(o.dose || '')) {
          faser.push({ navn: `${o.navn} · venstre`, sek, type: 'hold' });
          faser.push({ navn: `${o.navn} · høyre`, sek, type: 'hold' });
        } else {
          faser.push({ navn: o.navn, sek, type: 'hold' });
        }
      });
      if (!ov.length) faser.push({ navn: blk.formatNavn, sek: (p.tidMin || 3) * 60, type: 'hold' });
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

// ===========================================================================
// Fullføring — registreres som bevegelse (XP via registrerBevegelse) og
// feires med samme varme ferdigskjerm som all annen bevegelse.
// ===========================================================================
function fullfor(mount, okt, delvis) {
  slippVaaken();
  // Planen hukes av først, så «Som planlagt»-merket kan feires på ferdigskjermen.
  if (okt.planId && !delvis) settPlanStatus(okt.planId, 'gjort');
  const resultat = registrerOgLogg({
    bevegelse: okt.bevegelse || 'custom',
    varighetMin: okt.varighetMin,
    intensitet: okt.intensitet || 3,
    tittel: okt.navn,
    kilde: 'bibliotek',
    ekstra: { oktId: okt.bibliotekId, planId: okt.planId || undefined, delvis: !!delvis },
  });
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
