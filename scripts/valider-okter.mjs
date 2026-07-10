// Validering av øktbiblioteket data/okter.json (node, null avhengigheter).
// Kjør fra repo-rot: node scripts/valider-okter.mjs
// Sjekker: gyldig JSON, nøyaktig 60 økter (én per kategori×skill×intensitet),
// id-mønster, enum-verdier, felt- og blokkvalidering per kind, at summen av
// blokk-minutter ligger innenfor ±20 % av varighetMin (warn), at ev.
// ovelseId/sekvensId resolverer, og avspillingssanity per kategori.
// Exit 0 = grønt. Exit 1 = feil (alt skrives til stdout uansett).
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const KATEGORIER = [
  'gatur', 'lop', 'yoga', 'styrke', 'toying',
  'sykkel', 'kroppsvekt', 'mobilitet', 'hiit', 'restitusjon',
];
const SKILLS = ['lav', 'medium', 'hoy'];
const INTENSITETER = ['lett', 'intens'];
const KILDETYPER = new Set(['program', 'protokoll', 'tradisjon', 'retningslinje']);
const UTSTYR = new Set([
  'matte', 'manualer', 'strikk', 'kettlebell', 'stang', 'benk',
  'sykkel', 'staver', 'sekk-med-vekt', 'stol', 'pute', 'teppe',
]);
const KINDS = new Set(['ovelser', 'sekvens', 'pust', 'kondisjon']);
const ROLLER = new Set(['oppvarming', 'hoved', 'nedtrapping']);
const FORMATKLASSER = new Set(['reps', 'hold']);
// Lovlige format+parametre-kombinasjoner for ovelser-blokker (kjor.js paramTekst).
const OVELSER_FORMATER = {
  'straight-sets': ['sett', 'reps', 'pauseSek'],
  styrkehold: ['sett', 'tidSek'],
  'statisk-toy': ['tidMin'],
  yin: ['tidMin'],
};
// Guidede kategorier skal ha minst én ovelser/sekvens-blokk; timer-kategorier
// minst én kondisjon/pust-blokk.
const GUIDEDE = new Set(['styrke', 'kroppsvekt', 'yoga', 'toying', 'mobilitet']);
const TIMERE = new Set(['gatur', 'lop', 'sykkel', 'hiit', 'restitusjon']);

let okter, exercises, sequences;
try {
  okter = read('okter.json');
} catch (e) {
  console.error('KUNNE IKKE LESE/PARSE data/okter.json:', e.message);
  process.exit(1);
}
try {
  exercises = read('exercises.json');
  sequences = read('sequences.json');
} catch (e) {
  console.error('KUNNE IKKE LESE referansefil:', e.message);
  process.exit(1);
}
const ovelseIder = new Set(exercises.map((e) => e.id));
const sekvensIder = new Set(sequences.map((s) => s.id));

// --- Antall og celledekning ---
if (!Array.isArray(okter)) { console.error('okter.json er ikke en array'); process.exit(1); }
if (okter.length !== 60) err(`Forventet 60 økter, fant ${okter.length}`);

const sett = new Set();
for (const k of KATEGORIER) for (const s of SKILLS) for (const i of INTENSITETER) sett.add(`${k}-${s}-${i}`);
const funnet = new Set();
for (const o of okter) {
  if (funnet.has(o.id)) err(`Duplikat økt-id: ${o.id}`);
  funnet.add(o.id);
}
for (const id of sett) if (!funnet.has(id)) err(`Mangler celle: ${id}`);
for (const id of funnet) if (!sett.has(id)) err(`Ukjent økt-id (matcher ingen celle): ${id}`);

// --- Per-økt-validering ---
const erTall = (v) => typeof v === 'number' && Number.isFinite(v);
const erHeltall = (v) => Number.isInteger(v);

for (const o of okter) {
  const at = `økt ${o.id || '(uten id)'}`;

  if (o.id !== `${o.kategori}-${o.skill}-${o.intensitet}`) err(`${at}: id matcher ikke kategori/skill/intensitet`);
  if (!KATEGORIER.includes(o.kategori)) err(`${at}: ukjent kategori "${o.kategori}"`);
  if (!SKILLS.includes(o.skill)) err(`${at}: ukjent skill "${o.skill}"`);
  if (!INTENSITETER.includes(o.intensitet)) err(`${at}: ukjent intensitet "${o.intensitet}"`);
  if (!o.navn || typeof o.navn !== 'string') err(`${at}: mangler navn`);
  if (!o.beskrivelse || typeof o.beskrivelse !== 'string') err(`${at}: mangler beskrivelse`);
  else if (o.beskrivelse.length > 220) warn(`${at}: beskrivelse over 220 tegn (${o.beskrivelse.length})`);
  if (!erHeltall(o.varighetMin) || o.varighetMin < 8 || o.varighetMin > 45) err(`${at}: varighetMin utenfor 8-45 (${o.varighetMin})`);
  if (!Array.isArray(o.utstyr)) err(`${at}: utstyr er ikke en liste`);
  else for (const u of o.utstyr) if (!UTSTYR.has(u)) err(`${at}: ukjent utstyr "${u}"`);

  // kilde
  if (!o.kilde || typeof o.kilde !== 'object') err(`${at}: mangler kilde`);
  else {
    if (!o.kilde.navn) err(`${at}: kilde mangler navn`);
    if (!KILDETYPER.has(o.kilde.type)) err(`${at}: ukjent kildetype "${o.kilde?.type}"`);
    if (!o.kilde.ref) err(`${at}: kilde mangler ref`);
  }

  // blokker
  if (!Array.isArray(o.blokker) || o.blokker.length < 1 || o.blokker.length > 5) {
    err(`${at}: blokker må være 1-5 (fant ${o.blokker?.length})`);
    continue;
  }
  let sumMin = 0;
  const kindsIBruk = new Set();
  o.blokker.forEach((b, i) => {
    const bat = `${at} blokk ${i + 1} (${b.kind})`;
    kindsIBruk.add(b.kind);
    if (!KINDS.has(b.kind)) { err(`${bat}: ukjent kind`); return; }
    if (!ROLLER.has(b.rolle)) err(`${bat}: ukjent rolle "${b.rolle}"`);
    if (!b.formatNavn) err(`${bat}: mangler formatNavn`);
    if (!erHeltall(b.min) || b.min < 1) err(`${bat}: min må være heltall ≥1 (${b.min})`);
    else sumMin += b.min;

    if (b.kind === 'ovelser') {
      if (!FORMATKLASSER.has(b.formatKlasse)) err(`${bat}: formatKlasse må være reps/hold ("${b.formatKlasse}")`);
      if (!Array.isArray(b.ovelser) || b.ovelser.length === 0) err(`${bat}: mangler ovelser[]`);
      else for (const ov of b.ovelser) {
        if (!ov.navn) err(`${bat}: øvelse mangler navn`);
        if (!ov.dose) err(`${bat}: øvelse "${ov.navn}" mangler dose`);
        if (ov.ovelseId && !ovelseIder.has(ov.ovelseId)) err(`${bat}: ovelseId "${ov.ovelseId}" finnes ikke i exercises.json`);
      }
      if (b.format !== undefined) {
        const kravd = OVELSER_FORMATER[b.format];
        if (!kravd) err(`${bat}: ulovlig format "${b.format}" for ovelser-blokk`);
        else for (const felt of kravd) if (!erTall(b.parametre?.[felt])) err(`${bat}: format ${b.format} krever parametre.${felt}`);
      }
    } else if (b.kind === 'sekvens') {
      const s = b.ovelser?.[0];
      if (!s?.navn) err(`${bat}: mangler sekvensnavn`);
      if (!Array.isArray(s?.posisjoner) || s.posisjoner.length === 0) err(`${bat}: mangler posisjoner[]`);
      if (!erHeltall(b.parametre?.runder) || b.parametre.runder < 1) err(`${bat}: mangler parametre.runder`);
      if (s?.sekvensId && !sekvensIder.has(s.sekvensId)) err(`${bat}: sekvensId "${s.sekvensId}" finnes ikke i sequences.json`);
    } else if (b.kind === 'pust') {
      if (!erTall(b.parametre?.tidMin)) err(`${bat}: mangler parametre.tidMin`);
      const t = b.parametre?.takt;
      if (!t || !erTall(t.inn) || !erTall(t.ut) || !erTall(t.holdInn) || !erTall(t.holdUt)) {
        err(`${bat}: takt må ha inn/holdInn/ut/holdUt som tall`);
      }
    } else if (b.kind === 'kondisjon') {
      const p = b.parametre || {};
      const jevn = erTall(p.tidMin);
      const intervall = Array.isArray(p.faser) && p.faser.length > 0;
      if (!jevn && !intervall) err(`${bat}: kondisjon krever tidMin (jevn) eller faser[] (intervall)`);
      if (intervall) {
        if (p.runder !== undefined && (!erHeltall(p.runder) || p.runder < 1)) err(`${bat}: runder må være heltall ≥1`);
        for (const f of p.faser) {
          if (!f.navn) err(`${bat}: fase mangler navn`);
          if (!erHeltall(f.sek) || f.sek < 1) err(`${bat}: fase "${f.navn}" har ugyldig sek (${f.sek})`);
          if (f.type !== 'arbeid' && f.type !== 'hvile') err(`${bat}: fase "${f.navn}" har ugyldig type "${f.type}"`);
        }
      }
    }
  });

  // Σ blokk-min ≈ varighetMin ±20 %
  if (erHeltall(o.varighetMin) && sumMin > 0) {
    const avvik = Math.abs(sumMin - o.varighetMin) / o.varighetMin;
    if (avvik > 0.2) warn(`${at}: blokk-sum ${sumMin} min avviker ${Math.round(avvik * 100)} % fra varighetMin ${o.varighetMin}`);
  }

  // Avspillingssanity per kategori
  if (GUIDEDE.has(o.kategori) && !kindsIBruk.has('ovelser') && !kindsIBruk.has('sekvens')) {
    warn(`${at}: guidet kategori uten ovelser/sekvens-blokk`);
  }
  if (TIMERE.has(o.kategori) && !kindsIBruk.has('kondisjon') && !kindsIBruk.has('pust')) {
    warn(`${at}: timer-kategori uten kondisjon/pust-blokk`);
  }
}

// --- Oppsummering ---
const perKategori = {};
for (const o of okter) perKategori[o.kategori] = (perKategori[o.kategori] || 0) + 1;
console.log(`Økter: ${okter.length} — per kategori: ${KATEGORIER.map((k) => `${k}:${perKategori[k] || 0}`).join(' ')}`);
console.log(`Utstyrsfrie økter: ${okter.filter((o) => Array.isArray(o.utstyr) && o.utstyr.length === 0).length}/60`);

if (warnings.length) {
  console.log(`\n${warnings.length} advarsler:`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} FEIL:`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  process.exit(1);
}
console.log('\n✓ okter.json er gyldig');
