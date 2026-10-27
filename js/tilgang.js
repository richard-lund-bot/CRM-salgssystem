// Tilgangsmodellen: effektiv tilgang = rolle-mal, overstyrt av individuelle
// unntak, løftet av aktive delegeringer. Rene funksjoner (testes i scripts/test.mjs).
import { NIVAAER } from './data.js';

const rang = (nivaa) => Math.max(0, NIVAAER.indexOf(nivaa));

// Hvilket nivå har `ansatt` på `modul`, og hvorfor?
// Returnerer { nivaa, kilde: 'rolle' | 'unntak' | 'delegert', delegering? }.
export function effektivTilgang(ansatt, modul, { roller, unntak, delegeringer }) {
  const fraRolle = roller[ansatt.rolle]?.tilgang?.[modul] ?? 'ingen';
  const fraUnntak = unntak[ansatt.id]?.[modul];
  let nivaa = fraUnntak ?? fraRolle;
  let kilde = fraUnntak ? 'unntak' : 'rolle';
  let delegering = null;
  for (const d of delegeringer) {
    if (d.til !== ansatt.id || d.modul !== modul || d.utloperOm < 0) continue;
    if (rang(d.nivaa) > rang(nivaa)) {
      nivaa = d.nivaa;
      kilde = 'delegert';
      delegering = d;
    }
  }
  return { nivaa, kilde, delegering };
}

// Kan `fra` delegere `modul` med `nivaa` til noen? Krever nivået «delegere» på
// modulen, og man kan bare gi bort «se» eller «bruke» – ikke retten til å
// delegere videre (ingen kjeder av delegeringer).
export function kanDelegere(fra, modul, nivaa, kontekst) {
  const egen = effektivTilgang(fra, modul, kontekst).nivaa;
  return egen === 'delegere' && (nivaa === 'se' || nivaa === 'bruke');
}

// Neste nivå når en celle i tabellen klikkes (ingen → se → bruke → delegere → ingen).
export function nesteNivaa(nivaa) {
  return NIVAAER[(rang(nivaa) + 1) % NIVAAER.length];
}

// Moduler en ansatt faktisk ser i suiten (alt over «ingen»).
export function synligeModuler(ansatt, moduler, kontekst) {
  return moduler.filter((m) => rang(effektivTilgang(ansatt, m.id, kontekst).nivaa) > 0);
}
