// Headless røyktest av Fellesskap-relasjonslaget (js/fellesskap.js): kretsen
// (legg til / oppdater / slett), «sist kontakt»-varme, sortering etter hvem det
// har gått lengst med, og at registrerKontakt både setter sistKontakt og
// tenner fellesskaps-gnisten (sosialloggen). localStorage stubbes.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const {
  lesKrets, leggTilPerson, oppdaterPerson, slettPerson, hentPerson,
  registrerKontakt, sorterKrets, dagerSiden, varmeTekst,
} = await import('../js/fellesskap.js');
const { lesSosiallogg, sosialStreak } = await import('../js/sosialt.js');

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };
const DAG = 86400000;
const iso = (d) => new Date(Date.now() - d * DAG).toISOString();

// --- Tom start ---
sjekk(lesKrets().length === 0, 'tom krets ved start');

// --- Legg til ---
const mor = leggTilPerson({ navn: 'Mor', emoji: '👩‍🦳', relasjon: 'Familie', metode: 'ring', telefon: '99 88 77 66' });
const nabo = leggTilPerson({ navn: 'Nabo', relasjon: 'Nabo', metode: 'melding' });
sjekk(!!mor && mor.navn === 'Mor' && mor.telefon === '99887766', 'legg til person + telefon trimmes');
sjekk(lesKrets().length === 2, 'to i kretsen');
sjekk(leggTilPerson({ navn: '   ' }) === null, 'tomt navn avvises');

// --- Oppdater / hent ---
oppdaterPerson(mor.id, { notat: 'Ring på søndager' });
sjekk(hentPerson(mor.id).notat === 'Ring på søndager', 'oppdaterPerson lagrer felt');

// --- dagerSiden / varme før kontakt ---
sjekk(dagerSiden(mor) === null, 'aldri kontaktet → dagerSiden null');
sjekk(varmeTekst(mor) === 'Ta kontakt for første gang.', 'varmetekst for aldri-kontaktet');

// --- Sortering: aldri-kontaktede først, ellers kaldeste først ---
oppdaterPerson(nabo.id, { sistKontakt: iso(3) }); // nabo kontaktet for 3 dager siden
// mor er aldri kontaktet → skal ligge først
sjekk(sorterKrets()[0].id === mor.id, 'aldri-kontaktet sorteres først');
oppdaterPerson(mor.id, { sistKontakt: iso(10) }); // mor 10 dager siden, nabo 3 → mor «kaldest»
sjekk(sorterKrets()[0].id === mor.id, 'kaldeste (10 d) foran varmere (3 d)');
sjekk(dagerSiden(hentPerson(nabo.id)) === 3, 'dagerSiden regner riktig');
sjekk(varmeTekst(hentPerson(nabo.id)) === '3 dager siden sist.', 'varmetekst dager siden');

// --- registrerKontakt: setter sistKontakt i dag + tenner gnisten ---
sjekk(sosialStreak() === 0, 'ingen sosial-streak før kontakt');
const res = registrerKontakt(mor.id);
sjekk(dagerSiden(hentPerson(mor.id)) === 0, 'registrerKontakt setter sist kontakt til i dag');
sjekk(varmeTekst(hentPerson(mor.id)) === 'Dere snakket i dag.', 'varmetekst «i dag» etter kontakt');
sjekk(res.streak === 1 && sosialStreak() === 1, 'registrerKontakt tenner fellesskaps-gnisten (streak 1)');
sjekk(lesSosiallogg().some((o) => o.vaner && o.vaner.motte), 'kontakt logges som sosial vane (motte)');

// --- Slett ---
slettPerson(nabo.id);
sjekk(lesKrets().length === 1 && !hentPerson(nabo.id), 'slettPerson fjerner personen');

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('\n✓ Alt grønt — Fellesskap-kretsen (legg til, varme, sortering, kontakt-logging).');
