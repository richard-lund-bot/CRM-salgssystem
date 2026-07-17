// Feiringslaget (M33) — den gamifiserte belønningsloopen rundt fullførte
// moduler og bevegelse, inspirert av Duolingo, men tro mot Mova-spec-en
// («aldri skam, delvis gjennomføring teller»):
//   1) claim-kiste med heiende panda etter fullført modul (kisteKort),
//   2) «pling pling» på opplåste økter (avdekket i kista + egen lyd),
//   3) streak-økning med «Jeg er dedikert»-bekreftelse (streakFeiring),
//   4) blå flamme-feiring når alle gnistene tennes samme dag (blaaFeiring).
//
// Rekkefølge i praksis: kista avdekker merker + opplåsninger inne i leksjons-
// skjermen; når brukeren trykker «Fortsett» spilles streak-feiringen over
// hele skjermen. Alt gjenbruker de eksisterende byggeklossene (animasjon.js,
// haptikk.js, lyd.js) og respekterer prefers-reduced-motion (via tallOpp/
// lagKonfetti + CSS-media). Ingen DOM-fri logikk her — rene skjermbyggere.
import { el, ikon } from './ui.js';
import { tallOpp, lagKonfetti, lagGnist } from './animasjon.js';
import { vibrer } from './haptikk.js';
import { pling } from './lyd.js';
import { feiringsHvorfor } from './mening.js';
import { hentGnistStatus } from './gnist.js';

// Maskoten i cheer-posen — egen liten bygger så vi slipper å importere sti.js
// (som importerer denne modulen tilbake; ville blitt en syklus).
const PANDA_CHEER = 'icons/brand/panda/panda-cheer.webp';
function pandaCheer(klasse) {
  return el('img', {
    class: 'panda-bilde' + (klasse ? ' ' + klasse : ''),
    src: PANDA_CHEER, alt: '', 'aria-hidden': 'true', draggable: 'false',
  });
}

// Skattekiste som inline-SVG (offline-first, samme stil som kroneSvg/lynSvg i
// sti.js). Lokket hengsler opp når `.kiste--apen` settes; stråler tennes.
function kisteSvg(klasse = '') {
  const wrap = el('div', { class: 'kiste' + (klasse ? ' ' + klasse : ''), 'aria-hidden': 'true' });
  wrap.innerHTML = '<svg viewBox="0 0 72 62" class="kiste__svg">'
    + '<ellipse class="kiste__glo" cx="36" cy="36" rx="30" ry="26"/>'
    + '<g class="kiste__straaler">'
    + '<path d="M36 6V-6"/><path d="M18 10 12 0"/><path d="M54 10 60 0"/><path d="M6 24 -4 20"/><path d="M66 24 76 20"/>'
    + '</g>'
    + '<g class="kiste__kropp">'
    + '<rect x="12" y="28" width="48" height="26" rx="4" fill="#B5761F" stroke="#7A4E14" stroke-width="2"/>'
    + '<rect x="12" y="34" width="48" height="5" fill="#8A5A18"/>'
    + '<rect x="31" y="36" width="10" height="16" rx="2" fill="#F5C542" stroke="#7A4E14" stroke-width="1.5"/>'
    + '<circle cx="36" cy="42" r="2.3" fill="#7A4E14"/>'
    + '</g>'
    + '<g class="kiste__lokk">'
    + '<path d="M12 30 Q12 15 36 15 Q60 15 60 30 Z" fill="#C98A2B" stroke="#7A4E14" stroke-width="2"/>'
    + '<rect x="11" y="28" width="50" height="5" rx="2" fill="#8A5A18"/>'
    + '</g>'
    + '</svg>';
  return wrap;
}

/**
 * «Claim-kiste»-kortet — den heiende feiringen etter en fullført modul.
 * Bygger et kort du legger inn i leksjons-skjermen (kropp). Det spiller seg
 * selv når det monteres: kista åpnes, og nye merker + opplåste økter avdekkes
 * én etter én med pling. `kort.spillAv()` er også eksponert.
 *
 * @param tittel    stor tittel («Teknikk lært!»)
 * @param under     undertekst (øvelsens/temaets navn)
 * @param merker    res.nyeMerker (avdekkes som «Nytt merke: …»)
 * @param opplaste  res.nyeOpplaste (avdekkes som «Låst opp: …» + pling pling)
 * @param panda     vis heiende panda (default true) — ellers valgfritt topp-ikon
 * @param ikonNavn  topp-ikon når panda=false (f.eks. 'bok' for teori)
 */
export function kisteKort({ tittel = 'Fullført!', under = '', merker = [], opplaste = [], panda = true, ikonNavn = null } = {}) {
  const linjer = el('div', { class: 'kiste-kort__linjer' });
  const kiste = kisteSvg('kiste-kort__kiste');
  const kort = el('div', { class: 'kiste-kort' },
    panda ? pandaCheer('kiste-kort__panda')
      : (ikonNavn ? el('span', { class: 'kiste-kort__toppikon' }, ikon(ikonNavn, 'ikon')) : null),
    kiste,
    el('h1', { class: 'kiste-kort__tittel' }, tittel),
    under ? el('p', { class: 'kiste-kort__under' }, under) : null,
    linjer,
  );

  let spilt = false;
  function spillAv() {
    if (spilt) return; spilt = true;
    vibrer('feiring');
    pling(880, 0.12);
    kiste.classList.add('kiste--apen');
    const rader = [
      ...merker.map((m) => ({ ikon: 'medalje', tekst: `Nytt merke: ${m.navn}`, klasse: 'merke' })),
      ...opplaste.map((o) => ({ ikon: 'lasopp', tekst: `Låst opp: ${o.navn}`, klasse: 'opplast' })),
    ];
    let plingNr = 0;
    rader.forEach((r, i) => {
      const rad = el('div', { class: `kiste-kort__linje kiste-kort__linje--${r.klasse}` },
        ikon(r.ikon, 'ikon'), el('span', {}, r.tekst));
      linjer.append(rad);
      requestAnimationFrame(() => setTimeout(() => rad.classList.add('kiste-kort__linje--inn'), 260 + i * 140));
      if (r.klasse === 'opplast') { // «pling pling» stigende per opplåsing
        const n = plingNr++;
        setTimeout(() => pling(760 + n * 130, 0.12), 320 + i * 160);
      }
    });
    if (opplaste.length) setTimeout(() => vibrer('riktig'), 340);
    try { kort.append(lagGnist(12), lagKonfetti(24, { sprut: true })); } catch { /* valgfri feiring */ }
  }
  // Auto-spill etter to frames (CSS-inngangen rekker å feste seg først).
  requestAnimationFrame(() => requestAnimationFrame(spillAv));
  kort.spillAv = spillAv;
  return kort;
}

// --- Streak-feiring («Jeg er dedikert») ------------------------------------
// Fyres kun på dagens første bevegelse (når streaken faktisk øker) og maks én
// gang per dag. Gates device-lokalt — samme «visningstilstand, ikke data»-
// mønster som trening.varslerSett; synkes bevisst ikke.
const STREAK_FLAGG = (iso) => `mova.streakFeiret.${iso}`;
function isoIdag(nå = Date.now()) {
  const d = new Date(nå);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dg = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dg}`;
}
function streakFeiretIdag() {
  try { return localStorage.getItem(STREAK_FLAGG(isoIdag())) === '1'; } catch { return false; }
}
function settStreakFeiret() {
  try { localStorage.setItem(STREAK_FLAGG(isoIdag()), '1'); } catch { /* ignorer */ }
}

/**
 * Fullskjerm streak-feiring: voksende flamme, tall som teller opp til den nye
 * streaken, og en «Jeg er dedikert»-knapp som bekrefter dagen. Returnerer et
 * Promise som resolver når brukeren bekrefter (eller straks, uten DOM).
 * No-shame: dette feirer bare økning — det finnes ingen «du mistet streaken».
 */
export function streakFeiring(streak) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(); return; }
    vibrer('feiring');
    const tall = el('span', { class: 'streakfeiring__tall' }, '0');
    const knapp = el('button', { class: 'streakfeiring__knapp', type: 'button' }, 'Jeg er dedikert');
    // Meningslinjen pakker inn belønningen: streaken peker mot ditt eget hvorfor
    // (ikigai). Vises kun når brukeren har erklært et hvorfor — ellers den rene
    // no-shame-linjen. Dette gjør de ekstrinsiske poengene intrinsisk forankret.
    const hvorfor = feiringsHvorfor();
    const overlay = el('div', { class: 'streakfeiring', role: 'dialog', 'aria-label': 'Streak økt' },
      el('div', { class: 'streakfeiring__glo' }),
      el('div', { class: 'streakfeiring__flamme' }, ikon('flamme', 'ikon')),
      el('div', { class: 'streakfeiring__teller' },
        tall, el('span', { class: 'streakfeiring__enhet' }, streak === 1 ? 'dag på rad' : 'dager på rad')),
      el('h1', { class: 'streakfeiring__tittel' }, 'Streak!'),
      hvorfor
        ? el('p', { class: 'streakfeiring__hvorfor' },
          el('span', { class: 'streakfeiring__hvorfor-merkelapp' }, 'Ett steg nærmere'),
          hvorfor)
        : el('p', { class: 'streakfeiring__under' },
          'Du møtte opp i dag. Én dag av gangen — det er slik det bygges.'),
      el('div', { class: 'streakfeiring__bunn' }, knapp),
    );
    let ferdig = false;
    const lukk = () => {
      if (ferdig) return; ferdig = true;
      vibrer('medium');
      overlay.classList.add('streakfeiring--ut');
      setTimeout(() => { overlay.remove(); resolve(); }, 380);
    };
    knapp.addEventListener('click', lukk);
    document.body.append(overlay);
    try { overlay.append(lagGnist(14), lagKonfetti(26, { sprut: true })); } catch { /* valgfri feiring */ }
    requestAnimationFrame(() => {
      overlay.classList.add('streakfeiring--pa');
      pling(660, 0.14);
      tallOpp(tall, streak, { fra: Math.max(0, streak - 1), ms: 800 });
    });
  });
}

/**
 * Spiller streak-feiringen dersom streaken økte i dag (res.streakØkte) og den
 * ikke alt er feiret. Resolver alltid — så kalleren trygt kan lukke/navigere
 * etterpå (`await streakEtter(res); lukk();`).
 */
export async function streakEtter(res) {
  const streak = res?.streakØkte || 0;
  if (streak > 0 && !streakFeiretIdag()) {
    settStreakFeiret();
    await streakFeiring(streak);
  }
}

// --- Full dag-feiring (alle fire vanene samme dag) --------------------------
// Feires én gang per dag, samme device-lokale gating som streak-feiringen.
const BLAA_FLAGG = (iso) => `takt.blaaFeiret.${iso}`;
function blaaFeiretIdag() {
  try { return localStorage.getItem(BLAA_FLAGG(isoIdag())) === '1'; } catch { return false; }
}
function settBlaaFeiret() {
  try { localStorage.setItem(BLAA_FLAGG(isoIdag()), '1'); } catch { /* ignorer */ }
}

/**
 * Fullskjerm feiring når alle fire vanene er gjort samme dag: samme scene som
 * streak-feiringen, i blått, med hoved-streaken som teller. Resolver når
 * brukeren bekrefter.
 */
export function blaaFeiring(streak) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(); return; }
    vibrer('feiring');
    const tall = el('span', { class: 'streakfeiring__tall' }, '0');
    const knapp = el('button', { class: 'streakfeiring__knapp streakfeiring__knapp--blaa', type: 'button' }, 'Fortsett');
    const hvorfor = feiringsHvorfor();
    const overlay = el('div', { class: 'streakfeiring streakfeiring--blaa', role: 'dialog', 'aria-label': 'Alle fire vaner i dag' },
      el('div', { class: 'streakfeiring__glo' }),
      el('div', { class: 'streakfeiring__flamme' }, ikon('flamme', 'ikon')),
      el('div', { class: 'streakfeiring__teller' },
        tall, el('span', { class: 'streakfeiring__enhet' }, streak === 1 ? 'dag på rad' : 'dager på rad')),
      el('h1', { class: 'streakfeiring__tittel' }, 'Alle fire i dag'),
      hvorfor
        ? el('p', { class: 'streakfeiring__hvorfor' },
          el('span', { class: 'streakfeiring__hvorfor-merkelapp' }, 'Ett steg nærmere'),
          hvorfor)
        : el('p', { class: 'streakfeiring__under' },
          'Bevegelse, mat, ro og sosialt — alt på plass i dag.'),
      el('div', { class: 'streakfeiring__bunn' }, knapp),
    );
    let ferdig = false;
    const lukk = () => {
      if (ferdig) return; ferdig = true;
      vibrer('medium');
      overlay.classList.add('streakfeiring--ut');
      setTimeout(() => { overlay.remove(); resolve(); }, 380);
    };
    knapp.addEventListener('click', lukk);
    document.body.append(overlay);
    try { overlay.append(lagGnist(14), lagKonfetti(26, { sprut: true })); } catch { /* valgfri feiring */ }
    requestAnimationFrame(() => {
      overlay.classList.add('streakfeiring--pa');
      pling(740, 0.14);
      tallOpp(tall, streak, { fra: Math.max(0, streak - 1), ms: 800 });
    });
  });
}

/**
 * Spiller full dag-feiringen dersom alle fire vanene nettopp kom på plass og
 * den ikke alt er feiret i dag. Kalles etter enhver registrering som kan ha
 * fullført en vane. Resolver alltid.
 */
export async function blaaEtter() {
  const gs = hentGnistStatus();
  if (gs.blaa.iDagAlle && !blaaFeiretIdag()) {
    settBlaaFeiret();
    await blaaFeiring(gs.blaa.streak);
  }
}
