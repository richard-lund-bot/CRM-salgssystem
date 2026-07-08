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
import {
  nivaFraTotalXp, belonningFor, nesteBelonning, lasteTemaer, lasteAvatarer,
  tittelFor, tierBadge, tierFor, TIER_NAVN, TEMAER, AVATARER,
  avatarBilde, erBildeAvatar, AVATAR_NAVN, STANDARD_AVATAR,
} from './belonninger.js';

// Avatar som element: bilde for genererte avatarer, ellers emoji-tekst (gammel profil).
function avatarEl(id, klasse) {
  return erBildeAvatar(id)
    ? el('img', { class: klasse, src: avatarBilde(id), alt: '', loading: 'lazy' })
    : el('span', { class: klasse }, id || '💪');
}

let _bib = null;
export function settBib(bib) { _bib = bib; }

// Ikon per belønningstype som STRENG (for hero-«Neste»-linja).
function belIkon(b) {
  return b.type === 'avatar' ? '🧑'
    : b.type === 'tema' ? '🎨'
      : b.type === 'tittel' ? '🏅'
        : b.type === 'ovelse' ? '🏋️'
          : '✨';
}
// Ikon som ELEMENT (avatar-belønninger vises som bilde i stigen).
function belIkonEl(b) {
  if (b.type === 'avatar' && erBildeAvatar(b.id)) {
    return el('img', { class: 'stige__avatar', src: avatarBilde(b.id), alt: '', loading: 'lazy' });
  }
  return belIkon(b);
}
function belTekst(b) {
  return b.type === 'avatar' ? `Avatar: ${AVATAR_NAVN[b.id] || b.id}`
    : b.type === 'tema' ? `Tema: ${b.navn}`
      : b.type === 'tittel' ? `Tittel: ${b.navn}`
        : b.type === 'ovelse' ? `Ny øvelse: ${b.navn}`
          : b.navn || 'Belønning';
}

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

  tegn();

  function tegn() {
    const p = hentProfil();
    const info = nivaFraTotalXp(p.globalXp || 0);
    tom(mount);
    mount.append(
      el('header', { class: 'topp' }, el('h1', { class: 'topp__tittel' }, 'Nivå')),
      el('main', { class: 'innhold' },
        belonningsHero(p, info, st),
        belonningsStige(p, info),
        avatarVelger(p, info),
        temaVelger(p, info),
        // Fysisk kapasitet per modalitet
        el('div', { class: 'kort' },
          el('h2', {}, 'Kapasitet per treningsform'),
          el('div', { class: 'nivliste' },
            ...VIS_MOD.filter((m) => p.nivaer?.[m]).map((m) => modKort(m, p, nå)),
          ),
          el('p', { class: 'dempet' }, 'Base = fysisk kapasitet. Opprykk krever XP + bevis (økter på toppnivå eller gateway). Egen kurve fra belønningsnivået over.'),
        ),
        gatewayKort(p, nå),
      ),
    );
  }

  // --- Belønningsnivå-hero (stort, hyppig, uten tak) ---
  function belonningsHero(p, info, st) {
    const avatar = p.innstillinger?.avatar || STANDARD_AVATAR;
    const neste = nesteBelonning(info.niva, _bib);
    return el('div', { class: 'kort hero nivahero' },
      el('div', { class: 'nivahero__topp' },
        el('div', { class: 'nivahero__avatar' }, avatarEl(avatar, 'nivahero__avatarbilde'),
          el('img', { class: 'nivahero__crest', src: tierBadge(info.niva), alt: '', loading: 'lazy' })),
        el('div', { class: 'nivahero__meta' },
          el('div', { class: 'nivahero__niva' }, `Nivå ${info.niva}`),
          el('div', { class: 'nivahero__tittel' }, `${tittelFor(info.niva)} · ${TIER_NAVN[tierFor(info.niva)]}-tier`),
        ),
        el('div', { class: 'nivahero__streak' }, el('div', { class: 'glob__tall' }, String(st.uker)), el('div', { class: 'stat__tekst' }, 'uker 🔥')),
      ),
      el('div', { class: 'xpbar xpbar--stor' }, el('div', { class: 'xpbar__fyll', style: `width:${info.pct}%` })),
      el('div', { class: 'nivahero__under' },
        el('span', { class: 'dempet' }, `${info.inne} / ${info.tilNeste} XP`),
        el('span', { class: 'dempet' }, `Neste: ${belIkon(neste)} ${belTekst(neste)}`),
      ),
    );
  }

  // --- Belønningsstige (rundt gjeldende nivå) ---
  function belonningsStige(p, info) {
    const fra = Math.max(2, info.niva - 2);
    const til = info.niva + 7;
    const rader = [];
    for (let n = fra; n <= til; n++) {
      const b = belonningFor(n, _bib);
      const ulast = n <= info.niva;
      rader.push(el('div', { class: 'stige__rad' + (ulast ? ' stige__rad--ulast' : '') + (n === info.niva ? ' stige__rad--na' : '') },
        el('span', { class: 'stige__niva' }, String(n)),
        el('span', { class: 'stige__ikon' }, belIkonEl(b)),
        el('span', { class: 'stige__tekst' }, belTekst(b)),
        el('span', { class: 'stige__status' }, ulast ? '✓' : '🔒'),
      ));
    }
    return el('div', { class: 'kort' },
      el('h2', {}, 'Belønninger'),
      el('p', { class: 'dempet' }, 'Hvert nivå gir noe nytt — en øvelse, avatar, tema eller tittel. Ingen tak.'),
      el('div', { class: 'stige' }, ...rader),
    );
  }

  // --- Avatar-velger ---
  function avatarVelger(p, info) {
    const ulast = lasteAvatarer(info.niva, _bib);
    const valgt = p.innstillinger?.avatar || STANDARD_AVATAR;
    return el('div', { class: 'kort' },
      el('h2', {}, 'Avatar'),
      el('div', { class: 'avatargrid' },
        ...AVATARER.map((a) => {
          const er = ulast.has(a);
          const laasNiva = laastPaNiva(a, 'avatar');
          return el('button', {
            class: 'avatarknapp' + (valgt === a ? ' avatarknapp--valgt' : '') + (er ? '' : ' avatarknapp--laast'),
            type: 'button', title: er ? (AVATAR_NAVN[a] || a) : `Låses opp på nivå ${laasNiva}`,
            onclick: er ? () => velg('avatar', a) : undefined,
          }, er
            ? el('img', { class: 'avatarknapp__bilde', src: avatarBilde(a), alt: AVATAR_NAVN[a] || a, loading: 'lazy' })
            : el('span', { class: 'avatarknapp__laas' }, laasNiva ? `${laasNiva}` : '🔒'));
        }),
      ),
    );
  }

  // --- Tema-velger ---
  function temaVelger(p, info) {
    const ulast = lasteTemaer(info.niva, _bib);
    const valgt = p.innstillinger?.tema || 'standard';
    return el('div', { class: 'kort' },
      el('h2', {}, 'Tema'),
      el('div', { class: 'temaliste' },
        ...TEMAER.map((t) => {
          const er = ulast.has(t.id);
          const laasNiva = laastPaNiva(t.id, 'tema');
          return el('button', {
            class: 'temaknapp' + (valgt === t.id ? ' temaknapp--valgt' : '') + (er ? '' : ' temaknapp--laast'),
            type: 'button', onclick: er ? () => velg('tema', t.id) : undefined,
          },
            el('span', { class: 'temaknapp__prikk', style: `background:${t.prikk}` }),
            el('span', { class: 'temaknapp__navn' }, t.navn),
            el('span', { class: 'temaknapp__status' }, valgt === t.id ? '✓' : er ? '' : `🔒 nv ${laasNiva}`),
          );
        }),
      ),
    );
  }

  // Finn nivået en avatar/tema låses opp på (for hint).
  function laastPaNiva(id, type) {
    for (let n = 2; n <= 120; n++) { const b = belonningFor(n, _bib); if (b.type === type && b.id === id) return n; }
    return null;
  }

  // Velg avatar/tema → lagre + anvend + tegn på nytt.
  function velg(felt, verdi) {
    const pr = hentProfil();
    pr.innstillinger = pr.innstillinger || {};
    pr.innstillinger[felt] = verdi;
    lagreProfil(pr);
    if (felt === 'tema') {
      if (verdi && verdi !== 'standard') document.documentElement.dataset.tema = verdi;
      else delete document.documentElement.dataset.tema;
    }
    tegn();
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
                el('span', { class: 'gw__navn' },
                  erPassert && !rusten && el('img', { class: 'gw__badge', src: 'icons/badges/gull.png', alt: '', loading: 'lazy' }),
                  g.navn),
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
