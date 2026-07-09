// Belønningssystemet (M6) — spill-laget som gjør progresjon engasjerende.
// Bevisst adskilt fra det fysiske kapasitetsnivået (base per modalitet, som er
// tregt og meningsfylt): dette er belønningsnivået — det stiger ofte, har INGEN
// tak, og gir en belønning HVER gang. Belønninger: en ny øvelse å prøve, en
// avatar, et app-tema eller en tittel. Alt utledet deterministisk fra total-XP,
// så ingenting kan «mistes» og sync trenger ikke lagre stigen.

// --- Nivåkurve: rask og uendelig ------------------------------------------
// XP for å gå fra nivå n til n+1. Starter lavt (dopamin tidlig), vokser lineært
// (aldri eksplosivt), aldri et tak. ~1 nivå per økt tidlig.
export function nivaKostnad(n) {
  return 40 + 20 * n;
}

/** Nivå + progresjon mot neste fra total-XP. */
export function nivaFraTotalXp(totalXp) {
  const xp = Math.max(0, totalXp || 0);
  let niva = 1;
  let brukt = 0;
  while (xp >= brukt + nivaKostnad(niva)) { brukt += nivaKostnad(niva); niva++; }
  const inne = xp - brukt;
  const tilNeste = nivaKostnad(niva);
  return { niva, inne, tilNeste, igjen: tilNeste - inne, pct: Math.min(100, Math.round((inne / tilNeste) * 100)), totalXp: xp };
}

// --- Kataloger ------------------------------------------------------------
// Avatarer (Higgsfield-genererte bilder). Første to er gratis fra start.
export const AVATARER = ['bicep', 'loper', 'yoga', 'flamme', 'lyn', 'fjell', 'trofe', 'vekt', 'puls'];
export const GRATIS_AVATARER = ['bicep', 'loper'];
export const STANDARD_AVATAR = 'bicep';
export function avatarBilde(id) { return `icons/avatars/${id}.png`; }
/** Er dette en bilde-avatar (vs. gammel emoji fra en tidligere profil)? */
export function erBildeAvatar(id) { return AVATARER.includes(id); }

// Temaer (CSS-paletter, se app.css). Alle er Mova-avledet: lys base med ulik
// aksentfarge — id-ene er uendret så opplåste temaer overlever redesignet.
export const TEMAER = [
  { id: 'standard', navn: 'Mova (standard)', prikk: '#008382' },
  { id: 'mork', navn: 'Marine', prikk: '#11264D' },
  { id: 'midnatt', navn: 'Midnatt', prikk: '#2E8FE0' },
  { id: 'glod', navn: 'Glød', prikk: '#E8853D' },
  { id: 'oliven', navn: 'Oliven', prikk: '#7E9C2E' },
  { id: 'nordlys', navn: 'Nordlys', prikk: '#8B5CF6' },
  { id: 'rodglod', navn: 'Rødglød', prikk: '#FF6F61' },
  { id: 'papir', navn: 'Papir (varm)', prikk: '#E8E2D9' },
  { id: 'mono', navn: 'Mono', prikk: '#3C4660' },
  { id: 'gull', navn: 'Gull', prikk: '#B08D2A' },
];

// Titler etter nivåtrinn (høyeste ≤ nivå gjelder).
export const TITLER = [
  [1, 'Nybegynner'], [4, 'Trent'], [8, 'Sterk'], [12, 'Solid'], [17, 'Erfaren'],
  [23, 'Rå'], [31, 'Veteran'], [41, 'Elite'], [55, 'Mester'], [75, 'Legende'], [100, 'Udødelig'],
];

export function tittelFor(niva) {
  let t = TITLER[0][1];
  for (const [n, navn] of TITLER) if (niva >= n) t = navn; else break;
  return t;
}

// Tier-crest (Higgsfield-genererte hexagon-badges) etter nivåbånd — bronse→diamant.
const TIER = [
  [1, 'bronse'], [5, 'solv'], [10, 'gull'], [17, 'smaragd'], [24, 'safir'],
  [34, 'rubin'], [47, 'ametyst'], [64, 'obsidian'], [85, 'diamant'],
];
export const TIER_NAVN = {
  bronse: 'Bronse', solv: 'Sølv', gull: 'Gull', smaragd: 'Smaragd', safir: 'Safir',
  rubin: 'Rubin', ametyst: 'Ametyst', obsidian: 'Obsidian', diamant: 'Diamant',
};
/** Filnavn (uten sti) for tier-crest på et gitt nivå. */
export function tierFor(niva) {
  let t = TIER[0][1];
  for (const [n, navn] of TIER) if (niva >= n) t = navn; else break;
  return t;
}
export function tierBadge(niva) { return `icons/badges/${tierFor(niva)}.png`; }

// --- Belønningsstige ------------------------------------------------------
// Kuraterte milepæler; øvrige nivåer fylles med «ny øvelse»-reveals.
const KURATERT = {
  3: { type: 'tema', id: 'midnatt' },
  4: { type: 'tittel', id: 'Trent' },
  5: { type: 'avatar', id: 'flamme' },
  6: { type: 'tema', id: 'glod' },
  8: { type: 'tittel', id: 'Sterk' },
  9: { type: 'avatar', id: 'lyn' },
  10: { type: 'tema', id: 'oliven' },
  12: { type: 'tittel', id: 'Solid' },
  13: { type: 'avatar', id: 'vekt' },
  15: { type: 'tema', id: 'nordlys' },
  17: { type: 'tittel', id: 'Erfaren' },
  18: { type: 'avatar', id: 'yoga' },
  20: { type: 'tema', id: 'rodglod' },
  23: { type: 'tittel', id: 'Rå' },
  25: { type: 'avatar', id: 'fjell' },
  30: { type: 'tema', id: 'papir' },
  31: { type: 'tittel', id: 'Veteran' },
  35: { type: 'avatar', id: 'trofe' },
  40: { type: 'tema', id: 'mono' },
  41: { type: 'tittel', id: 'Elite' },
  45: { type: 'avatar', id: 'puls' },
  50: { type: 'tema', id: 'gull' },
  55: { type: 'tittel', id: 'Mester' },
  75: { type: 'tittel', id: 'Legende' },
  100: { type: 'tittel', id: 'Udødelig' },
};

// Lesbare navn på avatar-emblemene (for belønningsteksten).
export const AVATAR_NAVN = {
  bicep: 'Biceps', loper: 'Løper', yoga: 'Yoga', flamme: 'Flamme', lyn: 'Lyn',
  fjell: 'Fjell', trofe: 'Trofé', vekt: 'Vektstang', puls: 'Puls',
};

// Deterministisk øvelsesrekkefølge for reveals — lette først, så tyngre.
let _ordnet = null;
function ordnedeOvelser(bib) {
  if (_ordnet) return _ordnet;
  if (!bib?.exercises?.length) return [];
  _ordnet = bib.exercises.slice().sort((a, b) => (a.niva - b.niva) || a.navn.localeCompare(b.navn, 'no'));
  return _ordnet;
}

// Hvor mange kuraterte nivåer ≤ n (for å mappe øvrige nivåer til øvelsesindeks).
function kuratertTil(n) {
  let c = 0;
  for (const k in KURATERT) if (Number(k) <= n) c++;
  return c;
}

/** Belønningen som deles ut når du når `niva`. */
export function belonningFor(niva, bib) {
  if (niva <= 1) return { type: 'start', niva };
  const k = KURATERT[niva];
  if (k) {
    if (k.type === 'tema') return { type: 'tema', id: k.id, navn: TEMAER.find((t) => t.id === k.id)?.navn || k.id, niva };
    if (k.type === 'avatar') return { type: 'avatar', id: k.id, navn: AVATAR_NAVN[k.id] || k.id, niva };
    if (k.type === 'tittel') return { type: 'tittel', id: k.id, navn: k.id, niva };
  }
  // Øvelses-reveal
  const ordnet = ordnedeOvelser(bib);
  if (!ordnet.length) return { type: 'xp', navn: 'XP-bonus', niva };
  const idx = (niva - 1 - kuratertTil(niva)) % ordnet.length;
  const e = ordnet[(idx + ordnet.length) % ordnet.length];
  return { type: 'ovelse', id: e.id, navn: e.navn, niva };
}

/** Alle belønninger til og med `niva` (for stigevisning og opplåsingssett). */
export function belonningerTil(niva, bib) {
  const ut = [];
  for (let n = 2; n <= niva; n++) ut.push(belonningFor(n, bib));
  return ut;
}

/** Sett av øvelses-IDer låst opp via belønningsstigen ved gitt nivå. */
const _revealCache = new Map();
export function belonningsOvelser(niva, bib) {
  if (_revealCache.has(niva)) return _revealCache.get(niva);
  const sett = new Set();
  for (let n = 2; n <= niva; n++) {
    const b = belonningFor(n, bib);
    if (b.type === 'ovelse') sett.add(b.id);
  }
  _revealCache.set(niva, sett);
  return sett;
}

// Opplåste temaer/avatarer ved gitt nivå (gratis + belønnede).
export function lasteTemaer(niva, bib) {
  const sett = new Set(['standard', 'mork']); // lyst + mørkt er gratis
  for (const b of belonningerTil(niva, bib)) if (b.type === 'tema') sett.add(b.id);
  return sett;
}
export function lasteAvatarer(niva, bib) {
  const sett = new Set(GRATIS_AVATARER);
  for (const b of belonningerTil(niva, bib)) if (b.type === 'avatar') sett.add(b.id);
  return sett;
}

// Neste belønning etter gjeldende nivå (for «neste opp»-hint).
export function nesteBelonning(niva, bib) {
  return belonningFor(niva + 1, bib);
}

// SVG-ikonnavn (fra js/ui.js sitt ikon-sett) per belønningstype — delt mellom
// niva-ui.js og kjor.js så begge viser samme konsistente linjeikon i stedet
// for plattform-emoji. Avatar-typen har eget bilde og trenger ikke dette.
export function belonningIkonNavn(b) {
  if (b.type === 'tema') return 'palett';
  if (b.type === 'tittel') return 'medalje';
  if (b.type === 'ovelse') return 'vekt';
  if (b.type === 'avatar') return 'person';
  return 'hexstjerne';
}
