// Mening — «Mitt kompass»: ikigai oversatt til TAKT (systemdesign 1.0).
// Ikke et stort tekstfelt, men et stille personaliseringslag under hele appen:
// brukeren bygger et kompass gjennom noen få konkrete valg, får hjelp til å
// formulere sitt hvorfor, og beholder full kontroll over hvordan det brukes.
// Kjerneprinsipp: TAKT skal minne brukeren om retningen — ikke bruke det som
// betyr mest til å skape press. Retning, ikke press. Personlig, ikke påtrengende.
//
// Tre lag med ulik tidshorisont:
//   Kjernekompass («For flere gode år sammen») — endres sjelden, aldri i det
//     skjulte; bare når brukeren redigerer eller godkjenner et forslag.
//   Denne tiden («Mer energi i hverdagen»)     — justeres hver 4.–12. uke.
//   Dagens behov                                — utløper ved dagens slutt.
//
// Bevisst uten imports: ren localStorage. Da kan feiring.js importere herfra
// uten fare for import-sykluser (feiring → mening, aldri motsatt).

const LS_HVORFOR = 'trening.mening';       // [{ id, tekst, opprettet }] — egne ord (legacy + «noe eget»)
const LS_REFLEKS = 'trening.meningslogg';  // [{ uke, tekst, opprettet }]
const LS_KOMPASS = 'takt.kompass';         // whyProfile — se lesKompass()
const LS_BUDSKAP = 'takt.kompassbudskap';  // [{ mal, modul, dato }] — visningslogg (kategori-ID-er, aldri rå tekst)
const MAKS_HVORFOR = 3;

// --- Små hjelpere -----------------------------------------------------------
function lesRå(nokkel, fallback = []) {
  try { return JSON.parse(localStorage.getItem(nokkel) || 'null') ?? fallback; } catch { return fallback; }
}
function skrivRå(nokkel, verdi) {
  try { localStorage.setItem(nokkel, JSON.stringify(verdi)); } catch { /* lagring valgfri */ }
}
export function isoDag(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ===========================================================================
// Motivasjonsdimensjoner — kompassets språk. Bredere enn den vestlige
// fire-sirkler-figuren: favner familieliv, selvstendighet, natur, omsorg, lek,
// små gleder og det å kunne fortsette med vanlige ting.
// ===========================================================================
export const DIMENSJONER = [
  { id: 'naerhet',       navn: 'Nærhet',        refleksjon: 'Når følte du deg mest til stede med noen denne uka?' },
  { id: 'livskraft',     navn: 'Livskraft',     refleksjon: 'Når kjente du mest energi eller kraft i kroppen denne uka?' },
  { id: 'frihet',        navn: 'Frihet',        refleksjon: 'Var det noe som fikk livet til å kjennes litt friere denne uka?' },
  { id: 'indre_ro',      navn: 'Indre ro',      refleksjon: 'Når kjente du at tempoet faktisk passet deg denne uka?' },
  { id: 'mestring',      navn: 'Mestring',      refleksjon: 'Hva fikk du til denne uka som du vil ta med deg videre?' },
  { id: 'opplevelse',    navn: 'Opplevelse',    refleksjon: 'Hvilket lite øyeblikk ville du gjerne opplevd igjen?' },
  { id: 'identitet',     navn: 'Identitet',     refleksjon: 'Når handlet du denne uka som den du ønsker å være?' },
  { id: 'bidrag',        navn: 'Bidrag',        refleksjon: 'Hva gjorde du som betydde noe for noen andre?' },
  { id: 'tilhorighet',   navn: 'Tilhørighet',   refleksjon: 'Når kjente du deg som en del av noe denne uka?' },
  { id: 'hverdagsglede', navn: 'Hverdagsglede', refleksjon: 'Hvilket lite lyspunkt gjorde en vanlig dag god?' },
];
const DIM = Object.fromEntries(DIMENSJONER.map((d) => [d.id, d]));

// ===========================================================================
// Valgbibliotek og taksonomi — stabile ID-er, tekster og vektingsvektorer.
// Valgene skal treffe bredden i vanlige liv uten å bli en endeløs liste.
// Hvert valg har en vektor { dimensjon: vekt } (0–1) — «leke med barna» gir
// f.eks. mest nærhet, litt livskraft og litt hverdagsglede.
// ===========================================================================

// Steg 1 — fem brede innganger. Ett valg er nok til å fortsette.
export const INNGANGER = [
  { id: 'mennesker',   navn: 'Menneskene mine',    hint: 'Jeg vil være der for noen',      ikon: 'personer', vekter: { naerhet: 0.8, bidrag: 0.3 } },
  { id: 'livet',       navn: 'Livet jeg vil leve', hint: 'Det jeg vil kunne fortsette med', ikon: 'fjell',    vekter: { livskraft: 0.6, opplevelse: 0.5, frihet: 0.4 } },
  { id: 'folelse',     navn: 'Hvordan jeg vil ha det', hint: 'Mer ro, energi eller frihet', ikon: 'sol',      vekter: { indre_ro: 0.5, livskraft: 0.5 } },
  { id: 'identitet',   navn: 'Den jeg ønsker å være', hint: 'Verdier og identitet i hverdagen', ikon: 'kompass', vekter: { identitet: 0.8, mestring: 0.3 } },
  { id: 'smaating',    navn: 'De små tingene',     hint: 'Det som gjør en vanlig dag god',  ikon: 'blad',     vekter: { hverdagsglede: 0.8, opplevelse: 0.3 } },
];

// Steg 2a — mennesker. Kategorier, aldri navn/alder/kjønn (dataminimering).
export const PERSONVALG = [
  { id: 'barna',    tekst: 'Barna mine',    vekter: { naerhet: 0.9, hverdagsglede: 0.3 } },
  { id: 'partner',  tekst: 'Partneren min', vekter: { naerhet: 0.8 } },
  { id: 'familien', tekst: 'Familien',      vekter: { naerhet: 0.7, tilhorighet: 0.4 } },
  { id: 'venner',   tekst: 'Vennene mine',  vekter: { tilhorighet: 0.7, naerhet: 0.4 } },
  { id: 'trenger',  tekst: 'Noen som trenger meg', vekter: { bidrag: 0.9, naerhet: 0.3 } },
  { id: 'megselv',  tekst: 'Meg selv',      vekter: { identitet: 0.6, frihet: 0.4, indre_ro: 0.3 } },
  { id: 'andre',    tekst: 'Noen andre',    vekter: { naerhet: 0.5 } },
];

// Steg 2b — muligheter og evner: hva vil du kunne gjøre, bevare eller oppleve?
// «gjerning» er verbfrasen som settes inn i formuleringene.
export const EVNEVALG = [
  { id: 'leke',     tekst: 'Leke og være aktiv',   gjerning: 'leke og være aktiv',           vekter: { naerhet: 0.8, livskraft: 0.6, hverdagsglede: 0.3 } },
  { id: 'tur',      tekst: 'Gå turer og være ute', gjerning: 'gå turer og være ute',          vekter: { livskraft: 0.6, opplevelse: 0.5, indre_ro: 0.4 } },
  { id: 'reise',    tekst: 'Reise og oppleve',     gjerning: 'reise og oppleve nye steder',   vekter: { opplevelse: 0.9, frihet: 0.5 } },
  { id: 'klare',    tekst: 'Klare meg selv',       gjerning: 'klare meg selv så lenge som mulig', vekter: { frihet: 0.9, livskraft: 0.5, identitet: 0.3 } },
  { id: 'energi',   tekst: 'Ha energi etter jobb', gjerning: 'ha energi igjen etter dagen',   vekter: { livskraft: 0.8, indre_ro: 0.3 } },
  { id: 'sosial',   tekst: 'Delta sosialt',        gjerning: 'delta i det som skjer rundt meg', vekter: { tilhorighet: 0.8, naerhet: 0.4 } },
  { id: 'skape',    tekst: 'Skape og drive med noe eget', gjerning: 'skape og drive med det jeg liker', vekter: { mestring: 0.7, frihet: 0.5, hverdagsglede: 0.3 } },
  { id: 'stelle',   tekst: 'Ta vare på hjem, hage eller dyr', gjerning: 'ta vare på det som er mitt', vekter: { bidrag: 0.5, hverdagsglede: 0.5, mestring: 0.3 } },
  { id: 'spontan',  tekst: 'Være spontan',         gjerning: 'si ja når det dukker opp noe',  vekter: { frihet: 0.8, opplevelse: 0.4 } },
  { id: 'folge',    tekst: 'Følge andre i deres aktiviteter', gjerning: 'stille opp og følge dem jeg er glad i', vekter: { bidrag: 0.7, naerhet: 0.5 } },
  { id: 'bevege',   tekst: 'Bevege meg fritt',     gjerning: 'gå i trapper og bevege meg fritt', vekter: { livskraft: 0.8, frihet: 0.4 } },
  { id: 'oppleve',  tekst: 'Oppleve mer av livet', gjerning: 'oppleve mer av livet',          vekter: { opplevelse: 0.8, hverdagsglede: 0.4 } },
];

// Steg 3a — livsfølelse: hvordan skal hverdagen kjennes? (opptil tre)
export const FOLELSESVALG = [
  { id: 'energi',   tekst: 'Mer energi',    vekter: { livskraft: 0.9 } },
  { id: 'ro',       tekst: 'Roligere',      vekter: { indre_ro: 0.9 } },
  { id: 'naervaer', tekst: 'Mer til stede', vekter: { naerhet: 0.7, indre_ro: 0.4 } },
  { id: 'frihet',   tekst: 'Friere',        vekter: { frihet: 0.9 } },
  { id: 'glede',    tekst: 'Mer glede',     vekter: { hverdagsglede: 0.8 } },
  { id: 'overskudd', tekst: 'Mer overskudd', vekter: { livskraft: 0.7, indre_ro: 0.3 } },
  { id: 'styrke',   tekst: 'Sterkere',      vekter: { livskraft: 0.6, mestring: 0.5 } },
  { id: 'mestring', tekst: 'Mer mestring',  vekter: { mestring: 0.9 } },
  { id: 'lek',      tekst: 'Mer lek',       vekter: { hverdagsglede: 0.6, naerhet: 0.4 } },
  { id: 'trygghet', tekst: 'Tryggere',      vekter: { indre_ro: 0.6, tilhorighet: 0.4 } },
  { id: 'eventyr',  tekst: 'Mer levende',   vekter: { opplevelse: 0.7, livskraft: 0.4 } },
  { id: 'balanse',  tekst: 'Bedre balansert', vekter: { indre_ro: 0.6, frihet: 0.3 } },
];

// Steg 3b — identitet: hvem ønsker du å være på vanlige dager? (én–to, lav terskel)
export const IDENTITETSVALG = [
  { id: 'tilstede',  tekst: 'En som er til stede',            vekter: { naerhet: 0.7, identitet: 0.5 } },
  { id: 'tarvare',   tekst: 'En som tar vare på seg selv',    vekter: { identitet: 0.6, livskraft: 0.4 } },
  { id: 'holder',    tekst: 'En som holder det jeg lover meg selv', vekter: { mestring: 0.6, identitet: 0.5 } },
  { id: 'prover',    tekst: 'En som prøver uten å måtte være perfekt', vekter: { identitet: 0.6, indre_ro: 0.4 } },
  { id: 'forbilde',  tekst: 'Et godt forbilde',               vekter: { identitet: 0.7, bidrag: 0.4 } },
  { id: 'stodig',    tekst: 'En som står stødig',             vekter: { identitet: 0.5, indre_ro: 0.5 } },
  { id: 'nysgjerrig', tekst: 'En som er nysgjerrig',          vekter: { opplevelse: 0.6, identitet: 0.4 } },
  { id: 'hartid',    tekst: 'En som har tid til andre',       vekter: { bidrag: 0.6, naerhet: 0.5 } },
  { id: 'itakt',     tekst: 'En som lever mer i takt med seg selv', vekter: { identitet: 0.6, indre_ro: 0.5 } },
];

// Steg 2c/hverdagsmening — hva gjør en vanlig dag god? (brukes av «smaating»-
// inngangen og som krydder i forslag)
export const HVERDAGSVALG = [
  { id: 'folk',     tekst: 'Tid med mennesker jeg er glad i', vekter: { naerhet: 0.7, hverdagsglede: 0.4 } },
  { id: 'natur',    tekst: 'Natur og årstider',   vekter: { opplevelse: 0.5, indre_ro: 0.5 } },
  { id: 'bevegelse', tekst: 'Bevegelse',          vekter: { livskraft: 0.7 } },
  { id: 'skape',    tekst: 'Å lage eller skape noe', vekter: { mestring: 0.6, hverdagsglede: 0.4 } },
  { id: 'maaltid',  tekst: 'Gode måltider',       vekter: { hverdagsglede: 0.6, tilhorighet: 0.4 } },
  { id: 'laere',    tekst: 'Å lære noe nytt',     vekter: { mestring: 0.5, opplevelse: 0.4 } },
  { id: 'hjelpe',   tekst: 'Å hjelpe noen',       vekter: { bidrag: 0.8 } },
  { id: 'stillhet', tekst: 'Stillhet',            vekter: { indre_ro: 0.8 } },
  { id: 'latter',   tekst: 'Latter og lek',       vekter: { hverdagsglede: 0.7, naerhet: 0.3 } },
  { id: 'musikk',   tekst: 'Musikk og kultur',    vekter: { hverdagsglede: 0.5, opplevelse: 0.4 } },
  { id: 'gjort',    tekst: 'Å få noe gjort',      vekter: { mestring: 0.7 } },
  { id: 'ritualer', tekst: 'Ritualer og tradisjoner', vekter: { tilhorighet: 0.5, hverdagsglede: 0.4 } },
];

// Motta-tone: hvordan vil du helst bli møtt? Styrer språk, aldri verdier.
export const TONER = [
  { id: 'varm',    navn: 'Rolig og vennlig',  eksempel: 'Litt er fortsatt en del av takten.' },
  { id: 'konkret', navn: 'Kort og konkret',   eksempel: '8 minutter mangler for dagens mål.' },
  { id: 'varier',  navn: 'Varier etter dagen', eksempel: 'TAKT velger tone ut fra dagsformen.' },
];

// «Denne tiden» — situasjonsvalg for dem som ikke vet (og som mellomlag for
// alle). Midlertidig kompass som inviterer til å utdype senere.
export const TIDSVALG = [
  { id: 'energi',  tekst: 'Mer energi i hverdagen',  frase: 'mer energi i hverdagen',       vekter: { livskraft: 0.8 } },
  { id: 'hode',    tekst: 'Et roligere hode',        frase: 'et roligere hode',             vekter: { indre_ro: 0.8 } },
  { id: 'igang',   tekst: 'Føle at jeg er i gang',   frase: 'å føle at jeg er i gang',      vekter: { mestring: 0.7 } },
  { id: 'folk',    tekst: 'Mer tid til menneskene mine', frase: 'mer tid til menneskene mine', vekter: { naerhet: 0.8 } },
  { id: 'bedre',   tekst: 'Bare en bedre hverdag',   frase: 'en bedre hverdag',             vekter: { hverdagsglede: 0.6, indre_ro: 0.4 } },
];

// Oppslag: id → valgobjekt, per bibliotek (til skjermer og formuleringer).
export const BIBLIOTEK = {
  personer: PERSONVALG, evner: EVNEVALG, folelser: FOLELSESVALG,
  identiteter: IDENTITETSVALG, hverdag: HVERDAGSVALG, tider: TIDSVALG,
};
function slåOpp(bibliotek, ider) {
  const kart = Object.fromEntries(BIBLIOTEK[bibliotek].map((v) => [v.id, v]));
  return (ider || []).map((id) => kart[id]).filter(Boolean);
}

// ===========================================================================
// Kompasslageret — whyProfile. Endres ALDRI i det skjulte: hvert felt kommer
// fra et valg brukeren gjorde eller en tekst brukeren godkjente.
// ===========================================================================

/** Leser kompasset (whyProfile) eller null. Form:
 *  { versjon, status: 'aktiv'|'pause', opprettet, oppdatert,
 *    valg: { inngang, personer[], evner[], folelser[], identiteter[], hverdag[] },
 *    setning, linje, tone, personnivaa: 'subtil'|'tematisk'|'direkte',
 *    denneTiden: { id, tekst, satt } | null,
 *    historikk: [{ setning, linje, til }] } */
export function lesKompass() {
  const k = lesRå(LS_KOMPASS, null);
  return k && typeof k === 'object' && k.setning ? k : null;
}
export function harKompass() { const k = lesKompass(); return !!k && k.status !== 'pause'; }

/** Skriver hele kompasset rått (brukes av synk etter fletting). */
export function settKompassRå(k) {
  if (k && typeof k === 'object' && k.setning) skrivRå(LS_KOMPASS, k);
  else { try { localStorage.removeItem(LS_KOMPASS); } catch { /* ignorer */ } }
}

/** Lagrer et nytt/redigert kompass. Tar vare på forrige formulering i
 *  historikken (versjonshistorikk — bare synlig for brukeren). */
export function lagreKompass({ valg = {}, setning, linje, tone = 'varm', personnivaa = 'subtil', denneTiden = null }) {
  const s = (setning || '').trim();
  if (!s) return null;
  const nå = new Date().toISOString();
  const gammel = lesKompass();
  const historikk = (gammel?.historikk || []).slice(-9);
  if (gammel && gammel.setning !== s) historikk.push({ setning: gammel.setning, linje: gammel.linje, til: nå });
  const k = {
    versjon: (gammel?.versjon || 0) + 1,
    status: 'aktiv',
    opprettet: gammel?.opprettet || nå,
    oppdatert: nå,
    valg: {
      inngang: valg.inngang || gammel?.valg?.inngang || null,
      personer: valg.personer || gammel?.valg?.personer || [],
      evner: valg.evner || gammel?.valg?.evner || [],
      folelser: valg.folelser || gammel?.valg?.folelser || [],
      identiteter: valg.identiteter || gammel?.valg?.identiteter || [],
      hverdag: valg.hverdag || gammel?.valg?.hverdag || [],
    },
    setning: s,
    linje: (linje || '').trim() || lagKompassLinje(valg) || gammel?.linje || 'Retning, ikke press',
    tone, personnivaa,
    denneTiden: denneTiden || gammel?.denneTiden || null,
    historikk,
  };
  skrivRå(LS_KOMPASS, k);
  return k;
}

/** Pause/gjenoppta kompasset uten å slette det. */
export function settKompassPause(paa) {
  const k = lesKompass();
  if (!k) return null;
  k.status = paa ? 'pause' : 'aktiv';
  k.oppdatert = new Date().toISOString();
  skrivRå(LS_KOMPASS, k);
  return k;
}

/** Sletter kompasset og budskapsloggen (eksport/redigering/pause/sletting
 *  hører til samme side). Egne ord og refleksjoner beholdes. */
export function slettKompass() {
  try { localStorage.removeItem(LS_KOMPASS); localStorage.removeItem(LS_BUDSKAP); } catch { /* ignorer */ }
}

/** Oppdaterer bare «Denne tiden»-laget (justeres hver 4.–12. uke). */
export function settDenneTiden(id) {
  const k = lesKompass();
  if (!k) return null;
  const valg = TIDSVALG.find((t) => t.id === id) || null;
  k.denneTiden = valg ? { id: valg.id, tekst: valg.tekst, satt: new Date().toISOString() } : null;
  k.oppdatert = new Date().toISOString();
  skrivRå(LS_KOMPASS, k);
  return k;
}

/** Er «denne tiden» moden for ny vurdering? (8+ uker siden den ble satt) */
export function denneTidenBorSes(nå = Date.now()) {
  const dt = lesKompass()?.denneTiden;
  if (!dt?.satt) return false;
  return nå - Date.parse(dt.satt) > 8 * 7 * 86400000;
}

// ===========================================================================
// Dimensjonsscore — eksplisitte valg dominerer. Hvert valg bidrar med sin
// vektingsvektor; summen normaliseres til [0,1] og sorteres.
// ===========================================================================
export function regnDimensjoner(valg = {}) {
  const sum = {};
  const leggTil = (vekter, faktor = 1) => {
    for (const [dim, v] of Object.entries(vekter || {})) sum[dim] = (sum[dim] || 0) + v * faktor;
  };
  const inng = INNGANGER.find((i) => i.id === valg.inngang);
  if (inng) leggTil(inng.vekter, 0.6); // inngangen setter en forsiktig hovedretning
  for (const p of slåOpp('personer', valg.personer)) leggTil(p.vekter);
  for (const e of slåOpp('evner', valg.evner)) leggTil(e.vekter);
  for (const f of slåOpp('folelser', valg.folelser)) leggTil(f.vekter, 1.2); // uttrykkelig ønsket følelse veier tyngst
  for (const i of slåOpp('identiteter', valg.identiteter)) leggTil(i.vekter);
  for (const h of slåOpp('hverdag', valg.hverdag)) leggTil(h.vekter, 0.8);
  const maks = Math.max(0.0001, ...Object.values(sum));
  return Object.entries(sum)
    .map(([id, score]) => ({ id, navn: DIM[id]?.navn || id, score: Math.round((score / maks) * 100) / 100 }))
    .sort((a, b) => b.score - a.score);
}

/** Alle dimensjonene et kompass bærer, sortert. Et «vet ikke»-kompass har
 *  ingen oppsettsvalg — da bærer «denne tiden» retningen alene. */
function alleDimensjoner(k) {
  if (!k) return [];
  const alle = regnDimensjoner(k.valg || {});
  if (alle.length) return alle;
  const t = k.denneTiden && TIDSVALG.find((x) => x.id === k.denneTiden.id);
  if (!t) return [];
  return Object.entries(t.vekter)
    .map(([id, score]) => ({ id, navn: DIM[id]?.navn || id, score }))
    .sort((a, b) => b.score - a.score);
}

/** De 2–4 sterkeste dimensjonene for et kompass (til chips og budskapsvalg). */
export function toppDimensjoner(k = lesKompass(), antall = 3) {
  return alleDimensjoner(k).filter((d) => d.score >= 0.45).slice(0, antall);
}

// ===========================================================================
// Formuleringsmotor — regel- og malbasert (MVP): kvalitet, tone og personvern
// er forutsigbart. Tre varianter: varm, konkret og identitetsbasert. Brukeren
// kan redigere fritt; det er gjenkjennelse som er målet, ikke en fasit.
// ===========================================================================
function listUt(ord) {
  const a = (ord || []).filter(Boolean);
  if (!a.length) return '';
  if (a.length === 1) return a[0];
  return `${a.slice(0, -1).join(', ')} og ${a[a.length - 1]}`;
}
function personFrase(valg) {
  const p = slåOpp('personer', valg.personer).filter((x) => x.id !== 'megselv');
  if (!p.length) return '';
  const ord = p.slice(0, 2).map((x) => x.tekst.toLowerCase());
  return listUt(ord);
}

export function lagFormuleringer(valg = {}) {
  const personer = personFrase(valg);
  const evner = slåOpp('evner', valg.evner).map((e) => e.gjerning);
  const folelser = slåOpp('folelser', valg.folelser).map((f) => f.tekst.toLowerCase());
  const identitet = slåOpp('identiteter', valg.identiteter)[0]?.tekst.toLowerCase() || '';
  const hverdag = slåOpp('hverdag', valg.hverdag).map((h) => h.tekst.toLowerCase());

  const varm = personer
    ? `Jeg vil ha overskudd til å være til stede for ${personer} og dele flere gode, aktive år med dem.`
    : (folelser.length
      ? `Jeg vil ha ${listUt(folelser)} i hverdagen — nok til ${evner[0] || 'de tingene som gjør en vanlig dag god'}.`
      : `Jeg vil ta vare på hverdagen min — ${listUt(hverdag) || 'de små tingene som gjør en vanlig dag god'}.`);

  const konkret = evner.length
    ? `Jeg tar vare på kroppen og rytmen min for å kunne ${listUt(evner.slice(0, 3))}.`
    : `Jeg tar vare på kroppen og rytmen min for ${listUt(folelser) || 'flere gode, vanlige dager'}.`;

  const identitetsbasert = identitet
    ? `Jeg vil være ${identitet}${personer ? `, slik at jeg kan være der for ${personer}` : ' — på vanlige dager, uten at det må være perfekt'}.`
    : (personer
      ? `Jeg vil være en ${personer.includes('barna') ? 'som barna kan regne med' : 'som stiller opp for dem jeg er glad i'} — én vanlig dag av gangen.`
      : `Jeg vil være en som lever mer i takt med meg selv — én vanlig dag av gangen.`);

  return [
    { id: 'varm', navn: 'Varmt', tekst: varm },
    { id: 'konkret', navn: 'Konkret', tekst: konkret },
    { id: 'identitet', navn: 'Identitet', tekst: identitetsbasert },
  ];
}

// Kort påminnelseslinje for resten av appen — utledes av sterkeste dimensjon.
const LINJER = {
  naerhet: 'For flere gode år sammen',
  livskraft: 'For mer overskudd i hverdagen',
  frihet: 'For å kunne gjøre det på min måte',
  indre_ro: 'For roen i vanlige dager',
  mestring: 'For å holde avtalen med meg selv',
  opplevelse: 'For alt jeg fortsatt vil oppleve',
  identitet: 'For den jeg ønsker å være',
  bidrag: 'For dem som trenger meg',
  tilhorighet: 'For fellesskapet rundt meg',
  hverdagsglede: 'For de små tingene som teller',
};
export function lagKompassLinje(valg = {}) {
  const topp = regnDimensjoner(valg)[0];
  return (topp && LINJER[topp.id]) || 'Retning, ikke press';
}

// ===========================================================================
// Budskapsmotoren — velger relevant språk og handling, produserer ikke
// uendelige motivasjonssitater. Kuraterte maler per modul/situasjon/tone med
// regelbasert sikkerhetsport: intet skyldspråk, ingen absolutte helsepåstander,
// personreferanser kun på nivået brukeren har samtykket til.
//
// Full dekning: hver modul (start, de fire pilarene, streak, tilbakekomst)
// har varianter for ALLE ti dimensjonene, flere per kombinasjon — slik at
// enhver motivasjonsprofil møter relevante, ferske setninger overalt, og
// rotasjonen gjør at det samme sjelden vises to dager på rad.
// ===========================================================================

// Biblioteket: modul → dimensjon → varianter (alle subtile). Skrivereglene:
// kort, handlingsnært, varmt, aldri krav eller skyld, aldri personreferanser.
const BUDSKAPSBIBLIOTEK = {
  // Start/Hjem — dagens inngang. Retning, aldri krav.
  start: {
    naerhet: [
      'Litt bevegelse nå kan gjøre det lettere å være til stede senere.',
      'Et lite overskudd i dag er noe de rundt deg også får glede av.',
      'Ti minutter for deg selv nå — mer nærvær resten av dagen.',
    ],
    livskraft: [
      'Ti minutter kan være nok til å gi litt mer overskudd til resten av dagen.',
      'Kroppen liker små drypp — ett lite valg nå gir energi senere.',
      'Du trenger ikke mye i dag. Litt bevegelse holder motoren varm.',
    ],
    frihet: [
      'Dette er en liten investering i å kunne fortsette å gjøre ting på din måte.',
      'Små valg i dag holder dørene åpne — også om mange år.',
      'Velg noe som passer deg i dag — det er hele poenget.',
    ],
    indre_ro: [
      'Dagen trenger ikke bli stor. Ett rolig valg er nok til å komme i gang.',
      'Begynn stille: ett valg i ditt tempo.',
      'Du kan la dagen starte rolig — det teller like mye.',
    ],
    mestring: [
      'Ett lite valg i dag er å holde avtalen med deg selv.',
      'Én ting gjort i dag er nok til å kjenne at du er i gang.',
      'Fremgang er sjelden stor — den er som oftest ett lite valg.',
    ],
    opplevelse: [
      'Kanskje dagen har et lite øyeblikk å by på — hold utkikk.',
      'En liten omvei ut i dag kan bli dagens høydepunkt.',
      'Nysgjerrighet er også en vane — prøv noe litt nytt i dag.',
    ],
    identitet: [
      'Ett lite valg i dag er et lite steg mot den du vil være.',
      'Vanlige dager er der identitet bygges — én liten handling er nok.',
      'Du trenger ikke være perfekt i dag. Bare litt av den du ønsker å være.',
    ],
    bidrag: [
      'Litt overskudd i dag gjør det lettere å stille opp for noen.',
      'Ta vare på deg selv først — det er slik du kan være der for andre.',
      'Et lite bidrag i dag teller — også for deg.',
    ],
    tilhorighet: [
      'En liten hilsen i dag kan gjøre dagen større for to.',
      'Du er en del av noe — la ett valg i dag minne deg på det.',
      'Små fellesskap bygges av vanlige dager som denne.',
    ],
    hverdagsglede: [
      'Se etter ett lite lyspunkt i dag — de teller mer enn de ser ut som.',
      'En god dag trenger bare ett godt øyeblikk.',
      'Gjør plass til én liten ting du liker i dag.',
    ],
  },
  // Bevegelse — prioriter det som støtter valgte evner og livsfølelse.
  bevegelse: {
    naerhet: [
      'En rolig tur gir overskudd du kan dele med dem hjemme.',
      'Litt bevegelse nå kan gi mer overskudd til resten av ettermiddagen.',
      'Bevegelse nå — mer tilstedeværelse etterpå.',
    ],
    livskraft: [
      'En rolig tur passer takten din i dag.',
      'Ti minutter bevegelse er nok til å vekke kroppen.',
      'Litt i dag, litt i morgen — det er slik energien bygges.',
    ],
    frihet: [
      'Dette er en liten investering i å kunne fortsette på din måte.',
      'Bein som brukes, bærer deg dit du vil — lenge.',
      'Velg bevegelsen som frister mest — det er lov.',
    ],
    indre_ro: [
      'En stille tur kan rydde mer enn en time ved pulten.',
      'Rolig bevegelse er også ro — bare i bevegelse.',
      'La skuldrene senke seg mens beina går.',
    ],
    mestring: [
      'En kort økt i dag holder avtalen med deg selv.',
      'Du trenger ikke slå noen rekord — bare møte opp.',
      'Små økter, ofte — det er det som bygger.',
    ],
    opplevelse: [
      'Ta en ny vei i dag — små oppdagelser teller også.',
      'Bevegelse ute gir dagen et lite eventyr.',
      'Kroppen din er billetten til nye steder — hold den i gang.',
    ],
    identitet: [
      'En som beveger seg litt hver dag — det er alt det krever.',
      'Dagens lille økt er et lite steg mot den du vil være.',
      'Du bygger en vane, ikke en prestasjon.',
    ],
    bidrag: [
      'Overskudd fra en kort økt er lettere å gi videre.',
      'Sterk nok til å stille opp — det starter i det små.',
      'Inviter gjerne noen med på turen — begge får noe igjen.',
    ],
    tilhorighet: [
      'En tur er finere med følge — spør noen.',
      'Bevegelse sammen er dobbelt så lett.',
      'Ta dagens runde der folk er — en hilsen underveis teller.',
    ],
    hverdagsglede: [
      'Velg bevegelsen som gir et smil — lek teller.',
      'Musikk på øret og ut døra — enkelt og godt.',
      'Ti gode minutter ute kan bli dagens beste.',
    ],
  },
  // Ro — knytt nedtrapping til nærvær og kapasitet, aldri til prestasjon.
  ro: {
    naerhet: [
      'Ro kan være det som gjør at du kommer tilbake mer til stede.',
      'Et par rolige minutter nå — mykere kvelder sammen.',
      'Pusten først, så menneskene — det henger sammen.',
    ],
    livskraft: [
      'Hvile er også trening — det er der energien lades.',
      'Litt ro nå kan gi mer krefter i kveld.',
      'Kroppen bygger overskudd når du senker tempoet.',
    ],
    frihet: [
      'Å stoppe litt er også å velge selv.',
      'Ro gir rom — og rom gir valg.',
      'Fem minutter uten krav. De er dine.',
    ],
    indre_ro: [
      'Du trenger ikke få mer gjort. Du kan hjelpe dagen med å lande.',
      'Tre rolige pust er en god start.',
      'Senk tempoet litt — resten av dagen følger etter.',
    ],
    mestring: [
      'Å ta pausen du hadde tenkt å ta — det er også å gjennomføre.',
      'Ro er en ferdighet. Den øves i små drypp.',
      'En liten pause nå gjør neste oppgave lettere.',
    ],
    opplevelse: [
      'Stillhet ute er en egen opplevelse — prøv fem minutter.',
      'Legg merke til én ting rundt deg akkurat nå.',
      'Ro åpner sansene — verden blir litt større.',
    ],
    identitet: [
      'En som tar vare på seg selv, tar også pauser.',
      'Ro er ikke å falle av — det er å stå stødig.',
      'Den rolige versjonen av deg er også deg.',
    ],
    bidrag: [
      'Med roligere hode er det lettere å være der for noen.',
      'Lad litt nå — noen får glede av det senere.',
      'Omsorg starter ofte med en pause.',
    ],
    tilhorighet: [
      'Ro sammen teller dobbelt — en stille kaffe med noen?',
      'Del en pause med noen i dag.',
      'Det finnes fellesskap også i stillhet.',
    ],
    hverdagsglede: [
      'En liten pause med noe du liker — te, utsikt, musikk.',
      'Gode dager har små mellomrom. Lag ett nå.',
      'Fem rolige minutter kan bli dagens fineste.',
    ],
  },
  // Mat — energi, fellesskap, enkelhet og nytelse.
  mat: {
    naerhet: [
      'Et enkelt måltid samler — det trenger ikke være mer.',
      'Mat lagd sammen smaker som regel best.',
      'Dekk på til flere — nærhet starter rundt bordet.',
    ],
    livskraft: [
      'Mat som gir energi utover ettermiddagen — mest planter, gjerne grovt.',
      'Ett grønt valg til hvert måltid er nok i dag.',
      'Jevn energi kommer fra jevne måltider.',
    ],
    frihet: [
      'Enkle råvarer, din måte — mat trenger ikke oppskrift.',
      'Lag en porsjon ekstra — så velger du fritt i morgen.',
      'Gode matvalg i dag gir kroppen flere valg siden.',
    ],
    indre_ro: [
      'Ett måltid uten skjerm — smak i fred.',
      'Spis litt langsommere i dag — roen følger med.',
      'Et varmt måltid kan senke tempoet i hele kvelden.',
    ],
    mestring: [
      'Ett godt matvalg i dag er nok — det teller.',
      'Enkle måltider gjennomført ofte slår perfekte sjelden.',
      'Planlegg ett måltid frem — så går resten av seg selv.',
    ],
    opplevelse: [
      'Prøv én ny smak denne uka — nysgjerrighet gjelder også mat.',
      'La sesongen bestemme — det gjør handleturen til en oppdagelse.',
      'En ny oppskrift er en liten reise hjemmefra.',
    ],
    identitet: [
      'Den som tar vare på seg selv, starter ofte på tallerkenen.',
      'Ett bevisst valg per måltid — det er hele vanen.',
      'Du velger hva kroppen får å jobbe med i dag.',
    ],
    bidrag: [
      'Lag litt ekstra — noen blir glad for en porsjon.',
      'Å lage mat til noen er omsorg i praksis.',
      'Inviter noen til bords — enkelt er mer enn nok.',
    ],
    tilhorighet: [
      'Mat som er lett å sette midt på bordet og dele.',
      'Måltider er limet — del ett i dag om du kan.',
      'Felles bord, felles dag — det trenger ikke planlegges stort.',
    ],
    hverdagsglede: [
      'Et enkelt måltid som gjør det lettere å samle folk rundt bordet.',
      'Godt brød, god kaffe, godt nok — nyt det.',
      'La ett måltid i dag være et lite høydepunkt.',
    ],
  },
  // Fellesskap — lavterskel kontakt, felles aktivitet eller bidrag.
  sosialt: {
    naerhet: [
      'Send en kort melding til noen du har tenkt på.',
      'To minutter på telefonen kan bety mye for noen — og for deg.',
      'Nærhet bygges i små drypp — ett i dag er nok.',
    ],
    livskraft: [
      'Godt selskap gir energi — avtal noe lite.',
      'En tur med følge løfter både kropp og humør.',
      'Mennesker er også påfyll — hent litt i dag.',
    ],
    frihet: [
      'Velg samværet som gir deg noe — det er lov å si nei til resten.',
      'Små, ekte møter slår store forpliktelser.',
      'Du bestemmer formen — en benk, en kaffe, en telefon.',
    ],
    indre_ro: [
      'En rolig prat kan senke skuldrene bedre enn stillhet.',
      'Vær sammen uten program — det roligste samværet.',
      'Ett menneske, én kopp, ingen hast.',
    ],
    mestring: [
      'Å ta kontakt først er en liten øvelse — og den blir lettere.',
      'Én melding sendt i dag er vanen holdt.',
      'Sosiale muskler trenger også trening — smått og ofte.',
    ],
    opplevelse: [
      'Gjør noe litt nytt sammen med noen — små eventyr teller.',
      'Inviter noen med ut — opplevelser deles best.',
      'Et nytt sted, en kjent venn — god kombinasjon.',
    ],
    identitet: [
      'En som har tid til andre — det bygges i små valg som dette.',
      'Vær den som tar kontakt først i dag.',
      'Små gester er også den du er.',
    ],
    bidrag: [
      'Å stille opp i det små teller også som å være der.',
      'Spør noen «hvordan har du det egentlig?» — og lytt.',
      'Et lite tilbud om hjelp kan bære langt.',
    ],
    tilhorighet: [
      'Fellesskap vedlikeholdes i det små — en hilsen er nok i dag.',
      'Si ja til det lille — det er der tilhørighet bor.',
      'Laget ditt finnes — hold kontakten varm.',
    ],
    hverdagsglede: [
      'Del en latter med noen i dag — den smitter begge veier.',
      'En god prat kan være dagens lyspunkt.',
      'Små øyeblikk sammen gjør vanlige dager gode.',
    ],
  },
  // Streak i fare — beskytt rytmen uten tapsaversjon og skam.
  streak: {
    naerhet: [
      'Takten er der for menneskene dine — fem minutter holder den varm.',
      'Ett lite valg nå, mer overskudd til dem senere.',
    ],
    livskraft: [
      'Fem rolige minutter er nok til å holde energien i gang.',
      'Rytmen bygger kraft — små drypp holder den.',
    ],
    frihet: [
      'Takten er ikke borte. Fem rolige minutter er nok til å finne den igjen.',
      'Velg den minste handlingen som passer deg — det holder.',
    ],
    indre_ro: [
      'Ingen skippertak — ett rolig valg holder rytmen.',
      'Rytme er ro i praksis. Litt er nok.',
    ],
    mestring: [
      'Velg den minste handlingen som passer — det holder avtalen i live.',
      'Rekka bygges av små dager — dagens kan være bitteliten.',
    ],
    opplevelse: [
      'En kort tur ut teller — og kanskje byr den på noe.',
      'Hold rytmen med noe du faktisk har lyst til.',
    ],
    identitet: [
      'Den du vil være, gjør litt også på travle dager.',
      'Rytmen er din — én liten handling bekrefter den.',
    ],
    bidrag: [
      'Litt påfyll nå gjør deg tilgjengelig for andre etterpå.',
      'Hold rytmen — den bærer mer enn deg.',
    ],
    tilhorighet: [
      'Ta noen med på dagens lille valg.',
      'Rytme deles — en kort tur med følge teller dobbelt.',
    ],
    hverdagsglede: [
      'La dagens lille valg være noe du liker.',
      'Rytmen skal kjennes god — velg det hyggelige alternativet.',
    ],
  },
  // Tilbakekomst — «Du trenger ikke ta igjen noe. Du kan begynne der du er.»
  tilbakekomst: {
    naerhet: [
      'Du trenger ikke ta igjen noe. Menneskene dine trenger deg som du er i dag.',
      'Begynn der du er — ett lite valg gir litt mer å gi.',
    ],
    livskraft: [
      'Du trenger ikke ta igjen noe. Litt energi bygges fra første lille valg.',
      'Start mykt: ti minutter er en hel start.',
    ],
    frihet: [
      'Ingen fasit å følge — begynn med det som føles mulig.',
      'Du velger takten selv. Én liten ting i dag er nok.',
    ],
    indre_ro: [
      'Du trenger ikke få mer gjort. Begynn stille, i ditt tempo.',
      'Rolig start er også start.',
    ],
    mestring: [
      'Du trenger ikke ta igjen noe. Ett lite valg er nok til å være i gang igjen.',
      'Begynn med det minste — resten kommer etter.',
    ],
    opplevelse: [
      'Begynn med noe som frister — en kort tur ut er en fin gjenstart.',
      'Verden er der fortsatt — ta en liten kikk i dag.',
    ],
    identitet: [
      'Den du vil være begynner igjen i dag — i det små.',
      'Én liten handling i dag — det er hele gjenstarten.',
    ],
    bidrag: [
      'Begynn der du er — omsorgen din er like mye verdt i dag.',
      'Ett lite valg for deg selv først. Så er det lettere å gi.',
    ],
    tilhorighet: [
      'Fellesskapet er der fortsatt. En liten hilsen er en fin vei inn igjen.',
      'Begynn gjerne sammen med noen — det gjør starten lettere.',
    ],
    hverdagsglede: [
      'Begynn med noe hyggelig — en god start trenger ikke være nyttig.',
      'Ett lite lyspunkt i dag er en hel gjenstart.',
    ],
  },
};

// Mal: { id, modul, dim (dimensjon som må være blant toppene), niva
//        ('subtil'|'tematisk'|'direkte'), tekst(k) — direkte-maler kan bruke
//        kompassets egne ord og krever personnivaa 'direkte'. }
// Genereres fra biblioteket + noen få tematisk/direkte-spesialer.
export const BUDSKAPSMALER = [
  { id: 'start-tema',    modul: 'start', dim: 'naerhet', niva: 'tematisk', tekst: () => 'For mer overskudd til dem som betyr mest.' },
  { id: 'start-direkte', modul: 'start', dim: 'naerhet', niva: 'direkte',  tekst: (k) => k.linje },
];
for (const [modul, dimmer] of Object.entries(BUDSKAPSBIBLIOTEK)) {
  for (const [dim, tekster] of Object.entries(dimmer)) {
    tekster.forEach((t, i) => BUDSKAPSMALER.push({
      id: `${modul}-${dim}-${i + 1}`, modul, dim, niva: 'subtil', tekst: () => t,
    }));
  }
}
export const BUDSKAPSMODULER = Object.keys(BUDSKAPSBIBLIOTEK);

// Skyldspråk-vokabular som ALDRI skal slippe gjennom (sikkerhetsport). Malene
// over er kuraterte, men porten står som siste skanse også for framtidige maler.
const FORBUDT = /\b(sviktet|skuffet|lovet deg selv|dårlig samvittighet|på etterskudd|taper|mister alt|siste sjanse)\b/i;

// Visningsloggen renser seg selv: rader som peker på mal-ID-er som ikke
// lenger finnes (bibliotekbytte/oppdatering), filtreres bort ved lesing —
// gammel logg kan dermed aldri blokkere eller fryse dagens valg.
const KJENTE_MALER = new Set(BUDSKAPSMALER.map((m) => m.id));
function lesBudskapslogg() { return lesRå(LS_BUDSKAP, []).filter((r) => KJENTE_MALER.has(r.mal)); }
function skrivBudskapslogg(logg) { skrivRå(LS_BUDSKAP, logg.slice(-240)); }

/**
 * Velger et kompassbudskap for en modul — eller null (kun uten aktivt
 * kompass, eller om sikkerhetsporten feller alt). Regler:
 *   - krever aktivt kompass; malens dimensjon må være blant brukerens
 *     dimensjoner (topp 5, alltid minst 3 — bred dekning uansett profil)
 *   - malens nivå må være tillatt av brukerens personnivå (subtil < tematisk < direkte)
 *   - maks ett budskap per modul per dag, stabilt gjenvist samme dag
 *   - ferskhet: samme mal helst ikke to ganger på 7 dager; er hele utvalget i
 *     hvile, velges malen som sist ble vist for lengst siden — aldri tom side
 *   - deterministisk per dag (dagsnr roterer blant kandidatene — ro i UI-et)
 */
export function kompassBudskap(modul, nå = Date.now()) {
  const k = lesKompass();
  if (!k || k.status === 'pause') return null;
  const nivåRekke = { subtil: 0, tematisk: 1, direkte: 2 };
  const tillatt = nivåRekke[k.personnivaa || 'subtil'];
  const alle = alleDimensjoner(k);
  let topper = alle.filter((d) => d.score >= 0.45).slice(0, 5);
  if (topper.length < 3) topper = alle.slice(0, 3); // smal profil → bruk de beste som finnes
  const toppSet = new Set(topper.map((d) => d.id));
  const dag = isoDag(nå);
  const logg = lesBudskapslogg();

  const gyldige = BUDSKAPSMALER.filter((m) => m.modul === modul
    && toppSet.has(m.dim)
    && nivåRekke[m.niva] <= tillatt
    && !FORBUDT.test(m.tekst(k)));
  if (!gyldige.length) return null;

  // Stabil gjenvisning: dagens budskap for modulen ligger fast hele dagen.
  const idag = logg.find((r) => r.dato === dag && r.modul === modul);
  if (idag) {
    const m = gyldige.find((x) => x.id === idag.mal);
    if (m) return { id: m.id, tekst: m.tekst(k), dim: m.dim };
  }

  // Ferskhet: helst maler som ikke er vist siste 7 dager; er alt i hvile,
  // ta den som har hvilt lengst (framfor å vise ingenting).
  const nylige = new Set(logg.filter((r) => (nå - Date.parse(r.dato)) < 7 * 86400000).map((r) => r.mal));
  let kandidater = gyldige.filter((m) => !nylige.has(m.id));
  if (!kandidater.length) {
    const sistVist = new Map();
    for (const r of logg) sistVist.set(r.mal, r.dato);
    kandidater = [[...gyldige].sort((a, b) =>
      (sistVist.get(a.id) || '').localeCompare(sistVist.get(b.id) || ''))[0]];
  }

  const valgt = kandidater[Math.floor(Date.parse(dag) / 86400000) % kandidater.length];
  skrivBudskapslogg([...logg, { mal: valgt.id, modul, dato: dag }]);
  return { id: valgt.id, tekst: valgt.tekst(k), dim: valgt.dim };
}

/** «Hvorfor ser jeg dette?» — forklarbarhet for kompass-siden. */
export function kompassForklaring(k = lesKompass()) {
  if (!k) return '';
  const topper = toppDimensjoner(k, 3).map((d) => d.navn.toLowerCase());
  if (!topper.length) return 'Kompasset brukes bare til å velge språk og små forslag — aldri til press.';
  return `Du har valgt ${listUt(topper)} som viktige retninger. Derfor får forslag og språk i appen dette preget — og aldri mer enn du har åpnet for.`;
}

// ===========================================================================
// Egne ord («Mitt hvorfor», legacy) — beholdes som brukerens frie formuleringer.
// Vises på kompass-siden som «Mine egne ord» og kan fortsatt legges til.
// ===========================================================================
export const STARTSPORSMAL = [
  { id: 'hvem', sporsmal: 'Hvem vil du være der for?', hint: 'barnebarna, partneren, vennene' },
  { id: 'klare', sporsmal: 'Hva vil du fortsatt klare om 20 år?', hint: 'gå på tur, leke på gulvet, stå på ski' },
  { id: 'bidra', sporsmal: 'Hva gir mening å bidra med?', hint: 'frivillighet, dugnad, hjelpe noen' },
  { id: 'mer', sporsmal: 'Hva vil du ha mer av i livet?', hint: 'ro, nærhet, mestring, natur' },
];

// Normaliserer for synk: hvert innslag trenger en stabil id + oppdatert (LWW).
export function lesHvorfor() {
  return lesRå(LS_HVORFOR).map((h) => ({ ...h, oppdatert: h.oppdatert || h.opprettet }));
}
/** Skriver hele hvorfor-listen rått (brukes av synk etter fletting). */
export function settHvorforRå(arr) { skrivRå(LS_HVORFOR, Array.isArray(arr) ? arr : []); }
export function harHvorfor() { return lesHvorfor().length > 0; }

/** Legger til et nytt eget ord (maks 3, trimmet, ingen duplikat). */
export function leggTilHvorfor(tekst) {
  const t = (tekst || '').trim();
  if (!t) return null;
  const liste = lesHvorfor();
  if (liste.length >= MAKS_HVORFOR) return null;
  if (liste.some((h) => h.tekst.trim().toLowerCase() === t.toLowerCase())) return null;
  const nå = new Date().toISOString();
  const ny = { id: `hvorfor-${Date.now().toString(36)}`, tekst: t, opprettet: nå, oppdatert: nå };
  liste.push(ny);
  skrivRå(LS_HVORFOR, liste);
  return ny;
}

export function slettHvorfor(id) {
  const liste = lesHvorfor().filter((h) => h.id !== id);
  skrivRå(LS_HVORFOR, liste);
  return liste;
}

/** Kan man legge til flere egne ord? (under taket) */
export function kanLeggeTil() { return lesHvorfor().length < MAKS_HVORFOR; }
export const HVORFOR_TAK = MAKS_HVORFOR;

/** Meningslinjen til feiringene: kompassets setning når det er aktivt (sjeldne
 *  milepæler er stedet for brukerens faktiske ord), ellers roterer egne ord
 *  stabilt per dag. null = ingenting erklært → feiringen bruker nøytral tekst. */
export function feiringsHvorfor(nå = Date.now()) {
  const k = lesKompass();
  if (k && k.status !== 'pause') return k.setning;
  const liste = lesHvorfor();
  if (!liste.length) return null;
  const d = new Date(nå);
  const dagsnr = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return liste[dagsnr % liste.length].tekst;
}

// --- Ukens refleksjon ------------------------------------------------------
// En menneskelig kontrollsløyfe — ikke et skjult treningsdatasett. Spørsmålet
// er dynamisk (roterer blant kompassets toppdimensjoner), og fritekst
// analyseres aldri automatisk til nye livsfakta.
export function ukeStart(ts = Date.now()) {
  const d = new Date(ts);
  const dag = (d.getDay() + 6) % 7; // man=0 … søn=6
  const man = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dag);
  return `${man.getFullYear()}-${String(man.getMonth() + 1).padStart(2, '0')}-${String(man.getDate()).padStart(2, '0')}`;
}

/** Ukens refleksjonsspørsmål: roterer blant toppdimensjonene per uke; uten
 *  kompass et rolig standardspørsmål. */
export function refleksjonsSporsmal(nå = Date.now()) {
  const k = lesKompass();
  const topper = k && k.status !== 'pause' ? toppDimensjoner(k, 4) : [];
  if (!topper.length) return 'Hva føltes mest meningsfullt denne uka?';
  const ukenr = Math.floor(Date.parse(ukeStart(nå)) / (7 * 86400000));
  return DIM[topper[ukenr % topper.length].id].refleksjon;
}

// Normaliserer for synk: id = uka (én refleksjon per uke), oppdatert for LWW.
export function lesRefleksjoner() {
  return lesRå(LS_REFLEKS).map((r) => ({ ...r, id: r.id || r.uke, oppdatert: r.oppdatert || r.opprettet }));
}
/** Skriver hele refleksjonsloggen rått (brukes av synk etter fletting). */
export function settRefleksjonerRå(arr) { skrivRå(LS_REFLEKS, Array.isArray(arr) ? arr : []); }

export function ukensRefleksjon(uke = ukeStart()) {
  return lesRefleksjoner().find((r) => r.uke === uke) || null;
}

/** Upsert refleksjon for gjeldende uke. Tom tekst sletter uka. */
export function settRefleksjon(tekst, uke = ukeStart()) {
  const t = (tekst || '').trim();
  let liste = lesRefleksjoner().filter((r) => r.uke !== uke);
  if (t) { const nå = new Date().toISOString(); liste.push({ id: uke, uke, tekst: t, opprettet: nå, oppdatert: nå }); }
  liste.sort((a, b) => (a.uke < b.uke ? 1 : -1)); // nyeste uke først
  skrivRå(LS_REFLEKS, liste);
  return t ? liste[0] : null;
}

/** Trenger brukeren en refleksjons-dytt nå? (har kompass eller egne ord, men
 *  ingen refleksjon denne uka ennå). */
export function trengerRefleksjon(nå = Date.now()) {
  return (harKompass() || harHvorfor()) && !ukensRefleksjon(ukeStart(nå));
}
