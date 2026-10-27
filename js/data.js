// Demodata for BD Brain-prototypen. ALT her er fiktivt: personer, kunder,
// e-poster, intranettsaker og nyheter. I en ekte løsning kommer dette fra
// koblingene (Microsoft Graph, intranett, nyhetskilder, ERP/CRM og Dario).
// Datoer er angitt som dager fra i dag (0 = i dag), så demoen alltid er fersk.

// Modulene i suiten. `kilde` beskriver hvor dataene ville kommet fra.
export const MODULER = [
  { id: 'brief', navn: 'Dagens brief', ikon: 'core', kilde: 'Alle koblinger', beskrivelse: 'Startsiden: talt oppsummering, visuell rapport og dagens prioriteringer.' },
  { id: 'epost', navn: 'E-post', ikon: 'mail', kilde: 'Outlook (Microsoft Graph)', beskrivelse: 'Leser innboksen, finner hva som krever svar og hvem som venter.' },
  { id: 'intranett', navn: 'Intranett', ikon: 'news', kilde: 'Intranett / SharePoint', beskrivelse: 'Det som er relevant for din rolle og region, ikke alt som publiseres.' },
  { id: 'nyheter', navn: 'Segmentnyheter', ikon: 'radar', kilde: 'Lokalaviser, anbud, byggeprosjekter', beskrivelse: 'Lokale nyheter og prosjekter i ditt segment og distrikt.' },
  { id: 'tilbud', navn: 'Tilbud (Dario)', ikon: 'doc', kilde: 'Dario', beskrivelse: 'Skriv tilbud med Dario sine verktøy, startet fra kunde, e-post eller prosjekt.' },
  { id: 'kunder', navn: 'Kunder', ikon: 'users', kilde: 'CRM / ERP', beskrivelse: 'Kunde-360: omsetning, åpne tilbud, siste kontakt og signaler.' },
  { id: 'kalender', navn: 'Kalender', ikon: 'cal', kilde: 'Outlook (Microsoft Graph)', beskrivelse: 'Dagens møter med kundekontekst ferdig forberedt.' },
  { id: 'team', navn: 'Team-pipeline', ikon: 'chart', kilde: 'CRM / ERP', beskrivelse: 'Lederflate: pipeline, tilbud som forfaller og hvem som trenger hjelp.' },
  { id: 'lager', navn: 'Lager og levering', ikon: 'box', kilde: 'ERP / logistikk', beskrivelse: 'Restordre, leveransestatus og avvik for dine kunder.' },
  { id: 'tilgang', navn: 'Tilgangstabell', ikon: 'key', kilde: 'Brain (intern)', beskrivelse: 'Tildel og deleger deler av suiten per person og rolle.' },
];

// Tilgangsnivåer i tabellen. Rekkefølgen er viktig: høyere indeks = mer tilgang.
export const NIVAAER = ['ingen', 'se', 'bruke', 'delegere'];

// Rolle-maler: utgangspunktet for hva hver rolle får. Individuelle unntak og
// tidsbegrensede delegeringer legges oppå (se tilgang.js).
// `fokus` vekter hva prioriteringsmotoren løfter fram for rollen.
export const ROLLER = {
  utesalg: {
    navn: 'Utesalg',
    fokus: { tilbud: 1.4, kunde: 1.3, prosjekt: 1.3, nyhet: 1.1, intern: 0.7, levering: 0.9, team: 0.3 },
    tilgang: { brief: 'bruke', epost: 'bruke', intranett: 'se', nyheter: 'bruke', tilbud: 'bruke', kunder: 'bruke', kalender: 'bruke', team: 'ingen', lager: 'se', tilgang: 'ingen' },
  },
  innesalg: {
    navn: 'Innesalg / kundesenter',
    fokus: { tilbud: 1.3, kunde: 1.2, prosjekt: 0.8, nyhet: 0.6, intern: 0.8, levering: 1.4, team: 0.3 },
    tilgang: { brief: 'bruke', epost: 'bruke', intranett: 'se', nyheter: 'se', tilbud: 'bruke', kunder: 'bruke', kalender: 'bruke', team: 'ingen', lager: 'bruke', tilgang: 'ingen' },
  },
  servicesenter: {
    navn: 'Servicesenterleder',
    fokus: { tilbud: 0.9, kunde: 1.1, prosjekt: 0.8, nyhet: 1.0, intern: 1.2, levering: 1.3, team: 1.0 },
    tilgang: { brief: 'bruke', epost: 'bruke', intranett: 'bruke', nyheter: 'bruke', tilbud: 'se', kunder: 'bruke', kalender: 'bruke', team: 'se', lager: 'bruke', tilgang: 'ingen' },
  },
  salgssjef: {
    navn: 'Salgssjef / regionleder',
    fokus: { tilbud: 1.0, kunde: 1.1, prosjekt: 1.2, nyhet: 1.0, intern: 1.1, levering: 0.7, team: 1.5 },
    tilgang: { brief: 'bruke', epost: 'bruke', intranett: 'bruke', nyheter: 'bruke', tilbud: 'se', kunder: 'bruke', kalender: 'bruke', team: 'delegere', lager: 'se', tilgang: 'bruke' },
  },
  produktspesialist: {
    navn: 'Produktspesialist',
    fokus: { tilbud: 1.2, kunde: 0.9, prosjekt: 1.3, nyhet: 1.2, intern: 0.9, levering: 0.8, team: 0.2 },
    tilgang: { brief: 'bruke', epost: 'bruke', intranett: 'se', nyheter: 'bruke', tilbud: 'bruke', kunder: 'se', kalender: 'bruke', team: 'ingen', lager: 'se', tilgang: 'ingen' },
  },
};

export const ANSATTE = [
  { id: 'ida', navn: 'Ida Fjeld', rolle: 'utesalg', region: 'Oslo Øst', segment: ['VVS-installatør', 'Bolig'], leder: 'tor' },
  { id: 'sander', navn: 'Sander Holm', rolle: 'utesalg', region: 'Romerike', segment: ['VA/Infrastruktur', 'Kommune'], leder: 'tor' },
  { id: 'mona', navn: 'Mona Lie', rolle: 'innesalg', region: 'Oslo', segment: ['VVS-installatør'], leder: 'tor' },
  { id: 'arne', navn: 'Arne Bakke', rolle: 'servicesenter', region: 'Bryn', segment: ['VVS-installatør', 'Industri'], leder: 'tor' },
  { id: 'tor', navn: 'Tor Vik', rolle: 'salgssjef', region: 'Øst', segment: ['VVS-installatør', 'VA/Infrastruktur', 'Bolig'], leder: null },
  { id: 'nina', navn: 'Nina Sæther', rolle: 'produktspesialist', region: 'Øst', segment: ['Varme/energi', 'Industri'], leder: 'tor' },
];

// Startverdier for individuelle unntak i tilgangstabellen (oppå rolle-malen).
export const UNNTAK = {
  sander: { team: 'se' },          // senior selger som følger regionens VA-prosjekter
  nina: { kunder: 'bruke' },
};

// Tidsbegrensede delegeringer: «Tor gir Sander Team-pipeline mens han er på ferie».
export const DELEGERINGER = [
  { fra: 'tor', til: 'sander', modul: 'team', nivaa: 'bruke', utloperOm: 10, grunn: 'Ferie uke 45–46' },
];

export const KUNDER = [
  { id: 'k1', navn: 'Østby Rør AS', segment: 'VVS-installatør', region: 'Oslo Øst', omsetning12m: 4_200_000, trend: -0.18, nokkel: true, eier: 'ida', sisteKontaktDager: 23 },
  { id: 'k2', navn: 'Lunde VVS', segment: 'VVS-installatør', region: 'Oslo Øst', omsetning12m: 1_150_000, trend: 0.07, nokkel: false, eier: 'ida', sisteKontaktDager: 6 },
  { id: 'k3', navn: 'Nordre Follo kommune', segment: 'Kommune', region: 'Follo', omsetning12m: 6_800_000, trend: 0.12, nokkel: true, eier: 'sander', sisteKontaktDager: 11 },
  { id: 'k4', navn: 'Brattli Entreprenør', segment: 'VA/Infrastruktur', region: 'Romerike', omsetning12m: 3_300_000, trend: 0.31, nokkel: true, eier: 'sander', sisteKontaktDager: 2 },
  { id: 'k5', navn: 'Kaldt & Varmt Teknikk', segment: 'Industri', region: 'Bryn', omsetning12m: 890_000, trend: -0.04, nokkel: false, eier: 'arne', sisteKontaktDager: 14 },
  { id: 'k6', navn: 'Solvang Boligbygg', segment: 'Bolig', region: 'Oslo Øst', omsetning12m: 2_400_000, trend: 0.02, nokkel: true, eier: 'ida', sisteKontaktDager: 4 },
];

// Alle innkommende signaler i én liste. Prioriteringsmotoren scorer disse.
// type: tilbud | kunde | prosjekt | nyhet | intern | levering | team
// for: hvem signalet gjelder (ansatt-id), '*' = alle, eller rolle:<id>
export const SIGNALER = [
  // E-post
  { id: 'e1', kilde: 'epost', type: 'tilbud', for: ['ida'], kunde: 'k1', tittel: 'Østby Rør ber om revidert tilbud på Hasle Park, blokk C', utdrag: '«Vi trenger oppdaterte priser på rør og armatur før torsdag – konkurrent har levert lavere.»', fristOm: 2, verdi: 640_000, flagg: ['svar-forventet', 'konkurrent'] },
  { id: 'e2', kilde: 'epost', type: 'kunde', for: ['ida'], kunde: 'k2', tittel: 'Lunde VVS: spørsmål om levering av varmepumper', utdrag: '«Kan dere bekrefte leveringsdato på ordre 4471?»', fristOm: 1, verdi: 85_000, flagg: ['svar-forventet'] },
  { id: 'e3', kilde: 'epost', type: 'intern', for: ['*'], tittel: 'HR: Husk å registrere timer for oktober', utdrag: 'Påminnelse om timeregistrering innen fredag.', fristOm: 3, verdi: 0, flagg: [] },
  { id: 'e4', kilde: 'epost', type: 'prosjekt', for: ['sander'], kunde: 'k3', tittel: 'Nordre Follo: forespørsel om rammeavtale VA-materiell 2027', utdrag: '«Vi ønsker et møte om ny rammeavtale før anbudet lyses ut i desember.»', fristOm: 5, verdi: 2_500_000, flagg: ['svar-forventet'] },
  { id: 'e5', kilde: 'epost', type: 'levering', for: ['mona', 'arne'], kunde: 'k5', tittel: 'Reklamasjon: feil dimensjon på ventiler, ordre 4512', utdrag: '«Montørene står – vi trenger riktig vare i dag.»', fristOm: 0, verdi: 42_000, flagg: ['svar-forventet', 'reklamasjon'] },
  { id: 'e6', kilde: 'epost', type: 'tilbud', for: ['mona'], kunde: 'k2', tittel: 'Lunde VVS: be om pris på 40 baderomspakker', utdrag: '«Prosjekt i Groruddalen, oppstart januar.»', fristOm: 3, verdi: 310_000, flagg: ['svar-forventet'] },
  { id: 'e7', kilde: 'epost', type: 'team', for: ['tor'], tittel: '3 tilbud over 500 000 kr forfaller denne uka i regionen', utdrag: 'Automatisk varsel fra CRM.', fristOm: 2, verdi: 1_700_000, flagg: [] },
  { id: 'e8', kilde: 'epost', type: 'prosjekt', for: ['nina'], tittel: 'Rådgiver ber om teknisk dokumentasjon på varmesentral', utdrag: '«Til forprosjekt for Skøyen skole – trenger FDV og dimensjonering.»', fristOm: 4, verdi: 900_000, flagg: ['svar-forventet'] },

  // Intranett
  { id: 'i1', kilde: 'intranett', type: 'intern', for: ['*'], tittel: 'Ny prisliste for rør og deler gjelder fra 1. november', utdrag: 'Prisjusteringer på kobber og PEX. Åpne tilbud med gyldighet over 1.11 bør sjekkes.', fristOm: 5, verdi: 0, flagg: ['påvirker-tilbud'] },
  { id: 'i2', kilde: 'intranett', type: 'intern', for: ['rolle:servicesenter', 'rolle:salgssjef'], tittel: 'Kampanjeuke for servicesentrene starter mandag', utdrag: 'Materiell sendes torsdag. Husk oppstilling i butikk.', fristOm: 6, verdi: 0, flagg: [] },
  { id: 'i3', kilde: 'intranett', type: 'intern', for: ['*'], tittel: 'Fagdag: ny byggteknisk forskrift for vannbåren varme', utdrag: 'Påmelding innen onsdag.', fristOm: 1, verdi: 0, flagg: [] },

  // Segmentnyheter (lokale/regionale)
  { id: 'n1', kilde: 'nyheter', type: 'nyhet', for: ['sander', 'tor'], tittel: 'Lillestrøm vedtar 180 mill. til vann og avløp i 2027', utdrag: 'Romerikes Blad: utskifting av ledningsnett i sentrum og på Skjetten.', fristOm: null, verdi: 0, flagg: ['mulighet'] },
  { id: 'n2', kilde: 'nyheter', type: 'prosjekt', for: ['ida', 'tor'], tittel: 'Solvang Boligbygg får rammetillatelse for 120 leiligheter på Haugerud', utdrag: 'Byggestart planlagt våren 2027. Eksisterende kunde.', kunde: 'k6', fristOm: null, verdi: 1_800_000, flagg: ['mulighet'] },
  { id: 'n3', kilde: 'nyheter', type: 'nyhet', for: ['nina', 'arne'], tittel: 'Enova øker støtten til varmepumper i næringsbygg', utdrag: 'Kan utløse etterspørsel fra industrikunder allerede i Q1.', fristOm: null, verdi: 0, flagg: ['mulighet'] },
  { id: 'n4', kilde: 'nyheter', type: 'nyhet', for: ['ida', 'mona'], tittel: 'Konkurrent åpner nytt utsalg på Alnabru', utdrag: 'Åpning i november med lanseringspriser mot installatører.', fristOm: null, verdi: 0, flagg: ['konkurrent'] },

  // CRM / ERP-signaler
  { id: 'c1', kilde: 'crm', type: 'kunde', for: ['ida'], kunde: 'k1', tittel: 'Østby Rør: omsetning ned 18 % siste 12 mnd, ingen kontakt på 23 dager', utdrag: 'Nøkkelkunde med fallende kjøp.', fristOm: null, verdi: 4_200_000, flagg: ['frafallsrisiko'] },
  { id: 'c2', kilde: 'crm', type: 'tilbud', for: ['sander'], kunde: 'k4', tittel: 'Tilbud T-2291 til Brattli Entreprenør utløper i morgen', utdrag: 'Kummer og rør til Kjeller-krysset. Ingen respons siden innsending.', fristOm: 1, verdi: 780_000, flagg: ['utløper'] },
  { id: 'c3', kilde: 'crm', type: 'team', for: ['tor'], tittel: 'Ida har 4 tilbud over 14 dager uten oppfølging', utdrag: 'Samlet verdi 1,1 mill.', fristOm: null, verdi: 1_100_000, flagg: [] },
  { id: 'l1', kilde: 'lager', type: 'levering', for: ['mona', 'ida'], kunde: 'k2', tittel: 'Ordre 4471 (varmepumper) forsinket 3 dager fra leverandør', utdrag: 'Ny ETA fredag. Kunden har spurt.', fristOm: 1, verdi: 85_000, flagg: ['avvik'] },
  { id: 'l2', kilde: 'lager', type: 'levering', for: ['arne'], tittel: '12 restordre på Bryn eldre enn 5 dager', utdrag: 'Mest småvarer – sjekk alternativer.', fristOm: 2, verdi: 0, flagg: ['avvik'] },
];

// Dagens kalender per ansatt (klokkeslett i dag).
export const KALENDER = {
  ida: [
    { tid: '08:00', varighet: 30, tittel: 'Salgsmøte region Øst', kunde: null },
    { tid: '10:30', varighet: 60, tittel: 'Byggeplassbesøk Hasle Park', kunde: 'k1' },
    { tid: '13:00', varighet: 45, tittel: 'Lunsj med Solvang Boligbygg', kunde: 'k6' },
  ],
  sander: [
    { tid: '09:00', varighet: 60, tittel: 'Befaring Kjeller-krysset', kunde: 'k4' },
    { tid: '14:00', varighet: 30, tittel: 'Teams: VA-produktgruppe', kunde: null },
  ],
  mona: [{ tid: '08:00', varighet: 15, tittel: 'Morgenmøte kundesenter', kunde: null }],
  arne: [
    { tid: '07:30', varighet: 15, tittel: 'Morgenmøte servicesenter', kunde: null },
    { tid: '11:00', varighet: 30, tittel: 'Kaldt & Varmt: reklamasjon', kunde: 'k5' },
  ],
  tor: [
    { tid: '08:00', varighet: 30, tittel: 'Salgsmøte region Øst', kunde: null },
    { tid: '12:00', varighet: 60, tittel: '1:1 med Ida', kunde: null },
    { tid: '15:00', varighet: 60, tittel: 'Regionledermøte', kunde: null },
  ],
  nina: [{ tid: '10:00', varighet: 90, tittel: 'Prosjektering med rådgiver, Skøyen skole', kunde: null }],
};

// Pipeline per trinn (beløp i kr), for den visuelle rapporten.
export const PIPELINE = {
  ida: { Forespørsel: 900_000, 'Tilbud sendt': 2_100_000, Forhandling: 640_000, Vunnet: 1_300_000 },
  sander: { Forespørsel: 2_500_000, 'Tilbud sendt': 1_400_000, Forhandling: 780_000, Vunnet: 2_200_000 },
  mona: { Forespørsel: 310_000, 'Tilbud sendt': 420_000, Forhandling: 0, Vunnet: 380_000 },
  arne: { Forespørsel: 150_000, 'Tilbud sendt': 260_000, Forhandling: 90_000, Vunnet: 610_000 },
  tor: { Forespørsel: 4_100_000, 'Tilbud sendt': 5_600_000, Forhandling: 2_300_000, Vunnet: 5_900_000 },
  nina: { Forespørsel: 900_000, 'Tilbud sendt': 450_000, Forhandling: 0, Vunnet: 300_000 },
};
