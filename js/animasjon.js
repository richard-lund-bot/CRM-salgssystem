// Animasjonsverktøykasse — små, avhengighetsløse hjelpere som brukes sammen
// med CSS-siden av verktøykassen (se «M9» i app.css). Ingen rammeverk.

const REDUSERT = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Teller et tall opp fra `fra` til `til` over `ms` ms (ease-out). Respekterer redusert bevegelse. */
export function tallOpp(el, til, { fra = 0, ms = 700, format = (n) => String(n) } = {}) {
  if (!el) return;
  if (REDUSERT() || til === fra) { el.textContent = format(til); return; }
  const start = performance.now();
  const diff = til - fra;
  function steg(nå) {
    const t = Math.min(1, (nå - start) / ms);
    const ease = 1 - (1 - t) ** 3; // cubic ease-out
    el.textContent = format(Math.round(fra + diff * ease));
    if (t < 1) requestAnimationFrame(steg);
    else {
      el.textContent = format(til);
      el.classList.remove('tall--puls'); void el.offsetWidth; el.classList.add('tall--puls');
    }
  }
  requestAnimationFrame(steg);
}

/** Fyller en SVG-sirkel («.ringfremgang__fyll») for timer-/nedtellingsskjermer. */
export function lagRing(radius = 54) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('class', 'ringfremgang');
  const omkrets = 2 * Math.PI * radius;
  const spor = document.createElementNS(NS, 'circle');
  spor.setAttribute('class', 'ringfremgang__spor');
  spor.setAttribute('cx', '60'); spor.setAttribute('cy', '60'); spor.setAttribute('r', String(radius));
  spor.setAttribute('stroke-width', '8');
  const fyll = document.createElementNS(NS, 'circle');
  fyll.setAttribute('class', 'ringfremgang__fyll');
  fyll.setAttribute('cx', '60'); fyll.setAttribute('cy', '60'); fyll.setAttribute('r', String(radius));
  fyll.setAttribute('stroke-width', '8');
  fyll.setAttribute('stroke-dasharray', String(omkrets));
  fyll.setAttribute('stroke-dashoffset', '0');
  svg.append(spor, fyll);
  return { svg, sett: (pct) => { fyll.setAttribute('stroke-dashoffset', String(omkrets * (1 - Math.min(1, Math.max(0, pct))))); } };
}

/**
 * Lar en fyll-stripe (xpbar__fyll, bar__fyll) gli inn fra 0 til mål-verdien i
 * stedet for å hoppe rett dit — CSS-transition (se app.css) driver selve
 * glidningen, dette triggrer den ved å sette 0 først og målet én frame senere.
 */
export function fyllInn(el, prop, verdi) {
  if (!el) return;
  if (REDUSERT()) { el.style[prop] = verdi; return; }
  el.style[prop] = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style[prop] = verdi; }));
}

/** Kort konfetti-burst (rene CSS-animerte spans) — brukes ved level-up. */
export function lagKonfetti(antall = 22) {
  const wrap = document.createElement('div');
  wrap.className = 'konfetti';
  if (REDUSERT()) return wrap;
  const farger = ['#0BA69F', '#4FA9F5', '#FF6F61', '#C8E76B', '#8CCBFF', '#FE9A82'];
  for (let i = 0; i < antall; i++) {
    const brikke = document.createElement('span');
    brikke.className = 'konfetti__brikke';
    const x = Math.random() * 100;
    const dx = (Math.random() - 0.5) * 120;
    const rot = 180 + Math.random() * 360;
    const ms = 1000 + Math.random() * 700;
    const forsinkelse = Math.random() * 250;
    brikke.style.left = `${x}%`;
    brikke.style.background = farger[i % farger.length];
    brikke.style.setProperty('--konf-dx', `${dx}px`);
    brikke.style.setProperty('--konf-rot', `${rot}deg`);
    brikke.style.setProperty('--konf-ms', `${ms}ms`);
    brikke.style.setProperty('--konf-forsinkelse', `${forsinkelse}ms`);
    wrap.append(brikke);
  }
  return wrap;
}
