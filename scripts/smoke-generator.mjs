// Headless røyktest av generatoren — ingen nettleser. Bygger bib fra data/,
// kjører generering for alle modaliteter × varighetsklasser, og sjekker:
//   1) determinisme (samme seed → identisk økt)
//   2) ingen tom hovedblokk
//   3) bytt-øvelse gir en annen øvelse
//   4) alt valgt utstyr finnes faktisk på lokasjonen
// Exit 0 = grønt.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { genererOkt, byttOvelse, tilgjengeligUtstyr } from '../js/generator.js';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const les = (n) => JSON.parse(readFileSync(join(rot, 'data', `${n}.json`), 'utf8'));

const FILER = ['exercises', 'chains', 'formats', 'templates', 'equipment', 'bundles', 'gateways', 'sequences', 'warmups', 'protocols'];
const data = Object.fromEntries(FILER.map((f) => [f, les(f)]));
const bunkeMap = new Map(data.bundles.map((b) => [b.id, b]));
const bib = {
  ...data,
  utstyrMap: new Map(data.equipment.map((e) => [e.id, e])),
  losBunke: (id) => new Set(bunkeMap.get(id)?.inkluderer || []),
};

// Profil som dekker et vanlig hjemme-gym på middels nivå.
const profil = {
  nivaer: Object.fromEntries(['STY', 'HIIT', 'BASE', 'MET', 'SKILL', 'PLYO', 'YOGA', 'PIL', 'STR', 'MOB', 'CORE', 'REST', 'HYB']
    .map((m) => [m, { base: 3 }])),
  lokasjoner: [{ navn: 'Hjemme', bundleId: 'hjemme-gym', varierer: ['pullup'] }],
  aktivLokasjon: 'Hjemme',
  varighetsklasse: 'standard',
  innstillinger: { nivaOverstyr: {} },
};

let feil = 0;
const sjekk = (ok, melding) => { if (!ok) { console.error('✗', melding); feil++; } };

const utstyrSett = tilgjengeligUtstyr(bib, profil, 'Hjemme');
const modaliteter = [...new Set(data.templates.map((t) => t.modalitet))];
const klasser = ['mikro', 'kort', 'standard', 'lang'];

let antall = 0;
for (const modalitet of modaliteter) {
  for (const varighetsklasse of klasser) {
    for (const intensitet of [2, 3, 4]) {
      const valg = { modalitet, varighetsklasse, intensitet, lokasjon: 'Hjemme', stempel: '2026-07-08' };
      const a = genererOkt(bib, profil, valg);
      const b = genererOkt(bib, profil, valg);
      antall++;

      // 1) determinisme
      sjekk(JSON.stringify(a) === JSON.stringify(b), `ikke-deterministisk: ${modalitet}/${varighetsklasse}/i${intensitet}`);

      // 2) ingen tom hovedblokk (klokke/dist/pust/sekvens kan mangle øvelser — de er tidsstyrt)
      for (const blk of a.blokker) {
        const forventerOvelser = blk.kind === 'ovelser';
        if (forventerOvelser && blk.rolle === 'hoved') {
          sjekk(blk.ovelser.length > 0, `tom hovedblokk ${blk.format} i ${modalitet}/${varighetsklasse}`);
        }
        // 4) utstyrsdekning
        for (const o of blk.ovelser || []) {
          for (const u of o.utstyr || []) {
            sjekk(utstyrSett.has(u), `udekket utstyr «${u}» i ${o.navn} (${modalitet}/${varighetsklasse})`);
          }
          // Nivåtak gjelder kun ekte øvelser (oppvarming/pust/sekvens har ikke nivå).
          if (blk.kind === 'ovelser') sjekk(o.niva <= 4, `øvelse over nivåtak: ${o.navn} nv${o.niva}`);
        }
      }

      // 3) bytt-øvelse
      const bi = a.blokker.findIndex((blk) => blk.kind === 'ovelser' && blk.ovelser.length > 1);
      if (bi >= 0) {
        const før = a.blokker[bi].ovelser[0].id;
        const c = byttOvelse(bib, profil, a, bi, 0);
        const etter = c.blokker[bi].ovelser[0].id;
        sjekk(før !== etter, `bytt endret ikke øvelsen i ${modalitet}/${varighetsklasse} (${før})`);
      }
    }
  }
}

console.log(`Genererte og validerte ${antall} økter over ${modaliteter.length} modaliteter.`);
if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('✓ Alt grønt — generatoren er deterministisk, dekket og ikke-tom.');
