// Varslingssystem (M24) — en avledet varsel-feed bak bjella. Tre kilder,
// alle regnet ut fra loggen + profilen ved visning (ingen egen datalagring):
//   1) fullførte økter (fra trening.logg)
//   2) nivå-opp (løpende sum av øktenes xp krysser en nivåterskel)
//   3) nylig opptjente merker (merkerNå() gir `dato` for hvert merke)
// «Sett»-tidspunktet er device-spesifikt og ligger bare i localStorage — det
// synkes ikke (det er visningstilstand, ikke data). Skjermen (visVarsler) bor i
// app.js så den kan bruke skjerm()-skallet; her ligger modellen + kort-visning.
import { el, ikon } from './ui.js';
import { hentProfil, hentLogg, hentPlan } from './store.js';
import { nivaFraTotalXp } from './niva.js';
import { merkerNå } from './merker.js';
import { BEVEGELSER, aktivitetNavn, loggBevegelse } from './bevegelse.js';

const SETT_KEY = 'trening.varslerSett';

function settTidspunkt() {
  const n = Number(localStorage.getItem(SETT_KEY));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Marker varsler som sett (kalles når #/varsler åpnes). Setter sist-sett til
 * det seneste av «nå» og nyeste varsel — slik at alt som nettopp ble vist
 * regnes som sett selv ved klokkeavvik eller en økt logget for et øyeblikk siden.
 */
export function merkVarslerSett(nyesteTs = 0) {
  const verdi = Math.max(Date.now(), nyesteTs || 0);
  try { localStorage.setItem(SETT_KEY, String(verdi)); } catch { /* ignorer */ }
}

// Tidspunkt (ms) for en loggoppføring: `oppdatert` (skrivetidspunkt) er mest
// pålitelig; manuelle økter setter `dato` til kl. 12, så vi foretrekker oppdatert.
function loggTs(o) {
  const t = Date.parse(o.oppdatert || o.dato || '');
  return Number.isFinite(t) ? t : 0;
}

/**
 * Bygger hele varsel-feeden, nyeste først. Hvert element får `ulest` satt ut
 * fra sist-sett-tidspunktet på byggetidspunktet.
 */
export function byggVarsler(profil = hentProfil(), logg = hentLogg(), planer = hentPlan()) {
  const sett = settTidspunkt();
  const ut = [];

  // 1) Fullførte økter
  for (const o of logg) {
    const bev = loggBevegelse(o);
    const deler = [];
    if (o.varighetMin) deler.push(`${o.varighetMin} min`);
    if (o.xp) deler.push(`+${o.xp} XP`);
    ut.push({
      id: `okt-${o.id || loggTs(o)}`,
      type: 'okt',
      tittel: aktivitetNavn(o),
      tekst: deler.join(' · ') || 'Fullført',
      ikon: BEVEGELSER[bev]?.ikon || 'sjekk',
      farge: 'teal',
      ts: loggTs(o),
      href: '#/aktivitet',
    });
  }

  // 2) Nivå-opp (globalt). Løpende sum av xp i kronologisk rekkefølge — samme
  // tall som nivaFraTotalXp gir, siden globalXp bare er summen av øktenes xp.
  // En stor økt kan krysse flere terskler; da blir det ett varsel per nivå.
  const kron = [...logg].filter((o) => loggTs(o) > 0).sort((a, b) => loggTs(a) - loggTs(b));
  let sum = 0;
  for (const o of kron) {
    const for_ = nivaFraTotalXp(sum).niva;
    sum += o.xp || 0;
    const etter = nivaFraTotalXp(sum).niva;
    for (let n = for_ + 1; n <= etter; n++) {
      ut.push({
        id: `niva-${n}`,
        type: 'levelup',
        tittel: `Nivå ${n} nådd!`,
        tekst: 'Nytt globalt nivå — bra jobba.',
        ikon: 'stjerne',
        farge: 'gul',
        ts: loggTs(o),
        href: '#/merker',
      });
    }
  }

  // 3) Opptjente merker (bare de med kjent dato — noen få har null dato og
  // kan ikke plasseres i tid; de vises fortsatt på Profil).
  for (const m of merkerNå()) {
    if (!m.oppnadd || !m.dato) continue;
    const ts = Date.parse(m.dato);
    if (!Number.isFinite(ts)) continue;
    ut.push({
      id: `merke-${m.id}`,
      type: 'merke',
      tittel: `Merke: ${m.navn}`,
      tekst: m.tekst,
      ikon: m.ikon,
      farge: m.farge,
      ts,
      href: '#/merker',
    });
  }

  ut.sort((a, b) => b.ts - a.ts);
  return ut.map((v) => ({ ...v, ulest: v.ts > sett }));
}

/** Om det finnes minst ett ulest varsel (styrer prikken på bjella). */
export function harUlesteVarsler() {
  return byggVarsler().some((v) => v.ulest);
}

/** Relativ tid på norsk: «nå», «5 min siden», «3 t siden», «i går», ellers dato. */
export function tidSiden(ts, nå = Date.now()) {
  const min = Math.floor(Math.max(0, nå - ts) / 60000);
  if (min < 1) return 'nå';
  if (min < 60) return `${min} min siden`;
  const t = Math.floor(min / 60);
  if (t < 24) return `${t} t siden`;
  const dager = Math.floor(t / 24);
  if (dager === 1) return 'i går';
  if (dager < 7) return `${dager} dager siden`;
  return new Date(ts).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

/** Ett varsel som en lenke-rad (samme fargede sirkel-språk som merkene). */
export function varselKort(v) {
  return el('a', { class: 'varselkort' + (v.ulest ? ' varselkort--ulest' : ''), href: v.href },
    el('span', { class: `varselkort__disk movflis--${v.farge}` }, ikon(v.ikon)),
    el('div', { class: 'varselkort__meta' },
      el('span', { class: 'varselkort__tittel' }, v.tittel),
      el('span', { class: 'varselkort__tekst' }, v.tekst),
    ),
    el('span', { class: 'varselkort__tid' }, tidSiden(v.ts)),
    v.ulest && el('i', { class: 'varselkort__prikk', 'aria-label': 'ulest' }),
  );
}
