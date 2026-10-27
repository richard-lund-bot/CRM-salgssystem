// Prioriteringsmotoren: tar alle signaler (e-post, intranett, nyheter, CRM,
// lager, kalender) og rangerer dem for én ansatt. Bevisst regelbasert og
// forklarbar: hver prioritet har en liste med «hvorfor». En språkmodell kan
// senere skrive teksten, men rekkefølgen skal kunne etterprøves.
// Rene funksjoner (testes i scripts/test.mjs).

const FLAGG = {
  reklamasjon: [30, 'Reklamasjon – kunden står'],
  'svar-forventet': [20, 'Noen venter på svar fra deg'],
  utløper: [18, 'Tilbudet utløper snart'],
  frafallsrisiko: [15, 'Nøkkelkunde med fallende kjøp'],
  konkurrent: [12, 'Konkurrent er inne i bildet'],
  avvik: [12, 'Avvik i levering'],
  'påvirker-tilbud': [10, 'Påvirker åpne tilbud'],
  mulighet: [8, 'Ny salgsmulighet'],
};

const HANDLING = {
  tilbud: { tekst: 'Lag/oppdater tilbud i Dario', modul: 'tilbud' },
  kunde: { tekst: 'Ring eller besøk kunden', modul: 'kunder' },
  prosjekt: { tekst: 'Book møte og kvalifiser prosjektet', modul: 'kunder' },
  levering: { tekst: 'Sjekk ordren og gi kunden ny dato', modul: 'lager' },
  nyhet: { tekst: 'Vurder hvilke kunder dette angår', modul: 'nyheter' },
  intern: { tekst: 'Les og sett av tid', modul: 'intranett' },
  team: { tekst: 'Ta det opp med teamet', modul: 'team' },
};

export function gjelder(signal, ansatt) {
  return signal.for.some((f) => f === '*' || f === ansatt.id || f === `rolle:${ansatt.rolle}`);
}

function hast(fristOm) {
  if (fristOm == null) return [0, null];
  if (fristOm <= 0) return [35, 'Frist i dag'];
  if (fristOm === 1) return [25, 'Frist i morgen'];
  if (fristOm === 2) return [18, 'Frist om 2 dager'];
  if (fristOm === 3) return [12, 'Frist om 3 dager'];
  if (fristOm <= 5) return [6, `Frist om ${fristOm} dager`];
  return [0, null];
}

function verdiPoeng(verdi) {
  if (!verdi) return 0;
  return Math.max(0, Math.min(15, (Math.log10(verdi) - 4) * 6));
}

export const kr = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mill. kr`
    : `${n.toLocaleString('nb-NO')} kr`;

// Ranger signaler for en ansatt. Returnerer [{ signal, score, grunner, handling }].
export function prioriter(ansatt, { signaler, roller, kunder, kalender }) {
  const fokus = roller[ansatt.rolle]?.fokus ?? {};
  const kundeById = Object.fromEntries(kunder.map((k) => [k.id, k]));
  const mote = Object.fromEntries((kalender[ansatt.id] ?? []).filter((m) => m.kunde).map((m) => [m.kunde, m]));
  const mine = signaler.filter((s) => gjelder(s, ansatt));
  const perKunde = {};
  for (const s of mine) if (s.kunde) (perKunde[s.kunde] ??= []).push(s);

  const rangert = mine.map((s) => {
    const grunner = [];
    let poeng = 10;
    for (const f of s.flagg) {
      const [p, tekst] = FLAGG[f] ?? [0, null];
      poeng += p;
      if (tekst) grunner.push(tekst);
    }
    const [hp, ht] = hast(s.fristOm);
    poeng += hp;
    if (ht) grunner.push(ht);
    const vp = verdiPoeng(s.verdi);
    poeng += vp;
    if (vp >= 8) grunner.push(`Verdi ${kr(s.verdi)}`);
    const kunde = kundeById[s.kunde];
    if (kunde?.nokkel) { poeng += 8; grunner.push(`${kunde.navn} er nøkkelkunde`); }
    if (s.kunde && mote[s.kunde]) { poeng += 10; grunner.push(`Du møter kunden i dag kl. ${mote[s.kunde].tid}`); }
    const relaterte = (perKunde[s.kunde] ?? []).filter((r) => r.id !== s.id);
    if (relaterte.length) { poeng += 5 * relaterte.length; grunner.push(`Henger sammen med ${relaterte.length} annet signal om samme kunde`); }
    const vekt = fokus[s.type] ?? 1;
    if (vekt >= 1.3) grunner.push('Midt i ditt fokusområde');
    return { signal: s, score: Math.round(poeng * vekt), grunner, handling: HANDLING[s.type] };
  });
  return rangert.sort((a, b) => b.score - a.score || (a.signal.fristOm ?? 99) - (b.signal.fristOm ?? 99));
}

// Nøkkeltall til den visuelle rapporten.
export function nokkeltall(ansatt, { signaler, kalender, pipeline }) {
  const mine = signaler.filter((s) => gjelder(s, ansatt));
  const p = pipeline[ansatt.id] ?? {};
  return {
    svarForventet: mine.filter((s) => s.flagg.includes('svar-forventet')).length,
    fristerToDager: mine.filter((s) => s.fristOm != null && s.fristOm <= 2).length,
    moter: (kalender[ansatt.id] ?? []).length,
    aapenPipeline: Object.entries(p).filter(([trinn]) => trinn !== 'Vunnet').reduce((sum, [, v]) => sum + v, 0),
    muligheter: mine.filter((s) => s.flagg.includes('mulighet')).length,
  };
}
