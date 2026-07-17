// Husstand — delt handleliste for husholdninger. Én felles, redigerbar liste
// som medlemmer abonnerer på via en kort kode. Innholdet er MATERIALISERT
// (varer med hver sitt tidsstempel) og synkes på item-nivå (last-write-wins per
// vare) mot Supabase (delte_handlelister + handleliste_medlemmer). Offline-
// først: localStorage er alltid primærkilden; synk skjer ved åpning, ved
// pull-to-refresh og i bakgrunnen (online/synlig) — ikke sanntid.
import { rest, rpc, erInnlogget, brukerId } from './sync.js';
import { vareId, VARE_KATEGORIER, gjettVarekategori } from './mat.js';

const LS_HUS = 'trening.husstand';       // {id, kode, navn, medlemsnavn}
const LS_DATA = 'trening.husstanddata';  // {personer, personerOppdatert, varer:{}, oppdatert}

function naa() { return new Date().toISOString(); }
function lesJson(k, fb) { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fb : v; } catch { return fb; } }
function skrivJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* valgfri */ } }

export function hentHusstand() { return lesJson(LS_HUS, null); }
export function erIHusstand() { return !!hentHusstand()?.id; }
function settHusstand(h) { if (h) skrivJson(LS_HUS, h); else localStorage.removeItem(LS_HUS); }

export function lesData() {
  const d = lesJson(LS_DATA, null) || {};
  return { personer: d.personer || 2, personerOppdatert: d.personerOppdatert || '', varer: d.varer || {}, oppdatert: d.oppdatert || '' };
}
function skrivData(d) { skrivJson(LS_DATA, d); }

// --- Fletting (rein funksjon, item-nivå last-write-wins) -------------------
const nyere = (a, b) => (Date.parse(a || 0) || 0) >= (Date.parse(b || 0) || 0);
export function flettData(a = {}, b = {}) {
  const va = a.varer || {}, vb = b.varer || {};
  const varer = {};
  for (const key of new Set([...Object.keys(va), ...Object.keys(vb)])) {
    const x = va[key], y = vb[key];
    if (x && y) varer[key] = nyere(x.oppdatert, y.oppdatert) ? x : y;
    else varer[key] = x || y;
  }
  const brukA = nyere(a.personerOppdatert, b.personerOppdatert);
  return {
    personer: (brukA ? a.personer : b.personer) || a.personer || b.personer || 2,
    personerOppdatert: (brukA ? a.personerOppdatert : b.personerOppdatert) || '',
    varer,
    oppdatert: nyere(a.oppdatert, b.oppdatert) ? (a.oppdatert || '') : (b.oppdatert || ''),
  };
}
// Klipp bort gamle gravsteiner (slettede varer eldre enn 30 dager).
function beskjær(varer) {
  const grense = Date.now() - 30 * 86400000;
  const ut = {};
  for (const [k, v] of Object.entries(varer || {})) {
    if (v.slettet && (Date.parse(v.oppdatert || 0) || 0) < grense) continue;
    ut[k] = v;
  }
  return ut;
}

// --- Mutasjoner (lokalt → planlegg push) -----------------------------------
function endre(muter) {
  const d = lesData();
  muter(d);
  d.oppdatert = naa();
  skrivData(d);
  planleggSynk();
  return d;
}
export function settVare({ navn, mengde = null, enhet = '', kategori }) {
  const n = (navn || '').trim(); if (!n) return null;
  const kat = kategori || gjettVarekategori(n);
  const key = vareId({ navn: n, kategori: kat });
  endre((d) => { d.varer[key] = { navn: n.slice(0, 40), mengde, enhet, kategori: kat, avkrysset: false, oppdatert: naa(), slettet: false }; });
  return key;
}
export function veksleAvkrysset(key) {
  let ny = false;
  endre((d) => { const v = d.varer[key]; if (v) { v.avkrysset = !v.avkrysset; v.oppdatert = naa(); ny = v.avkrysset; } });
  return ny;
}
export function fjernVare(key) {
  endre((d) => { const v = d.varer[key]; if (v) { v.slettet = true; v.avkrysset = false; v.oppdatert = naa(); } });
}
export function settPersoner(n) {
  const p = Math.max(1, Math.min(12, n));
  endre((d) => { d.personer = p; d.personerOppdatert = naa(); });
  return p;
}
/** Legg til varer fra en beregnet handleliste (behold avkryssing på det som fins). */
export function importerVarer(liste) {
  let lagt = 0;
  endre((d) => {
    for (const ing of liste || []) {
      const kat = ing.kategori || 'annet';
      const key = vareId({ navn: ing.navn, kategori: kat });
      const fins = d.varer[key];
      if (fins && !fins.slettet) continue;
      d.varer[key] = { navn: ing.navn, mengde: ing.mengde ?? null, enhet: ing.enhet || '', kategori: kat, avkrysset: false, oppdatert: naa(), slettet: false };
      lagt++;
    }
  });
  return lagt;
}

// --- Gruppering til visning (samme form som mat.byggHandleliste) -----------
export function byggGrupper() {
  const d = lesData();
  const alle = Object.entries(d.varer).filter(([, v]) => v && !v.slettet)
    .map(([key, v]) => ({ key, navn: v.navn, mengde: v.mengde, enhet: v.enhet || '', kategori: v.kategori || 'annet', avkrysset: !!v.avkrysset }));
  const grupper = [];
  for (const kat of VARE_KATEGORIER) {
    const varer = alle.filter((v) => v.kategori === kat.id).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
    if (varer.length) grupper.push({ ...kat, varer, antall: varer.length, avkrysset: varer.filter((x) => x.avkrysset).length });
  }
  return { grupper, personer: d.personer || 2, totalVarer: grupper.reduce((s, g) => s + g.antall, 0) };
}
export function handlelisteTekst() {
  const b = byggGrupper();
  const linjer = ['Handleliste'];
  for (const g of b.grupper) { linjer.push('', g.navn); for (const v of g.varer) linjer.push(`- ${v.navn}${v.mengde != null ? ` (${v.mengde} ${v.enhet})` : ''}`); }
  return linjer.join('\n');
}

// --- Abonnement (opprett / bli med / forlat) -------------------------------
function tilVarerKart(liste, ut = {}) {
  for (const ing of liste || []) {
    const kat = ing.kategori || 'annet';
    ut[vareId({ navn: ing.navn, kategori: kat })] = {
      navn: ing.navn, mengde: ing.mengde ?? null, enhet: ing.enhet || '', kategori: kat, avkrysset: !!ing.avkrysset, oppdatert: naa(), slettet: false,
    };
  }
  return ut;
}
export async function opprettHusstand({ navn, medlemsnavn, startVarer = [], personer = 2 }) {
  const data = { personer, personerOppdatert: naa(), varer: tilVarerKart(startVarer), oppdatert: naa() };
  const rad = await rpc('opprett_delt_handleliste', { p_navn: navn, p_medlemsnavn: medlemsnavn, p_data: data });
  const row = Array.isArray(rad) ? rad[0] : rad;
  settHusstand({ id: row.id, kode: row.kode, navn: row.navn, medlemsnavn: medlemsnavn || 'Meg' });
  skrivData(row.data && row.data.varer ? { personer: row.data.personer || personer, personerOppdatert: row.data.personerOppdatert || '', varer: row.data.varer, oppdatert: row.oppdatert || naa() } : data);
  return { kode: row.kode, id: row.id, navn: row.navn };
}
export async function bliMed({ kode, medlemsnavn }) {
  const rad = await rpc('bli_med_i_handleliste', { p_kode: (kode || '').trim().toUpperCase(), p_medlemsnavn: medlemsnavn });
  const row = Array.isArray(rad) ? rad[0] : rad;
  settHusstand({ id: row.id, kode: row.kode, navn: row.navn, medlemsnavn: medlemsnavn || 'Meg' });
  const d = (row.data && typeof row.data === 'object') ? row.data : {};
  skrivData({ personer: d.personer || 2, personerOppdatert: d.personerOppdatert || '', varer: d.varer || {}, oppdatert: row.oppdatert || naa() });
  return { navn: row.navn, kode: row.kode };
}
export async function forlatHusstand() {
  const h = hentHusstand(); if (!h) return;
  const uid = brukerId();
  try {
    const filter = uid ? `&user_id=eq.${uid}` : '';
    await rest(`handleliste_medlemmer?liste_id=eq.${h.id}${filter}`, { method: 'DELETE', prefer: 'return=minimal' });
  } catch { /* RLS begrenser uansett til egen rad */ }
  settHusstand(null);
  localStorage.removeItem(LS_DATA);
}
export async function hentMedlemmer() {
  const h = hentHusstand(); if (!h) return [];
  try { return (await rpc('hent_handleliste_medlemmer', { p_liste: h.id })) || []; } catch { return []; }
}

// --- Synk (pull → flett → push) --------------------------------------------
const lyttere = new Set();
export function påEndring(fn) { lyttere.add(fn); return () => lyttere.delete(fn); }
function meld() { for (const fn of lyttere) { try { fn(); } catch { /* */ } } }

let synkerNaa = false;
export async function synk() {
  const h = hentHusstand();
  if (!h || !erInnlogget() || !navigator.onLine || synkerNaa) return { ok: false };
  synkerNaa = true;
  try {
    const rader = await rest(`delte_handlelister?id=eq.${h.id}&select=data,oppdatert,navn`);
    if (!rader || !rader.length) { settHusstand(null); localStorage.removeItem(LS_DATA); meld(); return { ok: false, borte: true }; }
    const rad = rader[0];
    if (rad.navn && rad.navn !== h.navn) settHusstand({ ...h, navn: rad.navn });
    const lokal = lesData();
    const fjern = (rad.data && typeof rad.data === 'object') ? rad.data : { varer: {} };
    const flettet = flettData(lokal, fjern);
    flettet.varer = beskjær(flettet.varer);
    skrivData(flettet);
    const endret = JSON.stringify(flettet.varer) !== JSON.stringify(fjern.varer || {})
      || (flettet.personer !== (fjern.personer || 2));
    if (endret) {
      await rest(`delte_handlelister?id=eq.${h.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { data: flettet, oppdatert: naa() } });
    }
    meld();
    return { ok: true };
  } catch (e) {
    console.warn('Husstand-synk feilet', e);
    return { ok: false, feil: e.message };
  } finally { synkerNaa = false; }
}

let pushTimer = null;
function planleggSynk() {
  if (!erIHusstand() || !erInnlogget() || !navigator.onLine) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => synk(), 1200);
}

export function init() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => synk());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) synk(); });
}
