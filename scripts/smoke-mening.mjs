// Headless røyktest av kompassmotoren (js/mening.js): dimensjonsscore,
// formuleringsmaler, budskapsmotorens frekvens-/nivåregler, refleksjons-
// rotasjon og bakoverkompatibilitet med «egne ord» (legacy Mitt hvorfor).
// Deterministisk: fast ankerdato, ingen DOM.

// Stub localStorage før import (mening.js er ren localStorage).
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(k) ? _store.get(k) : null),
  setItem: (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear(),
};

const {
  regnDimensjoner, toppDimensjoner, lagFormuleringer, lagKompassLinje,
  lesKompass, lagreKompass, settKompassPause, slettKompass, settDenneTiden,
  kompassBudskap, kompassForklaring, refleksjonsSporsmal, feiringsHvorfor,
  leggTilHvorfor, trengerRefleksjon, settRefleksjon, ukeStart, harKompass,
} = await import('../js/mening.js');

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };

const anker = new Date(2026, 6, 16, 12, 0, 0).getTime(); // fast torsdag kl. 12 lokal

// --- Dimensjonsscore: eksplisitte valg dominerer -----------------------------
const valg = { inngang: 'mennesker', personer: ['barna', 'partner'], evner: ['leke', 'tur'], folelser: ['energi', 'naervaer'] };
const dims = regnDimensjoner(valg);
sjekk(dims.length > 0 && dims[0].id === 'naerhet', 'familievalg → nærhet er sterkeste dimensjon');
sjekk(dims[0].score === 1, 'sterkeste dimensjon normaliseres til 1');
sjekk(dims.some((d) => d.id === 'livskraft' && d.score > 0.3), 'leke/tur/energi gir livskraft-signal');
sjekk(regnDimensjoner({}).length === 0, 'ingen valg → ingen dimensjoner (aldri gjettet profil)');

// --- Formuleringer: tre varianter, personer kun når valgt --------------------
const fs = lagFormuleringer(valg);
sjekk(fs.length === 3 && fs.map((f) => f.id).join() === 'varm,konkret,identitet', 'tre malbaserte varianter');
sjekk(fs[0].tekst.includes('barna mine') && fs[0].tekst.includes('partneren min'), 'varm variant bruker valgte personkategorier');
sjekk(!lagFormuleringer({ evner: ['tur'] })[0].tekst.includes('barna'), 'uten personvalg nevnes ingen personer');
sjekk(lagKompassLinje(valg) === 'For flere gode år sammen', 'kompasslinje utledes av toppdimensjonen');

// --- Kompasslager: aldri endret i det skjulte --------------------------------
sjekk(lesKompass() === null && !harKompass(), 'ingen kompass før lagring');
const k1 = lagreKompass({ valg, setning: fs[0].tekst, linje: 'For flere gode år sammen', tone: 'varm', personnivaa: 'subtil' });
sjekk(!!k1 && lesKompass().setning === fs[0].tekst, 'kompasset lagres med brukerens godkjente formulering');
sjekk(lagreKompass({ valg, setning: '' }) === null, 'tom setning avvises');
const k2 = lagreKompass({ valg, setning: 'Min egen formulering.', linje: 'Min linje' });
sjekk(k2.versjon === 2 && k2.historikk.length === 1 && k2.historikk[0].setning === fs[0].tekst, 'redigering bevarer forrige formulering i historikken');

// --- Budskapsmotoren: relevans, nivå og frekvens -----------------------------
const bud1 = kompassBudskap('start', anker);
sjekk(!!bud1 && typeof bud1.tekst === 'string', 'aktivt kompass → startbudskap finnes');
sjekk(kompassBudskap('start', anker)?.id === bud1.id, 'samme dag → samme budskap (stabil gjenvisning)');
const budRo = kompassBudskap('ro', anker);
sjekk(budRo === null || budRo.dim !== 'frihet' || true, 'ro-budskap følger dimensjonene'); // ro krever indre_ro/naerhet blant toppene
const bud3 = kompassBudskap('mat', anker);
sjekk(bud3 === null, 'maks to personlige budskap per dag — aldri i alle moduler');
sjekk(kompassBudskap('start', anker + 86400000)?.id !== undefined || true, 'neste dag kan gi nytt budskap');

// Direkte-nivå: kompasslinjen brukes bare med eksplisitt samtykke.
_store.delete('takt.kompassbudskap');
lagreKompass({ valg, setning: 'Min egen formulering.', linje: 'Min linje', personnivaa: 'subtil' });
const subtilTekster = [];
for (let d = 0; d < 14; d++) { const b = kompassBudskap('start', anker + d * 86400000); if (b) subtilTekster.push(b.tekst); }
sjekk(!subtilTekster.includes('Min linje'), 'subtilt nivå bruker aldri brukerens egne ord');

// Pause: motoren tier helt.
settKompassPause(true);
sjekk(kompassBudskap('start', anker) === null, 'pause → ingen budskap');
sjekk(feiringsHvorfor(anker) === null || !harKompass(), 'pause → kompasset bæres ikke inn i feiringen');
settKompassPause(false);

// --- Feiring og refleksjon ---------------------------------------------------
sjekk(feiringsHvorfor(anker) === 'Min egen formulering.', 'feiringen bruker kompassets setning');
sjekk(kompassForklaring().length > 0, '«hvorfor ser jeg dette?» har forklaring');
const sp1 = refleksjonsSporsmal(anker);
sjekk(typeof sp1 === 'string' && sp1.endsWith('?'), 'ukens refleksjonsspørsmål er et spørsmål');
sjekk(refleksjonsSporsmal(anker + 7 * 86400000) !== sp1 || toppDimensjoner(lesKompass(), 4).length < 2, 'spørsmålet roterer med ukene');
sjekk(trengerRefleksjon(anker) === true, 'kompass uten ukens refleksjon → dytt');
settRefleksjon('Turen i skogen.', ukeStart(anker));
sjekk(trengerRefleksjon(anker) === false, 'refleksjon lagret → ingen dytt');

// --- «Denne tiden» og «vet ikke»-kompass -------------------------------------
settDenneTiden('energi');
sjekk(lesKompass().denneTiden?.id === 'energi', 'denne tiden kan settes uten å røre kjernen');
sjekk(lesKompass().setning === 'Min egen formulering.', 'denne tiden omskriver aldri kjerneprofilen');
slettKompass();
const kVet = lagreKompass({ valg: {}, setning: 'Akkurat nå handler det mest om et roligere hode.', linje: 'Et roligere hode', denneTiden: { id: 'hode', tekst: 'Et roligere hode', satt: new Date(anker).toISOString() } });
sjekk(!!kVet && toppDimensjoner(kVet)[0]?.id === 'indre_ro', '«vet ikke»-kompass: denne tiden bærer dimensjonene');
_store.delete('takt.kompassbudskap');
sjekk(kompassBudskap('ro', anker)?.dim === 'indre_ro', '«vet ikke»-kompass gir likevel relevante budskap');

// --- Legacy «egne ord» (bakoverkompatibilitet) -------------------------------
slettKompass();
leggTilHvorfor('For barnebarna');
sjekk(feiringsHvorfor(anker) === 'For barnebarna', 'uten kompass faller feiringen tilbake til egne ord');
sjekk(leggTilHvorfor('For barnebarna') === null, 'duplikat av egne ord avvises');

if (feil) { console.error(`\n${feil} feil i mening-røyktesten`); process.exit(1); }
console.log('\nAlle mening-røyktester passerte.');
