// Fellesskap (pilar 4) — relasjonslaget: «Din krets» (moai) + kontakt-logging.
// Kretsen er de få personene du vil holde varmt. Alt bor lokalt — personvern-
// først: ingen import av kontaktlista, ingen lesing av anrop/meldinger. Du
// skriver selv inn de få du bryr deg om. Å logge kontakt med en person setter
// «sist kontakt» og tenner fellesskaps-gnisten (via sosialloggen), så dagen
// teller som all annen sosial kontakt. Rene funksjoner over localStorage.
import { sikreVane, isoDag } from './sosialt.js';

const LS = 'trening.krets';
const DAG = 86400000;

// Emoji i stedet for bildeopplasting — enkelt, privat, offline.
export const KRETS_EMOJI = ['🧑', '👩', '👨', '👩‍🦳', '🧔', '👵', '👴', '🧑‍🦱', '👧', '🧒', '🐕', '🏡', '💬', '❤️'];
export const RELASJONER = ['Familie', 'Venn', 'Nabo', 'Kollega', 'Partner', 'Annet'];
export const METODER = [
  { id: 'ring', navn: 'Ring', ikon: 'telefon' },
  { id: 'melding', navn: 'Send melding', ikon: 'snakke' },
  { id: 'inviter', navn: 'Inviter', ikon: 'personer' },
];

// --- Lager ------------------------------------------------------------------
function les() { try { return JSON.parse(localStorage.getItem(LS) || '[]') || []; } catch { return []; } }
function skriv(a) { try { localStorage.setItem(LS, JSON.stringify(a)); } catch { /* lagring valgfri */ } }
export function lesKrets() { return les(); }
/** Skriver hele kretsen rått (brukes av synk etter fletting). */
export function settKretsRå(arr) { skriv(Array.isArray(arr) ? arr : []); }

function nyId() { return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }
function startAvDag(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

export function hentPerson(id) { return les().find((x) => x.id === id) || null; }

export function leggTilPerson({ navn, emoji, relasjon, metode, telefon } = {}) {
  const n = (navn || '').trim();
  if (!n) return null;
  const liste = les();
  const nå = new Date().toISOString();
  const p = {
    id: nyId(), navn: n.slice(0, 40), emoji: emoji || '🧑', relasjon: relasjon || null,
    metode: metode || 'melding', telefon: (telefon || '').replace(/\s+/g, '') || null,
    sistKontakt: null, notat: '', opprettet: nå, oppdatert: nå,
  };
  liste.push(p); skriv(liste); return p;
}

export function oppdaterPerson(id, patch) {
  const liste = les();
  const p = liste.find((x) => x.id === id);
  if (!p) return null;
  Object.assign(p, patch, { oppdatert: new Date().toISOString() });
  skriv(liste); return p;
}

export function slettPerson(id) { skriv(les().filter((x) => x.id !== id)); }

/** Dager siden sist kontakt (null hvis aldri kontaktet). */
export function dagerSiden(p, nå = Date.now()) {
  if (!p?.sistKontakt) return null;
  const t = Date.parse(p.sistKontakt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((startAvDag(nå) - startAvDag(t)) / DAG));
}

/** Varm, menneskelig «sist kontakt»-tekst til personkortet. */
export function varmeTekst(p, nå = Date.now()) {
  const d = dagerSiden(p, nå);
  if (d == null) return 'Ta kontakt for første gang.';
  if (d === 0) return 'Dere snakket i dag.';
  if (d === 1) return 'Snakket i går.';
  if (d < 7) return `${d} dager siden sist.`;
  if (d < 14) return 'En stund siden sist.';
  if (d < 31) return 'Flere uker siden sist.';
  return 'Lenge siden sist.';
}

/**
 * Kretsen sortert etter hvem det har gått lengst med — aldri-kontaktede og de
 * «kaldeste» først, så «Ta vare på noen» alltid foreslår den som trenger det mest.
 */
export function sorterKrets(krets = les(), nå = Date.now()) {
  return krets.slice().sort((a, b) => {
    const da = dagerSiden(a, nå); const db = dagerSiden(b, nå);
    if (da == null && db == null) return 0;
    if (da == null) return -1;
    if (db == null) return 1;
    return db - da;
  });
}

/**
 * Logg kontakt med en person: setter sistKontakt = i dag og tenner fellesskaps-
 * gnisten (sosialloggen, vane 'motte'), så dagen teller. Returnerer feiring-
 * resultatet + den oppdaterte personen.
 */
export function registrerKontakt(id, nå = Date.now()) {
  const person = oppdaterPerson(id, { sistKontakt: new Date(nå).toISOString() });
  const res = sikreVane('motte', isoDag(nå));
  return { person, ...res };
}

// «Kom i gang»-ideer (lavterskel, roterer). Hver har ferdige åpningsreplikker
// som senker dørstokkmila — du slipper å finne ordene selv.
export const IGANG_IDEER = [
  {
    id: 'takk', ikon: 'hjerte', tittel: 'Skriv en takk', hint: 'En liten hilsen varmer.',
    forslag: ['Takk for sist — det betød mer enn du tror.', 'Tenkte på deg i dag. Håper alt er bra med deg?'],
  },
  {
    id: 'inviter', ikon: 'personer', tittel: 'Inviter til noe', hint: 'Planlegg noe hyggelig.',
    forslag: ['Har du lyst på en kaffe eller en tur denne uka?', 'Blir du med på en middag en dag snart?'],
  },
  {
    id: 'kompliment', ikon: 'stjerne', tittel: 'Gi et kompliment', hint: 'Det løfter dagen.',
    forslag: ['Måtte bare si det: du er god å ha.', 'Du gjorde dagen min bedre sist vi snakket.'],
  },
];
