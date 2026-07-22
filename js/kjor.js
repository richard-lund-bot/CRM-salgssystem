// Øktspilleren (M13, «now playing»-oppsett M16.1): review → kjøring av
// bibliotekøkter. Holder «gjeldende økt» i minne mellom skjermene. Kjøringa
// flater hver blokk ut til en stegliste (lagSteg) og spiller ett steg om
// gangen: tidsstyrte steg teller ned og går videre av seg selv, reps får en
// romslig gjettet tid, og selvstyrte flyt-steg venter på «Hopp over». En
// sesjonsklokke teller total tid, og både den og stegtimeren regner med
// veggklokke-tid (ikke tellende intervaller), så alt løper riktig videre selv
// om skjermen låses eller appen legges i bakgrunnen — og våkenlåsen holder
// skjermen på. Fullføring registreres som bevegelse (registrerOgLogg) —
// samme varme ferdigskjerm som all annen bevegelse.
import { el, tom, ikon } from './ui.js';
import { settPlanStatus } from './store.js';
import { registrerOgLogg, visBevegelseFerdig } from './beveg.js';
import { lagRing } from './animasjon.js';
import { holdVaaken, slippVaaken } from './vaakenlaas.js';
import { infoKnapp, ovelseInfo, ovelseBilde, visOvelseArk } from './ovelse.js';
import { anbefaling, sisteSett, oppsummerOkt, loggførStyrkeokt } from './styrke.js';
import { pling } from './lyd.js';

let gjeldendeOkt = null;
let aktivInterval = null;
let vedSynlig = null; // kalles når appen kommer i forgrunnen igjen

// Hvor «tilbake» fra review skal gå: siden man åpnet økta FRA (Bevegelse-hjem,
// favoritter, Ro, biblioteket …). Settes ved hvert åpningspunkt (settOpprinnelse)
// fordi router-flyten via #/okter?start=X kollapser forrigeHash, så vi kan ikke
// utlede opprinnelsen etterpå. Uten en opprinnelse faller vi tilbake til
// biblioteket (som før).
let reviewOpprinnelse = null;
export function settOpprinnelse(hash) { reviewOpprinnelse = hash || null; }

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
// Selve lyden bor nå i js/lyd.js (delt med feiringene, felles av/på-bryter).

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
      () => { location.hash = reviewOpprinnelse || (okt.kategori ? `#/okter?kat=${okt.kategori}` : '#/okter'); }),
    el('main', { class: 'innhold' },
      okt.beskrivelse && el('p', { class: 'dempet' }, okt.beskrivelse),
      ...byggReviewInnhold(okt),
      el('div', { class: 'fast-bunn' },
        el('button', { class: 'knapp', type: 'button', onclick: () => { location.hash = '#/kjor'; } }, 'Start økt'),
      ),
    ),
  );
}

// Review-innholdet (blokkseksjonene + kilde) — deles med økt-kortet i app.js,
// som viser samme gjennomgang i et flytende kort over gjeldende side.
export function byggReviewInnhold(okt) {
  return [
    ...okt.blokker.map((blk) => blokkSeksjon(blk)),
    okt.kilde?.navn ? el('p', { class: 'dempet' }, `Basert på: ${okt.kilde.navn}`) : null,
  ];
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

// Tolker en dosetekst til {sett, reps, holdSek, pauseSek, timeSek, perSide}.
// «3×8, pause 90 s» → 3 sett à 8 reps, 90 s pause. «3×30 s» → 3 sett à 30 s
// hold. «×10» → 1 sett à 10. «2 min» → én tidsperiode.
function parseDose(dose) {
  const s = String(dose || '');
  const r = { sett: 0, reps: 0, holdSek: 0, pauseSek: 0, timeSek: 0, perSide: /per side/i.test(s) };
  const pause = s.match(/pause\s*(\d+)\s*s/i);
  if (pause) r.pauseSek = parseInt(pause[1], 10);
  const sr = s.match(/(\d+)\s*[×x]\s*(\d+)\s*(s)?/i);
  if (sr) {
    if (sr[3]) { r.sett = parseInt(sr[1], 10); r.holdSek = parseInt(sr[2], 10); }
    else { r.sett = parseInt(sr[1], 10); r.reps = parseInt(sr[2], 10); }
  } else {
    const bare = s.match(/^\s*[×x]\s*(\d+)/i);
    if (bare) { r.sett = 1; r.reps = parseInt(bare[1], 10); }
    else {
      const min = s.match(/(\d+)\s*min/i);
      if (min) r.timeSek = parseInt(min[1], 10) * 60;
      else { const sek = s.match(/(\d+)\s*s\b/i); if (sek && !r.pauseSek) r.timeSek = parseInt(sek[1], 10); }
    }
  }
  return r;
}

// Flater en blokk ut til en stegliste. Hovedblokkene (styrke) bygges opp som
// sett: hvert reps-sett er selvstyrt (skriv vekt + reps), med en pausetimer
// mellom settene. Andre reps-steg (oppvarming/nedtrapping) er enten en
// tidsperiode («2 min») eller selvstyrte «gjør reps, gå videre».
//   sett-steg: {type:'sett', ovNavn, settNr, settAv, reps, perSide, sek:null}
//   hold-sett: {type:'hold', settNr, settAv, sek:holdSek}
//   pause:     {type:'hvile', sek:pauseSek}
//   tidssteg:  {type:'arbeid', sek} · selvstyrt: {type:'reps', sek:null}
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
  const erHoved = blk.rolle === 'hoved';
  const blkPause = p.pauseSek;
  const ovelser = blk.ovelser || [];
  const steg = [];
  ovelser.forEach((o, ovIdx) => {
    const d = parseDose(o.dose);
    const perSide = o.unilateral || d.perSide;
    const sett = d.sett || p.sett || 0;
    if (erHoved && sett >= 1 && (d.reps || p.reps || d.holdSek)) {
      const reps = d.reps || p.reps || 0;
      const pause = d.pauseSek || blkPause || 75;
      for (let s = 1; s <= sett; s++) {
        steg.push(d.holdSek
          ? { navn: o.navn, ovNavn: o.navn, type: 'hold', settNr: s, settAv: sett, holdSek: d.holdSek, perSide, sek: d.holdSek }
          : { navn: o.navn, ovNavn: o.navn, type: 'sett', settNr: s, settAv: sett, reps, perSide, sek: null });
        if (s < sett) steg.push({ navn: 'Pause', type: 'hvile', sek: pause });
      }
      // Pause etter siste sett òg — før neste øvelse (ikke etter den siste).
      if (ovIdx < ovelser.length - 1) steg.push({ navn: 'Pause', type: 'hvile', sek: pause });
    } else if (d.timeSek) {
      steg.push({ navn: o.navn, dose: o.dose, sek: d.timeSek, type: 'arbeid' });
    } else {
      const sub = [o.dose, perSide && !/per side/i.test(o.dose || '') && 'per side'].filter(Boolean).join(' · ') || null;
      steg.push({ navn: o.navn, dose: sub, sek: null, type: 'reps' });
    }
  });
  return steg;
}

export function visKjoreSkjerm(mount, { vedAvbrudd = null } = {}) {
  if (!gjeldendeOkt) { location.hash = '#/okter'; return; }
  const okt = gjeldendeOkt;
  stoppTimer();

  const blokkMin = okt.blokker.reduce((s, b) => s + (b.min || 0), 0);
  const totalSek = Math.max(1, (okt.varighetMin || blokkMin || 1) * 60);

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
  const arbeidsVekt = {}; // vekt brukt i denne økta per øvelse (mater feltene)
  const settLogg = [];

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
  // Manualøvelser (navnet sier «manual»): vekta gjelder per manual (én hånd).
  // Goblet/kettlebell holdes som én vekt med begge hender, så de holdes utenfor.
  const perManual = (navn) => /manual/i.test(navn);

  // --- topp (dagsfase-bakgrunn) ---
  const fase = dagsfaseNaa();
  const bg = el('div', { class: 'kjor2__bg', 'aria-hidden': 'true', style: `background-image:url('icons/brand/hero-${fase}.webp')` });
  const topp = el('header', { class: 'kjor2__topp' },
    el('h1', { class: 'kjor2__tittel' }, okt.navn),
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
  const naRingEnhet = el('span', { class: 'kjor2-ring__enhet' }, 'sek');
  const { svg: naRingSvg, sett: naRingSett } = lagRing(50);
  const naRing = el('div', { class: 'kjor2-ring' }, naRingSvg,
    el('div', { class: 'kjor2-ring__inn' }, naRingTall, naRingEnhet));
  // Sett-innmating (vises kun på sett-steg): vekt + reps + fullfør.
  const vektInn = el('input', { class: 'kjor2-sett__felt', type: 'number', inputmode: 'decimal', min: '0', step: '0.5', placeholder: '0', 'aria-label': 'Vekt i kg' });
  const repsInn = el('input', { class: 'kjor2-sett__felt', type: 'number', inputmode: 'numeric', min: '0', step: '1', 'aria-label': 'Antall reps' });
  const vektHint = el('span', { class: 'kjor2-sett__hint' }, '');
  const vektMerk = el('span', { class: 'kjor2-sett__merk' }, 'Vekt (kg)'); // «per manual» ved manualer
  // RIR (reps i reserve): valgfri anstrengelse-chip 0–4+ som styrer neste anbefaling.
  let valgtRir = null;
  const rirChips = [0, 1, 2, 3, 4].map((n) => el('button', {
    class: 'kjor2-rir__chip', type: 'button',
    onclick: () => { valgtRir = valgtRir === n ? null : n; oppdaterRir(); },
  }, n === 4 ? '4+' : String(n)));
  function oppdaterRir() { rirChips.forEach((c, i) => c.classList.toggle('kjor2-rir__chip--valgt', valgtRir === i)); }
  const rirHjelp = el('p', { class: 'kjor2-rir__hjelp', hidden: true },
    'RIR = «reps i reserve»: hvor mange flere reps du kunne tatt før du måtte gi deg. '
    + '0 = helt tomt (til utmattelse), 2 = to igjen. Lavere RIR = tyngre sett. Brukes til å foreslå neste vekt.');
  const rirInfo = el('button', {
    class: 'kjor2-rir__i', type: 'button', 'aria-label': 'Hva betyr RIR?',
    onclick: () => { rirHjelp.hidden = !rirHjelp.hidden; },
  }, ikon('info'));
  const rirRad = el('div', { class: 'kjor2-rir' },
    el('span', { class: 'kjor2-rir__merk' }, 'Reps igjen (RIR)'),
    rirInfo,
    el('div', { class: 'kjor2-rir__chips' }, ...rirChips),
  );
  const settBlokk = el('div', { class: 'kjor2-sett' },
    el('div', { class: 'kjor2-sett__felter' },
      el('label', { class: 'kjor2-sett__gruppe' }, vektMerk, vektInn, vektHint),
      el('label', { class: 'kjor2-sett__gruppe' }, el('span', { class: 'kjor2-sett__merk' }, 'Reps'), repsInn),
    ),
    rirRad,
    rirHjelp,
    el('button', { class: 'knapp kjor2-sett__knapp', type: 'button', onclick: () => fullforSteg() }, ikon('sjekk', 'ikon ikon--liten'), 'Fullfør sett'),
  );
  // «Neste øvelse» for selvstyrte ikke-sett-steg (oppvarming/nedtrapping, flyt).
  const nesteEnkel = el('button', { class: 'knapp knapp--sekundaer kjor2-na__neste', type: 'button', onclick: () => fullforSteg() }, 'Neste øvelse');
  const naKort = el('div', { class: 'kort kjor2-na' },
    el('div', { class: 'kjor2-na__topp' }, el('span', { class: 'kjor2-na__merke' }, 'NÅ'), naInfoWrap, naRing),
    naBilde, naNavn, naDose, naTip, settBlokk, nesteEnkel,
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
      el('div', { class: 'kjor2__stabel' }, sesjonKort, naKort, nesteKort, nesteBlokkKort),
    ),
    bunn,
  );

  // --- oppdatering ---
  let tegnetEnGang = false;
  function tegnSteg() {
    const g = gj();
    tom(naBilde); naBilde.append(stegBilde(g));
    naNavn.textContent = g ? g.navn : '';
    const tip = g && ovelseInfo(g.navn)?.tips?.[0];
    naTip.style.display = tip ? '' : 'none';
    naTipTekst.textContent = tip ? ` ${tip}` : '';
    tom(naInfoWrap);
    const ik = g && infoKnapp(g.navn);
    if (ik) naInfoWrap.append(ik);

    const erSett = !!(g && g.type === 'sett');
    const selvstyrt = !!(g && !g.sek && !erSett); // oppvarming/nedtrapping reps, flyt
    settBlokk.style.display = erSett ? '' : 'none';
    nesteEnkel.style.display = selvstyrt ? '' : 'none';
    naRing.style.visibility = (g && g.sek) || erSett ? '' : 'hidden';

    if (erSett) {
      naRingEnhet.textContent = `av ${g.settAv}`;
      naRingTall.textContent = String(g.settNr);
      naRingSett(g.settNr / g.settAv);
      naDose.textContent = `Sett ${g.settNr} av ${g.settAv} · mål ${g.reps} reps${g.perSide ? ' · per side' : ''}`;
      const inn = arbeidsVekt[g.ovNavn];                       // satt tidligere i økta
      const anbef = anbefaling(g.ovNavn, { reps: g.reps, sett: g.settAv });
      const forrige = sisteSett(g.ovNavn);                     // topp-sett fra historikk
      const forhaand = inn?.vekt ?? anbef.vekt ?? forrige?.vekt ?? null;
      vektMerk.textContent = perManual(g.ovNavn) ? 'Vekt per manual (kg)' : 'Vekt (kg)';
      vektInn.value = Number.isFinite(forhaand) ? String(forhaand) : '';
      repsInn.value = g.reps ? String(g.reps) : '';
      valgtRir = null; oppdaterRir();
      rirHjelp.hidden = true;
      vektHint.textContent = forrige
        ? `sist ${forrige.vekt} kg × ${forrige.reps}${anbef.vekt ? ` · anbefalt ${anbef.vekt}` : ''}`
        : (anbef.vekt ? `anbefalt ${anbef.vekt} kg` : 'ny øvelse — velg en trygg vekt');
    } else {
      naRingEnhet.textContent = 'sek';
      naDose.textContent = (g && g.type === 'hold' && g.settAv)
        ? `Sett ${g.settNr} av ${g.settAv} · ${g.holdSek} s hold${g.perSide ? ' · per side' : ''}`
        : doseTekst(g);
    }

    const n = nesteSteg();
    if (n) {
      nesteKort.style.display = '';
      tom(nesteBilde); nesteBilde.append(stegBilde(n));
      nesteNavn.textContent = n.navn;
      nesteDose.textContent = n.type === 'sett' ? `Sett ${n.settNr}/${n.settAv} · ${n.reps} reps` : doseTekst(n);
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
      const nbIkon = nb.formatKlasse === 'hold' ? 'stoppeklokke' : nb.kind === 'sekvens' ? 'yoga'
        : nb.kind === 'pust' ? 'hjerte' : nb.kind === 'kondisjon' ? 'loper' : 'vekt';
      (nb.ovelser || []).slice(0, 4).forEach((o) => nbListe.append(el('div', { class: 'kjor2-nb__rad' },
        el('span', { class: 'kjor2-nb__ikon' }, ikon(nbIkon)),
        el('span', { class: 'kjor2-nb__navn' }, o.navn),
        el('span', { class: 'kjor2-nb__tid' }, String(o.dose || '').split(',')[0]),
      )));
    }
    blokkTeller.textContent = `Blokk ${bIdx + 1} av ${okt.blokker.length}`;
    // Slide NÅ-kortet inn ved steg-/fasebytte (ikke på første tegning) —
    // øktrytmen føles ikke lenger som et hardt innholdshopp.
    if (tegnetEnGang) { naKort.classList.remove('kjor2-na--inn'); void naKort.offsetWidth; naKort.classList.add('kjor2-na--inn'); }
    tegnetEnGang = true;
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
    if (!(g && g.sek)) return; // sett/selvstyrt: tegnSteg eier NÅ-ringen

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
    if (teller && rem !== sisteTikk) {
      sisteTikk = rem; pling(700, 0.05);
      naRingTall.classList.remove('kjor2-tall--pop'); void naRingTall.offsetWidth; naRingTall.classList.add('kjor2-tall--pop');
    }
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

  // Loggfør et sett (vekt + reps) og gå videre — brukes av «Fullfør sett» og
  // av «Neste øvelse» på selvstyrte steg. Starter sesjonsklokka om nødvendig
  // så pausetimeren mellom sett løper.
  function fullforSteg() {
    const g = gj();
    if (g && g.type === 'sett') {
      const vekt = parseFloat(String(vektInn.value).replace(',', '.'));
      const reps = parseInt(repsInn.value, 10);
      const v = Number.isFinite(vekt) ? vekt : null;
      const r = Number.isFinite(reps) ? reps : (g.reps || null);
      settLogg.push({ ovNavn: g.ovNavn, settNr: g.settNr, vekt: v, reps: r, rir: valgtRir, perSide: !!g.perSide });
      if (v != null) arbeidsVekt[g.ovNavn] = { vekt: v, reps: r };
    }
    if (!spiller) settSpill(true);
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

  function avsluttNaturlig() { stoppTimer(); fullfor(mount, okt, false, settLogg); }

  function ferdigTrykk() {
    if (bIdx >= okt.blokker.length - 1) { stoppTimer(); fullfor(mount, okt, false, settLogg); return; }
    const min = Math.max(1, gjortMin());
    if (confirm(`Avslutte økta nå? Vi teller ~${min} min du har gjort.`)) {
      stoppTimer();
      fullfor(mount, { ...okt, varighetMin: min }, true, settLogg);
    }
  }

  function lukk() {
    if (!startet && bIdx === 0 && sIdx === 0) {
      if (confirm('Avslutte økta? Du kan starte igjen når du vil.')) {
        stoppTimer(); slippVaaken();
        // I kort-modus (økta kjører i flytkortet) går avbrudd tilbake til
        // gjennomgangen i kortet; rute-modus navigerer til #/review som før.
        if (vedAvbrudd) vedAvbrudd(); else location.hash = '#/review';
      }
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
// Fullføring — registreres som bevegelse (registrerOgLogg) og feires med
// samme varme ferdigskjerm som all annen bevegelse.
// ===========================================================================
function fullfor(mount, okt, delvis, settLogg = []) {
  slippVaaken();
  // Planen hukes av først, så «Som planlagt»-merket kan feires på ferdigskjermen.
  if (okt.planId && !delvis) settPlanStatus(okt.planId, 'gjort');
  // Styrke: oppsummer (volum + PR) MOT eksisterende logg, så lagre økta.
  const styrke = settLogg.length ? oppsummerOkt(settLogg) : null;
  if (styrke?.harData) loggførStyrkeokt(okt.navn, settLogg);
  const resultat = registrerOgLogg({
    bevegelse: okt.bevegelse || 'custom',
    varighetMin: okt.varighetMin,
    intensitet: okt.intensitet || 3,
    tittel: okt.navn,
    kilde: 'bibliotek',
    ekstra: { oktId: okt.bibliotekId, planId: okt.planId || undefined, delvis: !!delvis, volumKg: styrke?.volum || undefined },
  });
  gjeldendeOkt = null;
  visBevegelseFerdig(mount, resultat, {
    bevegelse: okt.bevegelse, varighetMin: okt.varighetMin, tittel: okt.navn, delvis,
    styrke: styrke?.harData ? styrke : null,
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
