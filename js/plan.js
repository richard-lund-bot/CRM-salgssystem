// Plan-modul (M9): kalenderoversikt over planlagte økter, planlegging på
// fremtidige datoer, og bulk-utfylling av kalenderen ut fra ukemål/motivasjon.
// Selve øktinnholdet genereres først når økta faktisk startes (samme
// deterministiske generator som «Ny økt») — planen lagrer kun modalitet +
// varighet + dato, ikke ferdig-genererte blokker, så innholdet aldri blir
// stale når biblioteket eller profilen endrer seg.
import { el, tom, chip, ikon } from './ui.js';
import { MODALITET_NAVN } from './library.js';
import { KLASSER } from './kjor.js';
import { hentProfil, hentPlan, leggTilPlan, fjernPlan, planForDato, planKommende } from './store.js';

let _bib = null;
export function settBib(bib) { _bib = bib; }

const DAG = 86400000;
const UKEDAG_KORT = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];
const MND_NAVN = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

function isoDato(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dg = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dg}`;
}
function varighetNavn(k) {
  return { mikro: '5–10 min', kort: '15–20 min', standard: '30–40 min', lang: '45–60 min' }[k] || k;
}

export function visPlanSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { location.hash = '#/hjem'; return; }
  const bib = _bib;

  const idag = new Date(); idag.setHours(0, 0, 0, 0);
  const idagIso = isoDato(idag);
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const forhandsdato = params.get('d');
  let valgtDato = forhandsdato && /^\d{4}-\d{2}-\d{2}$/.test(forhandsdato) ? forhandsdato : idagIso;
  let visMnd = new Date(`${valgtDato}T00:00:00`);
  visMnd = new Date(visMnd.getFullYear(), visMnd.getMonth(), 1);
  const skjemaState = { modalitet: null, varighetsklasse: profil.varighetsklasse || 'standard' };

  tegn();

  function tegn() {
    tom(mount);
    mount.append(
      el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Plan')),
      el('main', { class: 'innhold' },
        kalenderKort(),
        dagKort(),
        fyllKort(),
        agendaKort(),
      ),
    );
  }

  // --- Månedskalender ---
  function kalenderKort() {
    const år = visMnd.getFullYear();
    const mnd = visMnd.getMonth();
    const førsteUkedag = (new Date(år, mnd, 1).getDay() + 6) % 7; // mandag = 0
    const dagerIMnd = new Date(år, mnd + 1, 0).getDate();
    const planSett = new Set(hentPlan().filter((p) => p.status === 'planlagt').map((p) => p.dato));

    const celler = [];
    for (let i = 0; i < førsteUkedag; i++) celler.push(el('span', { class: 'kalmnd__dag kalmnd__dag--tom' }));
    for (let d = 1; d <= dagerIMnd; d++) {
      const iso = isoDato(new Date(år, mnd, d));
      const erIdag = iso === idagIso;
      const erValgt = iso === valgtDato;
      const harPlan = planSett.has(iso);
      celler.push(el('button', {
        class: 'kalmnd__dag'
          + (erIdag ? ' kalmnd__dag--idag' : '')
          + (erValgt ? ' kalmnd__dag--valgt' : ''),
        type: 'button',
        onclick: () => { valgtDato = iso; tegn(); },
      },
        el('span', { class: 'kalmnd__tall' }, String(d)),
        harPlan && el('span', { class: 'kalmnd__prikk' }),
      ));
    }

    return el('div', { class: 'kort' },
      el('div', { class: 'kalmnd__hode' },
        el('button', { class: 'ikonknapp', type: 'button', title: 'Forrige måned', onclick: () => { visMnd = new Date(år, mnd - 1, 1); tegn(); } }, ikon('tilbake')),
        el('h2', {}, `${MND_NAVN[mnd]} ${år}`),
        el('button', { class: 'ikonknapp', type: 'button', title: 'Neste måned', onclick: () => { visMnd = new Date(år, mnd + 1, 1); tegn(); } }, ikon('chevron')),
      ),
      el('div', { class: 'kalmnd__ukedager' }, ...UKEDAG_KORT.map((u) => el('span', {}, u))),
      el('div', { class: 'kalmnd__grid' }, ...celler),
    );
  }

  // --- Valgt dag: eksisterende planer + skjema for å legge til ---
  function dagKort() {
    const dato = new Date(`${valgtDato}T00:00:00`);
    const visning = dato.toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });
    const tittel = visning.charAt(0).toUpperCase() + visning.slice(1);
    const planer = planForDato(valgtDato);
    const erFortid = valgtDato < idagIso;

    return el('div', { class: 'kort' },
      el('h2', {}, tittel),
      planer.length
        ? el('div', { class: 'plandag__liste' }, ...planer.map((p) => planRad(p)))
        : el('p', { class: 'dempet' }, 'Ingen planlagt økt denne dagen.'),
      !erFortid && leggTilSkjema(),
    );
  }

  function planRad(p) {
    return el('div', { class: 'plandag__rad' },
      el('div', {},
        el('div', { class: 'plandag__mod' }, MODALITET_NAVN[p.modalitet] || p.modalitet),
        el('div', { class: 'dempet' }, varighetNavn(p.varighetsklasse)),
      ),
      el('div', { class: 'plandag__knapper' },
        el('a', { class: 'knapp knapp--sekundaer knapp--liten', href: `#/ny?m=${p.modalitet}&k=${p.varighetsklasse}&p=${p.id}` }, 'Start'),
        el('button', { class: 'ikonknapp', type: 'button', title: 'Fjern', onclick: () => { fjernPlan(p.id); tegn(); } }, ikon('kryss')),
      ),
    );
  }

  function leggTilSkjema() {
    const modaliteter = [...new Set(bib.templates.map((t) => t.modalitet))];
    if (!skjemaState.modalitet || !modaliteter.includes(skjemaState.modalitet)) skjemaState.modalitet = modaliteter[0];
    return el('div', { class: 'plandag__form' },
      el('p', { class: 'dempet' }, 'Planlegg ny økt'),
      el('div', { class: 'chiprad' },
        ...modaliteter.map((m) => chip(MODALITET_NAVN[m] || m, {
          aktiv: skjemaState.modalitet === m, onClick: () => { skjemaState.modalitet = m; tegn(); },
        })),
      ),
      el('div', { class: 'chiprad' },
        ...KLASSER.map(([navn, id]) => chip(navn, {
          aktiv: skjemaState.varighetsklasse === id, onClick: () => { skjemaState.varighetsklasse = id; tegn(); },
        })),
      ),
      el('button', {
        class: 'knapp knapp--sekundaer', type: 'button',
        onclick: () => {
          leggTilPlan({ dato: valgtDato, modalitet: skjemaState.modalitet, varighetsklasse: skjemaState.varighetsklasse });
          tegn();
        },
      }, ikon('pluss'), 'Legg til i planen'),
    );
  }

  // --- Fyll kalender: bulk-generer et par ukers planer ut fra ukemål ---
  function fyllKort() {
    return el('div', { class: 'kort' },
      el('h2', {}, 'Fyll kalenderen'),
      el('p', { class: 'dempet' }, `Fordeler ${profil.ukemaal || 4} økter per uke ut fra motivasjonsprofilen din — hopper over dager som allerede har en plan.`),
      el('div', { class: 'knapprad' },
        ...[2, 4, 8].map((uker) => el('button', {
          class: 'knapp knapp--sekundaer', type: 'button',
          onclick: () => { const n = fyllKalender(uker); tegn(); meldFylt(n); },
        }, `${uker} uker`)),
      ),
    );
  }

  function meldFylt(antall) {
    const p = document.querySelector('.plan-meldt');
    if (p) p.textContent = antall > 0 ? `${antall} nye økter lagt i planen.` : 'Alle dager i perioden har allerede en plan.';
  }

  function fyllKalender(uker) {
    const modaliteter = [...new Set(bib.templates.map((t) => t.modalitet))];
    const vekter = profil.motivasjon?.vekter || {};
    const rangert = modaliteter.slice().sort((a, b) => (vekter[b] || 0) - (vekter[a] || 0));
    const topp = rangert.slice(0, Math.min(3, rangert.length)) || ['STY'];
    const ukemaal = Math.max(1, profil.ukemaal || 4);
    const eksisterende = new Set(hentPlan().filter((p) => p.status === 'planlagt').map((p) => p.dato));

    const offsets = [];
    for (let i = 0; i < ukemaal; i++) offsets.push(Math.round((i * 7) / ukemaal));

    let modIdx = 0;
    let lagt = 0;
    for (let u = 0; u < uker; u++) {
      for (const off of offsets) {
        const dato = new Date(idag.getTime() + (u * 7 + off + 1) * DAG);
        const iso = isoDato(dato);
        if (eksisterende.has(iso)) continue;
        const modalitet = topp[modIdx % topp.length]; modIdx++;
        leggTilPlan({ dato: iso, modalitet, varighetsklasse: profil.varighetsklasse || 'standard' });
        eksisterende.add(iso);
        lagt++;
      }
    }
    return lagt;
  }

  // --- Kommende: kronologisk agenda ---
  function agendaKort() {
    const kommende = planKommende(idagIso).slice(0, 10);
    return el('div', { class: 'kort' },
      el('h2', {}, 'Kommende'),
      el('p', { class: 'plan-meldt dempet' }),
      kommende.length
        ? el('div', { class: 'plandag__liste' }, ...kommende.map((p) => agendaRad(p)))
        : el('p', { class: 'dempet' }, 'Ingen planlagte økter fremover ennå.'),
    );
  }

  function agendaRad(p) {
    const dato = new Date(`${p.dato}T00:00:00`);
    const kort = dato.toLocaleDateString('no-NO', { weekday: 'short', day: 'numeric', month: 'short' });
    return el('button', {
      class: 'plandag__rad plandag__rad--knapp', type: 'button',
      onclick: () => { valgtDato = p.dato; visMnd = new Date(dato.getFullYear(), dato.getMonth(), 1); tegn(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    },
      el('div', {},
        el('div', { class: 'plandag__mod' }, MODALITET_NAVN[p.modalitet] || p.modalitet),
        el('div', { class: 'dempet' }, `${kort} · ${varighetNavn(p.varighetsklasse)}`),
      ),
      el('span', { class: 'listerad__chevron' }, ikon('chevron')),
    );
  }
}
