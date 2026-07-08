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
