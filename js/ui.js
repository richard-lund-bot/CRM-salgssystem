// Små DOM-hjelpere — ingen rammeverk.

/** Lager et element med attributter og barn. */
export function el(tag, attrs = {}, ...barn) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const b of barn.flat()) {
    if (b == null || b === false) continue;
    node.append(b.nodeType ? b : document.createTextNode(String(b)));
  }
  return node;
}

/** Tømmer et element. */
export function tom(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Enkel chip-knapp. */
export function chip(tekst, { aktiv = false, onClick } = {}) {
  return el('button', { class: 'chip' + (aktiv ? ' chip--aktiv' : ''), type: 'button', onclick: onClick }, tekst);
}

// --- Linjeikoner (inline SVG, 24×24, arver farge via currentColor) ---------
// Ingen eksterne avhengigheter; tema-farget gjennom stroke: currentColor.
const IKONER = {
  hjem: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  lyn: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  graf: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16l4-5 3 3 5-7"/>',
  kalender: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/>',
  puls: '<path d="M2 12h4l2-7 4 14 3-10 2 3h5"/>',
  meny: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  tilbake: '<path d="M15 6l-6 6 6 6"/>',
  pluss: '<path d="M12 5v14M5 12h14"/>',
  bjelle: '<path d="M6 9a6 6 0 1112 0v4l2 3H4l2-3z"/><path d="M10 21h4"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0116 0"/>',
  rute: '<path d="M6 6h7a3 3 0 010 6H9a3 3 0 000 6h9"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/>',
  loper: '<circle cx="15" cy="5" r="2"/><path d="M14 8l-3 3 2 3 1 5M13 11l4 2M11 11l-4 1M13 17l-3 3"/>',
  stoppeklokke: '<circle cx="12" cy="13" r="7"/><path d="M12 13V9M9 2h6M18 6l1-1"/>',
  sko: '<path d="M3 16v-4l4-3 3 3 6 1 5 3v2a2 2 0 01-2 2H3z"/><path d="M7 9l1 2M10 12l1 2"/>',
  vekt: '<path d="M4 12h16M6 8v8M18 8v8M3 10v4M21 10v4"/>',
  yoga: '<circle cx="12" cy="4" r="2"/><path d="M12 6v6M6 20l6-8 6 8M6 12h12"/>',
  flamme: '<path d="M12 3c3 4 5 6 5 9a5 5 0 11-10 0c0-2 1-3 2-4"/><path d="M12 21a3 3 0 003-3c0-2-3-4-3-4"/>',
  trofe: '<path d="M7 4h10v4a5 5 0 01-10 0V4z"/><path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M9 20h6M12 13v4"/>',
  hjerte: '<path d="M12 20s-7-4.5-9-9a4 4 0 017-3 4 4 0 017 3c-2 4.5-9 9-9 9z"/>',
  gir: '<circle cx="12" cy="12" r="2.7"/><path d="M12.2 2h-.4a1.8 1.8 0 00-1.8 1.8v.1a1.8 1.8 0 01-.9 1.6l-.4.2a1.8 1.8 0 01-1.8 0l-.1-.1a1.8 1.8 0 00-2.5.7l-.2.3a1.8 1.8 0 00.6 2.5l.2.1a1.8 1.8 0 01.9 1.6v.4a1.8 1.8 0 01-.9 1.6l-.2.1a1.8 1.8 0 00-.6 2.5l.2.3a1.8 1.8 0 002.5.7l.1-.1a1.8 1.8 0 011.8 0l.4.2a1.8 1.8 0 01.9 1.6v.2a1.8 1.8 0 001.8 1.8h.4a1.8 1.8 0 001.8-1.8v-.2a1.8 1.8 0 01.9-1.6l.4-.2a1.8 1.8 0 011.8 0l.1.1a1.8 1.8 0 002.5-.7l.2-.3a1.8 1.8 0 00-.6-2.5l-.2-.1a1.8 1.8 0 01-.9-1.6v-.4a1.8 1.8 0 01.9-1.6l.2-.1a1.8 1.8 0 00.6-2.5l-.2-.3a1.8 1.8 0 00-2.5-.7l-.1.1a1.8 1.8 0 01-1.8 0l-.4-.2a1.8 1.8 0 01-.9-1.6V3.8A1.8 1.8 0 0012.2 2z"/>',
  bok: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19a2 2 0 012-2h13"/>',
  sky: '<path d="M7 18a4 4 0 01-.5-8 5 5 0 019.7-1A3.5 3.5 0 0117 18z"/>',
  hexstjerne: '<path d="M12 3l7 4v10l-7 4-7-4V7z"/><path d="M12 8l1.3 2.7 3 .4-2.2 2 .5 3-2.6-1.4L9.9 16l.5-3-2.2-2 3-.4z"/>',
  medalje: '<circle cx="12" cy="14.5" r="5"/><path d="M12 9.8L8.3 2.5M12 9.8l3.7-7.3"/><path d="M9.8 14.6l1.5 1.6 2.7-3.4"/>',
  las: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  sjekk: '<path d="M4 12.5l5 5L20 6" stroke-width="2.6"/>',
  kryss: '<path d="M6 6l12 12M18 6L6 18" stroke-width="2.4"/>',
  bytt: '<path d="M7 8h11m0 0l-3.2-3M18 8l-3.2 3" stroke-width="2.2"/><path d="M17 16H6m0 0l3.2-3M6 16l3.2 3" stroke-width="2.2"/>',
  repeat: '<path d="M4 12a8 8 0 0113.9-5.4M20 12a8 8 0 01-13.9 5.4" stroke-width="2.2"/><path d="M17 3v4h-4M7 21v-4h4"/>',
  terning: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.3" cy="8.3" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.7" cy="8.3" r="1.3" fill="currentColor" stroke="none"/><circle cx="8.3" cy="15.7" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.7" cy="15.7" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  palett: '<path d="M12 3a9 8 0 100 16c1.2 0 1.7-.7 1.7-1.5s-.5-1-.5-1.8c0-.9.7-1.5 1.6-1.5H16a4 4 0 004-4c0-4-3.6-7.2-8-7.2z"/><circle cx="8" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.6" cy="15" r="1.1" fill="currentColor" stroke="none"/><circle cx="13" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="16.2" cy="10.5" r="1.1" fill="currentColor" stroke="none"/>',
  stjerne: '<path d="M12 3.5l2.5 5.4 5.9.7-4.4 4.1 1.2 5.9L12 16.8l-5.2 2.8 1.2-5.9-4.4-4.1 5.9-.7z"/>',
};

/** Returnerer et inline SVG-ikon (arver farge). */
export function ikon(navn, klasse = 'ikon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', klasse);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = IKONER[navn] || '';
  return svg;
}
