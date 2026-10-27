// Skriver ut alle setningene Dario kan si i demoen (alle ansatte), som JSON.
// Brukes av scripts/lag-stemme.py, så lydklippene alltid matcher manuset.
import { ROLLER, ANSATTE, SIGNALER, KUNDER, KALENDER, PIPELINE } from '../js/data.js';
import { prioriter, nokkeltall } from '../js/prioritering.js';
import { lagManus } from '../js/brief.js';

const data = { signaler: SIGNALER, roller: ROLLER, kunder: KUNDER, kalender: KALENDER, pipeline: PIPELINE };
const setninger = new Set();
for (const a of ANSATTE) {
  const manus = lagManus(a, { prioriteringer: prioriter(a, data), nokkel: nokkeltall(a, data), kalender: KALENDER });
  manus.forEach((s) => setninger.add(s));
}
console.log(JSON.stringify([...setninger], null, 2));
