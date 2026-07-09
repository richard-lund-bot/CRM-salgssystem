// Progresjon (M11 — valgfritt, avansert lag): fysisk kapasitet per trenings-
// form + gateway-tester. Dette er IKKE appens identitet lenger (den bor i
// Min reise) — det er et verktøy for deg som vil følge strukturert styrke-
// progresjon. Nivåene her styrer hvilke øvelsesnivåer generatoren byr på.
// Språket er mykt: et nivå som har hvilt «trenger en oppfriskning», det er
// aldri «tapt» — én økt eller re-test henter det tilbake.
import { el, tom, chip, ikon } from './ui.js';
import { MODALITET_NAVN } from './library.js';
import { hentProfil, lagreProfil } from './store.js';
import {
  raBase, effektivBase, nivaFraBase, momentum, decay,
  terskel, registrerGateway, bestattGateway,
} from './niva.js';
import { ANKER, ankerTilNivaer } from './onboarding.js';
import { fyllInn } from './animasjon.js';

let _bib = null;
export function settBib(bib) { _bib = bib; }

// Modaliteter vi viser nivåkort for (de med reell progresjon).
const VIS_MOD = ['STY', 'SKILL', 'HIIT', 'BASE', 'MET', 'CORE', 'PLYO', 'YOGA', 'PIL', 'STR', 'MOB'];

export function visProgresjonSkjerm(mount) {
  const profil = hentProfil();
  if (!profil) { location.hash = '#/hjem'; return; }
  const nå = Date.now();

  tegn();

  function tegn() {
    const p = hentProfil();
    tom(mount);
    mount.append(
      el('header', { class: 'topp' },
        el('h1', { class: 'topp__tittel' }, 'Progresjon'),
        el('p', { class: 'topp__under' }, 'For deg som vil følge kapasiteten — helt valgfritt.'),
      ),
      el('main', { class: 'innhold' },
        el('div', { class: 'kort kort--info' },
          el('p', {}, 'Nivåene her styrer hvilke øvelser generatoren byr på. XP, belønninger og reisen din påvirkes ikke av dem — all bevegelse teller uansett.'),
        ),
        el('div', { class: 'kort' },
          el('h2', {}, 'Kapasitet per treningsform'),
          el('div', { class: 'nivliste' },
            ...VIS_MOD.filter((m) => p.nivaer?.[m]).map((m) => modKort(m, p, nå)),
          ),
          el('p', { class: 'dempet' }, 'Opprykk krever XP + bevis (økter på toppnivå eller gateway). Et nivå som hviler, hentes tilbake med én økt eller re-test.'),
        ),
        kalibrerKort(),
        gatewayKort(p, nå),
      ),
    );
  }

  function modKort(m, p, nå2) {
    const ra = raBase(p, m);
    const eff = effektivBase(p, m, nå2);
    const mom = momentum(p, m, nå2);
    const dec = decay(p, m, nå2);
    const niv = p.nivaer[m];
    const xpTil = terskel(ra);
    const pct = Math.min(100, Math.round(((niv.xp || 0) / xpTil) * 100));
    const modXpFyll = el('div', { class: 'xpbar__fyll' });
    fyllInn(modXpFyll, 'width', `${pct}%`);

    const decTekst = mom.tilstand === 'ny' ? 'ingen økter ennå — null stress'
      : dec.rusten ? 'har hvilt — én økt henter det tilbake'
        : mom.tilstand === 'aktiv' ? 'i fin rytme'
          : mom.tilstand === 'kjolig' ? 'klar når du er'
            : 'velkommen tilbake — dobbel XP';

    return el('div', { class: 'nivrad' },
      el('div', { class: 'nivrad__topp' },
        el('span', { class: 'nivrad__navn' }, MODALITET_NAVN[m] || m),
        el('span', { class: 'nivrad__base' + (eff < ra ? ' nivrad__base--redusert' : '') },
          `nivå ${eff}`, eff < ra && el('span', { class: 'dempet' }, ` (av ${ra})`),
        ),
      ),
      el('span', { class: 'niva niva--liten' }, ...[1, 2, 3, 4, 5].map((k) => el('i', { class: 'niva__p' + (k <= nivaFraBase(eff) ? ' niva__p--på' : '') }))),
      el('div', { class: 'xpbar' }, modXpFyll),
      el('div', { class: 'nivrad__meta' },
        el('span', { class: 'dempet' }, `${niv.xp || 0} / ${xpTil} XP`),
        el('span', { class: 'dempet' }, decTekst),
      ),
    );
  }

  // --- Valgfri kalibrering med ankertesten (fra onboarding) ---
  function kalibrerKort() {
    const state = { apen: false, svar: {} };
    const kort = el('div', { class: 'kort' });

    function tegnKort() {
      tom(kort);
      kort.append(
        el('h2', {}, 'Kalibrer startnivå'),
        el('p', { class: 'dempet' }, 'Seks konkrete spørsmål setter kapasitetsnivåene på nytt. Valgfritt — og rører aldri XP eller logg.'),
      );
      if (!state.apen) {
        kort.append(el('button', { class: 'knapp knapp--sekundaer', type: 'button', onclick: () => { state.apen = true; tegnKort(); } }, 'Ta ankertesten'));
        return;
      }
      kort.append(
        el('div', { class: 'ob-anker' },
          ...ANKER.map((q) => el('div', { class: 'ob-sp' },
            el('p', { class: 'ob-sp__tekst' }, q.sp),
            el('div', { class: 'chiprad' },
              ...q.svar.map(([tekst, verdi]) => chip(tekst, {
                aktiv: state.svar[q.id] === verdi,
                onClick: () => { state.svar[q.id] = verdi; tegnKort(); },
              })),
            ),
          )),
        ),
        el('button', {
          class: 'knapp' + (Object.keys(state.svar).length === ANKER.length ? '' : ' knapp--av'),
          type: 'button',
          disabled: Object.keys(state.svar).length !== ANKER.length,
          onclick: () => {
            const p = hentProfil();
            const nye = ankerTilNivaer(state.svar);
            // Behold XP/bevis der de finnes — bare basene kalibreres.
            for (const [m, niv] of Object.entries(nye)) {
              const gammel = p.nivaer?.[m];
              p.nivaer[m] = gammel
                ? { ...gammel, base: niv.base, hoyesteBevist: Math.max(gammel.hoyesteBevist || 0, niv.base) }
                : niv;
            }
            lagreProfil(p);
            tegn();
          },
        }, 'Lagre kalibrering'),
      );
    }
    tegnKort();
    return kort;
  }

  function gatewayKort(p, nå2) {
    const passert = new Set(p.gatewaysPassert || []);
    const perMod = {};
    for (const g of _bib.gateways) (perMod[g.modalitet] = perMod[g.modalitet] || []).push(g);

    return el('div', { class: 'kort' },
      el('h2', {}, 'Gateways — lås opp nye nivåer'),
      el('p', { class: 'dempet' }, 'Bestå en test for å hoppe forbi XP-grinden. Ingen straff for å prøve.'),
      ...Object.entries(perMod).map(([m, liste]) => el('div', { class: 'gw-gruppe' },
        el('h3', { class: 'gw-gruppe__navn' }, MODALITET_NAVN[m] || m),
        el('div', { class: 'gw-liste' },
          ...liste.map((g) => {
            const erPassert = passert.has(g.id);
            const hviler = erPassert && decay(p, m, nå2).rusten;
            return el('button', {
              class: 'gw' + (erPassert ? (hviler ? ' gw--rusten' : ' gw--ulast') : ' gw--last'),
              type: 'button',
              onclick: () => visGatewayTest(g),
            },
              el('div', { class: 'gw__topp' },
                el('span', { class: 'gw__navn' }, g.navn),
                el('span', { class: 'gw__status' },
                  erPassert ? ikon(hviler ? 'las' : 'sjekk') : null,
                  erPassert ? (hviler ? 'hviler' : 'ulåst') : 'test'),
              ),
              el('span', { class: 'gw__krav' }, kravTekst(g)),
            );
          }),
        ),
      )),
    );
  }

  // --- Gateway-test-skjerm ---
  function visGatewayTest(g) {
    const svar = {};
    const kravMedTall = (g.krav || []).filter((k) => k.ovelse != null && k.type !== 'nulltest');
    const melding = el('p', { class: 'dempet' }, 'Vær ærlig — dette låser opp øvelser i generatoren.');

    function evaluer() {
      if (bestattGateway(g, svar)) {
        const { profil: ny, resultat } = registrerGateway(hentProfil(), g, Date.now());
        lagreProfil(ny);
        tom(mount);
        mount.append(
          el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Bestått!')),
          el('main', { class: 'innhold' },
            el('div', { class: 'kort hero' },
              el('p', { class: 'hero__eyebrow' }, 'Gateway låst opp'),
              el('h2', { class: 'hero__tittel' }, g.navn),
              el('p', {}, g.laserOpp?.beskrivelse ? `Låst opp: ${g.laserOpp.beskrivelse}` : 'Nye nivåer er tilgjengelige i generatoren.'),
              el('p', { class: 'dempet' }, `+${resultat.xp} XP · base hevet til ${resultat.tilBase}`),
            ),
            el('button', { class: 'knapp', type: 'button', onclick: () => visProgresjonSkjerm(mount) }, 'Tilbake til Progresjon'),
          ),
        );
      } else {
        melding.textContent = 'Ikke ennå — tren videre og prøv igjen når du vil. Ingen straff.';
        melding.className = 'varsel';
      }
    }

    tom(mount);
    mount.append(
      el('header', { class: 'topp topp--kjor' },
        el('button', { class: 'topp__tilbake', type: 'button', onclick: () => visProgresjonSkjerm(mount) }, '‹'),
        el('div', {}, el('h1', { class: 'topp__tittel' }, g.navn), el('p', { class: 'topp__under' }, 'Gateway-test')),
      ),
      el('main', { class: 'innhold' },
        el('div', { class: 'kort' },
          el('h2', {}, 'Krav'),
          el('div', { class: 'loggliste' },
            ...kravMedTall.map((k) => el('div', { class: 'loggrad' },
              el('span', { class: 'loggrad__navn' }, `${ovelseNavn(k.ovelse)} — ${k.verdi} ${enhet(k.type)}${k.notat ? ` (${k.notat})` : ''}`),
              el('div', { class: 'loggrad__felter' },
                el('label', { class: 'loggfelt' },
                  el('span', { class: 'loggfelt__etikett' }, 'Ditt tall'),
                  el('input', {
                    class: 'loggfelt__inn', type: 'number', inputmode: 'numeric', min: '0',
                    oninput: (ev) => { svar[k.ovelse] = ev.target.value === '' ? undefined : Number(ev.target.value); },
                  }),
                ),
              ),
            )),
          ),
          melding,
        ),
        el('div', { class: 'fast-bunn' },
          el('button', { class: 'knapp', type: 'button', onclick: evaluer }, 'Sjekk resultat'),
        ),
      ),
    );
  }

  function kravTekst(g) {
    return (g.krav || []).filter((k) => k.ovelse).map((k) => `${k.verdi} ${enhet(k.type)} ${ovelseNavn(k.ovelse)}`).join(' + ') || 'verifiseringstest';
  }
  function ovelseNavn(id) { return _bib?.ovelseMap?.get(id)?.navn || id; }
  function enhet(type) { return type === 'hold' ? 's' : type === 'reps' ? 'reps' : ''; }
}
