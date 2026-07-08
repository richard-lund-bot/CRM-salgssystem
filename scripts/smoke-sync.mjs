// Headless test av flett-logikken (last-write-wins per rad) i js/sync.js.
// Rene funksjoner — ingen nettverk eller nettleser.
import { flettProfil, flettPerId } from '../js/sync.js';

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };

const T = (s) => `2026-07-0${s}T10:00:00.000Z`;

// --- flettProfil ---
sjekk(flettProfil(null, { data: { a: 1 }, oppdatert: T(1) }).a === 1, 'ingen lokal → fjernprofil brukes');
sjekk(flettProfil({ a: 9, oppdatert: T(3) }, { data: { a: 1 }, oppdatert: T(1) }).a === 9, 'lokal nyere vinner');
sjekk(flettProfil({ a: 9, oppdatert: T(1) }, { data: { a: 1 }, oppdatert: T(3) }).a === 1, 'fjern nyere vinner');
sjekk(flettProfil({ a: 9, oppdatert: T(2) }, { data: {}, oppdatert: T(9) }).a === 9, 'tom fjernprofil ignoreres');
sjekk(flettProfil({ a: 9, oppdatert: T(1) }, { data: { a: 1 }, oppdatert: T(3) }).oppdatert === T(3), 'oppdatert-stempel følger med');

// --- flettPerId (logg) ---
const lokal = [{ id: 'a', xp: 10, dato: T(1), oppdatert: T(1) }, { id: 'b', xp: 20, dato: T(2), oppdatert: T(2) }];
const fjern = [
  { data: { id: 'b', xp: 25, dato: T(2) }, oppdatert: T(5) }, // nyere → skal vinne
  { data: { id: 'c', xp: 30, dato: T(3) }, oppdatert: T(3) }, // ny rad
];
const flettet = flettPerId(lokal, fjern, 'dato');
const finn = (id) => flettet.find((x) => x.id === id);
sjekk(flettet.length === 3, `union gir 3 rader (${flettet.length})`);
sjekk(finn('a').xp === 10, 'rad kun lokalt beholdes');
sjekk(finn('b').xp === 25, 'fjern nyere vinner ved id-konflikt');
sjekk(finn('c').xp === 30, 'ny fjernrad legges til');
sjekk(flettet[0].id === 'c', `sortert nyeste dato først (${flettet[0].id})`);

// Lokal nyere ved konflikt beholdes
const flettet2 = flettPerId(
  [{ id: 'x', v: 'lokal', dato: T(4), oppdatert: T(4) }],
  [{ data: { id: 'x', v: 'fjern', dato: T(4) }, oppdatert: T(2) }],
  'dato',
);
sjekk(flettet2[0].v === 'lokal', 'lokal nyere beholdes over eldre fjernrad');

console.log(feil ? `\n${feil} FEIL` : '\n✓ Flett-logikken er grønn (last-write-wins per rad).');
process.exit(feil ? 1 : 0);
