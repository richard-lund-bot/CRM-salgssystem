// Beveg (M11 — spec §5): fri bevegelse og manuell logging. Beveg-fanen selv
// er øktbiblioteket (bibliotek-okter.js); her bor hurtigstart med timer
// (gå/løp/sykle), manuell logg og fullført-skjermen. Alt gir XP, flytter
// nivået og kan låse opp merker (§5.12: aldri skam, delvis gjennomføring
// teller, manuelle logger teller).
import { el, tom, chip, ikon } from './ui.js';
import { hentProfil, lagreProfil, hentLogg, leggTilLogg } from './store.js';
import { registrerBevegelse } from './niva.js';
import {
  BEVEGELSER, BEVEGELSE_NAVN, SPORTER,
  beregnXp, erComeback, bevegelsesMomentum,
} from './bevegelse.js';
import { merkerNå, nyeMerker } from './merker.js';
import { tallOpp, lagKonfetti } from './animasjon.js';

let aktivTimer = null;
function stoppTimer() {
  if (aktivTimer) { clearInterval(aktivTimer); aktivTimer = null; }
}

// --- Registrering: én vei inn for all fri/manuell bevegelse ----------------
export function registrerOgLogg({ bevegelse, varighetMin, intensitet = 3, tittel = null, kilde = 'manuell', dato = null, ekstra = {} }) {
  const profil = hentProfil();
  const logg = hentLogg();
  const nå = Date.now();
  const comeback = erComeback(logg, nå);
  const merkerFør = merkerNå();
  const { profil: ny, resultat } = registrerBevegelse(profil, { bevegelse, varighetMin, intensitet, comeback }, nå);
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
  resultat.nyeMerker = nyeMerker(merkerFør, merkerNå());
  return resultat;
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

  // ?d=YYYY-MM-DD (fra ukeskalenderen i biblioteket): logg en glemt økt på
  // en tidligere dato — datoen blir et eget valg under «Når?».
  const idagIso = (() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();
  const dParam = params.get('d');
  const forDato = /^\d{4}-\d{2}-\d{2}$/.test(dParam || '') && dParam < idagIso ? dParam : null;

  const state = {
    bevegelse: BEVEGELSER[params.get('b')] ? params.get('b') : 'walk',
    sport: null,
    tittel: '',
    minutter: 30,
    intensitet: 3,
    naar: forDato ? 'dato' : 'idag',
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
            forDato && chip(new Date(`${forDato}T12:00:00`).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' }),
              { aktiv: state.naar === 'dato', onClick: () => { state.naar = 'dato'; tegn(); } }),
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
              const dato = state.naar === 'dato' ? new Date(`${forDato}T12:00:00`) : new Date();
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
// Feirer XP, nivåopprykk og nye merker — varm og rolig, aldri høylytt.
// ===========================================================================
export function visBevegelseFerdig(mount, resultat, { bevegelse, varighetMin, tittel = null, delvis = false } = {}) {
  const logg = hentLogg();
  const mom = bevegelsesMomentum(logg);
  const xpTall = el('div', { class: 'xp-stor' }, '+0');
  const nye = resultat.nyeMerker || [];
  const feires = resultat.globalOpp || nye.length > 0;

  tom(mount);
  mount.append(
    el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Du beveget deg.')),
    el('main', { class: 'innhold' },
      el('div', { class: 'kort hero ferdighero' },
        feires && lagKonfetti(),
        el('span', { class: 'ferdighero__disk movflis--teal' }, ikon('sjekk')),
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
        el('p', { class: 'dempet' }, 'Nivået ditt bor på profilikonet — feiringen bor i merkene.'),
      ),
      nye.length > 0 && el('div', { class: 'kort' },
        el('h2', {}, nye.length === 1 ? 'Nytt merke!' : 'Nye merker!'),
        el('div', { class: 'nymerker' },
          ...nye.map((m) => el('div', { class: 'nymerke' },
            el('span', { class: `nymerke__sirkel movflis--${m.farge}` }, ikon(m.ikon)),
            el('span', { class: 'nymerke__meta' },
              el('span', { class: 'nymerke__navn' }, m.navn),
              el('span', { class: 'nymerke__tekst' }, m.tekst),
            ),
          )),
        ),
      ),
      el('div', { class: 'kort kort--info' },
        el('p', { class: 'oppmuntring__tittel' }, mom.tekst),
        el('p', { class: 'dempet' }, mom.undertekst),
      ),
      el('div', { class: 'knapprad' },
        el('button', { class: 'knapp', type: 'button', onclick: () => { location.hash = '#/hjem'; } }, 'Til Min dag'),
        el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: () => { location.hash = '#/merker'; } }, 'Se merkene'),
      ),
    ),
  );
  tallOpp(xpTall, resultat.xp, { format: (n) => `+${n} XP` });
}
