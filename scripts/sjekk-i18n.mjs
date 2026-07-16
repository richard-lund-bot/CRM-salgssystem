// Verifiserer at js/i18n.js er i takt med generatoren scripts/bygg-i18n.py.
//
// js/i18n.js er et byggeartefakt. Håndredigeringer (eller en glemt re-generering
// etter at ordboken i bygg-i18n.py ble endret) driver stille fra kilden. Denne
// vakten kjører generatoren til en midlertidig fil og feiler hvis den committede
// js/i18n.js avviker — uten å røre arbeidskopien. Kjør: `npm run sjekk-i18n`.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mål = join(ROT, 'js', 'i18n.js');

let tmp;
try {
  tmp = mkdtempSync(join(tmpdir(), 'i18n-'));
  const ferskFil = join(tmp, 'i18n.js');
  try {
    execFileSync('python3', [join(ROT, 'scripts', 'bygg-i18n.py'), ferskFil], { stdio: 'pipe' });
  } catch (e) {
    // Python mangler e.l. — ikke blokker committen på et manglende verktøy.
    console.warn('⚠ Hopper over i18n-drift-sjekk (kunne ikke kjøre bygg-i18n.py):', e.message.split('\n')[0]);
    process.exit(0);
  }
  const fersk = readFileSync(ferskFil, 'utf8');
  const committed = readFileSync(mål, 'utf8');
  if (fersk === committed) {
    console.log('✓ js/i18n.js er i takt med scripts/bygg-i18n.py.');
    process.exit(0);
  }
  console.error('\n\x1b[31m✗ js/i18n.js har drevet fra scripts/bygg-i18n.py.\x1b[0m');
  console.error('  Den committede fila matcher ikke generatorens utdata (håndredigert');
  console.error('  eller ikke regenerert etter en ordbok-endring).');
  console.error('\n  Kjør \x1b[36mpython3 scripts/bygg-i18n.py\x1b[0m og stage js/i18n.js på nytt.\n');
  process.exit(1);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
