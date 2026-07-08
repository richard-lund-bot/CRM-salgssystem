// Deterministisk tilfeldighet — samme seed gir alltid samme økt.
// Uten dette ville «regenerer» og reload gitt ulikt resultat, og øktene
// kunne ikke deles/repeteres. Ingen Math.random() i generatoren.

/** 32-bit hash av en streng (FNV-1a-variant) → heltall for seeding. */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — liten, rask PRNG. Returnerer funksjon som gir [0,1). */
export function lagRng(seed) {
  let a = (typeof seed === 'string' ? hashSeed(seed) : seed) >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Heltall i [0, n). */
export function rngInt(rng, n) {
  return Math.floor(rng() * n);
}

/** Fisher–Yates med gitt rng — muterer ikke input. */
export function stokk(liste, rng) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rngInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Trekk ett element pseudo-tilfeldig. */
export function trekk(liste, rng) {
  return liste.length ? liste[rngInt(rng, liste.length)] : null;
}
