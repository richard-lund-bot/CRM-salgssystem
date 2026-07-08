// Nivå-skjerm (taksonomi §16): per modalitet base + momentum-pil +
// decay-nedtelling, globalt nivå + streak øverst, og gateway-kartet som et
// skill-tree (låst / ulåst / rusten). Gateway-testene er kjørbare: består du
// kravene, låses nivåer opp umiddelbart (hurtigspor forbi XP-grinden).
import { el, tom, chip } from './ui.js';
import { MODALITET_NAVN } from './library.js';
import { hentProfil, lagreProfil, hentLogg } from './store.js';
import {
  raBase, effektivBase, nivaFraBase, momentum, decay, globaltNiva, streak,
  terskel, registrerGateway, bestattGateway,
} from './niva.js';

let _bib = null;
export function settBib(bib) { _bib = bib; }

// Modaliteter vi viser nivåkort for (de med reell progresjon).
const VIS_MOD = ['STY', 'SKILL', 'HIIT', 'BASE', 'MET', 'CORE', 'PLYO', 'YOGA', 'PIL', 'STR', 'MOB'];

const MOMENTUM_TEKST = {
  aktiv: 'aktiv', kjolig: 'kjølig', comeback: 'comeback', ny: 'ikke startet',
};

export function visNivaSkjerm(mount) {
  const profil = hentProfil();
  const logg = hentLogg();
  const nå = Date.now();
  if (!profil) { location.hash = '#/hjem'; return; }

  const st = streak(logg, profil.ukemaal || 4, nå);
  const gNiva = globaltNiva(profil.globalXp || 0);

  tegn();

  function tegn() {
    tom(mount);
    mount.append(
      el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Nivå')),
      el('main', { class: 'innhold' },
        // Globalt + streak
        el('div', { class: 'kort hero' },
          el('div', { class: 'globrad' },
            el('div', {}, el('div', { class: 'glob__tall' }, String(gNiva)), el('div', { class: 'stat__tekst' }, 'globalt nivå')),
            el('div', {}, el('div', { class: 'glob__tall' }, String(st.uker)), el('div', { class: 'stat__tekst' }, 'ukers streak 🔥')),
            el('div', {}, el('div', { class: 'glob__tall' }, `${st.denneUken}/${st.ukemaal}`), el('div', { class: 'stat__tekst' }, 'denne uka')),
          ),
        ),
        // Nivåkort per modalitet
        el('div', { class: 'kort' },
          el('h2', {}, 'Per treningsform'),
          el('div', { class: 'nivliste' },
            ...VIS_MOD.filter((m) => profil.nivaer?.[m]).map((m) => modKort(m, profil, nå)),
          ),
          el('p', { class: 'dempet' }, 'Base = kapasitet. Opprykk krever XP + bevis (økter på toppnivå eller gateway).'),
        ),
        // Gateway skill-tree
        gatewayKort(profil, nå),
      ),
    );
  }

  function modKort(m, profil, nå) {
    const ra = raBase(profil, m);
    const eff = effektivBase(profil, m, nå);
    const mom = momentum(profil, m, nå);
    const dec = decay(profil, m, nå);
    const niv = profil.nivaer[m];
    const xpTil = terskel(ra);
    const pct = Math.min(100, Math.round(((niv.xp || 0) / xpTil) * 100));

    const decTekst = mom.tilstand === 'ny' ? 'ingen økter enda'
      : dec.rusten ? `rusten −${dec.trinn} · re-test gjenoppretter`
        : mom.tilstand === 'aktiv' ? `aktiv i ${dec.dagerTil} d til`
          : mom.tilstand === 'kjolig' ? `kjølig — ${dec.dagerTil} d til nedgang`
            : `comeback — dobbel XP`;

    return el('div', { class: 'nivrad' },
      el('div', { class: 'nivrad__topp' },
        el('span', { class: 'nivrad__navn' }, MODALITET_NAVN[m] || m),
        el('span', { class: 'nivrad__base' + (eff < ra ? ' nivrad__base--redusert' : '') },
          `nivå ${eff}`, eff < ra && el('span', { class: 'dempet' }, ` (av ${ra})`),
          el('span', { class: 'mom mom--' + mom.tilstand }, mom.pil),
        ),
      ),
      el('span', { class: 'niva niva--liten' }, ...[1, 2, 3, 4, 5].map((k) => el('i', { class: 'niva__p' + (k <= nivaFraBase(eff) ? ' niva__p--på' : '') }))),
      el('div', { class: 'xpbar' }, el('div', { class: 'xpbar__fyll', style: `width:${pct}%` })),
      el('div', { class: 'nivrad__meta' },
        el('span', { class: 'dempet' }, `${niv.xp || 0} / ${xpTil} XP`),
        el('span', { class: 'dempet' }, decTekst),
      ),
    );
  }

  function gatewayKort(profil, nå) {
    const passert = new Set(profil.gatewaysPassert || []);
    const perMod = {};
    for (const g of _bib.gateways) (perMod[g.modalitet] = perMod[g.modalitet] || []).push(g);

    return el('div', { class: 'kort' },
      el('h2', {}, 'Gateways — lås opp nye nivåer'),
      el('p', { class: 'dempet' }, 'Bestå en test for å hoppe forbi XP-grinden.'),
      ...Object.entries(perMod).map(([m, liste]) => el('div', { class: 'gw-gruppe' },
        el('h3', { class: 'gw-gruppe__navn' }, MODALITET_NAVN[m] || m),
        el('div', { class: 'gw-liste' },
          ...liste.map((g) => {
            const erPassert = passert.has(g.id);
            const rusten = erPassert && decay(profil, m, nå).rusten;
            return el('button', {
              class: 'gw' + (erPassert ? (rusten ? ' gw--rusten' : ' gw--ulast') : ' gw--last'),
              type: 'button',
              onclick: () => visGatewayTest(g),
            },
              el('div', { class: 'gw__topp' },
                el('span', { class: 'gw__navn' }, g.navn),
                el('span', { class: 'gw__status' }, erPassert ? (rusten ? '🔒 rusten' : '✓ ulåst') : '🔓 test'),
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
          el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Bestått! 🔓')),
          el('main', { class: 'innhold' },
            el('div', { class: 'kort hero' },
              el('p', { class: 'hero__eyebrow' }, 'Gateway låst opp'),
              el('h2', { class: 'hero__tittel' }, g.navn),
              el('p', {}, g.laserOpp?.beskrivelse ? `Låst opp: ${g.laserOpp.beskrivelse}` : 'Nye nivåer er tilgjengelige i generatoren.'),
              el('p', { class: 'dempet' }, `+${resultat.xp} XP · base hevet til ${resultat.tilBase}`),
            ),
            el('button', { class: 'knapp', type: 'button', onclick: () => visNivaSkjerm(mount) }, 'Tilbake til Nivå'),
          ),
        );
      } else {
        melding.textContent = 'Ikke bestått ennå — tren videre og prøv igjen. Ingen straff.';
        melding.className = 'varsel';
      }
    }

    tom(mount);
    mount.append(
      el('header', { class: 'topp topp--kjor' },
        el('button', { class: 'topp__tilbake', type: 'button', onclick: () => visNivaSkjerm(mount) }, '‹'),
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
