// Onboarding (taksonomi §15): < 2 min, 5 skjermer. Bygger motivasjonsprofil
// (vekter), basenivå per modalitet (ankertest — konkrete prestasjonsspørsmål,
// aldri selvvurdering), ukemål + varighet, og første lokasjon fra en utstyrsbunke.
// Skriver profilen til store og lar appen ta over. Kan tas på nytt fra innstillinger.
import { el, tom, chip } from './ui.js';
import { MODALITET_NAVN } from './library.js';
import { lagreProfil, lagreSistLokasjon } from './store.js';

// --- Skjerm 1: motivasjon ---------------------------------------------------
// Hvert valg gir modalitetsvekt + formatvekt + hvilket toppkort hjem viser.
const MOTIVASJON = [
  { id: 'stabil', navn: 'Stabil rutine', ikon: '🔁', mod: { alle: 1 }, format: { mikro: 2, kort: 1 }, toppkort: 'streak' },
  { id: 'mestre', navn: 'Mestre nye øvelser', ikon: '🤸', mod: { SKILL: 3, STY: 2 }, format: { gtg: 2, emom: 1, styrkehold: 1 }, toppkort: 'skilltre' },
  { id: 'sterkere', navn: 'Bli sterkere', ikon: '💪', mod: { STY: 3 }, format: { 'straight-sets': 2, supersett: 2, complex: 1 }, toppkort: 'pr' },
  { id: 'kondis', navn: 'Bedre kondis', ikon: '🫁', mod: { HIIT: 2, BASE: 2 }, format: { intervall: 2, '4x4': 1 }, toppkort: 'volum' },
  { id: 'ro', navn: 'Ro / mindre stress', ikon: '🧘', mod: { REST: 3, YOGA: 2, STR: 1 }, format: { yin: 2, 'hold-flyt': 1, koherent: 1 }, toppkort: 'kveld' },
  { id: 'fysikk', navn: 'Fysikk / se resultater', ikon: '🏋️', mod: { STY: 3, HIIT: 2 }, format: { supersett: 2, 'myo-reps': 1, 'density-block': 1 }, toppkort: 'volum' },
  { id: 'variasjon', navn: 'Variasjon / lek', ikon: '🎲', mod: { alle: 1 }, format: {}, toppkort: 'overrask' },
];

// --- Skjerm 2: ankertest ----------------------------------------------------
// Konkrete prestasjonsspørsmål → base (1-4). Selvrapport = uverifisert til bevis.
const ANKER = [
  {
    id: 'push', sp: 'Hvor mange push-ups klarer du på ett sett?',
    svar: [['0–4', 1], ['5–14', 2], ['15–24', 3], ['25+', 4]],
  },
  {
    id: 'pull', sp: 'Pull-ups / hang?',
    svar: [['Henger < 20 s', 1], ['Ringrows går fint', 2], ['1–7 pull-ups', 3], ['8+ pull-ups', 4]],
  },
  {
    id: 'bein', sp: 'Dyp knebøy med hælene i gulvet?',
    svar: [['Nei', 1], ['Ja, dyp knebøy', 2], ['+ bulgarsk 10/side', 3], ['+ box pistol', 4]],
  },
  {
    id: 'core', sp: 'Kjerne?',
    svar: [['Planke < 30 s', 1], ['Planke 60 s', 2], ['Hollow hold 20 s', 3], ['Beinløft i heng', 4]],
  },
  {
    id: 'kondis', sp: 'Kondisjon?',
    svar: [['Går tur', 1], ['Jogger litt', 2], ['20 min rolig løp uten stopp', 3], ['4×4-intervaller er kjent', 4]],
  },
  {
    id: 'fleks', sp: 'Bevegelighet?',
    svar: [['Langt fra tærne', 1], ['Fingre i gulvet, strake bein', 2], ['+ litt yogaerfaring', 3], ['Erfaren / mobil', 4]],
  },
];

// Bygger nivaer{} per modalitet fra ankersvarene.
function ankerTilNivaer(svar) {
  const g = (id) => svar[id] || 2;
  const sty = Math.round((g('push') + g('pull') + g('bein')) / 3);
  const kondis = g('kondis');
  const fleks = g('fleks');
  const kart = {
    STY: sty,
    CORE: g('core'),
    HIIT: kondis,
    BASE: kondis,
    MET: Math.round((sty + kondis) / 2),
    STR: fleks,
    YOGA: Math.max(1, fleks),
    MOB: Math.max(2, fleks),
    PIL: 2,
    PLYO: Math.max(1, Math.min(3, g('bein'))),
    SKILL: 1, // nivå 5-skills krever alltid gateway; start lavt
    REST: 1,
    HYB: Math.round((sty + kondis) / 2),
  };
  const nivaer = {};
  for (const [m, base] of Object.entries(kart)) {
    nivaer[m] = { base: Math.max(1, Math.min(4, base)), xp: 0, verifisert: false };
  }
  return nivaer;
}

// --- Skjerm 5: anbefalt ukemiks fra topp-motivasjon (taksonomi §8) ----------
const UKEMIKS = {
  sterkere: 'Styrke/skills', fysikk: 'Styrke/skills', mestre: 'Styrke/skills',
  kondis: 'Fettap + form', stabil: 'Allsidig helse', variasjon: 'Allsidig helse',
  ro: 'Restitusjonsuke',
};

function motivasjonTilVekter(valgt) {
  // valgt = liste av motivasjon-id-er i rangert rekkefølge (#1 viktigst) → vekt 3/2/1.
  const vekter = {};
  const formatVekter = {};
  const rangvekt = [3, 2, 1];
  valgt.forEach((id, i) => {
    const m = MOTIVASJON.find((x) => x.id === id);
    if (!m) return;
    const rv = rangvekt[i] || 1;
    for (const [mod, v] of Object.entries(m.mod)) {
      if (mod === 'alle') {
        for (const k of Object.keys(MODALITET_NAVN)) vekter[k] = (vekter[k] || 0) + v * rv;
      } else {
        vekter[mod] = (vekter[mod] || 0) + v * rv;
      }
    }
    for (const [fmt, v] of Object.entries(m.format)) formatVekter[fmt] = (formatVekter[fmt] || 0) + v * rv;
  });
  return { vekter, formatVekter };
}

// ---------------------------------------------------------------------------
/**
 * Kjører onboarding inn i et container-element.
 * @param bib biblioteket (for bunkeliste)
 * @param ferdig callback(profil) når brukeren fullfører
 */
export function kjorOnboarding(container, bib, ferdig) {
  const state = {
    steg: 1,
    motivasjon: [], // rangert liste av id
    anker: {},
    ukemaal: 4,
    varighetsklasse: 'standard',
    bundleId: 'hjemme-gym',
    varierer: new Set(),
  };

  function ramme(tittel, undertekst, ...innhold) {
    tom(container);
    const prikker = el('div', { class: 'ob-prikker' },
      ...[1, 2, 3, 4, 5].map((n) => el('i', { class: 'ob-prikk' + (n <= state.steg ? ' ob-prikk--på' : '') })),
    );
    container.append(el('div', { class: 'ob' },
      el('header', { class: 'ob__topp' },
        prikker,
        el('h1', { class: 'ob__tittel' }, tittel),
        undertekst && el('p', { class: 'ob__under' }, undertekst),
      ),
      el('div', { class: 'ob__kropp' }, ...innhold),
    ));
  }

  function bunn(tekst, kanGaVidere, videre, tilbake) {
    return el('div', { class: 'ob__bunn' },
      state.steg > 1 && el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: tilbake }, 'Tilbake'),
      el('button', {
        class: 'knapp' + (kanGaVidere ? '' : ' knapp--av'),
        type: 'button',
        disabled: !kanGaVidere,
        onclick: kanGaVidere ? videre : undefined,
      }, tekst),
    );
  }

  // --- Skjerm 1 ---
  function skjerm1() {
    ramme('Hva motiverer deg?', 'Velg inntil 3 — trykk i rekkefølge, viktigst først.',
      el('div', { class: 'ob-valg' },
        ...MOTIVASJON.map((m) => {
          const rang = state.motivasjon.indexOf(m.id);
          const valgt = rang >= 0;
          return el('button', {
            class: 'ob-kort' + (valgt ? ' ob-kort--valgt' : ''),
            type: 'button',
            onclick: () => {
              if (valgt) state.motivasjon.splice(rang, 1);
              else if (state.motivasjon.length < 3) state.motivasjon.push(m.id);
              skjerm1();
            },
          },
            el('span', { class: 'ob-kort__ikon' }, m.ikon),
            el('span', { class: 'ob-kort__navn' }, m.navn),
            valgt && el('span', { class: 'ob-kort__rang' }, String(rang + 1)),
          );
        }),
      ),
      bunn('Neste', state.motivasjon.length > 0, () => { state.steg = 2; skjerm2(); }),
    );
  }

  // --- Skjerm 2 ---
  function skjerm2() {
    ramme('Ankertest', 'Konkrete tall — ikke selvvurdering. Setter startnivået ditt.',
      el('div', { class: 'ob-anker' },
        ...ANKER.map((q) => el('div', { class: 'ob-sp' },
          el('p', { class: 'ob-sp__tekst' }, q.sp),
          el('div', { class: 'chiprad' },
            ...q.svar.map(([tekst, verdi]) => chip(tekst, {
              aktiv: state.anker[q.id] === verdi,
              onClick: () => { state.anker[q.id] = verdi; skjerm2(); },
            })),
          ),
        )),
      ),
      bunn('Neste', Object.keys(state.anker).length === ANKER.length, () => { state.steg = 3; skjerm3(); }, () => { state.steg = 1; skjerm1(); }),
    );
  }

  // --- Skjerm 3 ---
  function skjerm3() {
    const varigheter = [['Mikro', 'mikro', '5–10 min'], ['Kort', 'kort', '15–20 min'], ['Standard', 'standard', '30–40 min'], ['Lang', 'lang', '45–60 min']];
    ramme('Ukemål & tid', 'Ukemålet definerer streaken din. Hviledager knekker den aldri.',
      el('div', { class: 'kort' },
        el('h2', {}, 'Økter per uke'),
        el('div', { class: 'chiprad' },
          ...[2, 3, 4, 5, 6].map((n) => chip(String(n), {
            aktiv: state.ukemaal === n, onClick: () => { state.ukemaal = n; skjerm3(); },
          })),
        ),
      ),
      el('div', { class: 'kort' },
        el('h2', {}, 'Vanlig øktlengde'),
        el('div', { class: 'ob-varig' },
          ...varigheter.map(([navn, id, und]) => el('button', {
            class: 'ob-varig__kort' + (state.varighetsklasse === id ? ' ob-varig__kort--valgt' : ''),
            type: 'button', onclick: () => { state.varighetsklasse = id; skjerm3(); },
          }, el('span', { class: 'ob-varig__navn' }, navn), el('span', { class: 'dempet' }, und))),
        ),
      ),
      bunn('Neste', true, () => { state.steg = 4; skjerm4(); }, () => { state.steg = 2; skjerm2(); }),
    );
  }

  // --- Skjerm 4 ---
  function skjerm4() {
    const bunke = bib.bundles.find((b) => b.id === state.bundleId) || bib.bundles[0];
    if (!bib.bundles.some((b) => b.id === state.bundleId)) state.bundleId = bunke.id;
    const utstyrNavn = (id) => bib.utstyrMap.get(id)?.navn || id;

    ramme('Hvor trener du mest?', 'Velg et utgangspunkt — du kan legge til flere steder senere.',
      el('div', { class: 'chiprad' },
        ...bib.bundles.map((b) => chip(b.navn, {
          aktiv: state.bundleId === b.id,
          onClick: () => { state.bundleId = b.id; state.varierer = new Set(); skjerm4(); },
        })),
      ),
      el('div', { class: 'kort' },
        el('h2', {}, 'Fast utstyr her'),
        el('p', { class: 'dempet' }, bunke.inkluderer.map(utstyrNavn).join(' · ')),
      ),
      (bunke.varierer || []).length > 0 && el('div', { class: 'kort' },
        el('h2', {}, 'Har stedet også dette?'),
        el('div', { class: 'ob-varier' },
          ...bunke.varierer.map((id) => {
            const på = state.varierer.has(id);
            return el('button', {
              class: 'ob-tggl' + (på ? ' ob-tggl--på' : ''), type: 'button',
              onclick: () => { på ? state.varierer.delete(id) : state.varierer.add(id); skjerm4(); },
            }, (på ? '✓ ' : '+ ') + utstyrNavn(id));
          }),
        ),
      ),
      bunn('Neste', true, () => { state.steg = 5; skjerm5(); }, () => { state.steg = 3; skjerm3(); }),
    );
  }

  // --- Skjerm 5: oppsummering ---
  function skjerm5() {
    const profil = byggProfil();
    const nivåkort = Object.entries(profil.nivaer)
      .filter(([m]) => ['STY', 'HIIT', 'CORE', 'STR', 'YOGA'].includes(m))
      .map(([m, n]) => el('div', { class: 'nivkort' },
        el('span', { class: 'nivkort__navn' }, MODALITET_NAVN[m] || m),
        el('span', { class: 'niva' }, ...[1, 2, 3, 4, 5].map((k) => el('i', { class: 'niva__p' + (k <= n.base ? ' niva__p--på' : '') }))),
      ));

    ramme('Din startprofil', 'Alt kan justeres senere i innstillinger.',
      el('div', { class: 'kort' },
        el('h2', {}, 'Nivå per treningsform'),
        el('div', { class: 'nivliste' }, ...nivåkort),
        el('p', { class: 'dempet' }, 'Uverifisert til første loggede bevis eller bestått gateway.'),
      ),
      el('div', { class: 'kort' },
        el('h2', {}, 'Anbefalt uke'),
        el('p', {}, `${profil.ukemiks} · ${profil.ukemaal} økter/uke · ${state.varighetsklasse}-lengde`),
      ),
      bunn('Fullfør', true, () => {
        lagreProfil(profil);
        lagreSistLokasjon(profil.aktivLokasjon);
        ferdig(profil);
      }, () => { state.steg = 4; skjerm4(); }),
    );
  }

  function byggProfil() {
    const { vekter, formatVekter } = motivasjonTilVekter(state.motivasjon);
    const bunke = bib.bundles.find((b) => b.id === state.bundleId) || bib.bundles[0];
    const topp = state.motivasjon[0];
    return {
      opprettet: new Date().toISOString(),
      motivasjon: {
        valg: state.motivasjon.slice(),
        vekter,
        formatVekter,
        toppkort: MOTIVASJON.find((m) => m.id === topp)?.toppkort || 'streak',
      },
      nivaer: ankerTilNivaer(state.anker),
      ukemaal: state.ukemaal,
      varighetsklasse: state.varighetsklasse,
      ukemiks: UKEMIKS[topp] || 'Allsidig helse',
      lokasjoner: [{
        navn: 'Hjemme',
        bundleId: bunke.id,
        varierer: [...state.varierer],
      }],
      aktivLokasjon: 'Hjemme',
      innstillinger: { brukJern: true, nivaOverstyr: {} },
    };
  }

  skjerm1();
}
