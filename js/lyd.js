// Lydeffekter (M33) — korte «pling» via Web Audio, ingen lydfiler (offline-first).
// Speiler haptikk.js: én enkel av/på-bryter som settes fra Innstillinger. All lyd
// er best-effort og feiler stille der Web Audio ikke finnes eller er blokkert
// (f.eks. før første bruker-gest). Brukes ved fasebytte i øktspilleren og i
// feiringene (claim-kiste + opplåsing).

let _av = false;
/** Slå lyd av/på (kalles fra Innstillinger ved oppstart og endring). */
export function settLydAv(verdi) { _av = !!verdi; }
/** Om lyd er slått av. */
export function lydErAv() { return _av; }

// Én delt AudioContext, opprettet dovent ved første pling (helst innen en gest).
let _ac = null;
function ctx() {
  if (_ac) return _ac;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    _ac = Ctx ? new Ctx() : null;
  } catch { _ac = null; }
  return _ac;
}

/** Kort «pling». Standard 880 Hz i 0,12 s. Stille når lyd er av. */
export function pling(frekv = 880, lengde = 0.12) {
  if (_av) return;
  try {
    const ac = ctx();
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = frekv;
    o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + lengde);
    o.start(); o.stop(ac.currentTime + lengde);
  } catch { /* stille fallback */ }
}

/** «Pling pling»: en liten stigende sekvens (feiring/opplåsing). */
export function plingSekvens(antall = 2, { start = 740, steg = 180, mellom = 130 } = {}) {
  if (_av) return;
  for (let i = 0; i < Math.max(1, antall); i++) {
    setTimeout(() => pling(start + i * steg, 0.12), i * mellom);
  }
}
