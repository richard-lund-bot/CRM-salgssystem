// Styrkelogg, e1RM, anbefalt vekt og prognose (M17).
//
// All data ligger lokalt (trening.styrkelogg) — én post per fullført
// styrkeøkt: { id, dato, oktNavn, ovelser:[{ navn, perSide, sett:[{vekt,reps}] }] }.
// Rene funksjoner + små inline-SVG-grafer (offline-først, ingen bibliotek).
// «Vekt forrige gang»-hintet under kjøring bruker samme kilde.

const LS = 'trening.styrkelogg';

function les() {
  try { return JSON.parse(localStorage.getItem(LS) || '[]') || []; } catch { return []; }
}
function skriv(a) {
  try { localStorage.setItem(LS, JSON.stringify(a)); } catch { /* lagring valgfri */ }
}

export function lesStyrkelogg() { return les(); }

// Epley: 1RM ≈ vekt × (1 + reps/30). Enkelt, robust, god nok for trend.
export function e1rm(vekt, reps) {
  const v = Number(vekt); const r = Number(reps);
  if (!(v > 0) || !(r > 0)) return 0;
  return v * (1 + r / 30);
}

const rund = (x, steg = 2.5) => Math.round(x / steg) * steg;

// Grupperer en flat settLogg [{ovNavn,settNr,vekt,reps,perSide}] til øvelser.
function grupper(settLogg) {
  const m = new Map();
  for (const s of settLogg || []) {
    const navn = s.ovNavn || s.navn;
    if (!m.has(navn)) m.set(navn, { navn, perSide: !!s.perSide, sett: [] });
    m.get(navn).sett.push({ vekt: s.vekt ?? null, reps: s.reps ?? null });
  }
  return [...m.values()];
}

// Total tonnasje (kg) for et sett øvelser — per side teller dobbelt.
export function oktVolum(ovelser) {
  let v = 0;
  for (const o of ovelser || []) {
    const faktor = o.perSide ? 2 : 1;
    for (const s of o.sett || []) v += (Number(s.vekt) || 0) * (Number(s.reps) || 0) * faktor;
  }
  return Math.round(v);
}

// Historikk for én øvelse: én rad per økt (kronologisk) med topp-vekt, e1RM
// og volum.
export function ovelseØkter(navn) {
  const ut = [];
  for (const økt of les()) {
    const o = (økt.ovelser || []).find((x) => x.navn === navn);
    if (!o) continue;
    const gyldige = (o.sett || []).filter((s) => Number(s.vekt) > 0 && Number(s.reps) > 0);
    if (!gyldige.length) continue;
    const toppVekt = Math.max(...gyldige.map((s) => Number(s.vekt)));
    const best = gyldige.reduce((a, s) => Math.max(a, e1rm(s.vekt, s.reps)), 0);
    ut.push({
      dato: økt.dato, oktNavn: økt.oktNavn, sett: gyldige,
      toppVekt, e1rm: Math.round(best * 10) / 10, volum: oktVolum([{ ...o, sett: gyldige }]),
    });
  }
  return ut.sort((a, b) => String(a.dato).localeCompare(String(b.dato)));
}

export function harStyrkedata(navn) { return ovelseØkter(navn).length > 0; }

// Topp-settet fra forrige økt med denne øvelsen — til «sist»-hintet.
export function sisteSett(navn) {
  const okter = ovelseØkter(navn);
  if (!okter.length) return null;
  const siste = okter[okter.length - 1];
  const topp = Math.max(...siste.sett.map((s) => Number(s.vekt)));
  const s = siste.sett.find((x) => Number(x.vekt) === topp);
  return { vekt: topp, reps: Number(s?.reps) || 0, dato: siste.dato };
}

// Oppsummer en fullført økt MOT eksisterende logg (kall før lagring): volum,
// antall og nye e1RM-PR-er per øvelse.
export function oppsummerOkt(settLogg) {
  const ovelser = grupper(settLogg).filter((o) => o.sett.some((s) => Number(s.vekt) > 0 && Number(s.reps) > 0));
  const volum = oktVolum(ovelser);
  let settAntall = 0;
  ovelser.forEach((o) => { settAntall += o.sett.filter((s) => Number(s.vekt) > 0 && Number(s.reps) > 0).length; });
  const prs = [];
  for (const o of ovelser) {
    const forrigeBeste = ovelseØkter(o.navn).reduce((a, r) => Math.max(a, r.e1rm), 0);
    const naa = o.sett.reduce((a, s) => Math.max(a, e1rm(s.vekt, s.reps)), 0);
    if (naa > forrigeBeste + 0.01 && forrigeBeste > 0) {
      prs.push({ navn: o.navn, e1rm: Math.round(naa), forrige: Math.round(forrigeBeste) });
    }
  }
  return { volum, settAntall, ovelseAntall: ovelser.length, prs, harData: ovelser.length > 0 };
}

// Lagre en fullført styrkeøkt. Returnerer posten (eller null uten data).
export function loggførStyrkeokt(oktNavn, settLogg, dato) {
  const ovelser = grupper(settLogg).filter((o) => o.sett.some((s) => Number(s.vekt) > 0 && Number(s.reps) > 0));
  if (!ovelser.length) return null;
  const rec = {
    id: `s${Date.now()}`,
    dato: dato || new Date().toISOString().slice(0, 10),
    oktNavn: oktNavn || 'Styrke',
    ovelser: ovelser.map((o) => ({ ...o, sett: o.sett.filter((s) => Number(s.vekt) > 0 && Number(s.reps) > 0) })),
  };
  const a = les(); a.push(rec); skriv(a);
  return rec;
}

// --- Anbefaling: vekt + sett/reps for neste gang -------------------------
// Progressiv overbelastning på topp-settet: traff alle mål → øk ~5 %,
// bommet → deload ~10 %, delvis → gjenta. Sett/reps kommer fra programmet.
export function anbefaling(navn, { reps = 8, sett = 3 } = {}) {
  const okter = ovelseØkter(navn);
  if (!okter.length) {
    return { vekt: null, sett, reps, tekst: 'Første gang: velg en vekt du klarer alle repsene med god teknikk.' };
  }
  const siste = okter[okter.length - 1];
  const topp = Math.max(...siste.sett.map((s) => Number(s.vekt)));
  const toppSett = siste.sett.filter((s) => Number(s.vekt) === topp);
  const traff = toppSett.every((s) => (Number(s.reps) || 0) >= reps);
  const bom = toppSett.every((s) => (Number(s.reps) || 0) < reps);
  let vekt; let tekst;
  if (traff) { vekt = Math.max(topp + 2.5, rund(topp * 1.05)); tekst = `Du klarte målet på ${topp} kg sist — prøv å øke.`; }
  else if (bom) { vekt = rund(topp * 0.9); tekst = 'Tungt sist — ta litt ned og bygg opp igjen.'; }
  else { vekt = topp; tekst = `Gjenta ${topp} kg og sikt på alle repsene.`; }
  return { vekt, sett, reps, tekst };
}

// --- Prognose: lineær trend på e1RM --------------------------------------
function linreg(xs, ys) {
  const n = xs.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const d = n * sxx - sx * sx;
  if (!d) return { a: sy / n, b: 0 };
  const b = (n * sxy - sx * sy) / d;
  return { a: (sy - b * sx) / n, b };
}

export function prognose(navn) {
  const okter = ovelseØkter(navn).filter((o) => o.e1rm > 0);
  if (okter.length < 3) return null;
  const t0 = Date.parse(okter[0].dato);
  const xs = okter.map((o) => (Date.parse(o.dato) - t0) / 86400000);
  const ys = okter.map((o) => o.e1rm);
  const { b } = linreg(xs, ys);
  const naa = ys[ys.length - 1];
  return { perUke: Math.round(b * 7 * 10) / 10, om4Uker: Math.round(naa + b * 28), naa: Math.round(naa), punkter: okter.length };
}

// --- Liten inline-SVG-linjegraf ------------------------------------------
export function lagLinjegraf(verdier, { farge = 'var(--aksent)', hoyde = 120 } = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 320; const H = hoyde; const pad = 10; const padY = 14;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'styrkegraf');
  svg.setAttribute('preserveAspectRatio', 'none');
  const vals = verdier.filter((v) => Number.isFinite(v));
  if (vals.length < 2) return svg;
  const min = Math.min(...vals); const max = Math.max(...vals);
  const spenn = max - min || 1;
  const x = (i) => pad + (i * (W - 2 * pad)) / (vals.length - 1);
  const y = (v) => padY + (H - 2 * padY) * (1 - (v - min) / spenn);
  const pkt = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  // Fyllflate under linja
  const fyll = document.createElementNS(NS, 'polygon');
  fyll.setAttribute('points', `${x(0)},${H - padY} ${pkt.join(' ')} ${x(vals.length - 1)},${H - padY}`);
  fyll.setAttribute('class', 'styrkegraf__fyll');
  const linje = document.createElementNS(NS, 'polyline');
  linje.setAttribute('points', pkt.join(' '));
  linje.setAttribute('class', 'styrkegraf__linje');
  linje.setAttribute('fill', 'none');
  linje.setAttribute('stroke', farge);
  svg.append(fyll, linje);
  // Punkter (siste uthevet)
  vals.forEach((v, i) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x(i)); c.setAttribute('cy', y(v));
    c.setAttribute('r', i === vals.length - 1 ? 4 : 2.5);
    c.setAttribute('class', 'styrkegraf__pkt' + (i === vals.length - 1 ? ' styrkegraf__pkt--siste' : ''));
    svg.append(c);
  });
  return svg;
}
