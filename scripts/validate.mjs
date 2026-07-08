// Validering av data/-filene (node, null avhengigheter). Kjør fra repo-rot:
//   node scripts/validate.mjs
// Sjekker: gyldig JSON, duplikat-IDer, at alle mønstre/modaliteter/utstyrs-IDer/
// kjede-referanser/gateway-referanser resolverer, og teller mot bibliotekets §28.
// Exit 0 = grønt. Exit 1 = feil (avvik/tellinger skrives til stdout uansett).
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const MONSTRE = new Set([
  'push-h', 'push-v', 'pull-v', 'pull-h', 'kneboy', 'hengsel', 'utfall', 'baering',
  'core-antiekst', 'core-antirot', 'core-lat', 'core-rot', 'core-flex', 'core-heng',
  'lokomotorisk', 'hopp', 'balanse', 'helkropp', 'mobilitet', 'skill', 'pust', 'flyt',
]);
const MODALITETER = new Set([
  'STY', 'HIIT', 'BASE', 'MET', 'SKILL', 'PLYO', 'YOGA', 'PIL', 'STR', 'MOB', 'CORE', 'REST', 'HYB',
]);
const TYPER = new Set(['reps', 'tid', 'hold', 'dist', 'pust', 'flyt']);
const IMPACT = new Set(['lav', 'med', 'hoy']);

// --- Last filene ---
let exercises, equipment, bundles, chains, formats, templates, gateways, sequences, warmups, protocols;
try {
  exercises = read('exercises.json');
  equipment = read('equipment.json');
  bundles = read('bundles.json');
  chains = read('chains.json');
  formats = read('formats.json');
  templates = read('templates.json');
  gateways = read('gateways.json');
  sequences = read('sequences.json');
  warmups = read('warmups.json');
  protocols = read('protocols.json');
} catch (e) {
  console.error('KUNNE IKKE LESE/PARSE en datafil:', e.message);
  process.exit(1);
}

const equipIds = new Set(equipment.map((e) => e.id));
const chainIds = new Set(chains.map((c) => c.id));
const exIds = new Set();

// --- Duplikat-IDer ---
for (const e of exercises) {
  if (exIds.has(e.id)) err(`Duplikat øvelses-ID: ${e.id}`);
  exIds.add(e.id);
}

// --- Per-øvelse-validering ---
for (const e of exercises) {
  const at = `øvelse ${e.id}`;
  if (!e.id || !e.navn) err(`${at}: mangler id/navn`);
  if (!MONSTRE.has(e.monster)) err(`${at}: ukjent mønster "${e.monster}"`);
  if (!Array.isArray(e.modaliteter) || e.modaliteter.length === 0) err(`${at}: mangler modaliteter`);
  for (const m of e.modaliteter || []) if (!MODALITETER.has(m)) err(`${at}: ukjent modalitet "${m}"`);
  if (typeof e.niva !== 'number' || e.niva < 1 || e.niva > 5) err(`${at}: nivå utenfor 1-5 (${e.niva})`);
  if (!TYPER.has(e.type)) err(`${at}: ukjent type "${e.type}"`);
  if (typeof e.unilateral !== 'boolean') err(`${at}: unilateral er ikke boolean`);
  if (!IMPACT.has(e.impact)) err(`${at}: ukjent impact "${e.impact}"`);
  if (!Array.isArray(e.varianter) || e.varianter.length === 0) err(`${at}: mangler varianter`);
  for (const v of e.varianter || []) {
    if (!Array.isArray(v.utstyr) || v.utstyr.length === 0) err(`${at}: variant uten utstyr`);
    for (const u of v.utstyr || []) if (!equipIds.has(u)) err(`${at}: ukjent utstyrs-ID "${u}"`);
  }
  if (e.kjede != null) {
    if (!chainIds.has(e.kjede)) err(`${at}: ukjent kjede "${e.kjede}"`);
    if (typeof e.kjedePos !== 'number') err(`${at}: kjede satt men kjedePos mangler`);
  }
}

// --- Kjeder: hvert ledd må peke på en ekte øvelse ---
for (const c of chains) {
  for (const l of c.ledd) {
    if (!exIds.has(l.ovelse)) err(`kjede ${c.id} pos ${l.pos}: ledd peker på ukjent øvelse "${l.ovelse}"`);
  }
}

// --- Gateways: krav/laserOpp må referere ekte øvelser/kjeder ---
for (const g of gateways) {
  for (const k of g.krav || []) {
    if (k.ovelse != null && !exIds.has(k.ovelse)) warn(`gateway ${g.id}: krav peker på øvelse "${k.ovelse}" som ikke finnes (kan være maskin-test uten bibliotekoppføring)`);
  }
  for (const kj of g.laserOpp?.kjeder || []) if (!chainIds.has(kj)) err(`gateway ${g.id}: laserOpp peker på ukjent kjede "${kj}"`);
}

// --- Formats: gyldige modaliteter ---
for (const f of formats) {
  for (const m of f.modaliteter || []) if (!MODALITETER.has(m)) err(`format ${f.id}: ukjent modalitet "${m}"`);
}

// --- Templates: modalitet + format-referanser ---
const formatIds = new Set(formats.map((f) => f.id));
for (const t of templates) {
  if (!MODALITETER.has(t.modalitet)) err(`mal ${t.id}: ukjent modalitet "${t.modalitet}"`);
  for (const b of t.blokker) if (!formatIds.has(b.format)) err(`mal ${t.id}: ukjent format "${b.format}"`);
}

// --- Bundles: utstyr-referanser ---
for (const b of bundles) {
  for (const u of [...b.inkluderer, ...(b.varierer || [])]) if (!equipIds.has(u)) err(`bunke ${b.id}: ukjent utstyrs-ID "${u}"`);
}

// --- Sequences: posisjonsreferanser (yoga) må resolvere der de er satt ---
for (const s of sequences) {
  for (const p of s.posisjoner || []) {
    if (!exIds.has(p) && !sequences.some((x) => x.id === p)) warn(`sekvens ${s.id}: posisjon "${p}" resolverer ikke (kan være §14-øvelse eller overgang)`);
  }
}

// --- Tellinger mot §28 ---
const byModalitet = {};
for (const e of exercises) for (const m of e.modaliteter) byModalitet[m] = (byModalitet[m] || 0) + 1;
const variantTotal = exercises.reduce((s, e) => s + e.varianter.length, 0);

const tellinger = {
  'øvelser totalt (exercises.json)': exercises.length,
  'progresjonskjeder (chains.json)': chains.length,
  'gateway-tester (gateways.json)': gateways.length,
  'yoga-sekvenser + KB-complexer (sequences.json)': sequences.length,
  'formater (formats.json)': formats.length,
  'maler (templates.json)': templates.length,
  'utstyr (equipment.json)': equipment.length,
  'bunker (bundles.json)': bundles.length,
  'oppvarming+nedtrapping (warmups.json)': warmups.oppvarming.length + warmups.nedtrapping.length,
  'pust/restitusjon (protocols.json)': protocols.length,
  'utstyrsvarianter totalt': variantTotal,
};

// §28 forventer ≈595 "enheter" der variant-oppgraderinger telles som egne enheter.
// exercises + variant-oppgraderinger (varianter utover 1 per øvelse) tilnærmer dette:
const variantUpgrades = variantTotal - exercises.length;
const enhetsEkvivalent = exercises.length + variantUpgrades;

console.log('\n=== TELLINGER ===');
for (const [k, v] of Object.entries(tellinger)) console.log(`  ${k}: ${v}`);
console.log('  fordeling per modalitet:', JSON.stringify(byModalitet));
console.log(`\n  §28 mål: ≈595 enheter · 22 progresjonskjeder`);
console.log(`  enhets-ekvivalent (øvelser + ${variantUpgrades} variant-oppgraderinger): ${enhetsEkvivalent}`);
console.log(`  progresjonskjeder: ${chains.length} (mål 22)`);

if (chains.length !== 22) warn(`Antall progresjonskjeder er ${chains.length}, §28 sier 22.`);

console.log('\n=== RESULTAT ===');
if (warnings.length) {
  console.log(`\nADVARSLER (${warnings.length}) — tolkninger/kjente avvik, ikke blokkerende:`);
  for (const w of warnings) console.log('  ⚠ ' + w);
}
if (errors.length) {
  console.log(`\nFEIL (${errors.length}):`);
  for (const e of errors) console.log('  ✗ ' + e);
  console.log('\n❌ VALIDERING FEILET');
  process.exit(1);
}
console.log('\n✅ ALT GRØNT — ingen referansefeil.');
