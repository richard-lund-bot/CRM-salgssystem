// Headless røyktest av Dagens brief (js/brief.js): første-åpning-gaten,
// deterministisk spørsmålsrotasjon (kompassbevisst) og sceneoppbyggingen.
// Deterministisk: fast ankerdato, ingen DOM (logikken er rene funksjoner).

// Stub localStorage før import (samme mønster som de andre smoke-testene).
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(k) ? _store.get(k) : null),
  setItem: (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear(),
};

const {
  skalViseBrief, merkBriefVist, briefVistIdag, dagensBriefSporsmal, byggBriefScener,
} = await import('../js/brief.js');
const { lagreKompass, slettKompass, toppDimensjoner } = await import('../js/mening.js');

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };

const anker = new Date(2026, 6, 16, 7, 30, 0).getTime(); // fast torsdag morgen lokal tid
const DAG = 86400000;

// --- Gaten: første åpning i dag ---------------------------------------------
sjekk(!skalViseBrief(anker), 'ingen profil → ingen brief (oppstartsgatene eier onboarding)');
localStorage.setItem('trening.profil', JSON.stringify({ navn: 'Kari', innstillinger: {} }));
sjekk(skalViseBrief(anker), 'med profil og uvist dag → briefen skal vises');
merkBriefVist(anker);
sjekk(briefVistIdag(anker), 'etter visning er dagen merket');
sjekk(!skalViseBrief(anker), 'samme dag → vises ikke igjen');
sjekk(skalViseBrief(anker + DAG), 'neste dag → vises på nytt');
localStorage.setItem('trening.profil', JSON.stringify({ navn: 'Kari', innstillinger: { brief: false } }));
sjekk(!skalViseBrief(anker + DAG), 'skrudd av i Innstillinger → aldri');
localStorage.setItem('trening.profil', JSON.stringify({ navn: 'Kari', innstillinger: {} }));

// --- Dagens spørsmål: deterministisk og kompassbevisst -----------------------
const s1 = dagensBriefSporsmal(anker + DAG);
sjekk(typeof s1 === 'string' && s1.endsWith('?'), 'uten kompass: nøytralt spørsmål');
sjekk(dagensBriefSporsmal(anker + DAG) === s1, 'samme dag → samme spørsmål (ro i UI-et)');
const uke = new Set(Array.from({ length: 8 }, (_, i) => dagensBriefSporsmal(anker + i * DAG)));
sjekk(uke.size >= 4, 'spørsmålet roterer over dagene');

const valg = { inngang: 'mennesker', personer: ['barna', 'partner'], folelser: ['energi', 'naervaer'] };
lagreKompass({ valg, setning: 'Jeg vil ha flere gode år med barna mine.', linje: 'For flere gode år sammen', personnivaa: 'subtil' });
const topper = new Set(toppDimensjoner(undefined, 4).map((d) => d.id));
sjekk(topper.size > 0, 'kompasset gir toppdimensjoner');
const s2 = dagensBriefSporsmal(anker + DAG);
sjekk(dagensBriefSporsmal(anker + DAG) === s2, 'med kompass: stabilt samme dag');
const tretti = new Set(Array.from({ length: 30 }, (_, i) => dagensBriefSporsmal(anker + i * DAG)));
sjekk(tretti.size >= 5, 'kompass-spørsmålene varierer over en måned');
sjekk([...tretti].every((s) => s.endsWith('?')), 'alle spørsmål er spørsmål');

// --- Scenene -----------------------------------------------------------------
const scener = byggBriefScener(anker + DAG);
const ider = scener.map((s) => s.id);
sjekk(ider.join() === 'hilsen,oversikt,kompass,sporsmal,refleksjon', 'med kompass: fem scener i riktig rekkefølge');
sjekk(scener[0].linjer.some((l) => l.tekst.includes('Kari')), 'hilsenen bruker navnet fra profilen');
sjekk(scener[0].linjer.some((l) => l.tekst.includes('God morgen')), 'morgenanker → morgenhilsen');
const kompassScene = scener.find((s) => s.id === 'kompass');
sjekk(kompassScene.linjer.some((l) => l.tekst.includes('Jeg vil ha flere gode år med barna mine.')), 'kompass-scenen siterer brukerens egen setning');
const spScene = scener.find((s) => s.id === 'sporsmal');
sjekk(spScene.linjer.some((l) => l.tekst === s2), 'spørsmål-scenen bærer dagens spørsmål');
sjekk(scener.every((s) => s.linjer.length >= 1 && s.linjer.length <= 4), 'få ord: aldri mer enn fire linjer per scene');

// Oversikten: åpen dag uten logg/plan, plan-linje når noe er planlagt.
const oversikt = scener.find((s) => s.id === 'oversikt');
sjekk(oversikt.linjer.some((l) => l.tekst.includes('Dagen er åpen')), 'tom logg og plan → åpen dag, aldri krav');
const dagIso = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
localStorage.setItem('trening.plan', JSON.stringify([{ id: 'p1', dato: dagIso(anker + DAG), status: 'planlagt' }]));
const medPlan = byggBriefScener(anker + DAG).find((s) => s.id === 'oversikt');
sjekk(medPlan.linjer.some((l) => l.tekst === 'Én økt står i planen i dag.'), 'én planlagt økt → rolig plan-linje');

// Streak-linjen: tre sammenhengende dager gir «3 dager på rad».
localStorage.setItem('trening.logg', JSON.stringify([
  { dato: dagIso(anker) }, { dato: dagIso(anker - DAG) }, { dato: dagIso(anker - 2 * DAG) },
]));
const medStreak = byggBriefScener(anker).find((s) => s.id === 'oversikt');
sjekk(medStreak.linjer.some((l) => l.tekst === '3 dager på rad i bevegelse.'), 'streak ≥ 2 nevnes som rolig faktum');

// Uten kompass (og uten egne ord) hoppes kompass-scenen stille over.
slettKompass();
const utenKompass = byggBriefScener(anker + DAG).map((s) => s.id);
sjekk(!utenKompass.includes('kompass'), 'uten kompass: scenen hoppes over');
sjekk(utenKompass.join() === 'hilsen,oversikt,sporsmal,refleksjon', 'fire scener uten kompass');

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('\nAlle brief-sjekker OK.');
