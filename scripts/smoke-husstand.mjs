// Headless røyktest av den delte husstands-handlelista (js/husstand.js): den
// rene item-nivå-flettingen (last-write-wins per vare) + lokale mutasjoner og
// gruppering. Nettverk (opprett/bli med/synk) testes ikke her — det krever en
// innlogget Supabase-bruker; RLS/RPC er verifisert mot databasen separat.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => '' });
// navigator.onLine leses bare bak erIHusstand()-guarden (false her), så vi
// trenger ingen navigator-shim — og den er skrivebeskyttet i Node.

const h = await import('../js/husstand.js');

let feil = 0;
const sjekk = (ok, t) => { if (!ok) { console.error('✗', t); feil++; } else console.log('✓', t); };

// --- Item-nivå fletting (last-write-wins per vare) ---
const A = {
  personer: 3, personerOppdatert: '2026-07-17T10:00:00Z',
  varer: {
    'grønnsaker::gulrøtter': { navn: 'Gulrøtter', mengde: 4, enhet: 'stk', kategori: 'grønnsaker', avkrysset: true, oppdatert: '2026-07-17T12:00:00Z' },
    'annet::kaffe': { navn: 'Kaffe', mengde: null, enhet: '', kategori: 'annet', avkrysset: false, oppdatert: '2026-07-17T09:00:00Z' },
  },
};
const B = {
  personer: 2, personerOppdatert: '2026-07-17T08:00:00Z',
  varer: {
    'grønnsaker::gulrøtter': { navn: 'Gulrøtter', mengde: 4, enhet: 'stk', kategori: 'grønnsaker', avkrysset: false, oppdatert: '2026-07-17T11:00:00Z' },
    'kjøl::melk': { navn: 'Melk', mengde: 1, enhet: 'l', kategori: 'kjøl', avkrysset: false, oppdatert: '2026-07-17T07:00:00Z' },
  },
};
const m = h.flettData(A, B);
sjekk(m.varer['grønnsaker::gulrøtter'].avkrysset === true, 'nyere avkryssing vinner (A kl.12 > B kl.11)');
sjekk(!!m.varer['annet::kaffe'] && !!m.varer['kjøl::melk'], 'union av varer fra begge sider');
sjekk(m.personer === 3 && m.personerOppdatert === A.personerOppdatert, 'personer: nyeste personerOppdatert vinner');

// Gravstein (slettet) med nyere stempel skal vinne over en eldre aktiv vare.
const C = { varer: { 'annet::kaffe': { navn: 'Kaffe', kategori: 'annet', slettet: true, oppdatert: '2026-07-17T13:00:00Z' } } };
const m2 = h.flettData(A, C);
sjekk(m2.varer['annet::kaffe'].slettet === true, 'nyere gravstein vinner over eldre aktiv vare');

// --- Lokale mutasjoner + gruppering ---
localStorage.clear();
sjekk(h.settVare({ navn: 'Brokkoli' }) === 'grønnsaker::brokkoli', 'settVare gjetter kategori (brokkoli→grønnsaker)');
h.settVare({ navn: 'Kyllingfilet' });
h.settVare({ navn: 'Havregryn' });
let g = h.byggGrupper();
sjekk(g.totalVarer === 3, 'tre varer i lista');
sjekk(g.grupper.some((x) => x.id === 'kjøl' && x.varer.some((v) => v.navn === 'Kyllingfilet')), 'kylling havner i Kjøl');

const key = h.settVare({ navn: 'Bananer' });
sjekk(h.veksleAvkrysset(key) === true, 'veksleAvkrysset huker av');
sjekk(h.byggGrupper().grupper.flatMap((x) => x.varer).find((v) => v.key === key).avkrysset, 'avkryssing reflekteres i gruppene');
h.fjernVare(key);
sjekk(!h.byggGrupper().grupper.flatMap((x) => x.varer).some((v) => v.key === key), 'fjernVare (gravstein) skjuler vara');

// Import beholder eksisterende, legger til nye.
const lagt = h.importerVarer([{ navn: 'Brokkoli', mengde: 1, enhet: 'stk', kategori: 'grønnsaker' }, { navn: 'Linser', mengde: 2, enhet: 'boks', kategori: 'belgvekster' }]);
sjekk(lagt === 1, 'importerVarer legger bare til nye (Brokkoli fantes)');

sjekk(!h.erIHusstand(), 'erIHusstand er false uten abonnement');
sjekk(h.handlelisteTekst().startsWith('Handleliste'), 'delbar tekst');

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('\n✓ Alt grønt — delt husstandsliste (fletting + mutasjoner + gruppering).');
