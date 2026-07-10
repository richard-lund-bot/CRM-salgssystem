// Ren mapping: Strava-aktivitet → Mova-loggrad. Ingen I/O — deles av
// Edge Functionen (Deno) og smoke-testen (node). Fallback er 'custom'
// (faktor 1.0) så ukjente aktivitetstyper aldri overkrediterer XP.
export const SPORT_TIL_BEVEGELSE = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Walk: 'walk', Hike: 'walk', Snowshoe: 'walk',
  Ride: 'bike', VirtualRide: 'bike', GravelRide: 'bike', MountainBikeRide: 'bike',
  EBikeRide: 'bike', EMountainBikeRide: 'bike', Handcycle: 'bike', Velomobile: 'bike',
  WeightTraining: 'strength', Crossfit: 'strength',
  Yoga: 'yoga', Pilates: 'yoga',
  HighIntensityIntervalTraining: 'hiit',
  Swim: 'sport', Soccer: 'sport', Tennis: 'sport', Pickleball: 'sport',
  Racquetball: 'sport', Squash: 'sport', Badminton: 'sport', TableTennis: 'sport',
  Golf: 'sport', RockClimbing: 'sport', AlpineSki: 'sport', BackcountrySki: 'sport',
  NordicSki: 'sport', RollerSki: 'sport', Snowboard: 'sport', IceSkate: 'sport',
  InlineSkate: 'sport', Skateboard: 'sport', Rowing: 'sport', VirtualRow: 'sport',
  Canoeing: 'sport', Kayaking: 'sport', StandUpPaddling: 'sport', Sail: 'sport',
  Surfing: 'sport', Windsurf: 'sport', Kitesurf: 'sport', Wheelchair: 'sport',
  Workout: 'custom', Elliptical: 'custom', StairStepper: 'custom',
};

/** Intensitet 1–5 fra snittpuls. Grov, men spennet i XP-faktor er smalt. */
export function intensitetFraPuls(snittPuls) {
  if (!snittPuls) return 3;
  if (snittPuls < 110) return 2;
  if (snittPuls < 140) return 3;
  if (snittPuls < 160) return 4;
  return 5;
}

/**
 * Bygger session_logs-raden for en Strava-aktivitet.
 * NB: `data.dato` bruker start_date (ekte UTC) — start_date_local har falsk
 * Z-suffiks som ville forskjøvet dagen i appen. Dato-KOLONNEN bruker den
 * lokale dagen, som er det kalenderen bryr seg om.
 * `xp: null` = ukreditert; appen gir XP på enheten etter pull.
 */
export function tilLoggRad(a, userId) {
  const id = `strava-${a.id}`;
  const oppdatert = new Date().toISOString();
  return {
    id,
    user_id: userId,
    dato: String(a.start_date_local || a.start_date || '').slice(0, 10),
    modalitet: null,
    data: {
      id,
      dato: a.start_date,
      bevegelse: SPORT_TIL_BEVEGELSE[a.sport_type] || 'custom',
      tittel: a.name || null,
      varighetMin: Math.max(1, Math.round((a.moving_time || a.elapsed_time || 60) / 60)),
      intensitet: intensitetFraPuls(a.average_heartrate),
      xp: null,
      kilde: 'strava',
      fullfort: true,
      distanseM: a.distance ? Math.round(a.distance) : null,
      snittPuls: a.average_heartrate ? Math.round(a.average_heartrate) : null,
      oppdatert,
    },
    oppdatert,
  };
}
