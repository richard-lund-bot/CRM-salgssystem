// Animasjonsverktøykasse — små, avhengighetsløse hjelpere som brukes sammen
// med CSS-siden av verktøykassen (se «M9» i app.css). Ingen rammeverk.

/** Om brukeren har bedt om redusert bevegelse. Delt gate — importer denne i
 *  stedet for å duplisere matchMedia rundt i modulene. */
export const REDUSERT = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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

/** Kort konfetti-burst (rene CSS-animerte spans) — brukes ved level-up/feiring.
 *  `sprut` gir hver brikke et lite oppadgående kast før den faller (bue-bane,
 *  mer organisk — jf. joy-delight-prinsippet), ellers ren nedfall. */
export function lagKonfetti(antall = 22, { sprut = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'konfetti' + (sprut ? ' konfetti--sprut' : '');
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
    if (sprut) brikke.style.setProperty('--konf-opp', `${40 + Math.random() * 90}px`);
    wrap.append(brikke);
  }
  return wrap;
}

/** Radierende gnist-burst (secondary action for feiringer) — små stjerner som
 *  spretter ut i en ring og fader. CSS driver selve animasjonen (.gnist__stj). */
export function lagGnist(antall = 10) {
  const wrap = document.createElement('div');
  wrap.className = 'gnist';
  if (REDUSERT()) return wrap;
  for (let i = 0; i < antall; i++) {
    const vinkel = (360 / antall) * i + (Math.random() - 0.5) * 18;
    const avstand = 46 + Math.random() * 34;
    const stj = document.createElement('span');
    stj.className = 'gnist__stj';
    stj.style.setProperty('--g-vinkel', `${vinkel}deg`);
    stj.style.setProperty('--g-avstand', `${avstand}px`);
    stj.style.setProperty('--g-ms', `${520 + Math.random() * 260}ms`);
    stj.style.setProperty('--g-forsinkelse', `${Math.random() * 120}ms`);
    wrap.append(stj);
  }
  return wrap;
}

/** Staggret inngang for en liste/rad-samling: hvert element glir inn med økende
 *  forsinkelse (follow-through/overlapping). Helt selvstendig via inline-stiler
 *  — ingen CSS-avhengighet og ingen FOUC hvis JS ikke rekker å kjøre (da vises
 *  alt normalt). Respekterer redusert bevegelse (rører ingenting). */
export function stagger(container, { selektor = ':scope > *', trinn = 55, ms = 380, maks = 12 } = {}) {
  if (!container || REDUSERT()) return;
  // Under en pågående View Transition eier den overgangen inngangen — ikke
  // dobbeltanimer (og unngå at start-skjult tilstand fanges i VT-snapshotet).
  if (typeof document !== 'undefined' && document.documentElement.dataset.vt) return;
  const barn = [...container.querySelectorAll(selektor)];
  barn.forEach((el, i) => {
    const d = Math.min(i, maks) * trinn;
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = `opacity ${ms}ms var(--ease-out) ${d}ms, transform ${ms}ms var(--ease-out) ${d}ms`;
      el.style.opacity = '1';
      el.style.transform = 'none';
    }));
  });
}

/** Kryssfade ved innholdsbytte: fade ut nåværende innhold, kjør `oppdater()`
 *  (som bytter DOM-en), fade inn. Ved redusert bevegelse byttes det rett.
 *  Brukes til øktspillerens faseskift så steg ikke bare «hopper». */
export function bytt(el, oppdater, { ms = 180 } = {}) {
  if (!el) { oppdater?.(); return; }
  if (REDUSERT()) { oppdater?.(); return; }
  el.style.transition = `opacity ${ms}ms var(--ease-standard), transform ${ms}ms var(--ease-standard)`;
  el.style.opacity = '0';
  el.style.transform = 'translateY(6px)';
  setTimeout(() => {
    oppdater?.();
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    }));
  }, ms);
}
