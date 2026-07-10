// Bevegelseslaget (M11 — Mova-spesifikasjonen §5–9): all bevegelse teller.
// Definerer de tolv bevegelsestypene, XP-formelen fra spesifikasjonen
// (minutter × bevegelsesfaktor × intensitetsfaktor, minst 5 XP), Momentum
// (rytme over rullerende 7 dager — aldri en streak som «ryker») og Dagens
// gnist (ett lavterskel-forslag per dag). Ingen DOM her — rene data og
// funksjoner over profil + logg, så alt kan gjenbrukes fra alle skjermer.

// --- De tolv bevegelsestypene ----------------------------------------------
// «slag» styrer hvordan bevegelsen startes fra Beveg-skjermen:
//   generator → strukturert økt via den eksisterende generatoren (modalitet)
//   fri       → hurtigstart med timer (gå/løp/sykle/fri bevegelse)
//   logg      → logges manuelt (sport, annet)
export const BEVEGELSER = {
  walk: { navn: 'Gåtur', ikon: 'loper', faktor: 1.0, slag: 'fri' },
  run: { navn: 'Løping', ikon: 'lyn', faktor: 1.4, slag: 'fri' },
  bike: { navn: 'Sykkel', ikon: 'sykkel', faktor: 1.2, slag: 'fri' },
  strength: { navn: 'Styrke', ikon: 'vekt', faktor: 1.3, slag: 'generator', modalitet: 'STY' },
  bodyweight: { navn: 'Kroppsvekt', ikon: 'person', faktor: 1.2, slag: 'generator', modalitet: 'CORE' },
  yoga: { navn: 'Yoga', ikon: 'yoga', faktor: 1.0, slag: 'generator', modalitet: 'YOGA' },
  stretch: { navn: 'Tøying', ikon: 'blad', faktor: 0.9, slag: 'generator', modalitet: 'STR' },
  mobility: { navn: 'Mobilitet', ikon: 'repeat', faktor: 0.9, slag: 'generator', modalitet: 'MOB' },
  hiit: { navn: 'HIIT', ikon: 'flamme', faktor: 1.4, slag: 'generator', modalitet: 'HIIT' },
  sport: { navn: 'Sport og lek', ikon: 'ball', faktor: 1.4, slag: 'logg' },
  recovery: { navn: 'Restitusjon', ikon: 'hjerte', faktor: 0.8, slag: 'generator', modalitet: 'REST' },
  custom: { navn: 'Annen bevegelse', ikon: 'stjerne', faktor: 1.0, slag: 'logg' },
};

export const BEVEGELSE_NAVN = Object.fromEntries(
  Object.entries(BEVEGELSER).map(([id, b]) => [id, b.navn]),
);

// Generator-modalitet → bevegelsestype (for XP og tellere på gamle loggførte økter).
export const MODALITET_TIL_BEVEGELSE = {
  STY: 'strength', HIIT: 'hiit', BASE: 'walk', MET: 'hiit', SKILL: 'bodyweight',
  PLYO: 'hiit', YOGA: 'yoga', PIL: 'yoga', STR: 'stretch', MOB: 'mobility',
  CORE: 'bodyweight', REST: 'recovery', HYB: 'strength',
};

// Bevegelsestype ↔ øktbibliotek-kategori (M13). Sport/annet har ingen
// bibliotekkategori — de logges manuelt.
export const BEVEGELSE_TIL_KATEGORI = {
  walk: 'gatur', run: 'lop', bike: 'sykkel', strength: 'styrke',
  bodyweight: 'kroppsvekt', yoga: 'yoga', stretch: 'toying',
  mobility: 'mobilitet', hiit: 'hiit', recovery: 'restitusjon',
};
export const KATEGORI_TIL_BEVEGELSE = Object.fromEntries(
  Object.entries(BEVEGELSE_TIL_KATEGORI).map(([b, k]) => [k, b]),
);

// Sporter for manuell logging — bare navn, ingen øvelsesdetaljer (§5.11).
export const SPORTER = [
  'Fotball', 'Tennis / padel', 'Svømming', 'Ski', 'Basketball', 'Klatring',
  'Dans', 'Skøyter', 'Kampsport', 'Golf', 'Volleyball', 'Annen sport',
];

// --- XP (§8): minutter × bevegelsesfaktor × intensitetsfaktor --------------
// Intensitetsspennet er bevisst smalt (0,8–1,25) så rolig bevegelse aldri
// føles verdiløs. Minste XP for enhver bevegelse: 5.
export const INTENSITETS_FAKTOR = { 1: 0.8, 2: 0.9, 3: 1.0, 4: 1.15, 5: 1.25 };

export function beregnXp(minutter, bevegelse, intensitet = 3) {
  const bf = BEVEGELSER[bevegelse]?.faktor ?? 1.0;
  const inf = INTENSITETS_FAKTOR[intensitet] ?? 1.0;
  return Math.max(5, Math.round((minutter || 0) * bf * inf));
}

// --- Aktivitet per dag (grunnlag for Momentum og rytme-prikker) ------------
const DAG = 86400000;

function dagsStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Minutter per dag de siste `dager` dagene (eldste først, siste = i dag). */
export function dagerMedAktivitet(logg, nå = Date.now(), dager = 7) {
  const idag = dagsStart(nå);
  const min = new Array(dager).fill(0);
  for (const o of logg) {
    const i = dager - 1 - Math.round((idag - dagsStart(Date.parse(o.dato))) / DAG);
    if (i >= 0 && i < dager) min[i] += o.varighetMin || 0;
  }
  return min;
}

/**
 * Momentum (§9) — rytme, ikke straff. Avledet av loggen ved lesetid.
 * Tilstander: ny (aldri beveget), klar (pause — «Ready when you are»),
 * bygger, sterk. Aldri «streak lost», aldri «failed».
 */
export function bevegelsesMomentum(logg, nå = Date.now()) {
  if (!logg.length) {
    return {
      tilstand: 'ny', aktiveDager: 0, minutter: 0, dagerSiden: null,
      tekst: 'Klar når du er.', undertekst: 'Én liten bevegelse er nok til å starte.',
    };
  }
  const dager7 = dagerMedAktivitet(logg, nå, 7);
  const aktiveDager = dager7.filter((m) => m > 0).length;
  const minutter = dager7.reduce((s, m) => s + m, 0);
  const siste = Math.max(...logg.map((o) => Date.parse(o.dato) || 0));
  const dagerSiden = Math.max(0, Math.round((dagsStart(nå) - dagsStart(siste)) / DAG));

  if (dagerSiden >= 5) {
    return {
      tilstand: 'klar', aktiveDager, minutter, dagerSiden,
      tekst: 'Velkommen tilbake.', undertekst: 'Én liten bevegelse er nok. Klar når du er.',
    };
  }
  if (aktiveDager >= 4) {
    return {
      tilstand: 'sterk', aktiveDager, minutter, dagerSiden,
      tekst: 'Du har god rytme.', undertekst: `${aktiveDager} aktive dager den siste uka. Det teller.`,
    };
  }
  if (aktiveDager >= 2) {
    return {
      tilstand: 'bygger', aktiveDager, minutter, dagerSiden,
      tekst: 'Du bygger momentum.', undertekst: 'Små steg i dag. Sterkere rytme i morgen.',
    };
  }
  return {
    tilstand: 'i-gang', aktiveDager, minutter, dagerSiden,
    tekst: 'Du er i gang.', undertekst: 'Hver bevegelse teller — også de små.',
  };
}

/** Comeback = fem+ dager siden sist. Gir dobbel XP og comeback-belønning. */
export function erComeback(logg, nå = Date.now()) {
  return bevegelsesMomentum(logg, nå).tilstand === 'klar';
}

// --- Dagens gnist (§5.1): ett enkelt forslag som senker dørstokkmila -------
// Deterministisk per dato (samme forslag hele dagen), varmt og lavterskel.
const GNISTER = {
  walk: [
    { tittel: '20 minutter gåtur ute', undertekst: 'Rolig tempo. Ingen press.', minutter: 20, intensitet: 2 },
    { tittel: '10-minutters nullstillingstur', undertekst: 'Ingen tempokrav. Bare kom deg ut.', minutter: 10, intensitet: 2 },
    { tittel: 'Rask halvtime til fots', undertekst: 'Litt opp i puls — i ditt tempo.', minutter: 30, intensitet: 3 },
  ],
  run: [
    { tittel: 'Rolig løpetur', undertekst: 'Snakketempo. Gå når du vil.', minutter: 20, intensitet: 3 },
    { tittel: 'Løp/gå-intervaller', undertekst: '1 minutt jogg, 1 minutt gange.', minutter: 20, intensitet: 3 },
  ],
  bike: [
    { tittel: 'Sykkeltur i rolig tempo', undertekst: 'Ute eller inne — begge teller.', minutter: 25, intensitet: 2 },
  ],
  strength: [
    { tittel: '20 minutter styrke', undertekst: 'Kort og enkelt — generatoren setter opp.', minutter: 20, intensitet: 3 },
    { tittel: 'Mikrostyrke hjemme', undertekst: 'Under 10 minutter. Det teller.', minutter: 8, intensitet: 3, varighetsklasse: 'mikro' },
  ],
  bodyweight: [
    { tittel: '10 minutter kroppsvekt', undertekst: 'Ingen utstyr. Ingen terskel.', minutter: 10, intensitet: 3, varighetsklasse: 'mikro' },
  ],
  yoga: [
    { tittel: 'Rolig yogaflyt', undertekst: 'Pust og bevegelse. Det holder.', minutter: 15, intensitet: 2 },
  ],
  stretch: [
    { tittel: '8 minutter tøying', undertekst: 'Hofter og rygg takker deg.', minutter: 8, intensitet: 1, varighetsklasse: 'mikro' },
  ],
  mobility: [
    { tittel: 'Litt mobilitet', undertekst: 'Myke ledd, lav terskel.', minutter: 10, intensitet: 2, varighetsklasse: 'mikro' },
  ],
  hiit: [
    { tittel: 'Kort intervalløkt', undertekst: 'Har du overskudd? Ta i litt.', minutter: 18, intensitet: 4, varighetsklasse: 'kort' },
  ],
  recovery: [
    { tittel: 'Rolig restitusjon', undertekst: 'Pust, tøy og land. Det teller.', minutter: 12, intensitet: 1, varighetsklasse: 'mikro' },
  ],
};

// Liten deterministisk hash for datostrenger.
function datoHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function varighetsklasseFor(minutter) {
  if (minutter <= 10) return 'mikro';
  if (minutter <= 22) return 'kort';
  if (minutter <= 42) return 'standard';
  return 'lang';
}

/** Startlenke for en bevegelse (øktbibliotek, hurtigstart eller manuell logg). */
function startHref(bevegelse, { maalMin } = {}) {
  const b = BEVEGELSER[bevegelse];
  if (!b) return '#/beveg';
  if (b.slag === 'generator') {
    return `#/okter?kat=${BEVEGELSE_TIL_KATEGORI[bevegelse] || 'styrke'}`;
  }
  if (b.slag === 'fri') {
    const m = maalMin ? `&maal=${maalMin}` : '';
    return `#/hurtig?b=${bevegelse}${m}`;
  }
  return `#/loggfor?b=${bevegelse}`;
}

/** Lenke til øktbibliotekets kategoriside for en bevegelse (fliser o.l.). */
export function okterHref(bevegelse) {
  const kat = BEVEGELSE_TIL_KATEGORI[bevegelse];
  return kat ? `#/okter?kat=${kat}` : `#/loggfor?b=${bevegelse}`;
}

/**
 * Dagens gnist: comeback → alltid en snill tur; ellers roterer forslaget
 * gjennom favorittbevegelsene (∪ gåtur) deterministisk per dato.
 */
export function dagensGnist(profil, logg, nå = Date.now()) {
  const iso = new Date(nå).toISOString().slice(0, 10);
  const mom = bevegelsesMomentum(logg, nå);

  if (mom.tilstand === 'ny' || mom.tilstand === 'klar') {
    const g = { bevegelse: 'walk', tittel: '10 minutter frisk luft', undertekst: 'Rolig tempo. Du kan snu når du vil.', minutter: 10, intensitet: 2 };
    return { ...g, comeback: mom.tilstand === 'klar', href: startHref('walk', { maalMin: 10 }), xp: beregnXp(10, 'walk', 2) };
  }

  const favoritter = (profil?.bevegelsesFavoritter || []).filter((b) => GNISTER[b]);
  const kandidater = [...new Set(['walk', ...favoritter])];
  const bevegelse = kandidater[datoHash(iso) % kandidater.length];
  const alternativer = GNISTER[bevegelse] || GNISTER.walk;
  const g = alternativer[datoHash(iso + bevegelse) % alternativer.length];

  const varighetsklasse = g.varighetsklasse || varighetsklasseFor(g.minutter);
  return {
    ...g,
    bevegelse,
    comeback: false,
    href: startHref(bevegelse, { varighetsklasse, intensitet: g.intensitet, maalMin: g.minutter }),
    xp: beregnXp(g.minutter, bevegelse, g.intensitet),
  };
}

/** Visningsnavn for en loggoppføring (ny bevegelses-logg eller gammel økt-logg). */
export function aktivitetNavn(o, modalitetNavn = {}) {
  if (o.tittel) return o.tittel;
  if (o.bevegelse) return BEVEGELSE_NAVN[o.bevegelse] || o.bevegelse;
  return modalitetNavn[o.modalitet] || o.modalitet || 'Bevegelse';
}

/** Bevegelsestype for en loggoppføring (gamle økter mappes fra modalitet). */
export function loggBevegelse(o) {
  return o.bevegelse || MODALITET_TIL_BEVEGELSE[o.modalitet] || 'custom';
}
