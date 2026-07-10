// Det hvite toppbanneret (M15) — delt av alle hovedfanene: profilikon med
// nivå-boble, bjelle, sentrert wordmark og en høyre-knapp (kalender som
// standard), med ukeskalender under. Banneret er sticky med buet underkant;
// innholdet scroller under. Ukene ligger i et dra-bart spor (forrige · denne
// · neste): dra med fingeren og uka følger med, slipp så glir den over.
// En dag åpner mosjonskalenderen på den datoen — med mindre skjermen sender
// inn sin egen dag-aksjon (biblioteket: logg/start/planlegg).
import { el, tom, ikon } from './ui.js';
import { hentProfil, hentLogg } from './store.js';
import { nivaFraTotalXp } from './niva.js';

const DAG = 86400000;
const UKEDAG_NAVN = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

function isoDato(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dg = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dg}`;
}

function mandagFor(d) {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  return new Date(m.getTime() - ((m.getDay() + 6) % 7) * DAG);
}

function wordmark() {
  return el('a', { class: 'wordmark', href: '#/hjem', 'aria-label': 'Mova' },
    'mova', el('span', { class: 'wordmark__prikk' }, '.'));
}

// Profilikonet bærer nivået som en liten boble — «levels med XP som et lite
// tall», resten av feiringen bor på Merker-siden.
function profilKnapp() {
  const profil = hentProfil();
  const niva = profil ? nivaFraTotalXp(profil.globalXp || 0).niva : null;
  return el('a', { class: 'ikonknapp ikonknapp--plain ikonknapp--profil', href: '#/merker', 'aria-label': `Profil og merker — nivå ${niva ?? 1}` },
    ikon('person'),
    niva != null && el('span', { class: 'nivaboble' }, String(niva)),
  );
}

export function lagBanner({ hoyre = null, dagAksjon = null } = {}) {
  const logg = hentLogg();
  const aktivSett = new Set(logg.map((o) => (o.dato || '').slice(0, 10)));
  let ukeOffset = 0;

  // Ukedagsnavnene står stille — bare datotallene ligger i det dra-bare sporet.
  function ukePanel(offset) {
    const panel = el('div', { class: 'hjemuke__dager' });
    const idagIso = isoDato(new Date());
    const man = mandagFor(new Date(Date.now() + offset * 7 * DAG));
    for (let i = 0; i < 7; i++) {
      const dato = new Date(man.getTime() + i * DAG);
      const iso = isoDato(dato);
      const erIdag = iso === idagIso;
      const lenke = el('a', { class: 'hjemuke__dag', href: `#/kalender?d=${iso}` },
        el('span', { class: 'hjemuke__tall' + (erIdag ? ' hjemuke__tall--idag' : '') }, String(dato.getDate())),
        el('i', { class: 'hjemuke__prikk' + (aktivSett.has(iso) && !erIdag ? ' hjemuke__prikk--aktiv' : '') }),
      );
      if (dagAksjon) lenke.addEventListener('click', (ev) => { ev.preventDefault(); dagAksjon(iso, erIdag); });
      panel.append(lenke);
    }
    return panel;
  }

  const spor = el('div', { class: 'hjemuke__spor' });
  const vindu = el('div', { class: 'hjemuke__vindu' }, spor);

  // Sporet er 300 % bredt med midtpanelet synlig; dra forskyver i px oppå
  // grunnposisjonen, og en blaing glir ett helt panel før ukene bygges på nytt.
  function settX(dxPx, anim) {
    spor.classList.toggle('hjemuke__spor--anim', anim);
    spor.style.transform = `translateX(calc(-33.3333% + ${dxPx}px))`;
  }

  function tegnUker() {
    tom(spor);
    spor.append(ukePanel(ukeOffset - 1), ukePanel(ukeOffset), ukePanel(ukeOffset + 1));
    settX(0, false);
  }

  let låst = false;
  function bla(retning) {
    if (låst) return;
    låst = true;
    settX(-retning * vindu.clientWidth, true);
    setTimeout(() => { ukeOffset += retning; tegnUker(); låst = false; }, 300);
  }

  // Dra med finger eller mus (pointer events; touch-action: pan-y i CSS lar
  // vertikal scroll gå til nettleseren mens horisontale drag havner her).
  let startX = null;
  let dratt = false;
  spor.addEventListener('pointerdown', (ev) => {
    if (låst || !ev.isPrimary) return;
    startX = ev.clientX;
    dratt = false;
  });
  spor.addEventListener('pointermove', (ev) => {
    if (startX == null || låst) return;
    const dx = ev.clientX - startX;
    if (!dratt) {
      if (Math.abs(dx) < 6) return;
      // Først når draget faktisk starter fanges pekeren — ellers ville
      // capture-retargeting spist vanlige tapp på dagene.
      dratt = true;
      spor.setPointerCapture(ev.pointerId);
    }
    settX(Math.max(-vindu.clientWidth, Math.min(vindu.clientWidth, dx)), false);
  });
  spor.addEventListener('pointerup', (ev) => {
    if (startX == null) return;
    const dx = ev.clientX - startX;
    startX = null;
    if (!dratt) return;
    const terskel = Math.min(70, vindu.clientWidth / 4);
    if (dx <= -terskel) bla(1);
    else if (dx >= terskel) bla(-1);
    else settX(0, true);
  });
  spor.addEventListener('pointercancel', () => {
    if (startX == null) return;
    startX = null;
    if (dratt) settX(0, true);
  });
  // Et drag skal ikke samtidig utløse klikk på dagen under fingeren.
  spor.addEventListener('click', (ev) => {
    if (!dratt) return;
    ev.preventDefault();
    ev.stopPropagation();
    dratt = false;
  }, true);

  const uke = el('div', { class: 'hjemuke' },
    el('div', { class: 'hjemuke__navner' },
      ...UKEDAG_NAVN.map((n) => el('span', { class: 'hjemuke__navn' }, n)),
    ),
    vindu,
  );
  tegnUker();

  if (hoyre) hoyre.classList.add('hjembanner__hoyre');
  return el('div', { class: 'hjembanner' },
    el('div', { class: 'hjembanner__rad' },
      profilKnapp(),
      el('a', { class: 'ikonknapp ikonknapp--plain', href: '#/innstillinger', 'aria-label': 'Varsler og innstillinger' }, ikon('bjelle')),
      el('span', { class: 'hjembanner__logo' }, wordmark()),
      hoyre || el('a', { class: 'ikonknapp ikonknapp--plain hjembanner__hoyre', href: '#/kalender', 'aria-label': 'Mosjonskalender' }, ikon('kalender')),
    ),
    uke,
  );
}

// Sidehode for fanene under banneret: stor Fredoka-tittel + undertekst i
// samme stil som biblioteket — alle hovedskjermer deler samme førsteinntrykk.
export function sideHero(tittel, under) {
  return el('div', { class: 'sidehero' },
    el('h1', { class: 'sidehero__tittel' }, tittel),
    under && el('p', { class: 'sidehero__under' }, under),
  );
}
