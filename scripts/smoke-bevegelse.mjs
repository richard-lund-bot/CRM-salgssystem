// Headless røyktest av bevegelseslaget (M11) — ingen nettleser.
// Sjekker: XP-formelen fra spesifikasjonen (min. 5 XP, smalt intensitetsspenn),
// registrering av fri bevegelse (teller, comeback, belønninger), Momentum-
// tilstander, Dagens gnist-determinisme og gjenstandsopplåsing.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { beregnXp, bevegelsesMomentum, dagensGnist, dagerMedAktivitet, MODALITET_TIL_BEVEGELSE, BEVEGELSER } from '../js/bevegelse.js';
import { registrerBevegelse, registrerOkt } from '../js/niva.js';
import { nivaFraTotalXp, ulasteGjenstander, nyeGjenstander, belonningFor, tittelFor, GJENSTANDER } from '../js/belonninger.js';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const les = (n) => JSON.parse(readFileSync(join(rot, 'data', `${n}.json`), 'utf8'));
const bib = { exercises: les('exercises') };

let feil = 0;
const sjekk = (ok, melding) => { if (!ok) { console.error('✗', melding); feil++; } };

// --- XP-formelen (spec §8) ---
sjekk(beregnXp(20, 'walk', 3) === 20, 'gåtur 20 min moderat = 20 XP');
sjekk(beregnXp(30, 'strength', 4) === Math.round(30 * 1.3 * 1.15), 'styrke 30 min hard');
sjekk(beregnXp(2, 'recovery', 1) === 5, 'minste XP er 5 — mikrobevegelse teller');
sjekk(beregnXp(60, 'sport', 3) === 84, 'fotball 60 min moderat = 84 XP');
// Rolig bevegelse skal aldri føles verdiløs: spennet er smalt.
sjekk(beregnXp(30, 'walk', 5) / beregnXp(30, 'walk', 1) < 1.6, 'intensitetsspennet er smalt');

// --- Alle bevegelsestyper og modalitetsmappingen henger sammen ---
for (const b of Object.keys(BEVEGELSER)) sjekk(beregnXp(10, b, 3) >= 5, `XP for ${b}`);
for (const [m, b] of Object.entries(MODALITET_TIL_BEVEGELSE)) sjekk(BEVEGELSER[b], `mapping ${m} → ${b}`);

// --- Registrering av fri bevegelse ---
const profil0 = { globalXp: 0, bevegelsesTeller: {}, nivaer: {} };
let p = profil0;
let sisteResultat = null;
for (let i = 0; i < 5; i++) {
  const r = registrerBevegelse(p, { bevegelse: 'walk', varighetMin: 20, intensitet: 2 }, bib);
  p = r.profil; sisteResultat = r.resultat;
}
sjekk(p.bevegelsesTeller.walk === 5, 'bevegelsesteller telles opp');
sjekk(p.globalXp === 5 * beregnXp(20, 'walk', 2), 'XP akkumuleres');
sjekk(ulasteGjenstander(p).has('sokker-tur'), '5 gåturer låser opp Tursokker');
sjekk((sisteResultat.nyeGjenstander || []).some((g) => g.id === 'sokker-tur'), 'opplåsing rapporteres i resultatet');

// Comeback: dobbel XP + comeback-gjenstand
const rc = registrerBevegelse(p, { bevegelse: 'walk', varighetMin: 10, intensitet: 2, comeback: true }, bib);
sjekk(rc.resultat.xp === 2 * beregnXp(10, 'walk', 2), 'comeback gir dobbel XP');
sjekk(rc.profil.harComeback === true, 'comeback-merket settes');
sjekk(ulasteGjenstander(rc.profil).has('caps-comeback'), 'comeback låser opp caps');

// --- Generatorøkter bruker samme formel og teller bevegelser ---
const profilOkt = { globalXp: 0, nivaer: { STY: { base: 3, xp: 0, bevisTeller: 0, hoyesteBevist: 3 } } };
const okt = { modalitet: 'STY', varighetMin: 30, intensitet: 3, blokker: [{ kind: 'ovelser', rolle: 'hoved', ovelser: [{ id: 'push-up', niva: 2 }] }] };
const ro = registrerOkt(profilOkt, okt, bib, []);
sjekk(ro.resultat.grunnXp === beregnXp(30, 'strength', 3), 'økt-XP følger spesifikasjonsformelen');
sjekk(ro.resultat.xp === ro.resultat.grunnXp + 10, 'ny øvelse gir +10 bonus oppå');
sjekk(ro.profil.bevegelsesTeller.strength === 1, 'økter teller som bevegelse');

// --- Momentum: aldri straff, alltid en varm tilstand ---
const nå = Date.now();
const DAG = 86400000;
const loggAktiv = [0, 1, 2, 4].map((d) => ({ dato: new Date(nå - d * DAG).toISOString(), varighetMin: 20 }));
sjekk(bevegelsesMomentum(loggAktiv, nå).tilstand === 'sterk', 'fire aktive dager = sterk rytme');
const loggPause = [{ dato: new Date(nå - 9 * DAG).toISOString(), varighetMin: 20 }];
const momPause = bevegelsesMomentum(loggPause, nå);
sjekk(momPause.tilstand === 'klar', 'pause = «klar», aldri «mistet»');
sjekk(!/mistet|røk|failed|streak/i.test(momPause.tekst + momPause.undertekst), 'ingen skamspråk i momentum-tekster');
sjekk(bevegelsesMomentum([], nå).tilstand === 'ny', 'tom logg = ny');
sjekk(dagerMedAktivitet(loggAktiv, nå, 7).length === 7, '7 dagers rytme');

// --- Dagens gnist: deterministisk og alltid med handling ---
const profilFav = { bevegelsesFavoritter: ['strength', 'yoga'], globalXp: 500 };
const g1 = dagensGnist(profilFav, loggAktiv, nå);
const g2 = dagensGnist(profilFav, loggAktiv, nå + 60000);
sjekk(g1.tittel === g2.tittel, 'gnisten er stabil gjennom dagen');
sjekk(g1.href && g1.xp >= 5, 'gnisten har lenke og XP-estimat');
sjekk(dagensGnist(profilFav, loggPause, nå).bevegelse === 'walk', 'comeback-gnist er en snill tur');

// --- Belønningsstigen: varme titler, ingen aggressive ---
const alleTitler = [];
for (let n = 1; n <= 120; n++) alleTitler.push(tittelFor(n));
sjekk(!alleTitler.some((t) => /elite|beast|udødelig|rå|legende|mester/i.test(t)), 'ingen aggressive titler');
for (let n = 2; n <= 60; n++) {
  const b = belonningFor(n, bib);
  sjekk(b && b.type && (b.navn || b.type === 'start'), `belønning på nivå ${n}`);
}
sjekk(nivaFraTotalXp(0).niva === 1, 'nivå 1 fra 0 XP');
sjekk(nivaFraTotalXp(200).niva >= 2, 'tidlige nivåer kommer raskt');

// Kuraterte gjenstander i stigen finnes i katalogen
for (const g of GJENSTANDER) sjekk(g.id && g.kategori && g.laas, `gjenstand ${g.id} komplett`);

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('✓ Alt grønt — bevegelseslag, XP, momentum, gnist og belønninger.');
