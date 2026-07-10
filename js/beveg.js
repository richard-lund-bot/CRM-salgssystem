// Beveg (M11 — spec §5): bevegelsesnavet. Flyten er energi-først:
// «Hvordan har du det i dag?» → tid → bevegelsestype. Strukturerte typer
// sendes til generatoren, gå/løp/sykle får hurtigstart med timer, og sport/
// annet logges manuelt. Alt gir XP og flytter reisen (§5.12: aldri skam,
// delvis gjennomføring teller, manuelle logger teller).
import { el, tom, chip, ikon } from './ui.js';
import { hentProfil, lagreProfil, hentLogg, leggTilLogg } from './store.js';
import { registrerBevegelse } from './niva.js';
import {
  BEVEGELSER, BEVEGELSE_NAVN, ENERGI, SPORTER, VARIGHET_MIN,
  beregnXp, startHref, erComeback, bevegelsesMomentum,
} from './bevegelse.js';
import { belonningIkonNavn } from './belonninger.js';
import { tegnFigur, sikreFigur } from './figur.js';
import { tallOpp, lagKonfetti } from './animasjon.js';

let _bib = null;
export function settBib(bib) { _bib = bib; }

// Valgt energi/tid huskes mens appen er åpen (lav terskel — ett svar holder).
let valgtEnergi = null;
let valgtK = null;

let aktivTimer = null;
function stoppTimer() {
  if (aktivTimer) { clearInterval(aktivTimer); aktivTimer = null; }
}

const KLASSER = [['Mikro', 'mikro', '5–10 min'], ['Kort', 'kort', '15–20 min'], ['Standard', 'standard', '30–40 min'], ['Lang', 'lang', '45–60 min']];

// --- Registrering: én vei inn for all fri/manuell bevegelse ----------------
export function registrerOgLogg({ bevegelse, varighetMin, intensitet = 3, tittel = null, kilde = 'manuell', dato = null, ekstra = {} }) {
  const profil = hentProfil();
  const logg = hentLogg();
  const nå = Date.now();
  const comeback = erComeback(logg, nå);
  const { profil: ny, resultat } = registrerBevegelse(profil, { bevegelse, varighetMin, intensitet, comeback }, _bib, nå);
  lagreProfil(ny);
  leggTilLogg({
    id: `bev-${nå}`,
    dato: dato || new Date(nå).toISOString(),
    bevegelse,
    tittel,
    varighetMin,
    intensitet,
    xp: resultat.xp,
    kilde,
    fullfort: true,
    ...ekstra,
  });
  return resultat;
}

// ===========================================================================
// Beveg-skjermen
// ===========================================================================
export function visBevegSkjerm(mount) {
  stoppTimer();
  const profil = hentProfil();
  if (!profil) { location.hash = '#/hjem'; return; }
  if (!valgtK) valgtK = profil.varighetsklasse || 'standard';

  function tegn() {
    tom(mount);
    const energi = ENERGI.find((e) => e.id === valgtEnergi) || null;
    mount.append(
      el('header', { class: 'topp' },
        el('h1', { class: 'topp__tittel' }, 'Beveg'),
        el('p', { class: 'topp__under' }, 'Hvordan vil du bevege deg i dag?'),
      ),
      el('main', { class: 'innhold' },
        el('div', { class: 'kort' },
          el('h2', {}, 'Hvordan har du det i dag?'),
          el('div', { class: 'energirad' },
            ...ENERGI.map((e) => el('button', {
              class: 'energiknapp' + (valgtEnergi === e.id ? ' energiknapp--valgt' : ''),
              type: 'button',
              onclick: () => { valgtEnergi = valgtEnergi === e.id ? null : e.id; tegn(); },
            }, e.navn)),
          ),
          energi && el('p', { class: 'dempet' }, energi.tekst),
        ),
        el('div', { class: 'kort' },
          el('h2', {}, 'Hvor mye tid har du?'),
          el('div', { class: 'chiprad' },
            ...KLASSER.map(([navn, id, und]) => chip(`${navn} · ${und}`, {
              aktiv: valgtK === id, onClick: () => { valgtK = id; tegn(); },
            })),
          ),
        ),
        energi && forslagKort(energi),
        el('div', { class: 'kort' },
          el('h2', {}, 'Velg bevegelse'),
          el('div', { class: 'bevgrid' },
            ...Object.entries(BEVEGELSER).map(([id, b]) => bevegelseFlis(id, b)),
            overraskFlis(),
          ),
        ),
        el('div', { class: 'kort' },
          el('div', { class: 'liste' },
            lenkerad('bok', 'Øktbiblioteket', '#/okter'),
            lenkerad('penn', 'Logg noe du alt har gjort', '#/loggfor'),
            lenkerad('kalender', 'Planlagte økter', '#/kalender'),
          ),
        ),
      ),
    );
  }

  function bevegelseFlis(id, b) {
    const href = startHref(id, {
      varighetsklasse: valgtK,
      intensitet: ENERGI.find((e) => e.id === valgtEnergi)?.intensitet,
      maalMin: VARIGHET_MIN[valgtK],
    });
    return el('a', { class: 'bevflis', href },
      el('span', { class: 'bevflis__ikon' }, ikon(b.ikon)),
      el('span', { class: 'bevflis__navn' }, b.navn),
    );
  }

  function overraskFlis() {
    return el('button', {
      class: 'bevflis bevflis--overrask', type: 'button',
      onclick: () => {
        const kandidater = kandidaterForEnergi(valgtEnergi);
        const id = kandidater[Math.floor(Math.random() * kandidater.length)];
        location.hash = startHref(id, {
          varighetsklasse: valgtK,
          intensitet: ENERGI.find((e) => e.id === valgtEnergi)?.intensitet,
          maalMin: VARIGHET_MIN[valgtK],
        });
      },
    },
      el('span', { class: 'bevflis__ikon' }, ikon('terning')),
      el('span', { class: 'bevflis__navn' }, 'Overrask meg'),
    );
  }

  // Ett vennlig forslag som matcher energien (§5.3: energi først).
  function forslagKort(energi) {
    const f = forslagForEnergi(energi.id, profil);
    if (!f) return null;
    return el('a', { class: 'kort gnist gnist--liten', href: f.href },
      el('div', { class: 'gnist__meta' },
        el('p', { class: 'gnist__eyebrow' }, 'Forslag til deg'),
        el('h2', { class: 'gnist__tittel' }, f.tittel),
        el('p', { class: 'gnist__under' }, `${f.undertekst} · ≈ +${f.xp} XP`),
      ),
      el('span', { class: 'gnist__pil' }, ikon('chevron')),
    );
  }

  tegn();
}

// Forslag per energinivå — lav energi får alltid noe snilt (§5.3).
function forslagForEnergi(energiId, profil) {
  const dagIdx = new Date().getDate();
  const velg = (liste) => liste[dagIdx % liste.length];
  const lav = [
    { bevegelse: 'walk', tittel: '10 minutter frisk luft', undertekst: 'Rolig tempo. Ingen press', minutter: 10, intensitet: 2 },
    { bevegelse: 'stretch', tittel: '8 minutter tøying', undertekst: 'Mykt og rolig', minutter: 8, intensitet: 1, varighetsklasse: 'mikro' },
    { bevegelse: 'recovery', tittel: 'Rolig restitusjon', undertekst: 'Pust og land', minutter: 12, intensitet: 1, varighetsklasse: 'mikro' },
    { bevegelse: 'yoga', tittel: 'Rolig yogaflyt', undertekst: 'Pust og bevegelse', minutter: 15, intensitet: 2, varighetsklasse: 'kort' },
  ];
  const normal = [
    { bevegelse: 'walk', tittel: '20 minutter gåtur', undertekst: 'Ut døra — det holder', minutter: 20, intensitet: 2 },
    { bevegelse: 'strength', tittel: 'Styrkeøkt som passer dagen', undertekst: 'Generatoren setter opp', minutter: 25, intensitet: 3, varighetsklasse: 'kort' },
    { bevegelse: 'yoga', tittel: 'Yogaflyt', undertekst: 'Mykt, men våkent', minutter: 20, intensitet: 2, varighetsklasse: 'kort' },
  ];
  const klar = [
    { bevegelse: 'strength', tittel: 'Skikkelig styrkeøkt', undertekst: 'Du har overskudd — bruk det', minutter: 35, intensitet: 4, varighetsklasse: 'standard' },
    { bevegelse: 'run', tittel: 'Løpetur', undertekst: 'Sett farten selv', minutter: 25, intensitet: 4 },
    { bevegelse: 'hiit', tittel: 'Kort intervalløkt', undertekst: 'Effektivt og ferdig', minutter: 18, intensitet: 4, varighetsklasse: 'kort' },
  ];
  const f = velg(energiId === 'lav' ? lav : energiId === 'klar' ? klar : normal);
  return {
    ...f,
    xp: beregnXp(f.minutter, f.bevegelse, f.intensitet),
    href: startHref(f.bevegelse, { varighetsklasse: f.varighetsklasse, intensitet: f.intensitet, maalMin: f.minutter }),
  };
}

function kandidaterForEnergi(energiId) {
  if (energiId === 'lav') return ['walk', 'stretch', 'recovery', 'yoga', 'mobility'];
  if (energiId === 'klar') return ['strength', 'run', 'hiit', 'bike', 'bodyweight'];
  return ['walk', 'strength', 'yoga', 'bike', 'bodyweight', 'stretch'];
}

function lenkerad(ikonNavn, tekst, href) {
  return el('a', { class: 'listerad', href },
    el('span', { class: 'listerad__ikon' }, ikon(ikonNavn)),
    el('span', { class: 'listerad__navn' }, tekst),
    el('span', { class: 'listerad__chevron' }, ikon('chevron')),
  );
}

// ===========================================================================
// Hurtigstart — timer for gåtur/løp/sykkel/fri bevegelse (§5.1 pkt. 4)
// ===========================================================================
export function visHurtigSkjerm(mount) {
  stoppTimer();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const bevegelse = BEVEGELSER[params.get('b')] ? params.get('b') : 'walk';
  const maal = Number(params.get('maal')) || null;
  const navn = BEVEGELSE_NAVN[bevegelse];

  let sekunder = 0;
  let kjorer = false;

  const klokke = el('div', { class: 'hurtig__klokke' }, '00:00');
  const startKnapp = el('button', { class: 'knapp knapp--stor', type: 'button' }, 'Start');
  const ferdigKnapp = el('button', { class: 'knapp knapp--sekundaer', type: 'button' }, 'Ferdig');

  function visTid() {
    const m = Math.floor(sekunder / 60);
    const s = sekunder % 60;
    klokke.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  startKnapp.addEventListener('click', () => {
    if (kjorer) {
      stoppTimer(); kjorer = false; startKnapp.textContent = 'Fortsett';
    } else {
      kjorer = true; startKnapp.textContent = 'Pause';
      stoppTimer();
      aktivTimer = setInterval(() => { sekunder++; visTid(); }, 1000);
    }
  });
  ferdigKnapp.addEventListener('click', () => {
    stoppTimer();
    visHurtigFullfor(mount, bevegelse, Math.max(1, Math.round(sekunder / 60)));
  });

  tom(mount);
  mount.append(
    el('header', { class: 'topp topp--kjor' },
      el('button', { class: 'topp__tilbake', type: 'button', onclick: () => { stoppTimer(); location.hash = '#/beveg'; }, title: 'Tilbake' }, '‹'),
      el('div', {},
        el('h1', { class: 'topp__tittel' }, navn),
        el('p', { class: 'topp__under' }, maal ? `Mål: ${maal} min — men alt teller.` : 'I ditt tempo. Alt teller.'),
      ),
    ),
    el('main', { class: 'innhold innhold--kjor' },
      el('div', { class: 'flate flate--midt hurtig' },
        el('span', { class: 'hurtig__ikon' }, ikon(BEVEGELSER[bevegelse].ikon)),
        klokke,
        maal && el('p', { class: 'dempet' }, `Du kan snu når du vil. ${maal} min er målet, ikke kravet.`),
        el('div', { class: 'flate__knapper' }, startKnapp, ferdigKnapp),
        el('p', { class: 'dempet flate__hint' }, 'Gjorde du det uten timer? ',
          el('a', { href: `#/loggfor?b=${bevegelse}` }, 'Logg manuelt')),
      ),
    ),
  );
  visTid();
}

// Etter timeren: bekreft minutter + hvor det kjentes → lagre.
function visHurtigFullfor(mount, bevegelse, minutter) {
  let intensitet = 3;
  let min = minutter;

  const minFelt = el('input', {
    class: 'loggfelt__inn loggfelt__inn--stor', type: 'number', inputmode: 'numeric',
    min: '1', value: String(min),
    oninput: (ev) => { min = Math.max(1, Number(ev.target.value) || 1); },
  });

  function tegn() {
    tom(mount);
    mount.append(
      el('header', { class: 'topp' },
        el('h1', { class: 'topp__tittel' }, 'Godt jobba'),
        el('p', { class: 'topp__under' }, 'Et par detaljer, så teller vi det med.'),
      ),
      el('main', { class: 'innhold' },
        el('div', { class: 'kort' },
          el('h2', {}, 'Minutter i bevegelse'),
          el('div', { class: 'loggrad__felter' }, minFelt),
        ),
        el('div', { class: 'kort' },
          el('h2', {}, 'Hvordan kjentes det?'),
          el('div', { class: 'chiprad' },
            ...[['Rolig', 1], ['Lett', 2], ['Moderat', 3], ['Hard', 4], ['Maks', 5]].map(([navn, v]) =>
              chip(navn, { aktiv: intensitet === v, onClick: () => { intensitet = v; tegn(); } })),
          ),
        ),
        el('div', { class: 'fast-bunn' },
          el('button', {
            class: 'knapp', type: 'button',
            onclick: () => {
              const resultat = registrerOgLogg({ bevegelse, varighetMin: min, intensitet, kilde: 'hurtig' });
              visBevegelseFerdig(mount, resultat, { bevegelse, varighetMin: min });
            },
          }, 'Det teller ✓'),
        ),
      ),
    );
  }
  tegn();
}

// ===========================================================================
// Manuell logg — «det du alt har gjort, teller» (§5.1 pkt. 6, §5.11)
// ===========================================================================
export function visLoggforSkjerm(mount) {
  stoppTimer();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const state = {
    bevegelse: BEVEGELSER[params.get('b')] ? params.get('b') : 'walk',
    sport: null,
    tittel: '',
    minutter: 30,
    intensitet: 3,
    naar: 'idag',
  };

  function tegn() {
    tom(mount);
    mount.append(
      el('header', { class: 'topp topp--kjor' },
        el('button', { class: 'topp__tilbake', type: 'button', onclick: () => { location.hash = '#/beveg'; }, title: 'Tilbake' }, '‹'),
        el('div', {},
          el('h1', { class: 'topp__tittel' }, 'Logg bevegelse'),
          el('p', { class: 'topp__under' }, 'Alt du har gjort, teller også her.'),
        ),
      ),
      el('main', { class: 'innhold' },
        el('div', { class: 'kort' },
          el('h2', {}, 'Hva gjorde du?'),
          el('div', { class: 'bevgrid bevgrid--kompakt' },
            ...Object.entries(BEVEGELSER).map(([id, b]) => el('button', {
              class: 'bevflis' + (state.bevegelse === id ? ' bevflis--valgt' : ''),
              type: 'button',
              onclick: () => { state.bevegelse = id; state.sport = null; tegn(); },
            },
              el('span', { class: 'bevflis__ikon' }, ikon(b.ikon)),
              el('span', { class: 'bevflis__navn' }, b.navn),
            )),
          ),
          state.bevegelse === 'sport' && el('div', { class: 'chiprad', style: 'margin-top:10px' },
            ...SPORTER.map((s) => chip(s, { aktiv: state.sport === s, onClick: () => { state.sport = s; tegn(); } })),
          ),
          state.bevegelse === 'custom' && el('input', {
            class: 'sok', type: 'text', placeholder: 'F.eks. hagearbeid, leking med barna…',
            value: state.tittel, style: 'margin-top:10px',
            oninput: (ev) => { state.tittel = ev.target.value; },
          }),
        ),
        el('div', { class: 'kort' },
          el('h2', {}, 'Hvor lenge?'),
          el('div', { class: 'chiprad' },
            ...[10, 15, 20, 30, 45, 60, 90].map((m) => chip(`${m} min`, {
              aktiv: state.minutter === m, onClick: () => { state.minutter = m; tegn(); },
            })),
          ),
        ),
        el('div', { class: 'kort' },
          el('h2', {}, 'Hvor hardt kjentes det?'),
          el('div', { class: 'chiprad' },
            ...[['Rolig', 1], ['Lett', 2], ['Moderat', 3], ['Hard', 4], ['Maks', 5]].map(([navn, v]) =>
              chip(navn, { aktiv: state.intensitet === v, onClick: () => { state.intensitet = v; tegn(); } })),
          ),
        ),
        el('div', { class: 'kort' },
          el('h2', {}, 'Når?'),
          el('div', { class: 'chiprad' },
            chip('I dag', { aktiv: state.naar === 'idag', onClick: () => { state.naar = 'idag'; tegn(); } }),
            chip('I går', { aktiv: state.naar === 'igar', onClick: () => { state.naar = 'igar'; tegn(); } }),
          ),
        ),
        el('p', { class: 'dempet', style: 'text-align:center' },
          `≈ +${beregnXp(state.minutter, state.bevegelse, state.intensitet)} XP`),
        el('div', { class: 'fast-bunn' },
          el('button', {
            class: 'knapp', type: 'button',
            onclick: () => {
              const dato = new Date();
              if (state.naar === 'igar') dato.setDate(dato.getDate() - 1);
              dato.setHours(12, 0, 0, 0);
              const tittel = state.bevegelse === 'sport' ? (state.sport || 'Sport')
                : state.bevegelse === 'custom' ? (state.tittel.trim() || null) : null;
              const resultat = registrerOgLogg({
                bevegelse: state.bevegelse, varighetMin: state.minutter,
                intensitet: state.intensitet, tittel, kilde: 'manuell',
                dato: dato.toISOString(),
              });
              visBevegelseFerdig(mount, resultat, { bevegelse: state.bevegelse, varighetMin: state.minutter, tittel });
            },
          }, 'Det teller ✓'),
        ),
      ),
    );
  }
  tegn();
}

// ===========================================================================
// Fullført-skjerm — «Du beveget deg. Det teller.» (spec §7/§15.5)
// ===========================================================================
export function visBevegelseFerdig(mount, resultat, { bevegelse, varighetMin, tittel = null, delvis = false } = {}) {
  const profil = hentProfil();
  const figur = sikreFigur(profil);
  const logg = hentLogg();
  const mom = bevegelsesMomentum(logg);
  const xpTall = el('div', { class: 'xp-stor' }, '+0');

  // Nye gjenstander som ikke allerede feires i nivåstigen (dedupe på id).
  const stigeIder = new Set((resultat.belonninger || []).map((b) => b.id));
  const ekstraGjenstander = (resultat.nyeGjenstander || []).filter((g) => !stigeIder.has(g.id));

  const belTekst = (b) => (
    b.type === 'gjenstand' ? `Nytt til figuren: ${b.navn}`
      : b.type === 'tema' ? `Nytt tema: ${b.navn}`
        : b.type === 'tittel' ? `Ny tittel: ${b.navn}`
          : b.type === 'ovelse' ? `Ny øvelse: ${b.navn}`
            : (b.navn || 'Belønning'));

  tom(mount);
  mount.append(
    el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Du beveget deg.')),
    el('main', { class: 'innhold' },
      el('div', { class: 'kort hero ferdighero' },
        resultat.globalOpp && lagKonfetti(),
        el('div', { class: 'ferdighero__figur' }, tegnFigur(figur, { pose: 'jubel', bredde: 92 })),
        el('p', { class: 'ferdighero__teller' }, 'Det teller.'),
        delvis && el('p', { class: 'dempet' }, 'En mindre bevegelse flytter deg også fremover.'),
        el('p', { class: 'hero__eyebrow' }, `${tittel || BEVEGELSE_NAVN[bevegelse] || 'Bevegelse'} · ${varighetMin} min`),
        xpTall,
        resultat.comeback && el('p', { class: 'ferdighero__comeback' }, 'Velkommen tilbake — dobbel XP.'),
      ),
      resultat.globalOpp && el('div', { class: 'kort levelup' },
        el('div', { class: 'levelup__glans' }),
        el('p', { class: 'hero__eyebrow' }, 'Nivå opp!'),
        el('div', { class: 'levelup__niva' }, `Nivå ${resultat.globalOpp}`),
        el('div', { class: 'levelup__belonninger' },
          ...(resultat.belonninger || []).map((b) => el('div', { class: 'levelup__bel' },
            el('span', { class: 'levelup__ikon' }, ikon(belonningIkonNavn(b))),
            el('span', {}, belTekst(b)),
          )),
        ),
      ),
      ekstraGjenstander.length > 0 && el('div', { class: 'kort' },
        el('h2', {}, 'Låst opp!'),
        ...ekstraGjenstander.map((g) => el('div', { class: 'feiring' },
          ikon(g.kategori === 'miljo' ? 'fjell' : 'stjerne'),
          `${g.navn} — se «Tilpass figur»`,
        )),
      ),
      el('div', { class: 'kort kort--info' },
        el('p', { class: 'oppmuntring__tittel' }, mom.tekst),
        el('p', { class: 'dempet' }, mom.undertekst),
      ),
      el('div', { class: 'knapprad' },
        el('button', { class: 'knapp', type: 'button', onclick: () => { location.hash = '#/hjem'; } }, 'Til Min dag'),
        el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: () => { location.hash = '#/reise'; } }, 'Se reisen din'),
      ),
    ),
  );
  tallOpp(xpTall, resultat.xp, { format: (n) => `+${n} XP` });
}
