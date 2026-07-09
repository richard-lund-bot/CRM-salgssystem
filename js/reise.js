// Min reise (M11 — spec §10.2/§12): det emosjonelle progresjonsnavet.
// Figuren går langs en sti gjennom miljøet sitt; nivå, XP, neste belønning,
// Momentum-rytme og milepælsstien vises varmt og uten press. Grafene bor i
// Aktivitet — dette er reisen. «Din reise. Ditt tempo. Din vei.»
import { el, tom, ikon } from './ui.js';
import { hentProfil, hentLogg } from './store.js';
import {
  nivaFraTotalXp, tittelFor, belonningFor, nesteBelonning, belonningIkonNavn,
  nesteGjenstander, laasTekst,
} from './belonninger.js';
import { tegnFigur, tegnMiljo, sikreFigur, MILJOER } from './figur.js';
import { bevegelsesMomentum, dagerMedAktivitet } from './bevegelse.js';
import { fyllInn } from './animasjon.js';

let _bib = null;
export function settBib(bib) { _bib = bib; }

export function visReiseSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { location.hash = '#/hjem'; return; }
  const logg = hentLogg();
  const figur = sikreFigur(profil);
  const info = nivaFraTotalXp(profil.globalXp || 0);
  const mom = bevegelsesMomentum(logg);

  tom(mount);
  mount.append(
    el('header', { class: 'topp' },
      el('h1', { class: 'topp__tittel' }, 'Min reise'),
      el('p', { class: 'topp__under' }, 'Ditt tempo. Din vei.'),
    ),
    el('main', { class: 'innhold' },
      sceneKort(),
      momentumKort(),
      stiKort(),
      nesteKort(),
      el('div', { class: 'knapprad' },
        el('a', { class: 'knapp', href: '#/tilpass' }, 'Tilpass figur'),
        el('a', { class: 'knapp knapp--sekundaer', href: '#/beveg' }, 'Beveg deg'),
      ),
      el('a', { class: 'listerad listerad--enkel', href: '#/progresjon' },
        el('span', { class: 'listerad__ikon' }, ikon('graf')),
        el('span', { class: 'listerad__navn' }, 'Progresjon per treningsform (avansert)'),
        el('span', { class: 'listerad__chevron' }, ikon('chevron')),
      ),
    ),
  );

  // --- Scenen: miljø + gående figur + nivå/XP -------------------------------
  function sceneKort() {
    const neste = nesteBelonning(info.niva, _bib);
    const fyll = el('div', { class: 'xpbar__fyll' });
    fyllInn(fyll, 'width', `${info.pct}%`);
    const miljoNavn = MILJOER[figur.miljo]?.navn || 'Engstien';

    return el('div', { class: 'kort reise-scene' },
      el('div', { class: 'reise-scene__vindu' },
        tegnMiljo(figur.miljo, { klasse: 'reise-scene__miljo' }),
        el('div', { class: 'reise-scene__figur' }, tegnFigur(figur, { pose: 'gaa', bredde: 84 })),
      ),
      el('div', { class: 'reise-scene__meta' },
        el('div', {},
          el('div', { class: 'reise-scene__tittel' }, figur.tittel || tittelFor(info.niva)),
          el('div', { class: 'dempet' }, `${miljoNavn} · Nivå ${info.niva}`),
        ),
        el('div', { class: 'reise-scene__niva' }, String(info.niva)),
      ),
      el('div', { class: 'xpbar xpbar--stor' }, fyll),
      el('div', { class: 'reise-scene__under' },
        el('span', { class: 'dempet' }, `${info.inne} / ${info.tilNeste} XP`),
        el('span', { class: 'dempet reise-scene__neste' }, ikon(belonningIkonNavn(neste)), ` Neste: ${neste.navn || ''}`),
      ),
    );
  }

  // --- Momentum: rytmen din — aldri en streak som «ryker» -------------------
  function momentumKort() {
    const dager = dagerMedAktivitet(logg, Date.now(), 7);
    const navnene = ukedagsNavn();
    return el('div', { class: 'kort' },
      el('h2', {}, 'Momentum'),
      el('div', { class: 'momdager' },
        ...dager.map((min, i) => el('div', { class: 'momdag' },
          el('i', { class: 'momdag__prikk' + (min > 0 ? ' momdag__prikk--aktiv' : '') + (i === 6 ? ' momdag__prikk--idag' : '') }),
          el('span', { class: 'momdag__navn' }, navnene[i]),
        )),
      ),
      el('p', { class: 'oppmuntring__tittel' }, mom.tekst),
      el('p', { class: 'dempet' }, mom.undertekst),
    );
  }

  // --- Stien: milepæler bak og foran deg -------------------------------------
  function stiKort() {
    const fra = Math.max(2, info.niva - 1);
    const til = info.niva + 6;
    const rader = [];
    for (let n = til; n >= fra; n--) {
      const b = belonningFor(n, _bib);
      const status = n < info.niva ? 'bak' : n === info.niva ? 'her' : 'foran';
      rader.push(el('div', { class: `sti__steg sti__steg--${status}` },
        el('span', { class: 'sti__node' },
          status === 'her' ? tegnFigur(figur, { pose: 'idle', bredde: 34 })
            : status === 'bak' ? ikon('sjekk') : String(n),
        ),
        el('div', { class: 'sti__meta' },
          el('span', { class: 'sti__niva' }, status === 'her' ? `Du er her — nivå ${n}` : `Nivå ${n}`),
          el('span', { class: 'sti__bel' }, ikon(belonningIkonNavn(b), 'ikon ikon--liten'), ` ${belTekst(b)}`),
        ),
      ));
    }
    return el('div', { class: 'kort' },
      el('h2', {}, 'Stien videre'),
      el('div', { class: 'sti' }, ...rader),
      el('p', { class: 'dempet' }, 'Hvert nivå gir noe nytt. Ingen tak, ingen frister.'),
    );
  }

  // --- Nærmeste bevegelsesbelønninger (mønster-opplåsinger, §14) -------------
  function nesteKort() {
    const neste = nesteGjenstander(profil, 3).filter((g) => g.laas.type !== 'niva');
    if (!neste.length) return null;
    return el('div', { class: 'kort' },
      el('h2', {}, 'Innen rekkevidde'),
      el('div', { class: 'liste' },
        ...neste.map((g) => el('div', { class: 'listerad listerad--stille' },
          el('span', { class: 'listerad__ikon' }, ikon(g.kategori === 'miljo' ? 'fjell' : 'stjerne')),
          el('span', { class: 'listerad__navn' }, g.navn),
          el('span', { class: 'dempet' }, laasTekst(g.laas)),
        )),
      ),
    );
  }

  function belTekst(b) {
    return b.type === 'gjenstand' ? b.navn
      : b.type === 'tema' ? `Tema: ${b.navn}`
        : b.type === 'tittel' ? `Tittel: ${b.navn}`
          : b.type === 'ovelse' ? `Ny øvelse: ${b.navn}`
            : (b.navn || 'Belønning');
  }

  function ukedagsNavn() {
    const navn = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'];
    const ut = [];
    const idag = new Date().getDay();
    for (let i = 6; i >= 0; i--) ut.push(i === 0 ? 'i dag' : navn[(idag - i + 7) % 7]);
    return ut;
  }
}
