// Dario – klikkbar prototype. Inngang, ruter og alle visninger.
// Ingen byggesteg: ren ES-modul. All data er fiktiv demodata fra data.js.
import { MODULER, NIVAAER, ROLLER, ANSATTE, UNNTAK, DELEGERINGER, KUNDER, SIGNALER, KALENDER, PIPELINE } from './data.js';
import { effektivTilgang, kanDelegere, nesteNivaa, synligeModuler } from './tilgang.js';
import { prioriter, nokkeltall, gjelder, kr } from './prioritering.js';
import { lagManus } from './brief.js';
import { lagOrb } from './orb.js';

// ---------- tilstand ----------

const LAGRING = 'dario.v1';
const lagret = (() => {
  try { return JSON.parse(localStorage.getItem(LAGRING)) ?? {}; } catch { return {}; }
})();

const tilstand = {
  ansattId: lagret.ansattId ?? 'ida',
  unntak: lagret.unntak ?? structuredClone(UNNTAK),
  delegeringer: lagret.delegeringer ?? structuredClone(DELEGERINGER),
  logg: lagret.logg ?? [],
};

function lagre() {
  try { localStorage.setItem(LAGRING, JSON.stringify(tilstand)); } catch { /* privat modus o.l. */ }
}

const ansatt = () => ANSATTE.find((a) => a.id === tilstand.ansattId) ?? ANSATTE[0];
const tilgangKontekst = () => ({ roller: ROLLER, unntak: tilstand.unntak, delegeringer: tilstand.delegeringer });
const nivaa = (a, modul) => effektivTilgang(a, modul, tilgangKontekst()).nivaa;
const kunde = (id) => KUNDER.find((k) => k.id === id);
const navnPaa = (id) => ANSATTE.find((a) => a.id === id)?.navn ?? id;

// ---------- hjelpere ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const IKON = {
  core: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  news: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18 6"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 15c3 0 5 2 5 5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4z"/><path d="m3 7 9 4 9-4M12 11v10"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  stop: '<rect x="6" y="6" width="12" height="12" fill="currentColor"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
const ikon = (navn) => `<svg class="ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[navn] ?? ''}</svg>`;

const KILDE = { epost: 'E-post', intranett: 'Intranett', nyheter: 'Nyheter', crm: 'CRM', lager: 'Lager' };

function datoTekst(d = new Date()) {
  return d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fristTekst(om) {
  if (om == null) return '';
  if (om <= 0) return 'I dag';
  if (om === 1) return 'I morgen';
  return `Om ${om} dager`;
}

// ---------- skall ----------

const app = document.getElementById('app');

function skall(innhold, aktiv) {
  const a = ansatt();
  const moduler = synligeModuler(a, MODULER, tilgangKontekst());
  return `
    <header class="topp">
      <a class="merke" href="#brief" aria-label="Dario – til Dagens brief">
        <img src="assets/bd-kube-64.png" alt="" width="32" height="32" />
        <span class="merke__tekst">DARIO</span>
      </a>
      <div class="topp__midt">
        <span class="status-prikk" aria-hidden="true"></span>
        <span class="topp__dato">${esc(datoTekst())}</span>
        <span class="topp__demo">Prototype · fiktive data</span>
      </div>
      <label class="persona">
        <span class="persona__etikett">Vis som</span>
        <select id="persona">
          ${ANSATTE.map((p) => `<option value="${p.id}" ${p.id === a.id ? 'selected' : ''}>${esc(p.navn)} · ${esc(ROLLER[p.rolle].navn)}</option>`).join('')}
        </select>
      </label>
    </header>
    <div class="ramme">
      <nav class="meny" aria-label="Moduler">
        ${moduler.map((m) => `
          <a href="#${m.id}" class="meny__lenke ${m.id === aktiv ? 'aktiv' : ''}" ${m.id === aktiv ? 'aria-current="page"' : ''}>
            ${ikon(m.ikon)}<span>${esc(m.navn)}</span>
          </a>`).join('')}
        <a href="#drofting" class="meny__lenke meny__drofting ${aktiv === 'drofting' ? 'aktiv' : ''}">${ikon('doc')}<span>Drøftelse</span></a>
      </nav>
      <main class="innhold" id="innhold">${innhold}</main>
    </div>`;
}

function seksjon(tittel, innhold, ekstra = '') {
  return `<section class="panel ${ekstra}"><h2 class="panel__tittel">${esc(tittel)}</h2>${innhold}</section>`;
}

function sideHode(modulId, undertittel) {
  const m = MODULER.find((x) => x.id === modulId);
  return `
    <div class="sidehode">
      <div class="sidehode__ikon">${ikon(m.ikon)}</div>
      <div>
        <h1>${esc(m.navn)}</h1>
        <p class="dempet">${esc(undertittel ?? m.beskrivelse)}</p>
      </div>
      <span class="kildemerke" title="Datakilde i en ekte løsning">Kilde: ${esc(m.kilde)}</span>
    </div>`;
}

// ---------- Dagens brief ----------

function kjerne() {
  // Dario: en svevende punktkule (canvas, se orb.js) inne i rolige HUD-ringer.
  return `
    <div class="kjerne" id="kjerne" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <circle class="kjerne__ring r1" cx="100" cy="100" r="96" />
        <circle class="kjerne__ring r2" cx="100" cy="100" r="88" />
      </svg>
      <canvas id="orb" class="kjerne__orb"></canvas>
    </div>`;
}

function pipelineSvg(p) {
  const trinn = Object.entries(p);
  const maks = Math.max(1, ...trinn.map(([, v]) => v));
  return `
    <div class="stolper" role="img" aria-label="Pipeline per trinn">
      ${trinn.map(([navn, v]) => `
        <div class="stolpe">
          <span class="stolpe__verdi">${v ? esc(kr(v)) : '–'}</span>
          <div class="stolpe__spor"><div class="stolpe__fyll ${navn === 'Vunnet' ? 'vunnet' : ''}" style="height:${Math.round((v / maks) * 100)}%"></div></div>
          <span class="stolpe__navn">${esc(navn)}</span>
        </div>`).join('')}
    </div>`;
}

function prioritetKort(p, i) {
  const s = p.signal;
  const k = kunde(s.kunde);
  const maks = 160;
  return `
    <article class="prio">
      <div class="prio__nr">${i + 1}</div>
      <div class="prio__kropp">
        <div class="prio__meta">
          <span class="chip">${esc(KILDE[s.kilde])}</span>
          ${k ? `<span class="chip chip--kunde">${esc(k.navn)}</span>` : ''}
          ${s.fristOm != null ? `<span class="chip ${s.fristOm <= 1 ? 'chip--hast' : ''}">${esc(fristTekst(s.fristOm))}</span>` : ''}
        </div>
        <h3>${esc(s.tittel)}</h3>
        <p class="dempet">${esc(s.utdrag)}</p>
        <details class="hvorfor">
          <summary>Hvorfor er dette viktig?</summary>
          <ul>${p.grunner.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
        </details>
      </div>
      <div class="prio__side">
        <div class="score" title="Prioritetsscore">
          <div class="score__spor"><div class="score__fyll" style="width:${Math.min(100, Math.round((p.score / maks) * 100))}%"></div></div>
          <span>${p.score}</span>
        </div>
        <a class="knapp knapp--liten" href="#${p.handling.modul}${p.handling.modul === 'tilbud' ? `?signal=${s.id}` : ''}">${esc(p.handling.tekst)} ${ikon('arrow')}</a>
      </div>
    </article>`;
}

function visBrief() {
  const a = ansatt();
  const data = { signaler: SIGNALER, roller: ROLLER, kunder: KUNDER, kalender: KALENDER, pipeline: PIPELINE };
  const prio = prioriter(a, data);
  const nokkel = nokkeltall(a, data);
  const manus = lagManus(a, { prioriteringer: prio, nokkel, kalender: KALENDER });
  const moter = KALENDER[a.id] ?? [];
  const kan = (m) => NIVAAER.indexOf(nivaa(a, m)) > 0;
  const intra = SIGNALER.filter((s) => s.kilde === 'intranett' && gjelder(s, a)).slice(0, 3);
  const nyh = SIGNALER.filter((s) => s.kilde === 'nyheter' && gjelder(s, a)).slice(0, 3);

  const html = `
    <section class="hero">
      ${kjerne()}
      <div class="hero__tekst">
        <p class="overline">Dagens brief · ${esc(ROLLER[a.rolle].navn)} · ${esc(a.region)}</p>
        <h1 class="hero__tittel">Hei, ${esc(a.navn.split(' ')[0])}!</h1>
        <p class="dempet">Dario har lest ${SIGNALER.filter((s) => gjelder(s, a)).length} signaler fra e-post, intranett, nyheter, CRM og lager – og koblet dem mot kalenderen din.</p>
        <div class="hero__knapper">
          <button class="knapp knapp--hoved" id="spill">${ikon('play')}<span>Spill av brief</span></button>
          <a class="knapp" href="#tilbud">${ikon('doc')}<span>Nytt tilbud</span></a>
        </div>
        <p class="teksting" id="teksting" aria-live="polite"></p>
      </div>
    </section>

    <div class="kpi-rad">
      ${kpi(nokkel.svarForventet, 'venter på svar')}
      ${kpi(nokkel.fristerToDager, 'frister innen 2 dager')}
      ${kpi(nokkel.moter, 'avtaler i dag')}
      ${kpi(kr(nokkel.aapenPipeline), 'åpen pipeline')}
      ${kpi(nokkel.muligheter, 'nye muligheter')}
    </div>

    <div class="rutenett">
      <div class="kolonne">
        ${seksjon('Dagens prioriteringer', prio.length ? prio.slice(0, 5).map(prioritetKort).join('') : '<p class="dempet">Ingenting krever deg akkurat nå.</p>')}
      </div>
      <div class="kolonne">
        ${seksjon('Dagen', moter.length ? `<ol class="tidslinje">${moter.map((m) => `
          <li><span class="tid">${esc(m.tid)}</span><span>${esc(m.tittel)}${m.kunde ? `<small class="dempet">Forberedt: ${esc(kunde(m.kunde).navn)} – ${esc(kr(kunde(m.kunde).omsetning12m))} siste 12 mnd</small>` : ''}</span></li>`).join('')}</ol>` : '<p class="dempet">Ingen avtaler.</p>')}
        ${seksjon('Pipeline', pipelineSvg(PIPELINE[a.id] ?? {}))}
        ${kan('intranett') ? seksjon('Fra intranettet', liste(intra)) : ''}
        ${kan('nyheter') ? seksjon('Segmentradar', liste(nyh)) : ''}
      </div>
    </div>

    ${seksjon('Koblinger', `
      <ul class="koblinger">
        ${['Outlook e-post', 'Outlook kalender', 'Intranett', 'Lokale nyheter og anbud', 'CRM / ERP', 'Tilbudsverktøy'].map((k) => `<li><span class="status-prikk"></span>${esc(k)} <small>demo</small></li>`).join('')}
      </ul>`, 'panel--smal')}`;

  app.innerHTML = skall(html, 'brief');
  orb?.stopp();
  orb = lagOrb(document.getElementById('orb'));
  document.getElementById('spill').addEventListener('click', () => spillBrief(manus));
}

const kpi = (verdi, etikett) => `<div class="kpi"><span class="kpi__verdi">${esc(verdi)}</span><span class="kpi__etikett">${esc(etikett)}</span></div>`;

const liste = (signaler) => signaler.length
  ? `<ul class="liste">${signaler.map((s) => `<li><b>${esc(s.tittel)}</b><span class="dempet">${esc(s.utdrag)}</span></li>`).join('')}</ul>`
  : '<p class="dempet">Ingenting nytt for deg.</p>';

// ---------- tale ----------

// Darios stemme: ferdig innspilte klipp (scripts/lag-stemme.py) slås opp på
// setningens tekst. Mangler et klipp, faller vi tilbake til nettleserens
// norske stemme, og til slutt til bare teksting.
let orb = null;
let snakker = false;
let stemmeKlipp = null;
const hentKlipp = () => (stemmeKlipp ??= fetch('assets/stemme/manifest.json')
  .then((r) => (r.ok ? r.json() : { klipp: {} }))
  .then((m) => m.klipp ?? {})
  .catch(() => ({})));

let lyd = null;
let analysator = null;
function lydspiller() {
  if (lyd) return lyd;
  lyd = new Audio();
  try {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const kilde = actx.createMediaElementSource(lyd);
    analysator = actx.createAnalyser();
    analysator.fftSize = 512;
    kilde.connect(analysator);
    analysator.connect(actx.destination);
    lyd.addEventListener('play', () => actx.resume());
  } catch { analysator = null; /* lyd uten visualisering */ }
  return lyd;
}

// Lydnivået (RMS) driver kula. Uten analysator: en rolig, syntetisk puls.
function folgNivaa() {
  const buffer = analysator ? new Uint8Array(analysator.fftSize) : null;
  const steg = (tid) => {
    if (!snakker) { orb?.settNivaa(0); return; }
    let n;
    if (buffer) {
      analysator.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const v of buffer) sum += ((v - 128) / 128) ** 2;
      n = Math.sqrt(sum / buffer.length) * 5;
    } else {
      n = 0.35 + Math.abs(Math.sin(tid / 140)) * 0.4;
    }
    orb?.settNivaa(n);
    requestAnimationFrame(steg);
  };
  requestAnimationFrame(steg);
}

async function spillBrief(manus) {
  const knapp = document.getElementById('spill');
  const teksting = document.getElementById('teksting');
  const kjerneEl = document.getElementById('kjerne');
  const stopp = () => {
    snakker = false;
    window.speechSynthesis?.cancel();
    lyd?.pause();
    kjerneEl?.classList.remove('snakker');
    if (knapp?.isConnected) knapp.innerHTML = `${ikon('play')}<span>Spill av brief</span>`;
  };
  if (snakker) return stopp();
  snakker = true;
  kjerneEl.classList.add('snakker');
  knapp.innerHTML = `${ikon('stop')}<span>Stopp</span>`;
  const spiller = lydspiller(); // opprettes i klikket, så nettleseren tillater lyd
  folgNivaa();

  const klipp = await hentKlipp();
  const synth = window.speechSynthesis;
  const nettleserstemme = synth?.getVoices().find((v) => /^(nb|no|nn)/i.test(v.lang));
  let i = 0;
  const neste = () => {
    if (!snakker || i >= manus.length) return stopp();
    const setning = manus[i++];
    teksting.textContent = setning;
    if (klipp[setning]) {
      spiller.src = `assets/stemme/${klipp[setning]}`;
      spiller.onended = neste;
      spiller.onerror = neste;
      spiller.play().catch(neste);
    } else if (synth && nettleserstemme) {
      const u = new SpeechSynthesisUtterance(setning);
      u.voice = nettleserstemme;
      u.lang = nettleserstemme.lang;
      u.onend = neste;
      u.onerror = neste;
      synth.speak(u);
    } else {
      setTimeout(neste, 900 + setning.length * 45);
    }
  };
  neste();
}

// ---------- E-post ----------

function visEpost() {
  const a = ansatt();
  const prio = prioriter(a, { signaler: SIGNALER.filter((s) => s.kilde === 'epost'), roller: ROLLER, kunder: KUNDER, kalender: KALENDER });
  const bøtte = (p) => (p.signal.fristOm != null && p.signal.fristOm <= 1) || p.signal.flagg.includes('reklamasjon') ? 'Svar i dag'
    : p.signal.flagg.includes('svar-forventet') ? 'Denne uka' : 'Til orientering';
  const grupper = ['Svar i dag', 'Denne uka', 'Til orientering'];
  const html = `${sideHode('epost', 'Dario har sortert innboksen etter hva som krever deg – ikke etter når det kom.')}
    ${grupper.map((g) => {
      const rader = prio.filter((p) => bøtte(p) === g);
      return seksjon(`${g} (${rader.length})`, rader.length ? rader.map((p) => `
        <article class="rad">
          <div><h3>${esc(p.signal.tittel)}</h3><p class="dempet">${esc(p.signal.utdrag)}</p>
          <p class="grunner">${p.grunner.slice(0, 3).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</p></div>
          <div class="rad__knapper">
            <button class="knapp knapp--liten" data-utkast="${p.signal.id}">Foreslå svar</button>
            ${p.signal.type === 'tilbud' ? `<a class="knapp knapp--liten" href="#tilbud?signal=${p.signal.id}">Lag tilbud</a>` : ''}
          </div>
          <div class="utkast" id="utkast-${p.signal.id}" hidden></div>
        </article>`).join('') : '<p class="dempet">Tomt.</p>');
    }).join('')}`;
  app.innerHTML = skall(html, 'epost');
  app.querySelectorAll('[data-utkast]').forEach((b) => b.addEventListener('click', () => {
    const s = SIGNALER.find((x) => x.id === b.dataset.utkast);
    const boks = document.getElementById(`utkast-${s.id}`);
    boks.hidden = false;
    boks.innerHTML = `<p class="overline">Utkast – sendes aldri automatisk</p>
      <p>Hei,<br>takk for henvendelsen om «${esc(s.tittel.split(':').pop().trim())}». Jeg ser på dette i dag og kommer tilbake til deg innen ${s.fristOm <= 0 ? 'kl. 14' : 'i morgen formiddag'}.</p>
      <p>Med vennlig hilsen<br>${esc(ansatt().navn)}<br>Brødrene Dahl</p>`;
  }));
}

// ---------- Intranett og nyheter ----------

function visIntranett() {
  const a = ansatt();
  const mine = SIGNALER.filter((s) => s.kilde === 'intranett');
  const html = `${sideHode('intranett')}
    ${seksjon('Relevant for deg', liste(mine.filter((s) => gjelder(s, a))))}
    ${seksjon('Filtrert bort for din rolle', liste(mine.filter((s) => !gjelder(s, a))), 'panel--dempet')}`;
  app.innerHTML = skall(html, 'intranett');
}

function visNyheter() {
  const a = ansatt();
  const nyh = SIGNALER.filter((s) => s.kilde === 'nyheter');
  const kort = (s) => {
    const berort = KUNDER.filter((k) => k.id === s.kunde || (a.segment.includes(k.segment) && k.region === a.region)).slice(0, 3);
    return `<article class="rad"><div>
      <p>${s.flagg.map((f) => `<span class="chip ${f === 'konkurrent' ? 'chip--hast' : ''}">${esc(f)}</span>`).join('')}</p>
      <h3>${esc(s.tittel)}</h3><p class="dempet">${esc(s.utdrag)}</p>
      ${berort.length ? `<p class="grunner">Kan berøre: ${berort.map((k) => `<span class="chip chip--kunde">${esc(k.navn)}</span>`).join('')}</p>` : ''}
    </div></article>`;
  };
  const html = `${sideHode('nyheter', `Segment: ${a.segment.join(', ')} · Distrikt: ${a.region}`)}
    ${seksjon('I ditt segment', nyh.filter((s) => gjelder(s, a)).map(kort).join('') || '<p class="dempet">Ingen treff i dag.</p>')}
    ${seksjon('Øvrige nyheter i regionen', nyh.filter((s) => !gjelder(s, a)).map(kort).join('') || '<p class="dempet">–</p>', 'panel--dempet')}`;
  app.innerHTML = skall(html, 'nyheter');
}

// ---------- Tilbud ----------

// Grovt demo-utvalg av varelinjer. I produksjon gjør tilbudsverktøyet dette med ekte priser.
const VARELINJER = [
  { ord: /rør|pex/i, linjer: [['PEX-rør 16 mm, rull 100 m', 12, 1890], ['Rør-i-rør-system, sett', 40, 645]] },
  { ord: /armatur|bad/i, linjer: [['Servantbatteri, krom', 40, 1290], ['Termostatisk dusjbatteri', 40, 2350]] },
  { ord: /varmepumpe/i, linjer: [['Luft/vann-varmepumpe 8 kW', 4, 74_900]] },
  { ord: /kum|va|avløp/i, linjer: [['Betongkum 1000 mm', 6, 14_200], ['PP-rør 315 mm, 6 m', 30, 3_980]] },
  { ord: /ventil/i, linjer: [['Kuleventil DN25', 50, 289]] },
];

function visTilbud(param) {
  const a = ansatt();
  const kanBruke = nivaa(a, 'tilbud') !== 'se';
  const s = SIGNALER.find((x) => x.id === param.get('signal'));
  const egne = KUNDER.filter((k) => k.eier === a.id || a.rolle === 'salgssjef' || a.rolle === 'innesalg');
  const html = `${sideHode('tilbud', 'Dario fyller inn konteksten og lager utkastet med tilbudsverktøyet. Du kontrollerer og sender.')}
    ${s ? `<div class="melding">Startet fra: <b>${esc(s.tittel)}</b></div>` : ''}
    ${!kanBruke ? '<div class="melding melding--varsel">Du har lesetilgang til tilbud. Be lederen din om «bruke» i tilgangstabellen for å lage tilbud.</div>' : ''}
    <div class="rutenett">
      <div class="kolonne">
        ${seksjon('1 · Kontekst', `
          <form id="tilbudsskjema" class="skjema">
            <label>Kunde<select name="kunde">${(egne.length ? egne : KUNDER).map((k) => `<option value="${k.id}" ${k.id === s?.kunde ? 'selected' : ''}>${esc(k.navn)}</option>`).join('')}</select></label>
            <label>Prosjekt<input name="prosjekt" value="${esc(s ? s.tittel.split(':').pop().replace(/^.*?på /, '').trim() : '')}" placeholder="F.eks. Hasle Park, blokk C" /></label>
            <label>Behov (fra e-post, notater eller tegning)<textarea name="behov" rows="5" placeholder="Beskriv hva kunden trenger">${esc(s?.utdrag ?? '')}</textarea></label>
            <label class="avkrysning"><input type="checkbox" name="prisliste" checked /> Bruk ny prisliste fra 1. november</label>
            <button class="knapp knapp--hoved" ${kanBruke ? '' : 'disabled'}>${ikon('doc')}<span>Lag utkast</span></button>
          </form>`)}
      </div>
      <div class="kolonne">
        ${seksjon('2 · Utkast', '<div id="tilbudsutkast"><p class="dempet">Utkastet vises her. Ingenting sendes til kunden før du har godkjent.</p></div>')}
      </div>
    </div>`;
  app.innerHTML = skall(html, 'tilbud');
  document.getElementById('tilbudsskjema').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const k = kunde(f.get('kunde'));
    const tekst = `${f.get('prosjekt')} ${f.get('behov')}`;
    let linjer = VARELINJER.filter((v) => v.ord.test(tekst)).flatMap((v) => v.linjer);
    if (!linjer.length) linjer = VARELINJER[0].linjer.concat(VARELINJER[1].linjer);
    const sum = linjer.reduce((t, [, ant, pris]) => t + ant * pris, 0);
    document.getElementById('tilbudsutkast').innerHTML = `
      <p class="overline">Tilbud til ${esc(k.navn)} · ${esc(f.get('prosjekt') || 'uten prosjektnavn')}</p>
      <table class="tabell">
        <thead><tr><th>Vare</th><th>Antall</th><th>Pris</th><th>Sum</th></tr></thead>
        <tbody>${linjer.map(([v, ant, pris]) => `<tr><td>${esc(v)}</td><td>${ant}</td><td>${esc(kr(pris))}</td><td>${esc(kr(ant * pris))}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="3">Sum eks. mva.</td><td>${esc(kr(sum))}</td></tr></tfoot>
      </table>
      <p class="dempet">Demo: varelinjene er gjettet fra nøkkelord. I den ekte løsningen henter tilbudsverktøyet riktige netto- og kundepriser.</p>
      <div class="hero__knapper"><button class="knapp knapp--liten" disabled>Åpne i tilbudsverktøyet</button><button class="knapp knapp--liten" disabled>Send til kunde</button></div>`;
  });
}

// ---------- Kunder, kalender, team, lager ----------

function visKunder() {
  const a = ansatt();
  const alle = a.rolle === 'salgssjef' || a.rolle === 'innesalg' || nivaa(a, 'kunder') === 'delegere';
  const rader = KUNDER.filter((k) => alle || k.eier === a.id || k.region === a.region);
  const html = `${sideHode('kunder', alle ? 'Alle kunder i regionen.' : 'Dine kunder og kunder i ditt distrikt.')}
    ${seksjon('Kunder', `<div class="tabell-rull"><table class="tabell">
      <thead><tr><th>Kunde</th><th>Segment</th><th>Omsetning 12 mnd</th><th>Trend</th><th>Siste kontakt</th><th>Ansvarlig</th><th>Signaler</th></tr></thead>
      <tbody>${rader.map((k) => {
        const sig = SIGNALER.filter((s) => s.kunde === k.id).length;
        return `<tr><td><b>${esc(k.navn)}</b>${k.nokkel ? ' <span class="chip">nøkkel</span>' : ''}</td><td>${esc(k.segment)}</td>
          <td>${esc(kr(k.omsetning12m))}</td><td class="${k.trend < 0 ? 'neg' : 'pos'}">${k.trend > 0 ? '+' : ''}${Math.round(k.trend * 100)} %</td>
          <td class="${k.sisteKontaktDager > 20 ? 'neg' : ''}">${k.sisteKontaktDager} dager</td><td>${esc(navnPaa(k.eier))}</td><td>${sig}</td></tr>`;
      }).join('')}</tbody></table></div>`)}`;
  app.innerHTML = skall(html, 'kunder');
}

function visKalender() {
  const a = ansatt();
  const moter = KALENDER[a.id] ?? [];
  const html = `${sideHode('kalender', 'Hver kundeavtale kommer med en ferdig forberedelse.')}
    ${moter.map((m) => {
      const k = kunde(m.kunde);
      const sig = k ? SIGNALER.filter((s) => s.kunde === k.id) : [];
      return seksjon(`${m.tid} · ${m.tittel}`, k ? `
        <p><b>${esc(k.navn)}</b> · ${esc(k.segment)} · ${esc(kr(k.omsetning12m))} siste 12 mnd (${k.trend > 0 ? '+' : ''}${Math.round(k.trend * 100)} %) · siste kontakt for ${k.sisteKontaktDager} dager siden</p>
        ${sig.length ? `<p class="overline">Ta opp</p>${liste(sig)}` : ''}` : `<p class="dempet">${m.varighet} min · intern avtale</p>`);
    }).join('') || seksjon('I dag', '<p class="dempet">Ingen avtaler.</p>')}`;
  app.innerHTML = skall(html, 'kalender');
}

function visTeam() {
  const team = ANSATTE.filter((x) => x.leder === 'tor');
  const maks = Math.max(...team.map((x) => Object.values(PIPELINE[x.id] ?? {}).reduce((t, v) => t + v, 0)));
  const html = `${sideHode('team', `Region Øst · ${team.length} personer`)}
    ${seksjon('Pipeline per person', `<div class="hbarer">${team.map((x) => {
      const p = PIPELINE[x.id] ?? {};
      const total = Object.values(p).reduce((t, v) => t + v, 0);
      return `<div class="hbar"><span>${esc(x.navn)}</span><div class="hbar__spor"><div class="hbar__fyll" style="width:${Math.round((total / maks) * 100)}%"></div></div><span>${esc(kr(total))}</span></div>`;
    }).join('')}</div>`)}
    ${seksjon('Signaler for lederen', liste(SIGNALER.filter((s) => s.type === 'team')))}
    <p class="dempet liten">Bevisst utelatt: lederen ser ikke de ansattes e-post eller personlige brief – bare tall og signaler fra CRM. Se Drøftelse → Personvern.</p>`;
  app.innerHTML = skall(html, 'team');
}

function visLager() {
  const a = ansatt();
  const html = `${sideHode('lager')}
    ${seksjon('Avvik og leveranser som angår deg', liste(SIGNALER.filter((s) => s.type === 'levering' && gjelder(s, a))))}`;
  app.innerHTML = skall(html, 'lager');
}

// ---------- Tilgangstabell ----------

function visTilgang() {
  const a = ansatt();
  const kanEndre = NIVAAER.indexOf(nivaa(a, 'tilgang')) >= NIVAAER.indexOf('bruke');
  const ktx = tilgangKontekst();
  const celle = (p, m) => {
    const t = effektivTilgang(p, m.id, ktx);
    const merke = { rolle: '', unntak: '<sup title="Individuelt unntak">U</sup>', delegert: `<sup title="Delegert fra ${esc(navnPaa(t.delegering?.fra))}">D</sup>` }[t.kilde];
    return `<td><button class="niva niva--${t.nivaa}" data-p="${p.id}" data-m="${m.id}" ${kanEndre ? '' : 'disabled'} aria-label="${esc(p.navn)}, ${esc(m.navn)}: ${t.nivaa}">${t.nivaa}${merke}</button></td>`;
  };
  const moduler = MODULER;
  const delegerbare = moduler.filter((m) => nivaa(a, m.id) === 'delegere');
  const html = `${sideHode('tilgang', 'Rolle-mal + individuelle unntak + tidsbegrensede delegeringer = det hver ansatt ser i suiten.')}
    ${kanEndre ? '' : '<div class="melding">Du ser tabellen, men kan ikke endre den. Bytt til «Tor Vik · Salgssjef» øverst for å prøve.</div>'}
    ${seksjon('Hvem har hva', `
      <div class="tabell-rull"><table class="tabell tilgangstabell">
        <thead><tr><th>Ansatt</th>${moduler.map((m) => `<th title="${esc(m.beskrivelse)}">${esc(m.navn)}</th>`).join('')}</tr></thead>
        <tbody>${ANSATTE.map((p) => `<tr><th scope="row">${esc(p.navn)}<small>${esc(ROLLER[p.rolle].navn)}</small></th>${moduler.map((m) => celle(p, m)).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <p class="forklaring"><span class="niva niva--ingen">ingen</span><span class="niva niva--se">se</span><span class="niva niva--bruke">bruke</span><span class="niva niva--delegere">delegere</span>
      <span>U = individuelt unntak · D = delegert · klikk en celle for å endre</span></p>
      ${kanEndre ? '<button class="knapp knapp--liten" id="nullstill">Tilbakestill til rolle-maler</button>' : ''}`)}
    ${seksjon('Delegeringer', `
      <div class="tabell-rull"><table class="tabell"><thead><tr><th>Fra</th><th>Til</th><th>Modul</th><th>Nivå</th><th>Utløper</th><th>Grunn</th><th></th></tr></thead>
      <tbody>${tilstand.delegeringer.map((d, i) => `<tr><td>${esc(navnPaa(d.fra))}</td><td>${esc(navnPaa(d.til))}</td><td>${esc(MODULER.find((m) => m.id === d.modul)?.navn)}</td><td>${esc(d.nivaa)}</td><td>om ${d.utloperOm} dager</td><td>${esc(d.grunn)}</td>
        <td>${d.fra === a.id ? `<button class="knapp knapp--liten" data-trekk="${i}">Trekk tilbake</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="dempet">Ingen aktive delegeringer.</td></tr>'}</tbody></table></div>
      ${delegerbare.length ? `
      <form id="deleger" class="skjema skjema--rad">
        <label>Modul<select name="modul">${delegerbare.map((m) => `<option value="${m.id}">${esc(m.navn)}</option>`).join('')}</select></label>
        <label>Til<select name="til">${ANSATTE.filter((p) => p.id !== a.id).map((p) => `<option value="${p.id}">${esc(p.navn)}</option>`).join('')}</select></label>
        <label>Nivå<select name="nivaa"><option>bruke</option><option>se</option></select></label>
        <label>Dager<input name="dager" type="number" min="1" max="90" value="14" /></label>
        <label>Grunn<input name="grunn" placeholder="F.eks. ferie" /></label>
        <button class="knapp knapp--hoved">Deleger</button>
      </form>` : '<p class="dempet">Du har ingen moduler med nivået «delegere».</p>'}`)}
    ${seksjon('Endringslogg', tilstand.logg.length ? `<ul class="liste">${tilstand.logg.slice(-8).reverse().map((l) => `<li><span class="dempet">${esc(l)}</span></li>`).join('')}</ul>` : '<p class="dempet">Alle endringer logges her (hvem, hva, når).</p>')}`;
  app.innerHTML = skall(html, 'tilgang');

  const logg = (tekst) => tilstand.logg.push(`${new Date().toLocaleString('nb-NO')} · ${a.navn}: ${tekst}`);
  app.querySelectorAll('.niva[data-p]').forEach((b) => b.addEventListener('click', () => {
    const p = ANSATTE.find((x) => x.id === b.dataset.p);
    const m = b.dataset.m;
    const ny = nesteNivaa(effektivTilgang(p, m, tilgangKontekst()).nivaa);
    (tilstand.unntak[p.id] ??= {})[m] = ny;
    if (ROLLER[p.rolle].tilgang[m] === ny) delete tilstand.unntak[p.id][m];
    logg(`satte ${p.navn} / ${MODULER.find((x) => x.id === m).navn} til «${ny}»`);
    lagre(); visTilgang();
  }));
  document.getElementById('nullstill')?.addEventListener('click', () => {
    tilstand.unntak = {};
    logg('tilbakestilte alle unntak til rolle-maler');
    lagre(); visTilgang();
  });
  app.querySelectorAll('[data-trekk]').forEach((b) => b.addEventListener('click', () => {
    const [d] = tilstand.delegeringer.splice(Number(b.dataset.trekk), 1);
    logg(`trakk tilbake ${d.modul} fra ${navnPaa(d.til)}`);
    lagre(); visTilgang();
  }));
  document.getElementById('deleger')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const d = { fra: a.id, til: f.get('til'), modul: f.get('modul'), nivaa: f.get('nivaa'), utloperOm: Number(f.get('dager')), grunn: f.get('grunn') || '–' };
    if (!kanDelegere(a, d.modul, d.nivaa, tilgangKontekst())) return;
    tilstand.delegeringer.push(d);
    logg(`delegerte ${d.modul} (${d.nivaa}) til ${navnPaa(d.til)} i ${d.utloperOm} dager`);
    lagre(); visTilgang();
  });
}

// ---------- ruter ----------

// ---------- Drøftelse ----------

// Drøftelsen er en egen side (drofting.html) som også vises inne i appen,
// slik at alt kan deles som én lenke.
function visDrofting() {
  app.innerHTML = skall('<p class="dempet">Laster drøftelsen…</p>', 'drofting');
  // Ikke skriv over en annen visning hvis brukeren har gått videre mens vi lastet.
  const fortsattHer = () => location.hash.replace(/^#\/?/, '').startsWith('drofting');
  fetch('drofting.html').then((r) => r.text()).then((tekst) => {
    const dok = new DOMParser().parseFromString(tekst, 'text/html');
    const innhold = document.getElementById('innhold');
    if (!innhold || !fortsattHer()) return;
    innhold.innerHTML = [...dok.querySelectorAll('style')].map((s) => s.outerHTML).join('') + dok.querySelector('main').outerHTML;
    innhold.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (href.startsWith('./#')) a.setAttribute('href', href.slice(2));
      else if (href === './') a.setAttribute('href', '#brief');
      else if (href.startsWith('#') && innhold.querySelector(href)) {
        // Innholdsfortegnelsen: rull til seksjonen uten å bytte visning.
        a.addEventListener('click', (e) => { e.preventDefault(); innhold.querySelector(href).scrollIntoView({ behavior: 'smooth' }); });
      }
    });
  }).catch(() => {
    const innhold = document.getElementById('innhold');
    if (innhold && fortsattHer()) innhold.innerHTML = '<div class="melding melding--varsel">Fant ikke drøftelsen. Åpne drofting.html direkte.</div>';
  });
}

const VISNINGER = { brief: visBrief, epost: visEpost, intranett: visIntranett, nyheter: visNyheter, tilbud: visTilbud, kunder: visKunder, kalender: visKalender, team: visTeam, lager: visLager, tilgang: visTilgang, drofting: visDrofting };

function rute() {
  if (snakker) { snakker = false; window.speechSynthesis?.cancel(); lyd?.pause(); }
  const [sti, sporring] = location.hash.replace(/^#\/?/, '').split('?');
  const id = VISNINGER[sti] ? sti : 'brief';
  if (id === 'drofting') {
    visDrofting();
  } else if (NIVAAER.indexOf(nivaa(ansatt(), id)) <= 0) {
    app.innerHTML = skall(`${sideHode(id)}<div class="melding melding--varsel">Denne delen av suiten er ikke tildelt deg. Tilgang styres i tilgangstabellen.</div>`, id);
  } else {
    VISNINGER[id](new URLSearchParams(sporring));
  }
  document.getElementById('persona').addEventListener('change', (e) => {
    tilstand.ansattId = e.target.value;
    lagre(); rute();
  });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', rute);
// Stemmelisten lastes asynkront i noen nettlesere.
window.speechSynthesis?.addEventListener?.('voiceschanged', () => {});
rute();
