// Røyktester for de rene funksjonene: tilgang, prioritering og brief-manus.
// Kjør: node scripts/test.mjs
import assert from 'node:assert/strict';
import { ROLLER, ANSATTE, UNNTAK, DELEGERINGER, MODULER, SIGNALER, KUNDER, KALENDER, PIPELINE } from '../js/data.js';
import { effektivTilgang, kanDelegere, nesteNivaa, synligeModuler } from '../js/tilgang.js';
import { prioriter, nokkeltall, gjelder } from '../js/prioritering.js';
import { lagManus } from '../js/brief.js';

const finn = (id) => ANSATTE.find((a) => a.id === id);
const ktx = { roller: ROLLER, unntak: UNNTAK, delegeringer: DELEGERINGER };
let antall = 0;
const test = (navn, fn) => { fn(); antall++; console.log(`  ✓ ${navn}`); };

console.log('tilgang');
test('rolle-mal gir utgangspunktet', () => {
  assert.deepEqual(effektivTilgang(finn('ida'), 'tilbud', ktx), { nivaa: 'bruke', kilde: 'rolle', delegering: null });
  assert.equal(effektivTilgang(finn('ida'), 'team', ktx).nivaa, 'ingen');
});
test('unntak overstyrer rolle-malen', () => {
  assert.equal(effektivTilgang(finn('nina'), 'kunder', ktx).kilde, 'unntak');
});
test('aktiv delegering løfter nivået', () => {
  const t = effektivTilgang(finn('sander'), 'team', ktx);
  assert.equal(t.nivaa, 'bruke');
  assert.equal(t.kilde, 'delegert');
});
test('utløpt delegering teller ikke', () => {
  const utlopt = { ...ktx, delegeringer: [{ ...DELEGERINGER[0], utloperOm: -1 }] };
  assert.equal(effektivTilgang(finn('sander'), 'team', utlopt).nivaa, 'se');
});
test('bare «delegere» kan delegere, og ikke videre', () => {
  assert.equal(kanDelegere(finn('tor'), 'team', 'bruke', ktx), true);
  assert.equal(kanDelegere(finn('tor'), 'team', 'delegere', ktx), false);
  assert.equal(kanDelegere(finn('ida'), 'tilbud', 'se', ktx), false);
});
test('nesteNivaa går i ring', () => {
  assert.equal(nesteNivaa('ingen'), 'se');
  assert.equal(nesteNivaa('delegere'), 'ingen');
});
test('synlige moduler følger tabellen', () => {
  const ids = synligeModuler(finn('ida'), MODULER, ktx).map((m) => m.id);
  assert.ok(ids.includes('brief') && !ids.includes('tilgang') && !ids.includes('team'));
});

console.log('prioritering');
const data = { signaler: SIGNALER, roller: ROLLER, kunder: KUNDER, kalender: KALENDER, pipeline: PIPELINE };
test('signaler filtreres på person, rolle og alle', () => {
  assert.ok(gjelder(SIGNALER.find((s) => s.id === 'e3'), finn('nina')));
  assert.ok(gjelder(SIGNALER.find((s) => s.id === 'i2'), finn('arne')));
  assert.ok(!gjelder(SIGNALER.find((s) => s.id === 'i2'), finn('ida')));
});
test('Ida: Østby Rør-tilbudet er øverst, med begrunnelse', () => {
  const p = prioriter(finn('ida'), data);
  assert.equal(p[0].signal.id, 'e1');
  assert.ok(p[0].grunner.some((g) => g.includes('møter kunden')));
  assert.equal(p[0].handling.modul, 'tilbud');
});
test('innesalg prioriterer reklamasjonen', () => {
  assert.equal(prioriter(finn('mona'), data)[0].signal.id, 'e5');
});
test('rangeringen er sortert synkende', () => {
  const p = prioriter(finn('tor'), data);
  for (let i = 1; i < p.length; i++) assert.ok(p[i - 1].score >= p[i].score);
});
test('nøkkeltall', () => {
  const n = nokkeltall(finn('ida'), data);
  assert.equal(n.moter, 3);
  assert.equal(n.aapenPipeline, 3_640_000);
});

console.log('brief');
test('manus hilser, nevner første avtale og prioriteringer', () => {
  const ida = finn('ida');
  const manus = lagManus(ida, { prioriteringer: prioriter(ida, data), nokkel: nokkeltall(ida, data), kalender: KALENDER, time: 7 });
  assert.equal(manus[0], 'God morgen, Ida. Her er dagen din.');
  assert.ok(manus.some((s) => s.includes('08:00')));
  assert.ok(manus.some((s) => s.startsWith('Først:')));
});

console.log(`\n${antall} tester OK`);
