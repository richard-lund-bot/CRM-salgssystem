// Haptisk tilbakemelding som følger animasjonene.
// - Android (og andre med Vibration API): ekte vibrasjonsmønstre.
// - iOS: Vibration API støttes ikke. Vi bruker triks-metoden med en skjult
//   <input switch> som gir et lett «tap» på iOS 17.4+ (kun ett tap, ingen
//   mønstre). Alt er best-effort og feiler stille der det ikke støttes.

const MONSTRE = {
  lett: 10,                       // trykk / åpne popover
  medium: 18,                     // start / «jeg gjorde det»
  riktig: [0, 14, 34, 20],        // riktig svar
  feil: [0, 26, 40, 18],          // feil svar (litt lengre)
  feiring: [0, 22, 45, 22, 45, 40], // trinn mestret
};

let _av = false;
/** Slå haptikk av/på (f.eks. fra innstillinger). */
export function settHaptikkAv(verdi) { _av = !!verdi; }

// iOS-triks: en skjult switch-bryter. Å «klikke» den innenfor en
// bruker-gest gir et lett haptisk tap på iOS 17.4+.
let _iosBryter = null;
function iosBryter() {
  if (_iosBryter || typeof document === 'undefined') return _iosBryter;
  try {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.setAttribute('switch', ''); // iOS-haptikk-triggeren
    label.appendChild(inp);
    document.body.appendChild(label);
    _iosBryter = inp;
  } catch { /* ignorer */ }
  return _iosBryter;
}

/** Gi haptisk tilbakemelding av en gitt type. */
export function vibrer(type = 'lett') {
  if (_av) return;
  const monster = MONSTRE[type] ?? MONSTRE.lett;
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(monster);
  } catch { /* ignorer */ }
  try {
    iosBryter()?.click(); // best-effort tap på iOS
  } catch { /* ignorer */ }
}
