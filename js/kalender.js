// Mosjonskalender (M12): ukeliste med én rad per dag — hver dag kan få
// planlagte økter via «Legg til», hver uke kan nullstilles, og ingenting
// skrives før «Lagre» (tilbake-pilen forkaster utkastet). Planene er samme
// datamodell som Plan-modulen (dato + modalitet + varighetsklasse); selve
// øktinnholdet genereres først når økta startes.
import { el, tom, chip, ikon } from './ui.js';
import { MODALITET_NAVN } from './library.js';
import { hentProfil, hentPlan, leggTilPlan, fjernPlan } from './store.js';
import { hentOkter, oktMedId, KATEGORIER, KATEGORI_NAVN } from './bibliotek-okter.js';

let _bib = null;
export function settBib(bib) { _bib = bib; }

const DAG = 86400000;
const UKEDAG_KORT = ['MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR', 'SØN'];
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ANTALL_UKER = 6;

function isoDato(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dg = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dg}`;
}

function varighetNavn(k) {
  return { mikro: '5–10 min', kort: '15–20 min', standard: '30–40 min', lang: '45–60 min' }[k] || k;
}

export function visKalenderSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { location.hash = '#/hjem'; return; }

  const idag = new Date();
  idag.setHours(0, 0, 0, 0);
  const idagIso = isoDato(idag);
  const man0 = new Date(idag.getTime() - ((idag.getDay() + 6) % 7) * DAG);
  const fokusDato = new URLSearchParams(location.hash.split('?')[1] || '').get('d');

  // Utkast — endringer samles her og skrives først ved «Lagre».
  const slettede = new Set(); // id-er på eksisterende planer som skal fjernes
  const nye = [];             // nye planer { tempId, dato, oktId }
  let tempTeller = 0;
  let apenDato = null;        // dag med åpent legg-til-skjema
  const skjema = { kat: 'styrke' };

  const endret = () => slettede.size > 0 || nye.length > 0;

  function planerFor(iso) {
    const eksisterende = hentPlan()
      .filter((p) => p.dato === iso && p.status === 'planlagt' && !slettede.has(p.id));
    return [...eksisterende, ...nye.filter((n) => n.dato === iso)];
  }

  function fjern(plan) {
    if (plan.tempId) nye.splice(nye.findIndex((n) => n.tempId === plan.tempId), 1);
    else slettede.add(plan.id);
    tegn();
  }

  function nullstillUke(man) {
    for (let i = 0; i < 7; i++) {
      const iso = isoDato(new Date(man.getTime() + i * DAG));
      for (const p of hentPlan()) {
        if (p.dato === iso && p.status === 'planlagt') slettede.add(p.id);
      }
      for (let j = nye.length - 1; j >= 0; j--) if (nye[j].dato === iso) nye.splice(j, 1);
    }
    tegn();
  }

  function lagre() {
    for (const id of slettede) fjernPlan(id);
    for (const n of nye) leggTilPlan({ dato: n.dato, oktId: n.oktId });
    location.hash = '#/hjem';
  }

  function tilbake() {
    if (endret() && !confirm('Forkaste endringene i kalenderen?')) return;
    location.hash = '#/hjem';
  }

  function ukeTittel(man) {
    const slutt = new Date(man.getTime() + 6 * DAG);
    const m1 = MND_KORT[man.getMonth()];
    const m2 = MND_KORT[slutt.getMonth()];
    return m1 === m2
      ? `${man.getDate()}.–${slutt.getDate()}. ${m2}`
      : `${man.getDate()}. ${m1} – ${slutt.getDate()}. ${m2}`;
  }

  // Velg en bibliotekøkt: kategorichips + de 6 øktene i kategorien.
  function leggTilSkjema(iso) {
    const okter = hentOkter().filter((o) => o.kategori === skjema.kat);
    return el('div', { class: 'kalform' },
      el('div', { class: 'chiprad' },
        ...KATEGORIER.map((k) => chip(k.navn, {
          aktiv: skjema.kat === k.id, onClick: () => { skjema.kat = k.id; tegn(); },
        })),
      ),
      el('div', { class: 'kalform__okter' },
        ...okter.map((o) => el('button', {
          class: 'kalform__okt', type: 'button',
          onclick: () => {
            nye.push({ tempId: `ny-${++tempTeller}`, dato: iso, oktId: o.id });
            apenDato = null;
            tegn();
          },
        },
          el('span', { class: 'kalform__oktnavn' }, o.navn),
          el('span', { class: 'kalform__okttid' }, `${o.varighetMin} min`),
        )),
      ),
      el('div', { class: 'knapprad' },
        el('button', { class: 'knapp knapp--sekundaer knapp--liten', type: 'button', onclick: () => { apenDato = null; tegn(); } }, 'Avbryt'),
      ),
    );
  }

  function dagRad(dato) {
    const iso = isoDato(dato);
    const erIdag = iso === idagIso;
    const erFortid = iso < idagIso;
    const planer = planerFor(iso);

    const innhold = el('div', { class: 'kalrad__innhold' },
      ...planer.map((p) => {
        const okt = p.oktId ? oktMedId(p.oktId) : null;
        const navn = okt ? okt.navn
          : (MODALITET_NAVN[p.modalitet] || KATEGORI_NAVN[p.kategori] || 'Økt');
        const under = okt ? `${okt.varighetMin} min · ${KATEGORI_NAVN[okt.kategori]}` : varighetNavn(p.varighetsklasse);
        return el('div', { class: 'kalplan' },
          el('span', { class: 'kalplan__meta' },
            el('span', { class: 'kalplan__navn' }, navn),
            el('span', { class: 'kalplan__varighet' }, under),
          ),
          el('button', { class: 'ikonknapp kalplan__fjern', type: 'button', 'aria-label': 'Fjern økt', onclick: () => fjern(p) }, ikon('kryss')),
        );
      }),
    );
    if (!erFortid) {
      innhold.append(apenDato === iso ? leggTilSkjema(iso) : el('button', {
        class: 'kal-leggtil', type: 'button',
        onclick: () => { apenDato = iso; tegn(); },
      }, ikon('pluss'), 'Legg til'));
    }

    return el('div', { class: 'kalrad' + (erFortid ? ' kalrad--fortid' : '') },
      el('span', { class: 'kalrad__dag' },
        el('span', { class: 'kalrad__navn' }, UKEDAG_KORT[(dato.getDay() + 6) % 7]),
        el('span', { class: 'kalrad__tall' + (erIdag ? ' kalrad__tall--idag' : '') }, String(dato.getDate())),
      ),
      innhold,
    );
  }

  function tegn() {
    const y = window.scrollY;
    tom(mount);

    const uker = [];
    for (let u = 0; u < ANTALL_UKER; u++) {
      const man = new Date(man0.getTime() + u * 7 * DAG);
      uker.push(el('div', { class: 'kort kaluke', 'data-uke': isoDato(man) },
        el('div', { class: 'kaluke__hode' },
          el('h2', { class: 'kaluke__tittel' }, ukeTittel(man)),
          el('button', { class: 'kaluke__reset', type: 'button', onclick: () => nullstillUke(man) }, ikon('repeat'), 'Nullstill'),
        ),
        ...Array.from({ length: 7 }, (_, i) => dagRad(new Date(man.getTime() + i * DAG))),
      ));
    }

    mount.append(
      el('header', { class: 'topp kal-topp' },
        el('button', { class: 'topp__tilbake', type: 'button', onclick: tilbake, title: 'Tilbake' }, '‹'),
        el('h1', { class: 'kal-topp__tittel' }, 'Mosjonskalender'),
        el('button', {
          class: 'kal-lagre' + (endret() ? ' kal-lagre--aktiv' : ''),
          type: 'button', disabled: !endret(), onclick: lagre,
        }, 'Lagre'),
      ),
      el('main', { class: 'innhold' }, ...uker),
    );
    window.scrollTo(0, y);
  }

  tegn();

  // Åpnet fra ukeskalenderen på hjemskjermen: rull til uka datoen ligger i.
  if (fokusDato && /^\d{4}-\d{2}-\d{2}$/.test(fokusDato)) {
    const d = new Date(`${fokusDato}T00:00:00`);
    const man = new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAG);
    const kort = mount.querySelector(`[data-uke="${isoDato(man)}"]`);
    if (kort) kort.scrollIntoView({ block: 'start' });
  }
}
