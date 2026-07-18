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
  DIMENSJONER, BUDSKAPSMALER, BUDSKAPSMODULER, isoDag,
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

// --- Budskapsmotoren: full dekning, relevans, nivå og ferskhet ---------------
// Bibliotekdekning: hver modul har varianter for ALLE ti dimensjonene, minst
// to per kombinasjon — slik at enhver motivasjonsprofil møter alle pilarene.
let hull = [];
for (const modul of BUDSKAPSMODULER) {
  for (const d of DIMENSJONER) {
    const n = BUDSKAPSMALER.filter((m) => m.modul === modul && m.dim === d.id && m.niva === 'subtil').length;
    if (n < 2) hull.push(`${modul}×${d.id}(${n})`);
  }
}
sjekk(hull.length === 0, 'alle moduler dekker alle 10 dimensjoner med ≥2 varianter', hull.join(', '));
sjekk(BUDSKAPSMALER.length >= 180, `stort bibliotek (${BUDSKAPSMALER.length} maler)`);

const bud1 = kompassBudskap('start', anker);
sjekk(!!bud1 && typeof bud1.tekst === 'string', 'aktivt kompass → startbudskap finnes');
sjekk(kompassBudskap('start', anker)?.id === bud1.id, 'samme dag → samme budskap (stabil gjenvisning)');
sjekk(BUDSKAPSMODULER.every((m) => kompassBudskap(m, anker) !== null),
  'alle pilarer får budskap samme dag (Bevegelse/Ro/Mat/Fellesskap m.fl.)');

// Ferskhet: samme modul over seks dager gir stor variasjon.
const seksDager = new Set();
for (let d = 0; d < 6; d++) { const b = kompassBudskap('bevegelse', anker + d * 86400000); if (b) seksDager.add(b.tekst); }
sjekk(seksDager.size >= 4, `bevegelse varierer over seks dager (${seksDager.size} ulike)`);

// Aldri tom side: selv når hele utvalget har vært vist, faller motoren
// tilbake til malen som har hvilt lengst.
let tomme = 0;
for (let d = 0; d < 30; d++) if (!kompassBudskap('ro', anker + d * 86400000)) tomme++;
sjekk(tomme === 0, 'ro gir budskap 30 dager på rad (fallback når alt er i hvile)');

// Gammel visningslogg (utdaterte mal-ID-er fra tidligere bibliotek) renses ved
// lesing og skal verken blokkere dagens budskap eller bli liggende.
_store.set('takt.kompassbudskap', JSON.stringify([{ mal: 'beveg-naerhet', modul: 'bevegelse', dato: isoDag(anker) }]));
const fersk = kompassBudskap('bevegelse', anker);
sjekk(!!fersk && fersk.id.startsWith('bevegelse-'), 'utdaterte logg-rader blokkerer ikke dagens budskap');
sjekk(!JSON.parse(_store.get('takt.kompassbudskap')).some((r) => r.mal === 'beveg-naerhet'),
  'utdaterte logg-rader ryddes bort ved neste skriving');
sjekk(kompassBudskap('bevegelse', anker)?.id === fersk.id, 'dagens valg står stabilt etter rydding');

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
sjekk(BUDSKAPSMODULER.every((m) => kompassBudskap(m, anker) !== null),
  '«vet ikke»-kompass dekker også alle pilarene');

// --- Legacy «egne ord» (bakoverkompatibilitet) -------------------------------
slettKompass();
leggTilHvorfor('For barnebarna');
sjekk(feiringsHvorfor(anker) === 'For barnebarna', 'uten kompass faller feiringen tilbake til egne ord');
sjekk(leggTilHvorfor('For barnebarna') === null, 'duplikat av egne ord avvises');

if (feil) { console.error(`\n${feil} feil i mening-røyktesten`); process.exit(1); }
console.log('\nAlle mening-røyktester passerte.');
