// Treningspreferanser (M22): brukeren setter et nivå per treningsform
// (favoritt/liker/nøytral/skjult) i Innstillinger. Nivået blir en multiplikator
// i økt-anbefalingen (js/app.js) og skjulte former filtreres bort fra
// øktbiblioteket. Lagres på profilen (profil.treningsPreferanser) og synker som
// del av profil-bloben — ingen skjemaendring. Manglende nøkkel = nøytral, så
// eksisterende brukere oppfører seg som før.
import { KATEGORIER } from './bibliotek-okter.js';

export const PREF_NIVAER = [
  { id: 'favoritt', navn: 'Favoritt', mult: 1.6 },
  { id: 'liker', navn: 'Liker', mult: 1.25 },
  { id: 'noytral', navn: 'Nøytral', mult: 1.0 },
  { id: 'skjult', navn: 'Skjul', mult: 0 },
];

const MULT = Object.fromEntries(PREF_NIVAER.map((n) => [n.id, n.mult]));

/** Nivået brukeren har satt for en kategori (default 'noytral'). */
export function prefNiva(profil, kat) {
  return profil?.treningsPreferanser?.[kat] || 'noytral';
}

/** Multiplikator for kategorien (skjult = 0). */
export function prefMult(profil, kat) {
  return MULT[prefNiva(profil, kat)] ?? 1;
}

/** Om kategorien er skjult. */
export function erSkjult(profil, kat) {
  return prefNiva(profil, kat) === 'skjult';
}

/** KATEGORIER minus de skjulte (til øktbiblioteket). */
export function synligeKategorier(profil) {
  return KATEGORIER.filter((k) => !erSkjult(profil, k.id));
}
