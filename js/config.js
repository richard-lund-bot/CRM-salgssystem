// Konfigurasjon. Supabase gjenbrukes fra samme prosjekt (ref/URL/nøkler beholdt).
// Nøkkelen er en offentlig anon-nøkkel (RLS beskytter data) — trygg i klienten.
export const SUPABASE_URL = 'https://rkvphgbfyfymilzwgmgp.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrdnBoZ2JmeWZ5bWlsendnbWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTEyMDMsImV4cCI6MjA5ODU4NzIwM30.ufVPAqsCRgaPUn9nNDdyq4YCQ4bA7LwsaJ-TVxfLAE0';

// App-versjon: bumpes for å tvinge ny service-worker-cache.
export const APP_VERSION = 'm28-2.34.0';

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
};

// Utfasede nøkler fra tidligere versjoner — ryddes ved full nullstilling.
export const LS_UTFASET = ['trening.genererte', 'trening.sistLokasjon', 'trening.syncKo'];
