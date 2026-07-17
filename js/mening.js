// Mening (Fase 6) — formål/ikigai som motivasjons-SPINE, ikke en sjette fane.
// I blue-zones-forskningen er «hvorfor du står opp om morgenen» (ikigai på
// Okinawa, plan de vida i Nicoya) blant de sterkeste faktorene for et langt,
// godt liv. Det er ikke en daglig handling som mat/bevegelse — det er rammen
// rundt alle handlingene. Derfor bor Mening ikke på tab-baren: den pakker inn
// belønningsloopen (feiring refererer til ditt hvorfor) og gir en rolig
// ukentlig refleksjon (privat meningsdagbok).
//
// Bevisst uten imports: ren localStorage. Da kan feiring.js importere herfra
// uten fare for import-sykluser (feiring → mening, aldri motsatt).

const LS_HVORFOR = 'trening.mening';       // [{ id, tekst, opprettet }]
const LS_REFLEKS = 'trening.meningslogg';  // [{ uke, tekst, opprettet }]
const MAKS_HVORFOR = 3;

// Startspørsmål langs blue-zones/ikigai-akser — hjelper mot «tom boks».
export const STARTSPORSMAL = [
  { id: 'hvem', sporsmal: 'Hvem vil du være der for?', hint: 'barnebarna, partneren, vennene' },
  { id: 'klare', sporsmal: 'Hva vil du fortsatt klare om 20 år?', hint: 'gå på tur, leke på gulvet, stå på ski' },
  { id: 'bidra', sporsmal: 'Hva gir mening å bidra med?', hint: 'frivillighet, dugnad, hjelpe noen' },
  { id: 'mer', sporsmal: 'Hva vil du ha mer av i livet?', hint: 'ro, nærhet, mestring, natur' },
];

// --- Lager: Mitt hvorfor ---------------------------------------------------
function lesRå(nokkel) {
  try { return JSON.parse(localStorage.getItem(nokkel) || '[]') || []; } catch { return []; }
}
function skrivRå(nokkel, arr) {
  try { localStorage.setItem(nokkel, JSON.stringify(arr)); } catch { /* lagring valgfri */ }
}

export function lesHvorfor() { return lesRå(LS_HVORFOR); }
/** Skriver hele hvorfor-listen rått (brukes av synk etter fletting). */
export function settHvorforRå(arr) { skrivRå(LS_HVORFOR, Array.isArray(arr) ? arr : []); }
export function harHvorfor() { return lesHvorfor().length > 0; }

/** Legger til et nytt «hvorfor» (maks 3, trimmet, ingen duplikat). Returnerer
 *  den nye oppføringen, eller null hvis tom / full / duplikat. */
export function leggTilHvorfor(tekst) {
  const t = (tekst || '').trim();
  if (!t) return null;
  const liste = lesHvorfor();
  if (liste.length >= MAKS_HVORFOR) return null;
  if (liste.some((h) => h.tekst.trim().toLowerCase() === t.toLowerCase())) return null;
  const ny = { id: `hvorfor-${Date.now().toString(36)}`, tekst: t, opprettet: new Date().toISOString() };
  liste.push(ny);
  skrivRå(LS_HVORFOR, liste);
  return ny;
}

export function slettHvorfor(id) {
  const liste = lesHvorfor().filter((h) => h.id !== id);
  skrivRå(LS_HVORFOR, liste);
  return liste;
}

/** Kan man legge til flere? (under taket) */
export function kanLeggeTil() { return lesHvorfor().length < MAKS_HVORFOR; }
export const HVORFOR_TAK = MAKS_HVORFOR;

/** Ett «hvorfor» til feiringen — roterer stabilt per dag (ikke tilfeldig-
 *  hoppende), så gjentatte visninger samme dag er like. null = ingen erklært. */
export function feiringsHvorfor(nå = Date.now()) {
  const liste = lesHvorfor();
  if (!liste.length) return null;
  const d = new Date(nå);
  const dagsnr = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return liste[dagsnr % liste.length].tekst;
}

// --- Ukens refleksjon ------------------------------------------------------
// «Uka» nøkles på mandagens ISO-dato (unngår ISO-ukenr-kanttilfeller). Én
// refleksjon per uke; nye erstatter gammel for samme uke (upsert).
export function ukeStart(ts = Date.now()) {
  const d = new Date(ts);
  const dag = (d.getDay() + 6) % 7; // man=0 … søn=6
  const man = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dag);
  return `${man.getFullYear()}-${String(man.getMonth() + 1).padStart(2, '0')}-${String(man.getDate()).padStart(2, '0')}`;
}

export function lesRefleksjoner() { return lesRå(LS_REFLEKS); }
/** Skriver hele refleksjonsloggen rått (brukes av synk etter fletting). */
export function settRefleksjonerRå(arr) { skrivRå(LS_REFLEKS, Array.isArray(arr) ? arr : []); }

export function ukensRefleksjon(uke = ukeStart()) {
  return lesRefleksjoner().find((r) => r.uke === uke) || null;
}

/** Upsert refleksjon for gjeldende uke. Tom tekst sletter uka. */
export function settRefleksjon(tekst, uke = ukeStart()) {
  const t = (tekst || '').trim();
  let liste = lesRefleksjoner().filter((r) => r.uke !== uke);
  if (t) liste.push({ uke, tekst: t, opprettet: new Date().toISOString() });
  liste.sort((a, b) => (a.uke < b.uke ? 1 : -1)); // nyeste uke først
  skrivRå(LS_REFLEKS, liste);
  return t ? liste[0] : null;
}

/** Trenger brukeren en refleksjons-dytt nå? (har et hvorfor, men ingen
 *  refleksjon denne uka ennå). */
export function trengerRefleksjon(nå = Date.now()) {
  return harHvorfor() && !ukensRefleksjon(ukeStart(nå));
}
