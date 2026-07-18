// Konfigurasjon. Supabase gjenbrukes fra samme prosjekt (ref/URL/nøkler beholdt).
// Nøkkelen er en offentlig anon-nøkkel (RLS beskytter data) — trygg i klienten.
export const SUPABASE_URL = 'https://rkvphgbfyfymilzwgmgp.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrdnBoZ2JmeWZ5bWlsendnbWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTEyMDMsImV4cCI6MjA5ODU4NzIwM30.ufVPAqsCRgaPUn9nNDdyq4YCQ4bA7LwsaJ-TVxfLAE0';

// App-versjon: bumpes for å tvinge ny service-worker-cache.
export const APP_VERSION = 'm82-5.36.0';

// Merkevare — én kilde til sannhet. En rebrand bytter kun disse konstantene;
// resten av appen leser herfra i stedet for et hardkodet navn.
// Cache-prefikset i sw.js er APP_NAME i små bokstaver (håndheves av hooken).
export const APP_NAME = 'Takt';
export const APP_SHORT = 'Takt';
export const APP_TAGLINE = 'Daglige valg, gode år';

// Lagrings-prefiks for localStorage-nøkler. Nøklene er interne og usynlige for
// brukeren; en fremtidig rebrand kan rute nye nøkler via en nokkel()-hjelper
// uten å foreldreløse eksisterende data. Beholdes 'trening' inntil videre.
export const LS_PREFIX = 'trening';

// Støttede språk (Norge-først, 'nb' er standard). Utvides for Norden senere
// uten å endre lasterne — hentSprakJson prøver .<lang>.json → base .json (NB).
export const STOTTEDE_SPRAK = ['nb', 'en'];

// Aktiverte OAuth-leverandører på medlemssidene. Må også være aktivert i
// Supabase (Auth → Providers). Legg til 'apple' her når den er satt opp.
export const OAUTH_PROVIDERE = ['facebook'];

// localStorage-nøkler
export const LS = {
  profil: 'trening.profil',
  logg: 'trening.logg',
  sesjon: 'trening.sesjon', // Supabase-auth-sesjon (M5-sync)
  sistSynk: 'trening.sistSynk', // tidsstempel for siste vellykkede sync
  plan: 'trening.plan', // planlagte økter (M9 — kalenderplanlegging)
  aktivOkt: 'trening.aktivOkt', // pågående hurtigstart-timer (overlever restart)
  adminAv: 'trening.adminAv', // admin har skrudd AV admin-modus for å se appen som et vanlig medlem (per enhet)
  krets: 'trening.krets', // Fellesskap: personene du vil holde varmt (lokalt, personvern-først)
  matlogg: 'trening.matlogg', // Kosthold-vaner (så full nullstilling rydder dem)
  sosiallogg: 'trening.sosiallogg', // Fellesskap-vaner
  rolog: 'trening.rolog', // Ro-vaner
};

// Utfasede nøkler fra tidligere versjoner — ryddes ved full nullstilling.
export const LS_UTFASET = ['trening.genererte', 'trening.sistLokasjon', 'trening.syncKo'];
