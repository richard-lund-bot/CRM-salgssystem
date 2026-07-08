// Generatoren (LAG 2): input (modalitet/tid/intensitet/lokasjon) → deterministisk økt.
// Leser biblioteket + brukerprofilen, velger en øktmal, og fyller hver blokk ved å
// filtrere øvelser (utstyr i lokasjonen ∩ nivå ulåst ∩ mønster/modalitet-krav ∩
// impact-regel) og dele med seed (v1-dealeren, nå generalisert). Ingen Math.random().
import { lagRng, stokk, rngInt } from './rng.js';
import { erUlast } from './niva.js';

// --- Lokasjon → tilgjengelig utstyr ---------------------------------------
export function tilgjengeligUtstyr(bib, profil, lokasjonNavn) {
  const lok = finnLokasjon(profil, lokasjonNavn);
  const sett = new Set(['kv']); // kroppsvekt er alltid på
  if (!lok) return sett;
  if (lok.utstyr?.length) {
    for (const id of lok.utstyr) sett.add(id);
  } else if (lok.bundleId) {
    for (const id of bib.losBunke(lok.bundleId, false)) sett.add(id);
    for (const id of lok.varierer || []) sett.add(id);
  }
  return sett;
}

export function finnLokasjon(profil, navn) {
  const lok = profil?.lokasjoner || [];
  return lok.find((l) => l.navn === (navn || profil?.aktivLokasjon)) || lok[0] || null;
}

// Velger første variant som er dekket av utstyret på stedet.
function velgVariant(e, utstyrSett) {
  for (const v of e.varianter) {
    if ((v.utstyr || []).every((u) => utstyrSett.has(u))) {
      return {
        utstyr: v.utstyr || [],
        navn: v.navnOverstyr || e.navn,
        nivaJust: v.nivaJust || 0,
      };
    }
  }
  return null;
}

function effektivNiva(e, variant) {
  return Math.max(1, Math.min(5, e.niva + (variant?.nivaJust || 0)));
}

// --- Kandidatutvelgelse for én øvelsesblokk -------------------------------
// Bygger {ovelse, variant}-liste som oppfyller alle harde krav, med myke
// filtre (tags, nivåtak, impact) som slakkes hvis blokka ellers blir tom.
function kandidater(bib, filter, ctx, slakk = 0) {
  let pool = bib.exercises;
  if (filter.kjeder) pool = pool.filter((e) => filter.kjeder.includes(e.kjede));
  if (filter.monstre) pool = pool.filter((e) => filter.monstre.includes(e.monster));
  if (filter.modaliteter) pool = pool.filter((e) => e.modaliteter.some((m) => filter.modaliteter.includes(m)));
  if (filter.ovelse) pool = pool.filter((e) => e.id === filter.ovelse);
  if (filter.type) pool = pool.filter((e) => e.type === filter.type);

  // Myk: tags (slakkes på nivå ≥ 1)
  if (filter.tags && slakk < 1) {
    const t = pool.filter((e) => (e.tags || []).some((x) => filter.tags.includes(x)));
    if (t.length) pool = t;
  }

  const ut = [];
  for (const e of pool) {
    const variant = velgVariant(e, ctx.utstyrSett);
    if (!variant) continue; // ingen dekket variant på stedet
    const nv = effektivNiva(e, variant);
    // Myk: nivåtak (base + gateway + overstyring, slakkes på nivå ≥ 2)
    if (slakk < 2 && !erUlast(ctx.profil, e, nv, ctx.gateways, ctx.nå)) continue;
    // Myk: unngå høy impact ved lav intensitet (slakkes på nivå ≥ 1)
    if (slakk < 1 && ctx.intensitet <= 2 && e.impact === 'hoy') continue;
    ut.push({ ovelse: e, variant, niva: nv });
  }
  return ut;
}

// Deler ut `antall` øvelser med seed, unngår gjentak, balanserer push:pull.
function del(kandidatliste, antall, ctx, balansert) {
  const brukt = (k) => ctx.brukte.has(k.ovelse.id);
  const nylig = (k) => ctx.nyligeIder.has(k.ovelse.id);
  // Prioriter øvelser som ikke er brukt i økta eller nylig i historikken.
  const rangert = stokk(kandidatliste, ctx.rng).sort(
    (a, b) => (brukt(a) - brukt(b)) || (nylig(a) - nylig(b)),
  );

  let valgt;
  if (balansert === 'push-pull') {
    const push = rangert.filter((k) => k.ovelse.monster.startsWith('push'));
    const pull = rangert.filter((k) => k.ovelse.monster.startsWith('pull'));
    const rest = rangert.filter((k) => !k.ovelse.monster.startsWith('push') && !k.ovelse.monster.startsWith('pull'));
    valgt = [];
    let i = 0;
    while (valgt.length < antall && (push.length || pull.length || rest.length)) {
      const kilde = (i % 2 === 0 ? (push.length ? push : pull) : (pull.length ? pull : push));
      const k = (kilde.length ? kilde : rest).shift();
      if (k) valgt.push(k);
      i++;
    }
  } else {
    valgt = rangert.slice(0, antall);
  }
  for (const k of valgt) ctx.brukte.add(k.ovelse.id);
  return valgt;
}

// Hvor mange øvelser en blokk uten eksplisitt `antall` skal ha.
function antallFra(filter, min, perMin) {
  if (Number.isFinite(filter.antall)) return filter.antall;
  return Math.max(2, Math.min(8, Math.round(min / perMin)));
}

// --- Formatparametre skalert mot blokk-lengde og intensitet ---------------
function formatParametre(fmt, min, intensitet, antall) {
  const p = { ...(fmt.parametre || {}) };
  const sek = min * 60;
  const hardere = intensitet >= 4;
  switch (fmt.id) {
    case 'intervall': {
      if (hardere) { p.arbeidSek = 45; p.hvileSek = 15; }
      p.runder = Math.max(4, Math.min(16, Math.round(sek / (p.arbeidSek + p.hvileSek))));
      break;
    }
    case 'tri-set':
      p.runder = Math.max(2, Math.min(5, Math.round(sek / (antall * (p.arbeidSek + p.pauseSek)))));
      break;
    case 'tabata':
      p.runder = 8; // fast 4-min-blokk
      break;
    case 'emom':
      p.minutter = Math.max(4, Math.min(20, Math.round(min)));
      if (hardere) p.reps += 2;
      break;
    case 'e2mom':
      p.minutter = Math.max(6, Math.min(20, Math.round(min)));
      break;
    case 'amrap':
      p.tidMin = Math.max(5, Math.round(min));
      break;
    case 'for-time':
      p.capMin = Math.max(5, Math.round(min));
      break;
    case 'density-block':
      p.tidMin = Math.max(5, Math.round(min));
      break;
    case 'sirkel':
      p.stasjoner = antall || p.stasjoner;
      p.runder = Math.max(2, Math.min(5, Math.round(sek / (p.stasjoner * 45))));
      break;
    case 'tid-i-sone':
      p.tidMin = Math.max(5, Math.round(min));
      break;
    case 'yin':
      p.posisjoner = antall || 1;
      p.tidMin = Math.max(2, Math.round(min / Math.max(1, antall)));
      break;
    case 'styrkehold':
      p.sett = Math.max(2, Math.min(5, Math.round(min)));
      if (hardere) p.tidSek += 10;
      break;
    case 'statisk-toy':
      p.sett = 2;
      break;
    case 'straight-sets':
    case 'supersett':
      if (hardere) p.pauseSek = Math.max(45, p.pauseSek - 15);
      break;
    default:
      break;
  }
  return p;
}

// --- Fyll én blokk --------------------------------------------------------
function fyllBlokk(bib, blokk, ctx) {
  const fmt = ctx.formatMap.get(blokk.format) || { id: blokk.format, navn: blokk.format, klasse: 'reps', parametre: {} };
  const f = blokk.filter || {};
  const base = {
    rolle: blokk.rolle,
    format: fmt.id,
    formatNavn: fmt.navn,
    formatKlasse: fmt.klasse,
    min: blokk.min,
    filter: f,
    notat: blokk.notat || '',
  };

  // 1) Oppvarming / nedtrapping fra pool
  if (f.pool) {
    const pool = f.pool.startsWith('nedtrapping') ? bib.warmups.nedtrapping : bib.warmups.oppvarming;
    const dekket = pool.filter((w) => (w.utstyr || []).every((u) => ctx.utstyrSett.has(u)));
    const n = antallFra(f, blokk.min, 1.5);
    const valgt = stokk(dekket.length ? dekket : pool, ctx.rng).slice(0, n);
    return { ...base, kind: 'oppvarming', ovelser: valgt.map((w) => ({ id: w.id, navn: w.navn, dose: w.dose })), parametre: {} };
  }

  // 2) Fast yoga-/complex-sekvens
  if (f.sekvens) {
    const seq = bib.sequences.find((s) => s.id === f.sekvens);
    const parametre = formatParametre(fmt, blokk.min, ctx.intensitet, 1);
    if (f.runder) parametre.runder = f.runder;
    return {
      ...base, kind: 'sekvens',
      ovelser: seq ? [{ id: seq.id, navn: seq.navn, beskrivelse: seq.beskrivelse, posisjoner: seq.posisjoner || [] }] : [],
      parametre,
    };
  }

  // 3) Pusteprotokoll (box/4-7-8/koherent) eller navngitt protokoll (bodyscan)
  const pustId = { 'box-breathing': 'box-breathing', '4-7-8': '4-7-8', koherent: 'koherent-pust' }[fmt.id];
  if (pustId || f.protokoll) {
    const pid = f.protokoll || pustId;
    const prot = bib.protocols.find((p) => p.id === pid) || null;
    return {
      ...base, kind: 'pust',
      ovelser: prot ? [{ id: prot.id, navn: prot.navn, takt: prot.takt, bruk: prot.bruk }] : [],
      parametre: { tidMin: Math.max(2, Math.round(blokk.min)), takt: prot?.takt || null },
    };
  }

  // 4) Ren kondisjonsblokk (tid i sone / distanse / 4×4) uten øvelsesutvalg
  if (fmt.klasse === 'dist') {
    return {
      ...base, kind: 'kondisjon',
      ovelser: [],
      parametre: { ...formatParametre(fmt, blokk.min, ctx.intensitet, 1), sone: f.sone || fmt.parametre?.sone || 'Z2' },
    };
  }

  // 5) Øvelsesblokk — filtrer og del med seed, slakk hardt til den ikke er tom
  const perMin = { oppvarming: 1.5, finisher: 2, hoved: 4, nedtrapping: 2.5 }[blokk.rolle] || 3;
  const antall = antallFra(f, blokk.min, perMin);
  let kand = [];
  for (let slakk = 0; slakk <= 3 && kand.length < antall; slakk++) {
    kand = kandidater(bib, f, ctx, slakk);
  }
  const valgt = del(kand, antall, ctx, f.balansert);
  return {
    ...base, kind: 'ovelser',
    ovelser: valgt.map((k) => ({
      id: k.ovelse.id,
      navn: k.variant.navn,
      monster: k.ovelse.monster,
      modaliteter: k.ovelse.modaliteter,
      niva: k.niva,
      type: k.ovelse.type,
      unilateral: k.ovelse.unilateral,
      impact: k.ovelse.impact,
      utstyr: k.variant.utstyr,
      abBreak: !!f.abBreak,
    })),
    parametre: formatParametre(fmt, blokk.min, ctx.intensitet, antall),
  };
}

// --- Malvalg --------------------------------------------------------------
const KLASSE_REKKE = ['mikro', 'kort', 'standard', 'lang', 'utvidet'];

export function velgMal(bib, modalitet, varighetsklasse) {
  const forMod = bib.templates.filter((t) => t.modalitet === modalitet);
  if (!forMod.length) return bib.templates[0];
  const eksakt = forMod.find((t) => t.varighetsklasse === varighetsklasse);
  if (eksakt) return eksakt;
  // Nærmeste varighetsklasse.
  const mål = KLASSE_REKKE.indexOf(varighetsklasse);
  return forMod.slice().sort((a, b) =>
    Math.abs(KLASSE_REKKE.indexOf(a.varighetsklasse) - mål) - Math.abs(KLASSE_REKKE.indexOf(b.varighetsklasse) - mål),
  )[0];
}

// --- Hovedinngang ---------------------------------------------------------
/**
 * @param valg { modalitet, varighetsklasse, intensitet, lokasjon?, seed?, nyligeIder? }
 * @returns Session
 */
export function genererOkt(bib, profil, valg) {
  const mal = velgMal(bib, valg.modalitet, valg.varighetsklasse);
  const lokasjonNavn = valg.lokasjon || profil?.aktivLokasjon || finnLokasjon(profil)?.navn || 'Hjemme';
  const seed = valg.seed || `${valg.modalitet}|${valg.varighetsklasse}|${valg.intensitet}|${lokasjonNavn}|${valg.stempel || ''}`;

  const ctx = {
    profil,
    gateways: bib.gateways,
    nå: valg.nå || Date.now(),
    formatMap: new Map(bib.formats.map((f) => [f.id, f])),
    utstyrSett: tilgjengeligUtstyr(bib, profil, lokasjonNavn),
    rng: lagRng(seed),
    brukte: new Set(),
    nyligeIder: new Set(valg.nyligeIder || []),
    intensitet: valg.intensitet || 3,
  };

  const blokker = mal.blokker.map((b) => fyllBlokk(bib, b, ctx));
  const varighetMin = mal.blokker.reduce((s, b) => s + (b.min || 0), 0);

  return {
    id: `okt-${seed}`,
    seed,
    templateId: mal.id,
    malNavn: mal.navn,
    modalitet: mal.modalitet,
    varighetsklasse: mal.varighetsklasse,
    intensitet: ctx.intensitet,
    lokasjon: lokasjonNavn,
    varighetMin,
    blokker,
    generertAv: valg,
  };
}

/**
 * Bytt én øvelse i en blokk — samme filter, ny kandidat som ikke alt er i blokka.
 * Returnerer en oppdatert kopi av økta (ren funksjon).
 */
export function byttOvelse(bib, profil, okt, blokkIdx, ovelseIdx) {
  const blokk = okt.blokker[blokkIdx];
  if (!blokk || blokk.kind !== 'ovelser') return okt;
  const ctx = {
    profil,
    gateways: bib.gateways,
    nå: Date.now(),
    formatMap: new Map(bib.formats.map((f) => [f.id, f])),
    utstyrSett: tilgjengeligUtstyr(bib, profil, okt.lokasjon),
    rng: lagRng(`${okt.seed}|bytt|${blokkIdx}|${ovelseIdx}|${blokk.ovelser[ovelseIdx]?.id}`),
    intensitet: okt.intensitet,
  };
  const iBruk = new Set(blokk.ovelser.map((o) => o.id));
  let kand = [];
  for (let slakk = 0; slakk <= 3 && !kand.length; slakk++) {
    kand = kandidater(bib, blokk.filter, ctx, slakk).filter((k) => !iBruk.has(k.ovelse.id));
  }
  if (!kand.length) return okt;
  const ny = stokk(kand, ctx.rng)[0];
  const nyBlokker = okt.blokker.slice();
  const nyOvelser = blokk.ovelser.slice();
  nyOvelser[ovelseIdx] = {
    id: ny.ovelse.id, navn: ny.variant.navn, monster: ny.ovelse.monster,
    modaliteter: ny.ovelse.modaliteter, niva: ny.niva, type: ny.ovelse.type,
    unilateral: ny.ovelse.unilateral, impact: ny.ovelse.impact, utstyr: ny.variant.utstyr,
    abBreak: blokk.ovelser[ovelseIdx]?.abBreak,
  };
  nyBlokker[blokkIdx] = { ...blokk, ovelser: nyOvelser };
  return { ...okt, blokker: nyBlokker };
}

/** Regenerer én blokk på nytt (ny deal), uten å røre resten av økta. */
export function regenererBlokk(bib, profil, okt, blokkIdx) {
  const mal = bib.templates.find((t) => t.id === okt.templateId);
  const malBlokk = mal?.blokker[blokkIdx];
  if (!malBlokk) return okt;
  // Unngå øvelser som allerede er i de andre blokkene.
  const brukteAndre = new Set();
  okt.blokker.forEach((b, i) => { if (i !== blokkIdx) for (const o of b.ovelser || []) brukteAndre.add(o.id); });
  const ctx = {
    profil,
    gateways: bib.gateways,
    nå: Date.now(),
    formatMap: new Map(bib.formats.map((f) => [f.id, f])),
    utstyrSett: tilgjengeligUtstyr(bib, profil, okt.lokasjon),
    rng: lagRng(`${okt.seed}|blokk|${blokkIdx}|${rngInt(lagRng(okt.seed + blokkIdx + (okt.blokker[blokkIdx].ovelser[0]?.id || '')), 1e6)}`),
    brukte: brukteAndre,
    nyligeIder: new Set(),
    intensitet: okt.intensitet,
  };
  const ny = fyllBlokk(bib, malBlokk, ctx);
  const nyBlokker = okt.blokker.slice();
  nyBlokker[blokkIdx] = ny;
  return { ...okt, blokker: nyBlokker };
}

/** Regenerer hele økta med ny seed (samme input). */
export function regenerer(bib, profil, okt) {
  const suffix = (okt.seed.match(/#(\d+)$/) || [])[1];
  const n = suffix ? Number(suffix) + 1 : 1;
  const grunnseed = okt.seed.replace(/#\d+$/, '');
  return genererOkt(bib, profil, { ...okt.generertAv, seed: `${grunnseed}#${n}`, lokasjon: okt.lokasjon });
}
