// Biblioteklaget: laster statiske JSON-data (øvelsesoppslaget + utstyrsnavn).
// Generator-datafilene (templates/formats/warmups/gateways/chains/bundles)
// lastes ikke lenger — øktene kommer fra øktbiblioteket (bibliotek-okter.js).
// Dataene er statiske i repoet og caches av service-workeren, så dette
// fungerer offline etter første last. Ingen brukertilstand her.

const FILER = ['exercises', 'equipment'];

let _cache = null;

async function hentJson(navn) {
  const res = await fetch(`./data/${navn}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Kunne ikke laste data/${navn}.json (${res.status})`);
  return res.json();
}

/** Laster biblioteket én gang og bygger oppslagsindekser. */
export async function lastBibliotek() {
  if (_cache) return _cache;
  const deler = await Promise.all(FILER.map(hentJson));
  const data = Object.fromEntries(FILER.map((f, i) => [f, deler[i]]));

  const ovelseMap = new Map(data.exercises.map((e) => [e.id, e]));
  const utstyrMap = new Map(data.equipment.map((e) => [e.id, e]));

  _cache = {
    ...data,
    ovelseMap,
    utstyrMap,
    /** Alle øvelser i en modalitet. */
    ovelserForModalitet: (m) => data.exercises.filter((e) => e.modaliteter.includes(m)),
    /** Slår opp en øvelse. */
    ovelse: (id) => ovelseMap.get(id),
  };
  return _cache;
}

/** Liste over alle modaliteter som faktisk finnes i biblioteket, med antall. */
export function modalitetsoversikt(bib) {
  const teller = {};
  for (const e of bib.exercises) for (const m of e.modaliteter) teller[m] = (teller[m] || 0) + 1;
  return teller;
}

export const MODALITET_NAVN = {
  STY: 'Styrke', HIIT: 'HIIT', BASE: 'Base', MET: 'Metcon', SKILL: 'Ferdighet',
  PLYO: 'Plyo', YOGA: 'Yoga', PIL: 'Pilates', STR: 'Tøying', MOB: 'Mobilitet',
  CORE: 'Core', REST: 'Restitusjon', HYB: 'Hybrid',
};

export const MONSTER_NAVN = {
  'push-h': 'Push horisontal', 'push-v': 'Push vertikal', 'pull-h': 'Pull horisontal',
  'pull-v': 'Pull vertikal', kneboy: 'Knebøy', hengsel: 'Hengsel', utfall: 'Utfall',
  baering: 'Bæring', 'core-antiekst': 'Core anti-ekstensjon', 'core-antirot': 'Core anti-rotasjon',
  'core-lat': 'Core lateral', 'core-rot': 'Core rotasjon', 'core-flex': 'Core fleksjon',
  'core-heng': 'Core heng', lokomotorisk: 'Lokomotorisk', hopp: 'Hopp', balanse: 'Balanse',
  helkropp: 'Helkropp', mobilitet: 'Mobilitet', skill: 'Ferdighet', pust: 'Pust', flyt: 'Flyt',
};
