// Installerer git-hooks lokalt ved å peke core.hooksPath til scripts/hooks.
// Kjøres automatisk via npm-ens `prepare` (dvs. ved `npm install`), eller
// manuelt med `npm run installer-hooks`. Trygg å kjøre flere ganger.
import { execSync } from 'node:child_process';

try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
} catch {
  process.exit(0); // ikke et git-tre (f.eks. installert som avhengighet) — hopp over
}

try {
  execSync('git config core.hooksPath scripts/hooks');
  console.log('✓ Git-hooks aktivert (core.hooksPath = scripts/hooks).');
} catch (e) {
  console.warn('Kunne ikke sette git-hooks:', e.message);
}
