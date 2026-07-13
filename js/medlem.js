// Medlem (auth) — innlogging + registrering. To skjermer som henger sammen:
// «Velkommen tilbake» (#/logg-inn) og «Bli medlem» (#/bli-medlem). Fullskjerm
// med bakgrunnsbilde, mova-merke, hilsen og et flytende hvitt kort. Bygger på
// Supabase GoTrue via js/sync.js: e-post + passord, samt Apple/Facebook (OAuth).
// Ingen tab-bar (fokusmodus). Onboarding bygges på nytt i neste steg.
import { el, tom, ikon } from './ui.js';
import { OAUTH_PROVIDERE } from './config.js';
import * as sync from './sync.js';

// Leverandør-metadata (merkeikon + visningsnavn). Hvilke som vises styres av
// OAUTH_PROVIDERE i config.js.
const PROVIDERE = {
  apple: { navn: 'Apple', merke: 'apple' },
  facebook: { navn: 'Facebook', merke: 'facebook' },
};

let _etterInnlogget = null;
/** app.js registrerer hva som skjer etter vellykket innlogging (synk + ruting). */
export function settEtterInnlogget(fn) { _etterInnlogget = fn; }

// --- Delte byggeklosser ---------------------------------------------------
function movaMerke() {
  return el('div', { class: 'auth__merke' },
    el('span', { class: 'auth__logo' }, 'mova'),
    el('span', { class: 'auth__tagline' }, 'Move for Life'),
  );
}

function tekstFelt({ type = 'text', navn, plass, autocomplete, ikonNavn }) {
  const input = el('input', {
    class: 'auth-felt__inn', type, name: navn, placeholder: plass, autocomplete,
    autocapitalize: type === 'email' ? 'none' : 'sentences', spellcheck: 'false',
  });
  const rad = el('label', { class: 'auth-felt' }, ikon(ikonNavn, 'ikon auth-felt__ikon'), input);
  return { rad, input };
}

function passordFelt({ navn = 'passord', plass = 'Passord', autocomplete = 'current-password' }) {
  const input = el('input', {
    class: 'auth-felt__inn', type: 'password', name: navn, placeholder: plass,
    autocomplete, autocapitalize: 'none', spellcheck: 'false',
  });
  const oye = el('button', { class: 'auth-felt__oye', type: 'button', 'aria-label': 'Vis passord' }, ikon('oyeav'));
  oye.addEventListener('click', () => {
    const skjult = input.type === 'password';
    input.type = skjult ? 'text' : 'password';
    oye.setAttribute('aria-label', skjult ? 'Skjul passord' : 'Vis passord');
    tom(oye); oye.append(ikon(skjult ? 'oye' : 'oyeav'));
    input.focus();
  });
  const rad = el('label', { class: 'auth-felt' }, ikon('las', 'ikon auth-felt__ikon'), input, oye);
  return { rad, input };
}

function skille(tekst = 'Eller fortsett med') {
  return el('div', { class: 'auth-skille' }, el('span', { class: 'auth-skille__tekst' }, tekst));
}

function providerKnapper() {
  return OAUTH_PROVIDERE.map((id) => {
    const p = PROVIDERE[id];
    if (!p) return null;
    const k = el('button', { class: 'auth-provider', type: 'button' },
      ikon(p.merke, 'merkeikon'), el('span', {}, `Fortsett med ${p.navn}`));
    k.addEventListener('click', () => sync.startOAuth(id));
    return k;
  }).filter(Boolean);
}

/** Skille + leverandørknapper — tomt hvis ingen leverandører er aktivert. */
function providerSeksjon() {
  const knapper = providerKnapper();
  return knapper.length ? [skille(), ...knapper] : [];
}

function primaerKnapp(tekst) {
  return el('button', { class: 'auth-primaer', type: 'submit' },
    el('span', { class: 'auth-primaer__tekst' }, tekst), ikon('pilhoyre', 'ikon auth-primaer__pil'));
}
function settLaster(knapp, laster) {
  knapp.disabled = laster;
  knapp.classList.toggle('auth-primaer--laster', laster);
}

function meldingsboks() { return el('p', { class: 'auth-melding', role: 'alert', hidden: true }); }
function visMelding(boks, tekst, type = 'feil') {
  boks.textContent = tekst || '';
  boks.hidden = !tekst;
  boks.classList.toggle('auth-melding--info', type === 'info');
  boks.classList.toggle('auth-melding--feil', type !== 'info');
}

function byttLenke(tekst, href, lenketekst) {
  return el('p', { class: 'auth__bytt' }, tekst + ' ',
    el('a', { class: 'auth-lenke', href }, lenketekst));
}

// --- Ramme ----------------------------------------------------------------
function ramme(mount, { variant, bilde, tittel, underLinjer, kort }) {
  tom(mount);
  const under = el('p', { class: 'auth__under' });
  underLinjer.forEach((linje, i) => { if (i) under.append(el('br')); under.append(linje); });
  mount.append(el('div', { class: `auth auth--${variant}` },
    el('div', { class: 'auth__bg', style: `background-image:url('icons/brand/${bilde}.webp')` }),
    el('div', { class: 'auth__innhold' },
      el('div', { class: 'auth__topp' }, movaMerke(), el('h1', { class: 'auth__tittel' }, tittel), under),
      kort,
    ),
  ));
  window.scrollTo(0, 0);
}

// --- Innlogging (#/logg-inn) ----------------------------------------------
export function visLoggInnSkjerm(mount) {
  const melding = meldingsboks();
  const epost = tekstFelt({ type: 'email', navn: 'epost', plass: 'E-post', autocomplete: 'email', ikonNavn: 'konvolutt' });
  const passord = passordFelt({ autocomplete: 'current-password' });
  const knapp = primaerKnapp('Logg inn');

  const glemt = el('button', { class: 'auth-glemt', type: 'button' }, 'Glemt passord?');
  glemt.addEventListener('click', () => glemtPassord(epost.input.value, melding));

  const form = el('form', { class: 'auth-form', novalidate: true },
    melding, epost.rad, passord.rad,
    el('div', { class: 'auth-glemt-rad' }, glemt),
    knapp, ...providerSeksjon(),
  );
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    visMelding(melding, '');
    const e = epost.input.value.trim();
    const p = passord.input.value;
    if (!e || !p) { visMelding(melding, 'Fyll inn e-post og passord.'); return; }
    settLaster(knapp, true);
    try {
      await sync.loggInnMedEpost({ epost: e, passord: p });
      _etterInnlogget?.();
    } catch (err) {
      visMelding(melding, err.message);
      settLaster(knapp, false);
    }
  });

  ramme(mount, {
    variant: 'logg-inn', bilde: 'auth-logg-inn', tittel: 'Velkommen tilbake',
    underLinjer: ['Godt å se deg igjen.', 'La oss fortsette reisen.'],
    kort: el('div', { class: 'auth__kort' }, form, byttLenke('Har du ikke en konto?', '#/bli-medlem', 'Bli medlem')),
  });
}

// --- Registrering (#/bli-medlem) ------------------------------------------
export function visRegistrerSkjerm(mount) {
  const melding = meldingsboks();
  const navn = tekstFelt({ type: 'text', navn: 'navn', plass: 'Fullt navn', autocomplete: 'name', ikonNavn: 'person' });
  const epost = tekstFelt({ type: 'email', navn: 'epost', plass: 'E-post', autocomplete: 'email', ikonNavn: 'konvolutt' });
  const passord = passordFelt({ autocomplete: 'new-password' });
  const knapp = primaerKnapp('Bli medlem');

  const form = el('form', { class: 'auth-form', novalidate: true },
    melding, navn.rad, epost.rad, passord.rad,
    knapp, ...providerSeksjon(),
  );
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    visMelding(melding, '');
    const n = navn.input.value.trim();
    const e = epost.input.value.trim();
    const p = passord.input.value;
    if (!n || !e || !p) { visMelding(melding, 'Fyll inn navn, e-post og passord.'); return; }
    if (p.length < 6) { visMelding(melding, 'Passordet må ha minst 6 tegn.'); return; }
    settLaster(knapp, true);
    try {
      const res = await sync.registrerMedEpost({ navn: n, epost: e, passord: p });
      if (res.innlogget) { _etterInnlogget?.(); return; }
      // E-postbekreftelse er slått på i Supabase — be brukeren åpne lenka.
      visMelding(melding, `Nesten der! Vi sendte en bekreftelseslenke til ${e}. Åpne den for å fullføre.`, 'info');
      settLaster(knapp, false);
    } catch (err) {
      visMelding(melding, err.message);
      settLaster(knapp, false);
    }
  });

  ramme(mount, {
    variant: 'bli-medlem', bilde: 'auth-bli-medlem', tittel: 'Bli medlem',
    underLinjer: ['Et nytt kapittel begynner nå.', 'Vi heier på deg hele veien.'],
    kort: el('div', { class: 'auth__kort' }, form, byttLenke('Har du allerede en konto?', '#/logg-inn', 'Logg inn')),
  });
}

// --- Glemt passord --------------------------------------------------------
async function glemtPassord(epost, melding) {
  const e = (epost || '').trim();
  if (!e) { visMelding(melding, 'Skriv inn e-posten din over, så sender vi en lenke.'); return; }
  try {
    await sync.sendPassordTilbakestilling(e);
    visMelding(melding, `Vi sendte en lenke for å tilbakestille passordet til ${e}.`, 'info');
  } catch (err) {
    visMelding(melding, err.message);
  }
}
