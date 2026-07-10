// Engangsoppsett: opprett/list/slett Stravas webhook-abonnement (én per app).
//
//   STRAVA_CLIENT_ID=… STRAVA_CLIENT_SECRET=… STRAVA_VERIFY_TOKEN=… \
//     node scripts/strava-abonner.mjs            # opprett
//   node scripts/strava-abonner.mjs --list       # vis eksisterende
//   node scripts/strava-abonner.mjs --slett <id> # fjern
//
// Kjøres ETTER at Edge Functionen er deployet — Strava validerer callback-en
// (GET med hub.challenge) i samme sekund som abonnementet opprettes.
const BASE = 'https://www.strava.com/api/v3/push_subscriptions';
const CALLBACK = 'https://rkvphgbfyfymilzwgmgp.supabase.co/functions/v1/strava/webhook';

const id = process.env.STRAVA_CLIENT_ID;
const secret = process.env.STRAVA_CLIENT_SECRET;
const verify = process.env.STRAVA_VERIFY_TOKEN;

function krev(navn, verdi) {
  if (!verdi) { console.error(`Mangler ${navn} i miljøet.`); process.exit(1); }
}
krev('STRAVA_CLIENT_ID', id);
krev('STRAVA_CLIENT_SECRET', secret);

const modus = process.argv[2] || 'opprett';

if (modus === '--list') {
  const res = await fetch(`${BASE}?client_id=${id}&client_secret=${secret}`);
  console.log(res.status, JSON.stringify(await res.json(), null, 2));
} else if (modus === '--slett') {
  const subId = process.argv[3];
  krev('abonnements-id (argument etter --slett)', subId);
  const res = await fetch(`${BASE}/${subId}?client_id=${id}&client_secret=${secret}`, { method: 'DELETE' });
  console.log(res.status, res.status === 204 ? 'slettet' : await res.text());
} else {
  krev('STRAVA_VERIFY_TOKEN', verify);
  const body = new URLSearchParams({
    client_id: id, client_secret: secret,
    callback_url: CALLBACK, verify_token: verify,
  });
  const res = await fetch(BASE, { method: 'POST', body });
  const tekst = await res.text();
  console.log(res.status, tekst);
  if (!res.ok) process.exit(1);
  console.log('✓ Webhook-abonnement opprettet mot', CALLBACK);
}
