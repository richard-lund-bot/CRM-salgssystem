// Våkenlås (M15): holder skjermen på under timer-økter via Wake Lock API.
// Progressiv forbedring — på enheter uten støtte skjer ingenting, og
// timerne går uansett riktig fordi de regner med veggklokke-tid.
let laas = null;
let ønsket = false;

export async function holdVaaken() {
  ønsket = true;
  try {
    laas = await navigator.wakeLock?.request('screen');
  } catch { /* ikke støttet eller avvist — helt greit */ }
}

export function slippVaaken() {
  ønsket = false;
  try { laas?.release(); } catch { /* alt ok */ }
  laas = null;
}

// Låsen slippes av systemet når appen legges i bakgrunnen — ta den tilbake
// når skjermen er synlig igjen, så lenge en økt fortsatt ønsker den.
document.addEventListener('visibilitychange', () => {
  if (ønsket && document.visibilityState === 'visible') holdVaaken();
});
