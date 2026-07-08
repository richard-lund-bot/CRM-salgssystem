// Engangs byggescript for F1: slår sammen data/parts/*.json til data/exercises.json
// og data/sequences.json, legger på variant-oppgraderinger (utstyr-dok §5 +
// bibliotek §19/§21/§25-kulepunktene) og synker kjede/kjedePos fra chains.json.
// Kjøres fra repo-rot: node scripts/merge-parts.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const PARTS = [
  'styrke', 'core-plyo-kondis', 'yoga-pilates', 'toying-mobilitet',
  'pakke-a', 'pakke-bcd', 'pakke-efg', 'supplement',
];

const exercises = [];
const avvik = [];
for (const p of PARTS) {
  const del = read(`data/parts/${p}.json`);
  exercises.push(...del.exercises);
  avvik.push(...(del.avvik || []).map((a) => `[${p}] ${a}`));
}

// --- Variant-oppgraderinger: { ovelseId: [variant, ...] } ---
const V = (utstyr, ekstra = {}) => ({ utstyr, ...ekstra });
const upgrades = {
  // utstyr-dok §5
  'goblet-squat': [V(['manualer']), V(['manualsett'])],
  'ringrow': [V(['trx']), V(['tuftepark'])],
  'ringrow-hoy-vinkel': [V(['trx'])],
  'ringrow-fotter-hevet': [V(['trx'])],
  'face-pull': [V(['kabel']), V(['band-lang'])],
  'pallof-press': [V(['kabel'])],
  'kb-floor-press': [V(['manualer', 'matte'])],
  'step-up': [V(['kasse']), V(['benk-ute'])],
  'dips': [V(['dipstativ'])],
  'negativ-dips': [V(['dipstativ']), V(['benk-ute'])],
  'l-sit-tuck': [V(['paralletter'])],
  'l-sit': [V(['paralletter'])],
  'assistert-pistol': [V(['trx']), V(['rack', 'stang'])],
  'skrimp-assistert': [V(['trx']), V(['rack', 'stang'])],
  // pull-up-familien → pullup-stang / rigg / tuftepark
  ...Object.fromEntries(
    ['dead-hang', 'skulderdrag-i-heng', 'negativ-pull-up', 'pull-up', 'chin-up',
      'chest-to-bar', 'l-pull-up', 'knee-raises-i-heng', 'leg-raises-i-heng',
      'toes-to-bar'].map((id) => [id, [V(['pullup']), V(['pullup-rigg']), V(['tuftepark'])]])
  ),
  // KB-løft → tyngre KB-rekke på gym
  ...Object.fromEntries(
    ['kb-rdl', 'kb-swing-tohands', 'kb-swing-enhands', 'kb-swing-dobbel',
      'kb-dead-clean', 'kb-clean', 'kb-snatch', 'kb-strict-press',
      'kb-push-press', 'kb-jerk'].map((id) => [id, [V(['kbsett'])]])
  ),
  // bibliotek §19: 12 manual-varianter av eksisterende
  ...Object.fromEntries(
    ['bulgarsk-splittkneboy', 'utfall-bak', 'hip-thrust-sofa', 'renegade-row',
      'suitcase-carry', 'farmer-carry-dobbel', 'rack-carry', 'russian-twist',
      'kb-windmill', 'kb-thruster', 'kb-halo'].map((id) => [id, [V(['manualer']), V(['manualsett'])]])
  ),
  // bibliotek §21: smith-varianter (teknisk nivåJust −1)
  'back-squat': [V(['smith'], { nivaJust: -1 })],
  'benkpress': [V(['smith'], { nivaJust: -1 })],
  'barbell-utfall': [V(['smith'], { nivaJust: -1 })],
  'militaerpress-ohp': [V(['smith'], { nivaJust: -1 })],
  'bent-over-row-stang': [V(['smith'], { nivaJust: -1 })],
  // bibliotek §21: multimaskin-varianter (hotellgym)
  'brystpress-maskin': [V(['multimaskin'])],
  'latpulldown-bred': [V(['multimaskin'])],
  'sittende-kabelro': [V(['multimaskin'])],
  'kabel-curl': [V(['multimaskin'])],
  'triceps-pushdown': [V(['multimaskin'])],
  // bibliotek §25: band-varianter av eksisterende
  'air-squat': [V(['band-mini'], { navnOverstyr: 'Air squat m/ miniband (knær ut)' })],
  'body-saw': [V(['glidere'])],
  'ettbens-sta': [V(['balansepute'])],
};
// assistert pull-up m/ bånd — nivaJust −1 på pull-up
upgrades['pull-up'].push(V(['pullup', 'band-lang'], { navnOverstyr: 'Assistert pull-up m/ bånd', nivaJust: -1 }));

const byId = new Map(exercises.map((e) => [e.id, e]));
let variantCount = 0;
const missing = [];
for (const [id, vars] of Object.entries(upgrades)) {
  const ex = byId.get(id);
  if (!ex) { missing.push(id); continue; }
  for (const v of vars) {
    const key = v.utstyr.join('+');
    if (ex.varianter.some((x) => x.utstyr.join('+') === key)) continue;
    ex.varianter.push(v);
    variantCount++;
  }
}
if (missing.length) avvik.push(`[merge] Variant-oppgradering fant ikke øvelsene: ${missing.join(', ')}`);
avvik.push(`[merge] La på ${variantCount} utstyrsvarianter på eksisterende øvelser (utstyr-dok §5, bibliotek §19/§21/§25).`);

// --- Synk kjede/kjedePos fra chains.json (chains.json er fasit) ---
// Hjemkjede = FØRSTE kjede (i chains.json-rekkefølge) som lister øvelsen.
// Delte inngangspunkter (push-up, kb-rdl, goblet-squat, kb-swing …) beholder
// dermed sin primærkjede; gym-kjedene refererer dem uten å overta eierskapet.
const chains = read('data/chains.json');
const chainPos = new Map();
for (const c of chains) for (const l of c.ledd) if (!chainPos.has(l.ovelse)) chainPos.set(l.ovelse, { kjede: c.id, kjedePos: l.pos });
let synced = 0;
const chainMismatch = [];
for (const ex of exercises) {
  const ref = chainPos.get(ex.id);
  if (ref) {
    if (ex.kjede !== ref.kjede || ex.kjedePos !== ref.kjedePos) {
      chainMismatch.push(`${ex.id}: ${ex.kjede}/${ex.kjedePos} → ${ref.kjede}/${ref.kjedePos}`);
      ex.kjede = ref.kjede;
      ex.kjedePos = ref.kjedePos;
      synced++;
    }
  } else if (ex.kjede) {
    chainMismatch.push(`${ex.id}: hadde ${ex.kjede}/${ex.kjedePos}, finnes ikke i chains.json → null`);
    ex.kjede = null;
    ex.kjedePos = null;
    synced++;
  }
}
if (synced) avvik.push(`[merge] Synket kjede/kjedePos fra chains.json på ${synced} øvelser: ${chainMismatch.join(' · ')}`);

// --- sequences.json: yoga-sekvenser + KB-complexer ---
const yoga = read('data/parts/sequences-yoga.json');
const kb = read('data/parts/kb-complexer.json');
const sequences = [
  ...yoga.sequences.map((s) => ({ kind: 'yoga', ...s })),
  ...kb.complexes.map((c) => ({ kind: 'kb-complex', ...c })),
];
avvik.push(...(yoga.avvik || []).map((a) => `[sequences-yoga] ${a}`));
avvik.push(...(kb.avvik || []).map((a) => `[kb-complexer] ${a}`));

// --- Duplikatsjekk før skriving ---
const seen = new Set();
const dups = exercises.filter((e) => (seen.has(e.id) ? true : (seen.add(e.id), false)));
if (dups.length) {
  console.error('DUPLIKAT-IDer:', dups.map((d) => d.id).join(', '));
  process.exit(1);
}

writeFileSync('data/exercises.json', JSON.stringify(exercises, null, 1) + '\n');
writeFileSync('data/sequences.json', JSON.stringify(sequences, null, 1) + '\n');
writeFileSync('data/parts/merge-avvik.json', JSON.stringify(avvik, null, 1) + '\n');
console.log(`exercises: ${exercises.length} · sequences: ${sequences.length} · varianter lagt på: ${variantCount}`);
console.log('sekvens-ider:', sequences.map((s) => s.id).join(', '));
