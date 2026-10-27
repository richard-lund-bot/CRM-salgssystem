// Morgenbriefen i Darios stemme: et kort manus (ca. 60–90 sekunder) bygget fra
// prioriteringene. Manuset er skrevet for øret: klokkeslett og beløp i ord, korte
// setninger, og Dario sin tone (blid, kort og fagstolt – rørleggerhumor sparsomt).
// I produksjon kan en språkmodell skrive manuset fra de samme strukturerte
// dataene; malen her viser formen og holder seg til fakta.

const TALLORD = ['null', 'ett', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti', 'elleve', 'tolv'];
const tall = (n) => TALLORD[n] ?? String(n);
const stor = (s) => s[0].toUpperCase() + s.slice(1);

// «10:30» → «halv elleve», «08:00» → «åtte», «13:15» → «kvart over ett».
export function klokkeTekst(hhmm) {
  const [t, m] = hhmm.split(':').map(Number);
  const time = (h) => tall(((h + 11) % 12) + 1);
  if (m === 0) return time(t);
  if (m === 30) return `halv ${time(t + 1)}`;
  if (m === 15) return `kvart over ${time(t)}`;
  if (m === 45) return `kvart på ${time(t + 1)}`;
  return hhmm.replace(':', '.');
}

// Beløp slik man sier dem: «3,6 millioner kroner», «640 000 kroner».
export function kroner(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} millioner kroner`;
  return `${n.toLocaleString('nb-NO')} kroner`;
}

// Én for felleskjønn: «én avtale», «én person».
const antallFelles = (n) => (n === 1 ? 'én' : tall(n));

// Skrevet tekst → tale: beløp, klokkeslett, prosent og forkortelser i ord.
const tilTale = (s) => s
  .replace(/(\d[\d\s\u00a0]*(?:,\d+)?) mill\. kr/g, '$1 millioner kroner')
  .replace(/(\d[\d\s\u00a0]*) kr\b/g, '$1 kroner')
  .replace(/kl\. (\d\d:\d\d)/g, (_, k) => `klokka ${klokkeTekst(k)}`)
  .replace(/ %/g, ' prosent')
  .replace(/\bmnd\b/g, 'måneder')
  .replace(/\s*\(([^)]+)\)/g, ', $1,')
  .replace(/: /g, ', ');

// Begrunnelsene fra prioriteringsmotoren, omskrevet slik man sier dem.
const GRUNN_TALE = [
  [/^Noen venter på svar fra deg$/, 'noen venter på svar'],
  [/^Frist i dag$/, 'fristen er i dag'],
  [/^Frist i morgen$/, 'fristen er i morgen'],
  [/^Frist om (\d+) dager$/, (_, n) => `fristen er om ${tall(Number(n))} dager`],
  [/^Konkurrent er inne i bildet$/, 'en konkurrent er inne i bildet'],
  [/^Reklamasjon – kunden står$/, 'kunden står og venter på riktig vare'],
  [/^Verdi (.+)$/, (_, v) => `det gjelder ${v}`],
  [/^Henger sammen med .*$/, 'det henger sammen med en annen sak på samme kunde'],
  [/^Påvirker åpne tilbud$/, 'det påvirker åpne tilbud'],
  [/^Ny salgsmulighet$/, 'det er en ny salgsmulighet'],
  [/^Avvik i levering$/, 'det er avvik i leveringen'],
  [/^Nøkkelkunde med fallende kjøp$/, 'det er en nøkkelkunde med fallende kjøp'],
];
const grunnTilTale = (g) => {
  for (const [monster, erstatt] of GRUNN_TALE) if (monster.test(g)) return tilTale(g.replace(monster, erstatt));
  return tilTale(g).toLowerCase();
};
const lavForste = (s) => s[0].toLowerCase() + s.slice(1);

// Returnerer en liste med setninger (vises som teksting og leses opp én og én).
export function lagManus(ansatt, { prioriteringer, nokkel, kalender }) {
  const fornavn = ansatt.navn.split(' ')[0];
  const moter = kalender[ansatt.id] ?? [];
  const s = [];
  s.push(`Hei, ${fornavn}! Dario her. Skal vi få flyt i dagen?`);

  if (moter.length) {
    const forste = moter[0];
    s.push(`Du har ${antallFelles(moter.length)} ${moter.length === 1 ? 'avtale' : 'avtaler'} i dag. Den første er ${lavForste(forste.tittel)}, klokka ${klokkeTekst(forste.tid)}.`);
  } else {
    s.push('Kalenderen er tom i dag. Perfekt dag for kundebesøk!');
  }

  if (nokkel.svarForventet) {
    s.push(`${stor(antallFelles(nokkel.svarForventet))} ${nokkel.svarForventet === 1 ? 'person venter' : 'personer venter'} på svar fra deg.`);
  }

  const topp = prioriteringer.slice(0, 3);
  if (topp.length) {
    s.push(topp.length === 1 ? 'Jeg har én ting du bør ta først.' : `Jeg har ${tall(topp.length)} ting du bør ta først.`);
    const ord = ['Først', 'Så', 'Og til slutt'];
    topp.forEach((p, i) => {
      const hvorfor = p.grunner.filter((g) => g !== 'Midt i ditt fokusområde').slice(0, 2).map(grunnTilTale).join(', og ');
      s.push(`${ord[i]}: ${tilTale(p.signal.tittel)}.${hvorfor ? ` ${stor(hvorfor)}.` : ''}`);
    });
  }

  if (nokkel.muligheter) {
    s.push(`I nyhetene fant jeg ${nokkel.muligheter === 1 ? 'én ny mulighet' : `${tall(nokkel.muligheter)} nye muligheter`} i segmentet ditt.`);
  }
  if (nokkel.aapenPipeline) {
    s.push(`Åpen pipeline er ${kroner(nokkel.aapenPipeline)}.`);
  }
  s.push('Det var alt fra meg. Flyt for fagfolk – ha en god dag!');
  // Vanlige mellomrom overalt (tallformatering gir ulike harde mellomrom i ulike
  // nettlesere), så setningene alltid matcher nøklene til stemmeklippene.
  return s.map((x) => x.replace(/\s/g, ' '));
}
