// Headless test av nivåmotoren (js/niva.js). Rene funksjoner, ingen nettleser.
// Verifiserer XP, opprykk gated på bevis, momentum/decay/streak, PR og gateway.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  terskel, globaltNiva, nivaFraBase, erUlast, momentum, decay, effektivBase,
  streak, prsFraLogg, registrerOkt, registrerGateway, bestattGateway, ukeNokkel,
} from '../js/niva.js';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const gateways = JSON.parse(readFileSync(join(rot, 'data', 'gateways.json'), 'utf8'));

const DAG = 86400000;
let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };

// --- terskler / globalt nivå ---
sjekk(terskel(1) === 100 && terskel(4) === 800, `terskel: nv1=${terskel(1)}, nv4=${terskel(4)}`);
sjekk(globaltNiva(0) === 1 && globaltNiva(100000) > 1, `globalt nivå vokser: ${globaltNiva(100000)}`);

// --- opplåsing ---
sjekk(nivaFraBase(2) === 2 && nivaFraBase(3) === 3 && nivaFraBase(5) === 4 && nivaFraBase(7) === 5, 'nivaFraBase 2/3/5/7 → 2/3/4/5');

const e4 = { id: 'x', modaliteter: ['STY'], kjede: 'push-h', niva: 4 };
sjekk(!erUlast({ nivaer: { STY: { base: 3 } } }, e4, 4, gateways), 'nivå 4 låst ved base 3');
sjekk(erUlast({ nivaer: { STY: { base: 5 } } }, e4, 4, gateways), 'nivå 4 ulåst ved base 5');
sjekk(erUlast({ gatewaysPassert: ['push-l4'], nivaer: { STY: { base: 2 } } }, e4, 4, gateways), 'gateway push-l4 låser opp push-h nv4');
sjekk(erUlast({ innstillinger: { nivaOverstyr: { STY: 5 } }, nivaer: { STY: { base: 1 } } }, e4, 4, gateways), 'manuell overstyring låser opp');

// --- XP + opprykk gated på bevis ---
const bib = {};
const okt = (mod, niva, min = 40, intensitet = 3) => ({
  modalitet: mod, varighetMin: min, intensitet,
  blokker: [{ ovelser: [{ id: mod.toLowerCase() + '-a', niva }, { id: mod.toLowerCase() + '-b', niva }] }],
});

// Base 2 → topp ulåst = nivå 2. Logg 5 økter med nivå-2-øvelser (bevis), nok XP.
let profil = { nivaer: { STY: { base: 2, xp: 0, bevisTeller: 0, hoyesteBevist: 2 } }, prs: {}, globalXp: 0, settOvelser: {} };
let nå = Date.parse('2026-01-01T10:00:00Z');
let sisteResultat = null;
for (let i = 0; i < 5; i++) {
  const r = registrerOkt(profil, okt('STY', 2, 60, 4), bib, [], nå + i * DAG);
  profil = r.profil; sisteResultat = r.resultat;
}
sjekk(sisteResultat.nivaOpp.length >= 1 && profil.nivaer.STY.base >= 3, `opprykk etter 5 bevis-økter + XP: base=${profil.nivaer.STY.base}`);

// XP alene rykker aldri opp: mange økter UNDER toppnivå (ingen bevis).
let p2 = { nivaer: { STY: { base: 3, xp: 0, bevisTeller: 0, hoyesteBevist: 3 } }, prs: {}, globalXp: 0, settOvelser: {} };
for (let i = 0; i < 8; i++) { p2 = registrerOkt(p2, okt('STY', 1, 60, 5), bib, [], nå + i * DAG).profil; }
sjekk(p2.nivaer.STY.base === 3, `XP uten bevis rykker ikke opp (base ${p2.nivaer.STY.base}, xp ${p2.nivaer.STY.xp})`);

// --- comeback dobler XP ---
let p3 = { nivaer: { STY: { base: 3, xp: 0, bevisTeller: 0, hoyesteBevist: 3, sisteOkt: '2026-01-01T10:00:00Z' } }, prs: {}, globalXp: 0, settOvelser: { 'sty-a': true, 'sty-b': true } };
const rCb = registrerOkt(p3, okt('STY', 3, 40, 3), bib, [], Date.parse('2026-03-01T10:00:00Z')); // ~59 d senere
sjekk(rCb.resultat.comeback && rCb.resultat.xp === 80, `comeback ×2: 40min×1.0×2 = ${rCb.resultat.xp}`);

// --- PR-bonus ---
let p4 = { nivaer: { STY: { base: 3, xp: 0, bevisTeller: 0, hoyesteBevist: 3 } }, prs: { 'sty-a': { id: 'sty-a', reps: 10 } }, globalXp: 0, settOvelser: { 'sty-a': true, 'sty-b': true } };
const rPr = registrerOkt(p4, okt('STY', 2, 30, 3), bib, [{ id: 'sty-a', reps: 15 }], nå);
sjekk(rPr.resultat.nyePrs.length === 1 && rPr.resultat.bonusXp === 20, `PR gir +20 bonus (${rPr.resultat.bonusXp})`);

// --- momentum / decay ---
const pM = { nivaer: { STY: { base: 4, hoyesteBevist: 4, sisteOkt: '2026-01-01T00:00:00Z' } } };
sjekk(momentum(pM, 'STY', Date.parse('2026-01-05T00:00:00Z')).tilstand === 'aktiv', 'momentum aktiv < 10 d');
sjekk(momentum(pM, 'STY', Date.parse('2026-01-16T00:00:00Z')).tilstand === 'kjolig', 'momentum kjølig 10–21 d');
sjekk(momentum(pM, 'STY', Date.parse('2026-02-10T00:00:00Z')).tilstand === 'comeback', 'momentum comeback > 21 d');
const dec = decay(pM, 'STY', Date.parse('2026-04-01T00:00:00Z')); // ~90 d, STY grace 21 takt 28
sjekk(dec.trinn >= 1 && dec.rusten, `decay slår inn: ${dec.trinn} trinn`);
const eff = effektivBase(pM, 'STY', Date.parse('2026-06-01T00:00:00Z'));
sjekk(eff >= 2 && eff <= 4, `effektiv base med gulv (hoyesteBevist-2): ${eff}`);

// --- streak ---
const logg = [];
// 4 økter/uke i 3 uker fram til nå.
const slutt = Date.parse('2026-02-01T12:00:00Z');
for (let u = 0; u < 3; u++) for (let d = 0; d < 4; d++) logg.push({ dato: new Date(slutt - u * 7 * DAG - d * DAG).toISOString(), modalitet: 'STY' });
const st = streak(logg, 4, slutt);
sjekk(st.uker >= 3, `streak ≥ 3 uker på ukemål 4: ${st.uker} (denne uken ${st.denneUken})`);

// --- gateway ---
const gwPush = gateways.find((g) => g.id === 'push-l4');
sjekk(bestattGateway(gwPush, { 'push-up': 30, dips: 12 }), 'gateway push-l4 bestått ved 30/12');
sjekk(!bestattGateway(gwPush, { 'push-up': 20, dips: 12 }), 'gateway push-l4 IKKE bestått ved 20/12');
const rGw = registrerGateway({ nivaer: {}, gatewaysPassert: [] }, gwPush, nå);
sjekk(rGw.profil.gatewaysPassert.includes('push-l4') && rGw.profil.nivaer.STY.base >= 5, `gateway hever base til ${rGw.profil.nivaer.STY.base}`);

// --- PR-uttrekk fra logg ---
const prLogg = [{ dato: '2026-01-01', resultater: [{ id: 'x', reps: 10 }] }, { dato: '2026-01-08', resultater: [{ id: 'x', reps: 14 }] }];
sjekk(prsFraLogg(prLogg).x.reps === 14, 'prsFraLogg tar høyeste reps');

console.log(feil ? `\n${feil} FEIL` : '\n✓ Nivåmotoren er grønn.');
process.exit(feil ? 1 : 0);
