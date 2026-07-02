# Ringeliste — CRM-salgssystem

Mobilvennlig ringeliste/CRM for selgerteam. All funksjonalitet ligger i én fil, `index.html`, som serveres via GitHub Pages. Uten skysynkronisering lagres alt kun lokalt i nettleseren (localStorage).

## Skysynkronisering (delt kundepool på tvers av telefoner)

Appen kan speile kunder og selgere til en gratis [Supabase](https://supabase.com)-database, slik at hele teamet deler samme kundepool i tilnærmet sanntid. Slik skrur du det på:

1. **Opprett tabellene:** Åpne Supabase-dashbordet → SQL Editor → lim inn innholdet i `supabase-schema.sql` → Run.
2. **Legg inn nøkkelen:** I `index.html`, finn `var SUPABASE_ANON_KEY = '';` og lim inn «anon public»-nøkkelen fra Supabase (Settings → API). `SUPABASE_URL` skal peke på prosjektet ditt. Anon-nøkkelen er laget for å ligge åpent i klientkode.
3. **Publiser** endringen (push til `main` → GitHub Pages deployer automatisk).
4. **Koble til på hver telefon:** Åpne appen → Verktøy → Skysynkronisering → skriv inn en felles teamkode (velg en som er vanskelig å gjette). Eksisterende lokale data lastes opp automatisk første gang.

Alle enheter med samme teamkode deler kunder, selgere, pool og salgsstatistikk. Appen fungerer fortsatt offline og synker igjen når nettet er tilbake. Merk: uten innlogging er teamkoden eneste sperre — ikke lagre sensitive persondata her.
