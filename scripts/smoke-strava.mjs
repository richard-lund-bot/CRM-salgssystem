// Smoke-test for Strava-broen (M14): mapping (delt med Edge Functionen),
// kreditering på enheten (XP + hovedbok), dedupe, soft delete og
// plan-avhuking. Kjøres med `node scripts/smoke-strava.mjs` — ingen DOM,
// localStorage stubbes.
let feil = 0;
function sjekk(navn, ok) {
  console.log(`${ok ? '✓' : '✗'} ${navn}`);
  if (!ok) feil++;
}

// --- Stubs før import (modulene bruker localStorage ved kall, ikke import) --
const lager = new Map();
globalThis.localStorage = {
  getItem: (k) => (lager.has(k) ? lager.get(k) : null),
  setItem: (k, v) => lager.set(k, String(v)),
  removeItem: (k) => lager.delete(k),
};

const { tilLoggRad, intensitetFraPuls, SPORT_TIL_BEVEGELSE } =
  await import('../supabase/functions/strava/mapping.js');
const { lagreProfil, hentProfil, settLoggRå, hentLogg, leggTilPlan, hentPlan } =
  await import('../js/store.js');
const { beregnXp } = await import('../js/bevegelse.js');
const { krediterNye } = await import('../js/strava.js');

// === 1) Mapping ==============================================================
const lop = tilLoggRad({
  id: 1234567, sport_type: 'Run', name: 'Morgenløp',
  moving_time: 1845, elapsed_time: 2000, distance: 5230.4,
  average_heartrate: 152.3,
  start_date: '2026-07-09T18:30:00Z', start_date_local: '2026-07-09T20:30:00Z',
}, 'uid-1');
sjekk('mapping: id = strava-<aktivitetsid>', lop.id === 'strava-1234567');
sjekk('mapping: Run → run', lop.data.bevegelse === 'run');
sjekk('mapping: varighet = avrundet moving_time', lop.data.varighetMin === 31);
sjekk('mapping: intensitet 4 ved snittpuls 152', lop.data.intensitet === 4);
sjekk('mapping: dato-kolonnen = lokal dag', lop.dato === '2026-07-09');
sjekk('mapping: data.dato = ekte UTC', lop.data.dato === '2026-07-09T18:30:00Z');
sjekk('mapping: xp er null (ukreditert)', lop.data.xp === null);
sjekk('mapping: distanse/puls avrundet', lop.data.distanseM === 5230 && lop.data.snittPuls === 152);
sjekk('mapping: Soccer → sport', SPORT_TIL_BEVEGELSE.Soccer === 'sport');
sjekk('mapping: ukjent type → custom', tilLoggRad({ id: 1, sport_type: 'NoeNytt', moving_time: 600 }, 'u').data.bevegelse === 'custom');
sjekk('mapping: puls-terskler', intensitetFraPuls(null) === 3 && intensitetFraPuls(100) === 2
  && intensitetFraPuls(139) === 3 && intensitetFraPuls(159) === 4 && intensitetFraPuls(170) === 5);

// === 2) Kreditering ==========================================================
const idag = new Date();
idag.setHours(10, 0, 0, 0);
const idagIso = idag.toISOString();
const dag = `${idag.getFullYear()}-${String(idag.getMonth() + 1).padStart(2, '0')}-${String(idag.getDate()).padStart(2, '0')}`;

lagreProfil({ navn: 'Test', globalXp: 100, bevegelsesTeller: {}, nivaer: {} });
leggTilPlan({ dato: dag, modalitet: 'BASE' }); // gammel plan: BASE → walk

const gaatur = {
  id: 'strava-777', dato: idagIso, bevegelse: 'walk', tittel: 'Lunsjtur',
  varighetMin: 30, intensitet: 3, xp: null, kilde: 'strava', fullfort: true,
  oppdatert: idagIso,
};
// En gammel lokal økt så comeback ikke slår inn.
const gammel = {
  id: 'bev-1', dato: new Date(idag.getTime() - 86400000).toISOString(),
  bevegelse: 'run', varighetMin: 20, intensitet: 3, xp: 28, kilde: 'manuell',
  fullfort: true, oppdatert: idagIso,
};
settLoggRå([gammel, gaatur]);

const antall = krediterNye();
const profil = hentProfil();
const rad = hentLogg().find((o) => o.id === 'strava-777');
const ventetXp = beregnXp(30, 'walk', 3);
sjekk('kreditering: én ny rad kreditert', antall === 1);
sjekk(`kreditering: rad fikk xp ${ventetXp}`, rad?.xp === ventetXp);
sjekk('kreditering: globalXp økte tilsvarende', profil.globalXp === 100 + ventetXp);
sjekk('kreditering: hovedboka husker raden', (profil.stravaKreditert || []).includes('strava-777'));
sjekk('kreditering: teller bevegelsen', profil.bevegelsesTeller.walk === 1);

// === 3) Plan-avhuking ========================================================
sjekk('plan: BASE-plan samme dag huket av', hentPlan()[0]?.status === 'gjort');

// === 4) Dedupe (stale kopi med xp: null re-pullet) ===========================
rad.xp = null; // simuler at en gammel fjernkopi vant flettingen
settLoggRå(hentLogg());
krediterNye();
sjekk('dedupe: hovedboka hindrer dobbel XP', hentProfil().globalXp === 100 + ventetXp);

// === 5) Soft delete ==========================================================
const slettes = { ...gaatur, id: 'strava-888', slettet: true, xp: 12 };
settLoggRå([...hentLogg(), slettes]);
krediterNye();
sjekk('soft delete: slettet rad fjernes lokalt', !hentLogg().some((o) => o.id === 'strava-888'));
sjekk('soft delete: andre rader beholdes', hentLogg().some((o) => o.id === 'strava-777'));

if (feil) { console.error(`\n${feil} sjekk(er) feilet.`); process.exit(1); }
console.log('\n✓ Strava-broen er grønn (mapping, kreditering, dedupe, sletting, plan).');
