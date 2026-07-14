// Toast-lag (M33) — lette, forbigående bekreftelser for stille handlinger
// (plan lagt til, synk ferdig o.l.). Spretter opp fra bunnen (squash-in via
// --ease-bounce) og auto-lukker. Respekterer redusert bevegelse (CSS-media).
// Avhengig kun av ui + haptikk — trygt å importere hvor som helst.
import { el, ikon } from './ui.js';
import { vibrer } from './haptikk.js';

let _lag = null;
function laget() {
  if (_lag && document.body.contains(_lag)) return _lag;
  _lag = el('div', { class: 'toastlag' });
  document.body.append(_lag);
  return _lag;
}

/**
 * Vis en toast. `type`: 'ok' | 'info' | 'fare'. Auto-lukker etter `ms` (klikk
 * lukker også). Returnerer en lukk-funksjon.
 */
export function varsle(tekst, { ikon: ikonNavn = 'sjekk', type = 'ok', ms = 2600 } = {}) {
  if (typeof document === 'undefined') return () => {};
  const t = el('div', { class: `toast toast--${type}`, role: 'status', 'aria-live': 'polite' },
    el('span', { class: 'toast__ikon' }, ikon(ikonNavn, 'ikon')),
    el('span', { class: 'toast__tekst' }, tekst),
  );
  laget().append(t);
  vibrer('lett');
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('toast--inn')));
  let lukket = false;
  const lukk = () => {
    if (lukket) return; lukket = true;
    t.classList.remove('toast--inn'); t.classList.add('toast--ut');
    setTimeout(() => t.remove(), 280);
  };
  const timer = setTimeout(lukk, ms);
  t.addEventListener('click', () => { clearTimeout(timer); lukk(); });
  return lukk;
}
