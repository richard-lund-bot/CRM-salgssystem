// Morgenbriefen som tale: et kort manus (ca. 60–90 sekunder) bygget fra
// prioriteringene. I produksjon kan en språkmodell skrive manuset fra de samme
// strukturerte dataene; malen her viser formen og holder seg til fakta.
import { kr } from './prioritering.js';

export function hilsen(time) {
  if (time < 10) return 'God morgen';
  if (time < 17) return 'God dag';
  return 'God kveld';
}

const TALLORD = ['null', 'ett', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti'];
const tall = (n) => TALLORD[n] ?? String(n);

// Returnerer en liste med setninger (vises som teksting mens briefen leses opp).
export function lagManus(ansatt, { prioriteringer, nokkel, kalender, time }) {
  const fornavn = ansatt.navn.split(' ')[0];
  const moter = kalender[ansatt.id] ?? [];
  const s = [];
  s.push(`${hilsen(time)}, ${fornavn}. Her er dagen din.`);

  if (moter.length) {
    const forste = moter[0];
    s.push(`Du har ${tall(moter.length)} ${moter.length === 1 ? 'avtale' : 'avtaler'} i dag. Første er ${forste.tittel.toLowerCase()} klokka ${forste.tid}.`);
  } else {
    s.push('Kalenderen er tom i dag – en god dag for kundebesøk.');
  }

  if (nokkel.svarForventet) {
    const antall = tall(nokkel.svarForventet);
    s.push(`${antall[0].toUpperCase()}${antall.slice(1)} ${nokkel.svarForventet === 1 ? 'person venter' : 'personer venter'} på svar fra deg.`);
  }

  const topp = prioriteringer.slice(0, 3);
  if (topp.length) {
    s.push(`Jeg foreslår ${tall(topp.length)} prioriteringer.`);
    const ord = ['Først', 'Deretter', 'Og til slutt'];
    topp.forEach((p, i) => {
      const hvorfor = p.grunner.slice(0, 2).join(', ').toLowerCase();
      s.push(`${ord[i]}: ${p.signal.tittel}. ${hvorfor ? `Fordi: ${hvorfor}.` : ''}`.trim());
    });
  }

  if (nokkel.muligheter) {
    s.push(`I nyhetene ser jeg ${tall(nokkel.muligheter)} ${nokkel.muligheter === 1 ? 'mulighet' : 'muligheter'} i ditt segment.`);
  }
  if (nokkel.aapenPipeline) {
    s.push(`Åpen pipeline er ${kr(nokkel.aapenPipeline)}.`);
  }
  s.push('Lykke til i dag.');
  return s;
}
