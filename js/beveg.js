// Beveg (M11 — spec §5): fri bevegelse og manuell logging. Beveg-fanen selv
// er øktbiblioteket (bibliotek-okter.js); her bor hurtigstart med timer
// (gå/løp/sykle), manuell logg og fullført-skjermen. Alt teller mot dagens
// gnist/streak og kan låse opp merker (§5.12: aldri skam, delvis gjennom-
// føring teller, manuelle logger teller). Hurtigstart-timeren regner med
// veggklokke-tid og lagres i localStorage — turen teller videre med
// skjermen av, og gjenopptas selv om appen startes på nytt.
import { el, tom, chip, ikon } from './ui.js';
import { LS } from './config.js';
import { hentLogg, leggTilLogg } from './store.js';
import {
  BEVEGELSER, BEVEGELSE_NAVN, SPORTER,
  erComeback, bevegelsesMomentum, beregnStreak,
} from './bevegelse.js';
import { hentGnistStatus, GNIST_PILARER } from './gnist.js';
import { merkerNå, nyeMerker } from './merker.js';
import { tallOpp } from './animasjon.js';
import { holdVaaken, slippVaaken } from './vaakenlaas.js';
import { laasteOktIder, nyeOpplaste } from './opplasing.js';
import { streakEtter, blaaEtter, kisteKort } from './feiring.js';

let aktivTimer = null;
let vedSynlig = null; // oppdaterer klokka umiddelbart når appen våkner
function stoppTimer() {
  if (aktivTimer) { clearInterval(aktivTimer); aktivTimer = null; }
  vedSynlig = null;
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') vedSynlig?.();
  });
}

// --- Pågående hurtigstart: lagres så turen overlever lukket app ------------
const AKTIV_MAKS_ALDER = 12 * 3600000; // eldre økter regnes som forlatt

/** Pågående hurtigstart-økt, eller null. Brukes også av app.js ved oppstart. */
export function aktivHurtig() {
  try {
    const a = JSON.parse(localStorage.getItem(LS.aktivOkt) || 'null');
    if (!a || !BEVEGELSER[a.bevegelse]) return null;
    const sist = a.kjorer ? a.startTs : a.oppdatert;
    if (!sist || Date.now() - sist > AKTIV_MAKS_ALDER) { localStorage.removeItem(LS.aktivOkt); return null; }
    return a;
  } catch { return null; }
}

function lagreAktiv(a) {
  try {
    if (a) localStorage.setItem(LS.aktivOkt, JSON.stringify({ ...a, oppdatert: Date.now() }));
    else localStorage.removeItem(LS.aktivOkt);
  } catch { /* full lagring — timeren går fint videre i minnet */ }
}

// --- Registrering: én vei inn for all fri/manuell bevegelse ----------------
export function registrerOgLogg({ bevegelse, varighetMin, intensitet = 3, tittel = null, kilde = 'manuell', dato = null, ekstra = {} }) {
  const logg = hentLogg();
  const nå = Date.now();
  const comeback = erComeback(logg, nå);
  const merkerFør = merkerNå();
  const førStreak = beregnStreak(logg, nå);
  const førLåste = kilde === 'laer' ? laasteOktIder() : null; // øyeblikksbilde før teknikk læres
  const resultat = { comeback };
  leggTilLogg({
    id: `bev-${nå}`,
    dato: dato || new Date(nå).toISOString(),
    bevegelse,
    tittel,
    varighetMin,
    intensitet,
    kilde,
    fullfort: true,
    ...ekstra,
  });
  resultat.nyeMerker = nyeMerker(merkerFør, merkerNå());
  // Streak-økning: kun dagens FØRSTE bevegelse løfter tallet (ellers 0). Mater
  // «Jeg er dedikert»-feiringen. Nye opplåste bibliotekøkter (kun ved læring)
  // mater «Låst opp!»-pling. Begge avledet, ingenting nytt lagres.
  const etterStreak = beregnStreak(hentLogg(), nå);
  resultat.streakØkte = etterStreak > førStreak ? etterStreak : 0;
  resultat.nyeOpplaste = førLåste ? nyeOpplaste(førLåste) : [];
  return resultat;
}

// ===========================================================================
// Hurtigstart — timer for gåtur/løp/sykkel/fri bevegelse (§5.1 pkt. 4).
// Tida regnes fra veggklokka (starttidspunkt + akkumulert), så turen teller
// videre med skjermen av — og en pågående økt gjenopptas fra localStorage.
// ===========================================================================
export function visHurtigSkjerm(mount) {
  stoppTimer();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');

  // Gjenoppta en pågående økt hvis den finnes — ellers start ferskt fra URL-en.
  const aktiv = aktivHurtig();
  const bevegelse = aktiv?.bevegelse || (BEVEGELSER[params.get('b')] ? params.get('b') : 'walk');
  const maal = aktiv?.maal ?? (Number(params.get('maal')) || null);
  const navn = BEVEGELSE_NAVN[bevegelse];

  // Tilstand: akkumMs = tid samlet før siste start, startTs = når den ble
  // startet sist (null når pauset). Sekunder = akkumMs + (nå − startTs).
  let akkumMs = aktiv?.akkumMs || 0;
  let startTs = aktiv?.kjorer ? aktiv.startTs : null;

  const kjorer = () => startTs != null;
  const sekunder = () => Math.floor((akkumMs + (kjorer() ? Date.now() - startTs : 0)) / 1000);

  const klokke = el('div', { class: 'hurtig__klokke' }, '00:00');
  // Rolig «pust» bak klokka (wellness-tier — bevisst rolig, ikke punchy).
  const tidBlokk = el('div', { class: 'hurtig__tid' + (kjorer() ? ' hurtig__tid--gaar' : '') },
    el('span', { class: 'hurtig__pust', 'aria-hidden': 'true' }), klokke);
  const startKnapp = el('button', { class: 'knapp knapp--stor', type: 'button' }, kjorer() ? 'Pause' : (akkumMs ? 'Fortsett' : 'Start'));
  const ferdigKnapp = el('button', { class: 'knapp knapp--sekundaer', type: 'button' }, 'Ferdig');

  let sisteSek = -1;
  function visTid() {
    const s = sekunder();
    klokke.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    tidBlokk.classList.toggle('hurtig__tid--gaar', kjorer());
    if (s !== sisteSek) { // lite rolig pust-pop per sekund
      sisteSek = s;
      klokke.classList.remove('hurtig__klokke--tikk'); void klokke.offsetWidth; klokke.classList.add('hurtig__klokke--tikk');
    }
  }

  function lagre() {
    lagreAktiv(akkumMs || kjorer() ? { bevegelse, maal, akkumMs, startTs, kjorer: kjorer() } : null);
  }

  function startTicking() {
    stoppTimer();
    aktivTimer = setInterval(visTid, 500);
    vedSynlig = visTid;
    holdVaaken();
  }

  startKnapp.addEventListener('click', () => {
    if (kjorer()) { // pause
      akkumMs += Date.now() - startTs;
      startTs = null;
      stoppTimer();
      slippVaaken();
      startKnapp.textContent = 'Fortsett';
    } else {
      startTs = Date.now();
      startKnapp.textContent = 'Pause';
      startTicking();
    }
    lagre();
    visTid();
  });
  ferdigKnapp.addEventListener('click', () => {
    const s = sekunder();
    stoppTimer();
    slippVaaken();
    lagreAktiv(null);
    visHurtigFullfor(mount, bevegelse, Math.max(1, Math.round(s / 60)));
  });

  tom(mount);
  mount.append(
    el('header', { class: 'topp topp--kjor' },
      el('button', {
        class: 'topp__tilbake', type: 'button', title: 'Tilbake',
        onclick: () => {
          if (sekunder() > 0 && !confirm('Avslutte uten å lagre? Tida forkastes.')) return;
          stoppTimer();
          slippVaaken();
          lagreAktiv(null);
          location.hash = '#/beveg';
        },
      }, '‹'),
      el('div', {},
        el('h1', { class: 'topp__tittel' }, navn),
        el('p', { class: 'topp__under' }, maal ? `Mål: ${maal} min — men alt teller.` : 'I ditt tempo. Alt teller.'),
      ),
    ),
    el('main', { class: 'innhold innhold--kjor' },
      el('div', { class: 'flate flate--midt hurtig' },
        el('span', { class: 'hurtig__ikon' }, ikon(BEVEGELSER[bevegelse].ikon)),
        tidBlokk,
        maal && el('p', { class: 'dempet' }, `Du kan snu når du vil. ${maal} min er målet, ikke kravet.`),
        el('div', { class: 'flate__knapper' }, startKnapp, ferdigKnapp),
        el('p', { class: 'dempet' }, 'Tida teller videre selv om skjermen slukker.'),
        el('p', { class: 'dempet flate__hint' }, 'Gjorde du det uten timer? ',
          el('a', { href: `#/loggfor?b=${bevegelse}` }, 'Logg manuelt')),
      ),
    ),
  );
  if (kjorer()) startTicking();
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
          'Alt teller.'),
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
// Feirer gnisten, streaken og nye merker — varm og rolig, aldri høylytt.
// ===========================================================================
export function visBevegelseFerdig(mount, resultat, { bevegelse, varighetMin, tittel = null, delvis = false, styrke = null } = {}) {
  const logg = hentLogg();
  const mom = bevegelsesMomentum(logg);
  const nye = resultat.nyeMerker || [];
  const løft = styrke && styrke.volum > 0 ? styrke : null;
  const volumTall = løft && el('div', { class: 'loft__tall' }, '0 kg');
  const aktivitet = tittel || BEVEGELSE_NAVN[bevegelse] || 'Bevegelse';

  // Streak-status etter registreringen: er dagens bevegelsesmål nådd, og hvor
  // mange av de fire vanene som er gjort i dag.
  const gs = hentGnistStatus();
  const beveg = gs.pilarer.bevegelse;

  tom(mount);
  mount.append(
    el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Du beveget deg.')),
    el('main', { class: 'innhold' },
      // Claim-kiste — samme heiende feiring som i Lær (åpner seg selv og
      // avdekker nye merker og evt. opplåste økter).
      kisteKort({
        tittel: delvis ? 'Det teller!' : 'Godt jobba!',
        under: `${aktivitet} · ${varighetMin} min`,
        merker: nye,
        opplaste: resultat.nyeOpplaste || [],
      }),
      resultat.comeback && el('p', { class: 'ferdighero__comeback', style: 'text-align:center' }, 'Velkommen tilbake.'),
      løft && el('div', { class: 'kort loft' },
        el('p', { class: 'hero__eyebrow' }, 'Løftet i dag'),
        volumTall,
        el('p', { class: 'loft__under' }, `${løft.settAntall} sett · ${løft.ovelseAntall} ${løft.ovelseAntall === 1 ? 'øvelse' : 'øvelser'} · godt jobba 💪`),
        løft.prs.length > 0 && el('div', { class: 'loft__prs' },
          ...løft.prs.slice(0, 4).map((p) => el('span', { class: 'loft__pr' },
            ikon('trofe', 'ikon ikon--liten'), ` Ny rekord: ${p.navn} (~${p.e1rm} kg)`)),
        ),
      ),
      beveg.iDag.naadd && el('div', { class: 'kort gnistkort' },
        el('span', { class: 'gnistkort__flamme' }, ikon('flamme')),
        el('div', { class: 'gnistkort__meta' },
          el('p', { class: 'hero__eyebrow' }, 'Streak'),
          el('p', { class: 'gnistkort__tekst' },
            `${beveg.streak} ${beveg.streak === 1 ? 'dag' : 'dager'} på rad`),
          el('p', { class: 'dempet' },
            gs.blaa.iDagAlle ? 'Alle fire vaner i dag.' : `${gs.blaa.tentIDag} av ${GNIST_PILARER.length} vaner i dag.`),
        ),
      ),
      el('div', { class: 'kort kort--info' },
        el('p', { class: 'oppmuntring__tittel' }, mom.tekst),
        el('p', { class: 'dempet' }, mom.undertekst),
      ),
      el('div', { class: 'knapprad' },
        el('button', { class: 'knapp', type: 'button', onclick: () => { location.hash = '#/trening'; } }, 'Til Min dag'),
        el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: () => { location.hash = '#/merker'; } }, 'Se merkene'),
      ),
    ),
  );
  if (volumTall) tallOpp(volumTall, løft.volum, { ms: 1100, format: (n) => `${n.toLocaleString('nb-NO')} kg` });
  // Første bevegelse på dagen som løftet streaken → «Jeg er dedikert» over
  // skjermen; ble dagen komplett blå, spilles blå flamme-feiringen etterpå.
  // Begge self-gater på dagens flagg.
  streakEtter(resultat).then(() => blaaEtter());
}
