// Opplåsing (gate for øktbiblioteket). En bibliotekøkt kan bare gjøres når ALLE
// øvelsene i den — oppvarming, hovedarbeid, sekvenser og nedtrapping — er lært
// teknisk i Lær (fullført teknikk-leksjon). Låste økter vises grå med hengelås.
// Admin-e-poster kan åpne låste økter likevel, for testing.
//
// Matchingen går gjennom en kanonisk øvelsesnøkkel (ovelseKanon) slik at Lær og
// øktbiblioteket deler identitet på tvers av alias/varianter. Modulen har sin
// egen bib (settBib) i stedet for å importere sti.js, for å unngå en sirkulær
// import (sti → merker → bibliotek-okter → opplasing).
import { hentLogg } from './store.js';
import { ovelseKanon } from './ovelse.js';
import { brukerEpost } from './sync.js';

// Node-verdier i Lær-loggen som IKKE er øvelser (skal ikke telle som «lært»).
const IKKE_OVELSE = new Set(['boss', 'graduation', 'teori']);
// E-poster med admin-tilgang: ser fortsatt alt som låst, men kan åpne for test.
const ADMIN_EPOSTER = new Set(['richard-lund@hotmail.com']);

let _bib = null;
export function settBib(bib) { _bib = bib; }

/** Om innlogget bruker er admin (kan åpne låste økter for testing). */
export function erAdmin() {
  const e = brukerEpost();
  return !!e && ADMIN_EPOSTER.has(e.trim().toLowerCase());
}

/** Alle øvelser brukeren har lært teknikken på (globalt, alle Lær-seksjoner),
 *  som kanoniske nøkler for matching mot øktbiblioteket. */
export function laerteOvelseNokler() {
  const sett = new Set();
  for (const o of hentLogg()) {
    if (o.kilde !== 'laer' || !o.node || IKKE_OVELSE.has(o.node)) continue;
    const e = _bib?.ovelse(o.node);
    sett.add(ovelseKanon(e?.navn || o.node));
  }
  return sett;
}

/** Alle øvelsesnavn i en økt, på tvers av blokker (inkl. sekvensposisjoner). */
export function oktOvelseNavn(okt) {
  const navn = [];
  for (const b of okt?.blokker || []) {
    for (const ov of b.ovelser || []) {
      if (b.kind === 'sekvens') navn.push(...(ov.posisjoner || []));
      else if (ov.navn) navn.push(ov.navn);
    }
  }
  return navn;
}

/** Låsestatus for en økt: totalt/lærte unike øvelser + hvilke som mangler i Lær.
 *  `laast` = det finnes minst én øvelse som ennå ikke er lært. */
export function oktLast(okt) {
  const laerte = laerteOvelseNokler();
  const unike = new Map(); // kanon → første visningsnavn
  for (const n of oktOvelseNavn(okt)) {
    const k = ovelseKanon(n);
    if (!unike.has(k)) unike.set(k, n);
  }
  const mangler = [...unike.entries()].filter(([k]) => !laerte.has(k)).map(([, n]) => n);
  const totalt = unike.size;
  return { totalt, laerte: totalt - mangler.length, mangler, laast: totalt > 0 && mangler.length > 0 };
}

/** Om økta er utilgjengelig for DENNE brukeren (låst, og ikke admin). */
export function oktSperret(okt) {
  return oktLast(okt).laast && !erAdmin();
}
