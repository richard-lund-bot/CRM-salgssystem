# -*- coding: utf-8 -*-
# Genererer js/i18n.js: NO→EN-ordbok (nøkler trimmet) + runtime (t + DOM-oversetter).
# Skriver til js/i18n.js som standard; gi en filsti som argument for å skrive et
# annet sted (brukes av scripts/sjekk-i18n.mjs for å sjekke drift uten å røre
# den committede fila).
import json
import os
import sys

# NO (trimmet) → EN. Norsk er kilde; manglende oppslag faller tilbake til norsk.
EN = {
 # Øvelsesoppslag
 'Søk øvelse…': 'Search exercise…', 'Bibliotek': 'Library', 'Alle': 'All',
 'øvelser': 'exercises', 'Ingen treff.': 'No matches.', 'Filtrer': 'Filter',
 # Bibliotek/økt-filtre og -kort
 'Viderekommen': 'Intermediate', 'Erfaren': 'Advanced', 'Uten utstyr': 'No equipment',
 'Rolig': 'Easy', 'Intens': 'Intense', 'Lett': 'Light', 'Moderat': 'Moderate',
 'Hard': 'Hard', 'Maks': 'Max', 'Uten utstyr.': 'No equipment.',
 'Velg en økt som passer dagen din.': 'Choose a session that fits your day.',
 'Basert på': 'Based on', 'Start': 'Start', 'Planlegg': 'Plan', 'Logg': 'Log', 'min': 'min',
 # Navigasjon / faner
 'Hjem': 'Home', 'Trening': 'Training', 'Profil': 'Profile',
 'Treningsbibliotek': 'Training Library', 'Lær': 'Learn', 'Aktivitet': 'Activity',
 'Meny og innstillinger': 'Menu and settings', 'Meny': 'Menu',
 'Innstillinger': 'Settings', 'Varsler': 'Notifications', 'Mosjonskalender': 'Activity calendar',
 # Ukedager
 'Man': 'Mon', 'Tir': 'Tue', 'Ons': 'Wed', 'Tor': 'Thu', 'Fre': 'Fri', 'Lør': 'Sat', 'Søn': 'Sun',
 'MAN': 'MON', 'TIR': 'TUE', 'ONS': 'WED', 'TOR': 'THU', 'FRE': 'FRI', 'LØR': 'SAT', 'SØN': 'SUN',
 'NÅ': 'NOW', 'nå': 'now', 'i går': 'yesterday', 'I går': 'Yesterday', 'I dag': 'Today',
 'Siste 7 dager': 'Last 7 days', 'Tidligere': 'Earlier',
 # Bevegelsestyper / kategorier
 'Tøying': 'Stretching', 'Gåtur': 'Walk', 'Løp': 'Run', 'Løping': 'Running', 'Knebøy': 'Squat',
 'Styrke': 'Strength', 'Sykkel': 'Bike', 'Yoga': 'Yoga', 'Sport': 'Sport', 'Sport og lek': 'Sport & play',
 'Svømming': 'Swimming', 'Skøyter': 'Skating', 'Bæring': 'Carry', 'Overrask meg': 'Surprise me',
 # Feed / UI
 'Nytt nå': 'New now', 'Fakta eller myte': 'Fact or Myth', 'Riktig rekkefølge': 'Order the Events',
 'Sjekk rekkefølgen': 'Check the order', 'Neste spørsmål': 'Next question', 'Til spørsmålene': 'To the questions',
 'Øv på nytt': 'Practice again', 'Godt forsøk!': 'Good try!', 'Ikke helt — prøv igjen.': 'Not quite — try again.',
 'Prøv igjen': 'Try again', 'Språk': 'Language',
 'Lagret — finn det igjen under «Lagret» i For deg-menyen': 'Saved — find it again under “Saved” in the For you menu',
 'Trykk bokmerket på et innlegg for å ta vare på det her.': 'Tap the bookmark on a post to keep it here.',
 'Kopiert til utklippstavlen': 'Copied to clipboard', 'Kunne ikke laste feeden': 'Could not load the feed',
 'Kommentarer': 'Comments', 'Skriv en kommentar…': 'Write a comment…', 'Del': 'Share', 'Lagre': 'Save',
 # Min dag / Trening-dashbord
 'Vi anbefaler': 'We recommend', 'Start økt': 'Start session', 'Start økta': 'Start the session',
 'Åpne plan': 'Open plan', 'Planlagt i dag': 'Planned today', 'Se økter': 'See sessions',
 'Velg bevegelse': 'Choose movement', 'Vis alle': 'Show all', 'Start når det passer deg': 'Start whenever it suits you',
 'Minutter i dag': 'Minutes today', 'Aktive dager': 'Active days', 'Dager på rad': 'Days in a row',
 'God morgen': 'Good morning', 'God dag': 'Good day', 'God kveld': 'Good evening', 'God natt': 'Good night',
 'Hvorfor denne økta?': 'Why this session?',
 # Profil / merker
 'Vanene dine, treningen din og merkene dine — samlet.': 'Your habits, your training and your badges — together.',
 'Milepæler': 'Milestones', 'Store øyeblikk': 'Big moments', 'Prøv noe nytt': 'Try something new',
 'Månedsrytme': 'Monthly rhythm', 'Døgnet rundt': 'Around the clock', 'Oppnådd': 'Achieved',
 'På vei': 'On the way', 'På vei mot': 'On the way to', 'Streak økt': 'Streak increased',
 'Aktivitet & historikk': 'Activity & history', 'Styrke & fremgang': 'Strength & progress',
 'Øvelsesoppslag': 'Exercise lookup',
 # Aktivitet / historikk
 'Alt du har beveget deg — samlet og talt.': 'Everything you have moved — gathered and counted.',
 'Historikk': 'History', 'Prestasjoner': 'Achievements', 'Ingen bevegelser ennå': 'No movement yet',
 'Tonnasje per økt': 'Tonnage per session', 'Test deg selv': 'Test yourself',
 'Vekt, sett og fremgang — samlet.': 'Weight, sets and progress — together.',
 'Rekorder (est. 1RM)': 'Records (est. 1RM)', 'Volum per muskelgruppe': 'Volume per muscle group',
 'Ingen løft logget ennå': 'No lifts logged yet', 'Finn en styrkeøkt': 'Find a strength session',
 # Innstillinger
 'Ukemål': 'Weekly goal', 'Ukemål & tid': 'Weekly goal & time', 'Treningspreferanser': 'Training preferences',
 'Tema': 'Theme', 'Lyd og vibrasjon': 'Sound and vibration', 'Lyd': 'Sound', 'Vibrasjon': 'Vibration',
 'Konto': 'Account', 'Faresone': 'Danger zone', 'Full nullstilling': 'Full reset', 'Logg ut': 'Log out',
 'Synk nå': 'Sync now', 'Skysync': 'Cloud sync', 'Admin': 'Admin', 'Admin-modus': 'Admin mode',
 'Skjul former du ikke vil ha, og løft favorittene — det styrer anbefalingene dine.':
   'Hide the forms you don’t want and boost your favourites — that steers your recommendations.',
 'Små pling og vibrasjoner i feiringene og øktspilleren.':
   'Little chimes and vibrations in the celebrations and the session player.',
 'Navnet brukes i hilsenen på Min dag.': 'The name is used in the greeting on My day.',
 'Ta profilen på nytt': 'Redo the profile', 'Send innloggingslenke': 'Send login link',
 'Slette ALT — profil, logg, streaks og historikk? Kan ikke angres.':
   'Delete EVERYTHING — profile, log, streaks and history? Cannot be undone.',
 'Innstillinger og om appen.': 'Settings and about the app.', 'Om Takt': 'About Takt',
 'Admin-modus på': 'Admin mode on', 'Ser appen som et vanlig medlem': 'Viewing the app as a regular member',
 'Tilbake til normal': 'Back to normal', 'Nøytral': 'Neutral', 'Færre': 'Fewer', 'Høy': 'High',
 'Ukemål nådd': 'Weekly goal reached',
 # Varsler
 'Ingen varsler ennå': 'No notifications yet',
 'Nivå': 'Level', 'nivå': 'level',
 # Beveg / hurtigstart / logg
 'Hurtigstart med timer.': 'Quick start with timer.', 'Fri økt med timer': 'Free session with timer',
 'Logg noe du alt har gjort': 'Log something you’ve already done', 'Klar til å bevege deg': 'Ready to move',
 'Klar når du er.': 'Ready when you are.', 'Én liten bevegelse er nok. Klar når du er.': 'One small movement is enough. Ready when you are.',
 'Én liten bevegelse er nok til å starte.': 'One small movement is enough to start.',
 'Avslutte uten å lagre? Tida forkastes.': 'Quit without saving? The time is discarded.',
 'Avslutte økta? Du kan starte igjen når du vil.': 'Quit the session? You can start again whenever you like.',
 'Til Min dag': 'To My day', 'Bra økt!': 'Great session!', 'Fullført!': 'Completed!', 'Fullført': 'Completed',
 'Jeg gjorde det ✓': 'I did it ✓', 'Ikke nå': 'Not now', 'Når?': 'When?',
 'Logg en «Test deg selv»': 'Log a “Test yourself”',
 # Øktspiller / kjør
 'Neste øvelse': 'Next exercise', 'Bytt øvelse': 'Swap exercise', 'Fullfør sett': 'Complete set',
 'Fullfør': 'Finish', 'Slik gjør du': 'How to do it', 'Se øvelsen': 'See the exercise', 'Se øvelse': 'See exercise',
 'Fjern økt': 'Remove session', 'forløpt tid': 'elapsed time', 'Fri økt': 'Free session',
 'Ingen øvelsesdetaljer.': 'No exercise details.',
 'Ingen detaljert beskrivelse ennå — gjør øvelsen rolig og kontrollert, i ditt tempo.':
   'No detailed description yet — do the exercise calmly and controlled, at your own pace.',
 # Øktbibliotek
 'Øktbiblioteket': 'The session library', 'Øktsamler': 'Session collector', 'Vanlig øktlengde': 'Typical session length',
 'Gåturbibliotek': 'Walk library', 'Løpebibliotek': 'Run library', 'Tøyebibliotek': 'Stretch library',
 'Rask halvtime til fots': 'Quick half hour on foot', 'Kort intervalløkt': 'Short interval session',
 'Rolig løpetur': 'Easy run', 'Langøkta': 'The long session',
 # Lær / artikler / stier
 'Et lite kompendium — les når det passer.': 'A little compendium — read whenever it suits.',
 'Favoritter': 'Favourites', 'Alle': 'All', 'Grunnlaget': 'The foundation', 'Les mer': 'Read more',
 'Ingen favoritter ennå': 'No favourites yet', 'Mestre nye øvelser': 'Master new exercises',
 'Ferdighetsløp': 'Skill journey', 'Ferdighetsnivå': 'Skill level',
 'Gjenstår å lære i Lær': 'Left to learn in Learn', 'Øv igjen': 'Practice again', 'Øvelse': 'Exercise',
 'Teori · les først': 'Theory · read first', 'Teori · fullført': 'Theory · completed',
 'Teori · lås opp øvelsene': 'Theory · unlock the exercises', 'Teori fullført!': 'Theory completed!',
 'Teknikk lært!': 'Technique learned!', 'Planlegg forsøket': 'Plan the attempt',
 'Enhet fullført': 'Unit completed', 'Seksjon fullført': 'Section completed', 'Kompendium fullført': 'Compendium completed',
 'Låst økt': 'Locked session', 'Låst opp:': 'Unlocked:',
 # Auth / medlem
 'Har du ikke en konto?': 'Don’t have an account?', 'Godt å se deg igjen.': 'Good to see you again.',
 'Passordet må ha minst 6 tegn.': 'The password must be at least 6 characters.',
 'Feil e-post eller passord.': 'Wrong email or password.', 'Fyll inn e-post og passord.': 'Fill in email and password.',
 'Fyll inn navn, e-post og passord.': 'Fill in name, email and password.',
 'Denne e-posten er allerede registrert. Prøv å logge inn.': 'This email is already registered. Try logging in.',
 'Bekreft e-posten din først — se innboksen.': 'Confirm your email first — check your inbox.',
 'For mange forsøk. Vent litt og prøv igjen.': 'Too many attempts. Wait a bit and try again.',
 'Noe gikk galt. Prøv igjen.': 'Something went wrong. Try again.',
 'Skriv inn e-posten din over, så sender vi en lenke.': 'Enter your email above and we’ll send a link.',
 'Logget inn som': 'Logged in as',
 # Strava
 'Koble til Strava': 'Connect to Strava', 'Koblet på klokka': 'Connected to your watch',
 'Fikk ikke hentet Strava-status.': 'Could not fetch Strava status.', 'Tilkoblingen feilet — prøv igjen.': 'The connection failed — try again.',
 # Kroppskart / muskler
 'Baklår': 'Hamstrings', 'Lår': 'Thighs', 'Framside lår': 'Quads', 'Innside lår': 'Inner thighs',
 'Hoftebøyere': 'Hip flexors', 'Knær': 'Knees', 'Håndledd': 'Wrists', 'Øvre rygg': 'Upper back',
 'Se hvor kroppen trenger ro eller er klar for belastning': 'See where the body needs rest or is ready for load',
 'Kroppskart som viser hvor restituert hver muskelgruppe er': 'Body map showing how recovered each muscle group is',
 'Balansert helkroppsøkt passer fint i dag.': 'A balanced full-body session fits well today.',
 'Beina trenger hvile — ta en overkroppsøkt.': 'The legs need rest — do an upper-body session.',
 'Overkroppen restituerer — kjør bein i dag.': 'The upper body is recovering — train legs today.',
 'Du er frisk og klar — kjør på med en hard økt.': 'You’re fresh and ready — go for a hard session.',
 'Ta en rolig kjerne- og mobilitetsøkt.': 'Do an easy core and mobility session.',
 'Kroppen er godt brukt — kjør rolig mobilitet i dag.': 'The body is well used — do easy mobility today.',
 # Onboarding
 'Hvordan liker du å bevege deg?': 'How do you like to move?',
 'Bevegelse kan være hva som helst du liker. Velg inntil 4.': 'Movement can be anything you like. Choose up to 4.',
 'Alt kan justeres senere i innstillinger.': 'Everything can be adjusted later in settings.',
 'Velg inntil 3 — trykk i rekkefølge, viktigst først.': 'Choose up to 3 — tap in order, most important first.',
 'F.eks. hagearbeid, leking med barna…': 'E.g. gardening, playing with the kids…',
 'Et vennlig mål for rytmen din. Livet går foran — ingenting «ryker».': 'A friendly goal for your rhythm. Life comes first — nothing “breaks”.',
 # Om
 'Takt — Daglige valg, gode år.': 'Takt — Daily choices, good years.',
 'Daglige valg, gode år': 'Daily choices, good years',
 # Diverse tagger
 'høy impact': 'high impact', 'per side': 'per side', 'Øvet': 'Intermediate', 'Nybegynner': 'Beginner', 'Avansert': 'Advanced',
 'Test': 'Test',
 # Feed-chrome
 'For deg': 'For you', 'Lagret': 'Saved', 'Lik': 'Like', 'Laster feeden…': 'Loading the feed…',
 'Ingenting her ennå': 'Nothing here yet', 'Ingen innlegg i denne kategorien.': 'No posts in this category.',
 'Kommentarer kommer snart': 'Comments coming soon', 'Quiz': 'Quiz', 'Koble begrepene': 'Match the Terms',
 'Hva skjedde?': 'What happened?', 'Fyll hullet': 'Fill the Gap', 'Finn parene': 'Match the Pairs',
 'Velg et begrep til venstre, så betydningen til høyre.': 'Pick a term on the left, then its meaning on the right.',
 'Koble hvert begrep til betydningen sin.': 'Match each term to its meaning.',
 'Snu to og to kort — finn parene som hører sammen.': 'Flip two cards at a time — find the matching pairs.',
 'Riktig!': 'Correct!', 'Kilde': 'Source', 'Fakta': 'Fact', 'Myte': 'Myth', 'trekk': 'moves',
 'Ingen varsler ennå': 'No notifications yet',
 'Fullfør en økt eller spill i feeden, så dukker det opp her.': 'Complete a session or play in the feed and it shows up here.',
 # Dedikert innleggsside
 'Innlegg': 'Post', 'Spill innlegget': 'Play the post', 'Tilbake': 'Back',
 # Blue-zones-pilarer (interesse-arket) + arktekst
 'Bevegelse': 'Movement', 'Kosthold': 'Nutrition', 'Tilhørighet': 'Belonging',
 'Ro': 'Calm', 'Mening': 'Meaning', 'Nysgjerrig': 'Curious',
 'Hva vil du ha mer av?': 'What do you want more of?',
 'Velg livsområdene du vil se mer av i feeden. Du kan endre når som helst.':
   'Choose the areas of life you want more of in the feed. You can change this anytime.',
 # Kosthold-pilaren (Fase 3) — daglige blue-zones-vaner
 'Grønnsaker': 'Vegetables', 'Belgvekster': 'Legumes', 'Fullkorn': 'Whole grains',
 'Fisk': 'Fish', 'Måtehold': 'Moderation',
 'Mest planter. Litt fisk. Måtehold.': 'Mostly plants. Some fish. Moderation.',
 'Gode valg i dag': 'Good choices today', 'gode valg i dag': 'good choices today',
 'dager på rad': 'days in a row', 'aktive dager': 'active days',
 'Blue zones-kjøkkenet: mest planter, litt fisk, og stopp når du er rundt 80 % mett.':
   'The blue zones kitchen: mostly plants, some fish, and stop when you are about 80% full.',
 'Dagens måltider': 'Today’s meals',
 'Hva spiste du i dag? (valgfritt)': 'What did you eat today? (optional)',
 'Lær mer om blue zones-kosthold': 'Learn more about blue zones eating',
 # Kosthold-merker
 'Første gode valg': 'First good choice', 'Ditt første blue-zones-valg': 'Your first blue zones choice',
 'God uke på kjøkkenet': 'A good week in the kitchen', 'Gode valg 7 dager': 'Good choices for 7 days',
 'Tre dager på rad': 'Three days in a row', 'Kosthold-streak 3 dager': 'Nutrition streak of 3 days',
 'To uker på rad': 'Two weeks in a row', 'Kosthold-streak 14 dager': 'Nutrition streak of 14 days',
 'Vanen sitter': 'The habit sticks', 'Gode valg 30 dager': 'Good choices for 30 days',
 # Faneetiketter (5 pilarer) + Ro/Fellesskap-flatene
 'Feed': 'Feed', 'Mat': 'Food', 'Sosialt': 'Social', 'Fellesskap': 'Belonging', 'fellesskap': 'belonging',
 # Fellesskap (pilar 4) — hjem, logg, krets, kom i gang
 'Små øyeblikk sammen gir mer mening, energi og glede.': 'Small moments together bring more meaning, energy and joy.',
 'Logg dagens kontakt': 'Log today’s connection', 'Hva gjorde du i dag?': 'What did you do today?',
 'Se fremgang': 'See progress', 'Annet': 'Other', 'Vis logg': 'Show log', 'Logget': 'Logged',
 'Ta vare på noen': 'Reach out to someone', 'Se alle': 'See all', 'Legg til': 'Add',
 'Legg til en person': 'Add a person', 'Legg til noen du vil holde kontakt med': 'Add someone you want to stay in touch with',
 'Din krets er de få du bryr deg om — som en «moai». Appen minner deg mykt på hvem det har gått en stund med.':
   'Your circle is the few you care about — like a “moai”. The app gently reminds you who it’s been a while with.',
 'Kom i gang': 'Get started', 'Skriv en takk': 'Write a thank-you', 'En liten hilsen varmer.': 'A little greeting warms.',
 'Inviter til noe': 'Invite to something', 'Planlegg noe hyggelig.': 'Plan something nice.',
 'Gi et kompliment': 'Give a compliment', 'Det løfter dagen.': 'It lifts the day.',
 'Finn fellesskap i nærheten': 'Find community near you', 'Finn fellesskap': 'Find community',
 'Din krets': 'Your circle', 'De få du vil holde varmt — som en «moai».': 'The few you want to keep close — like a “moai”.',
 'Ingen i kretsen ennå': 'No one in your circle yet',
 'Legg til noen få du vil holde kontakt med. Alt bor på telefonen din — vi henter aldri kontaktlista.':
   'Add a few people you want to stay in touch with. Everything stays on your phone — we never read your contacts.',
 'Rediger': 'Edit', 'Bilde': 'Picture', 'Relasjon': 'Relationship', 'Fjern': 'Remove',
 'Hvordan holder dere kontakt?': 'How do you keep in touch?', 'Ring': 'Call', 'Send melding': 'Send message', 'Inviter': 'Invite',
 'Familie': 'Family', 'Venn': 'Friend', 'Nabo': 'Neighbour', 'Kollega': 'Colleague', 'Partner': 'Partner',
 'Nummeret lagres bare på telefonen din, og brukes til å åpne ringing/melding.':
   'The number is stored only on your phone, and used to open calling/messaging.',
 'Lagt til i kretsen': 'Added to your circle', 'Skriv inn et navn': 'Enter a name',
 'Logg annen kontakt': 'Log other connection', 'Skriv kort hva du gjorde — alt som er ekte kontakt teller.':
   'Write briefly what you did — any real connection counts.', 'Logg kontakt': 'Log connection', 'Skriv noe kort først': 'Write something short first',
 'Del': 'Share', 'Marker som gjort': 'Mark as done', 'Kopiert — lim inn i en melding': 'Copied — paste into a message',
 'Fremgang': 'Progress', 'Rytmen din — uten press. Én ekte kontakt om dagen er nok.':
   'Your rhythm — no pressure. One real connection a day is enough.',
 'dager med kontakt (uke)': 'days with contact (week)', 'i kretsen sist uke': 'in your circle last week',
 'Denne uka': 'This week', 'Verdt et dult': 'Worth a nudge', 'Logg': 'Log',
 'Fin rytme! Du har vært i kontakt med hele kretsen nylig.': 'Nice rhythm! You’ve been in touch with your whole circle recently.',
 'Ingen kontakt logget ennå. Logg dagens på Fellesskap-siden.': 'No connection logged yet. Log today’s on the Belonging page.',
 'Å bli med i noe fast er en av de sikreste veiene ut av ensomhet. Her er ekte, landsdekkende steder å starte.':
   'Joining something regular is one of the surest ways out of loneliness. Here are real, nationwide places to start.',
 'En stund siden sist.': 'A while since last time.', 'Lenge siden sist.': 'Long since last time.',
 'Flere uker siden sist.': 'Several weeks since last time.', 'Ta kontakt for første gang.': 'Reach out for the first time.',
 'Snakket i går.': 'Talked yesterday.', 'Dere snakket i dag.': 'You talked today.',
 'Pust. Senk skuldrene. Vær her.': 'Breathe. Drop your shoulders. Be here.',
 'Pust deg rolig': 'Breathe yourself calm',
 # Ro (pilar 3) — daglige ro-vaner, mikroøkter, kveldsøkter
 'Små pauser roer systemet.': 'Small pauses calm the system.',
 'Velg det som passet for deg i dag.': 'Pick whatever suited you today.',
 'Pustet rolig': 'Breathed calmly', 'Var uten skjerm': 'Was screen-free', 'Ba / mediterte': 'Prayed / meditated',
 'Tok en liten pause': 'Took a short break', 'Var ute i naturen': 'Was out in nature',
 'Se logg': 'See log', 'Start på 2 minutter': 'Start with 2 minutes', 'For kvelden': 'For the evening',
 '1 min pust': '1 min breathing', 'Kort kroppsskann': 'Short body scan', 'Stillhet': 'Stillness',
 'Pust inn': 'Breathe in', 'Pust ut': 'Breathe out', 'Ferdig': 'Done', 'Godt gjort — det teller.': 'Well done — it counts.',
 'Ro-logg': 'Calm log', 'Rytmen din — uten press. Én liten pause om dagen er nok.':
   'Your rhythm — no pressure. One small pause a day is enough.',
 'rolige dager (uke)': 'calm days (week)', 'valg i dag': 'choices today', 'med ro. Én liten pause er nok.': 'with calm. One small pause is enough.',
 'Ingen rolige valg logget ennå. Huk av på Ro-siden.': 'No calm choices logged yet. Tick them off on the Calm page.',
 'Pust inn gjennom nesen. Slipp et langt, rolig sukk ut.': 'Breathe in through your nose. Let out a long, calm sigh.',
 'Merk kroppen fra tå til isse. Slipp spenning der du finner den.': 'Notice your body from toe to crown. Release tension where you find it.',
 'Bare vær. La tankene komme og gå — du trenger ikke gjøre noe.': 'Just be. Let thoughts come and go — you don’t have to do anything.',
 'Noen minutter bevisst pust senker stress og roer nervesystemet. Velg en øvelse — den spilles med rolig tempo og lyd.':
   'A few minutes of conscious breathing lowers stress and calms the nervous system. Pick an exercise — it plays at a calm pace with sound.',
 'Vi lever lengre sammen.': 'We live longer together.',
 'Fellesskap kommer snart': 'Community coming soon',
 'Å være sosial ansikt til ansikt er noe av det som betyr mest for et langt, godt liv. Her kommer ekte møteplasser i nærheten og små dytt til å møtes — vi bygger det stein for stein.':
   'Being social face to face is one of the things that matters most for a long, good life. Real local gatherings and gentle nudges to meet up are coming — we are building it stone by stone.',
 'Les om hvorfor tilhørighet betyr mest': 'Read why belonging matters most',
 # Sosialt-pilaren (Fase 5)
 'Møtte noen': 'Met someone', 'Ringte noen': 'Called someone', 'Ringte en du er glad i': 'Called a loved one',
 'Delte et måltid': 'Shared a meal', 'Ble med på noe': 'Joined something',
 'Tilhørighet holder deg frisk': 'Belonging keeps you well',
 'Finn møteplasser i nærheten': 'Find gathering places near you',
 'Laster…': 'Loading…',
 'På Okinawa kalles det «moai» — en fast gjeng du hører til hele livet. Sterke bånd til andre er blant de kraftigste faktorene for et langt liv. Huk av de gode sosiale valgene dine i dag.':
   'On Okinawa they call it “moai” — a fixed group you belong to for life. Strong ties to others are among the most powerful factors for a long life. Tick off your good social choices today.',
 # Sosialt-merker
 'Første møte': 'First connection', 'Ditt første sosiale valg': 'Your first social choice',
 'Sosial uke': 'A social week', 'Sosiale valg 7 dager': 'Social choices for 7 days',
 'Sosial streak 3 dager': 'Social streak of 3 days', 'Fast moai': 'A steady moai',
 'Sosial streak 14 dager': 'Social streak of 14 days', 'Sosiale valg 30 dager': 'Social choices for 30 days',
 # Mening-pilaren (Fase 6) — «Mitt hvorfor» + ukens refleksjon
 'Mitt hvorfor': 'My why',
 'På Okinawa kaller de det ikigai — grunnen til at du står opp om morgenen. Et tydelig hvorfor er blant de sterkeste kreftene for et langt, godt liv. De små valgene dine peker hit.':
   'On Okinawa they call it ikigai — the reason you get up in the morning. A clear why is among the strongest forces for a long, good life. Your small choices point here.',
 'Skriv ned grunnen din — det du kommer tilbake til når dagen er tung.':
   'Write down your reason — the one you come back to when the day is hard.',
 'Skriv ditt hvorfor': 'Write your why', 'Legg til et hvorfor til': 'Add another why',
 'La deg inspirere av et spørsmål — eller skriv helt fritt.': 'Let a question inspire you — or write freely.',
 'Jeg vil …': 'I want to …', 'Legg til': 'Add',
 'Skriv noe kort først': 'Write something short first', 'Lagt til': 'Added',
 'Du har nok hvorfor for nå — fjern ett for å bytte.': 'You have enough whys for now — remove one to swap.',
 'Hvem vil du være der for?': 'Who do you want to be there for?',
 'Hva vil du fortsatt klare om 20 år?': 'What do you still want to be able to do in 20 years?',
 'Hva gir mening å bidra med?': 'What feels meaningful to contribute?',
 'Hva vil du ha mer av i livet?': 'What do you want more of in life?',
 'Ukens refleksjon': "This week's reflection",
 'Ett rolig øyeblikk i uka — ikke en oppgave. Hva av det du gjorde betydde noe?':
   'One calm moment in the week — not a task. What of what you did mattered?',
 'Hva føltes mest meningsfullt denne uka?': 'What felt most meaningful this week?',
 'Lagre refleksjonen': 'Save the reflection', 'Oppdater': 'Update',
 'Refleksjon lagret': 'Reflection saved', 'Meningsdagbok': 'Meaning journal',
 'Ett steg nærmere': 'One step closer', 'Uke fra': 'Week of', 'Fjern': 'Remove',
 # Utforsk (M53) + Fargemodus
 'Utforsk': 'Explore', 'Kunnskap og inspirasjon for gode år.': 'Knowledge and inspiration for good years.',
 'Les etter pilar': 'Read by pillar', 'Kunnskap & inspirasjon': 'Knowledge & inspiration',
 'Dagens feed': "Today's feed", 'Spillbar kunnskap — ett kort av gangen': 'Playable knowledge — one card at a time',
 'Utforsk kunnskap & inspirasjon': 'Explore knowledge & inspiration', 'Les': 'Read',
 'Kunne ikke laste akkurat nå.': 'Could not load right now.',
 'Fargemodus': 'Colour mode',
 'Lys papir eller skogsgrønn mørk modus. «Auto» følger systemet ditt.':
   'Light paper or deep-green dark mode. “Auto” follows your system.',
 'Auto': 'Auto', 'Lys': 'Light', 'Mørk': 'Dark',
 # Pilar-hero (M53) — samme skall som Hjem
 'Mest planter. Litt fisk.': 'Mostly plants. Some fish.',
 'Måtehold — stopp ved 80 %.': 'Moderation — stop at 80%.',
 'Vi lever lengre sammen.': 'We live longer together.',
 'Tilhørighet holder deg frisk.': 'Belonging keeps you well.',
 'Pust. Senk skuldrene.': 'Breathe. Drop your shoulders.',
 'Vær her — noen rolige minutter.': 'Be here — a few calm minutes.',
 'Beveg deg litt hver dag.': 'Move a little every day.',
 'Små økter teller.': 'Small sessions count.',
 'av dagsmålet': 'of daily goal', 'gode valg i dag': 'good choices today',
}

# Streak-systemet (M54) — nøktern, selvforklarende tekst (ingen sjargong)
EN.update({
 'Ferdig i dag': 'Done today', 'Én rolig økt': 'One calm session',
 'Ett sosialt valg': 'One social choice', 'rolige økter i dag': 'calm sessions today',
 'Hele dager': 'Complete days',
 'Første hele dag': 'First complete day', 'Alle fire vanene på samme dag': 'All four habits on the same day',
 '3 hele dager': '3 complete days', 'Alle fire vanene 3 dager på rad': 'All four habits 3 days in a row',
 '7 hele dager': '7 complete days', 'Alle fire vanene 7 dager på rad': 'All four habits 7 days in a row',
 '14 hele dager': '14 complete days', 'Alle fire vanene 14 dager på rad': 'All four habits 14 days in a row',
 '30 hele dager': '30 complete days', 'Alle fire vanene 30 dager på rad': 'All four habits 30 days in a row',
 'Alle fire i dag': 'All four today', 'Alle fire vaner i dag.': 'All four habits today.',
 'Bevegelse, mat, ro og sosialt — alt på plass i dag.': 'Movement, food, calm and social — all in place today.',
 'Streak': 'Streak', 'Godt valg': 'Good choice', 'Alt teller.': 'Everything counts.',
 'Fire gode valg. Én dag i takt.': 'Four good choices. One day in rhythm.',
 'Les etter pilar': 'Read by pillar',
 'Velkommen tilbake.': 'Welcome back.', 'Fortsett': 'Continue',
})

# Kompendium/merke-tekster (lengre) — legg til
EN.update({
 'Din aller første bevegelse': 'Your very first movement',
 'Du møtte opp i dag. Én dag av gangen — det er slik det bygges.': 'You showed up today. One day at a time — that’s how it’s built.',
 'Vi heier på deg hele veien.': 'We’re cheering you on all the way.',
 'Ti rolige reps slår null reps. Hver gang.': 'Ten easy reps beat zero reps. Every time.',
 'Små steg i dag. Sterkere rytme i morgen.': 'Small steps today. Stronger rhythm tomorrow.',
 'Hver bevegelse teller — også de små.': 'Every movement counts — even the small ones.',
 'Første steg': 'First step', 'Første rekord': 'First record', 'Første time': 'First hour', 'Første trinn': 'First step',
 'Tre på rad': 'Three in a row', '3 dager på rad': '3 days in a row', '7 dager på rad': '7 days in a row',
 '14 dager på rad': '14 days in a row', '30 dager på rad': '30 days in a row', 'En hel måned': 'A whole month',
 'dager på rad': 'days in a row', 'dag på rad': 'day in a row',
 'Prøvd 2 ulike bevegelsestyper': 'Tried 2 different movement types',
 'Prøvd 4 ulike bevegelsestyper': 'Tried 4 different movement types',
 'Prøvd 7 ulike bevegelsestyper': 'Tried 7 different movement types',
 'Prøvd 10 ulike bevegelsestyper': 'Tried 10 different movement types',
 'Testet og målt': 'Tested and measured', 'Første økt importert fra Strava': 'First session imported from Strava',
 'Uteksaminert din første enhet': 'Graduated your first unit',
})

klasse_skip = {'artfav--på', 'bryter--på', 'førSett'}
EN = {k.strip(): v for k, v in EN.items() if k.strip() and k.strip() not in klasse_skip}

# --- Generer i18n.js --------------------------------------------------------
js = '''// Lokalisering (M40) — hele appen på norsk eller engelsk, valgt i Innstillinger.
// Norsk er kilde og standard: t(nb) og DOM-oversetteren slår opp engelsk i EN-
// ordboken og faller ALLTID tilbake til den norske teksten når et oppslag
// mangler — så engelsk-modus aldri viser tomme nøkler eller «hull». Feeden og
// treningsinnholdet byttes via egne engelske datafiler (data/*.en.json) i
// laste-laget; her ligger grensesnittstrengene + selve oversettermotoren.
import { hentProfil, lagreProfil } from './store.js';

const LS_SPRAK = 'trening.sprak';

/** Gjeldende språk ('nb' | 'en'). Profilinnstilling først, så lokal, standard nb. */
export function gjeldendeSprak() {
  const p = hentProfil()?.innstillinger?.sprak;
  if (p === 'nb' || p === 'en') return p;
  try { const l = localStorage.getItem(LS_SPRAK); if (l === 'nb' || l === 'en') return l; } catch { /* ignore */ }
  return 'nb';
}

export function erEngelsk() { return gjeldendeSprak() === 'en'; }

/**
 * Laster en datafil for gjeldende språk. Norsk er basefila (uten suffiks);
 * ethvert annet språk prøver data/<navn>.<lang>.json først og faller tilbake
 * til den norske data/<navn>.json (så en manglende oversettelse aldri bryter
 * appen). Dermed «bare virker» data/<navn>.sv.json osv. når Norden legges til.
 */
export async function hentSprakJson(navn, base = 'data') {
  const sprak = gjeldendeSprak();
  if (sprak !== 'nb') {
    try {
      const r = await fetch(`${base}/${navn}.${sprak}.json`, { cache: 'no-cache' });
      if (r.ok) return await r.json();
    } catch { /* faller tilbake til norsk under */ }
  }
  const r = await fetch(`${base}/${navn}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Kunne ikke laste ${navn} (${r.status})`);
  return r.json();
}

/** Setter språk (profil + lokal) og laster appen på nytt så alt tegnes i nytt språk. */
export function settSprak(id) {
  if (id !== 'nb' && id !== 'en') return;
  try { localStorage.setItem(LS_SPRAK, id); } catch { /* ignore */ }
  const profil = hentProfil();
  if (profil) { profil.innstillinger = profil.innstillinger || {}; profil.innstillinger.sprak = id; lagreProfil(profil); }
  document.documentElement.lang = id;
  location.reload();
}

// NO (trimmet) → EN. Kilde er norsk; manglende oppslag faller tilbake til norsk.
const EN = %%EN%%;

/** Oversetter en norsk kildestreng til gjeldende språk (fallback: uendret). */
export function t(nb) {
  if (gjeldendeSprak() !== 'en' || nb == null) return nb;
  const s = String(nb);
  return EN[s] ?? EN[s.trim()] ?? nb;
}

// --- DOM-oversetter ---------------------------------------------------------
// Går gjennom tekstnoder og oversettbare attributter og bytter eksakte norske
// strenger (trimmet) til engelsk. Idempotent: engelsk tekst er ingen nøkkel, så
// gjentatte kjøringer er trygge. En MutationObserver fanger async-innhold
// (feed, stier) og overlegg (story, kommentarer, varsler) uten at hver skjerm
// må hektes opp enkeltvis.
const ATTR = ['aria-label', 'placeholder', 'title', 'alt'];

function oversettNode(node) {
  if (node.nodeType === 3) { // tekstnode
    const s = node.nodeValue;
    if (!s) return;
    const key = s.trim();
    if (!key) return;
    const en = EN[key];
    if (en != null && en !== key) node.nodeValue = s.replace(key, en);
    return;
  }
  if (node.nodeType !== 1) return; // kun element videre
  for (const a of ATTR) {
    if (!node.hasAttribute || !node.hasAttribute(a)) continue;
    const v = node.getAttribute(a);
    const en = v && EN[v.trim()];
    if (en != null && en !== v.trim()) node.setAttribute(a, en);
  }
  const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const tekst = [];
  let n; while ((n = w.nextNode())) tekst.push(n);
  for (const tn of tekst) {
    const s = tn.nodeValue; const key = s && s.trim();
    if (!key) continue;
    const en = EN[key];
    if (en != null && en !== key) tn.nodeValue = s.replace(key, en);
  }
  if (node.querySelectorAll) {
    for (const el of node.querySelectorAll('[' + ATTR.join('],[') + ']')) {
      for (const a of ATTR) {
        const v = el.getAttribute(a);
        const en = v && EN[v.trim()];
        if (en != null && en !== v.trim()) el.setAttribute(a, en);
      }
    }
  }
}

/** Oversett et helt undertre nå (kalles ved oppstart og etter store re-tegninger). */
export function oversettDom(root = document.body) {
  if (!erEngelsk() || !root) return;
  oversettNode(root);
}

let _observatorPaa = false;
/** Start løpende oversetting av alt som legges til i DOM-en (kun i engelsk-modus). */
export function startOversetter() {
  if (_observatorPaa || !erEngelsk()) return;
  _observatorPaa = true;
  document.documentElement.lang = 'en';
  oversettDom(document.body);
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const nn of m.addedNodes) oversettNode(nn);
      if (m.type === 'characterData' && m.target) oversettNode(m.target);
      if (m.type === 'attributes' && m.target) oversettNode(m.target);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
}
'''
js = js.replace('%%EN%%', json.dumps(EN, ensure_ascii=False, indent=1))
# Standard: skriv til js/i18n.js ved siden av scripts/. Valgfritt argument
# overstyrer utfilen (drift-sjekken skriver til en midlertidig fil).
standard = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'js', 'i18n.js')
ut = sys.argv[1] if len(sys.argv) > 1 else standard
open(ut, 'w').write(js)
print(f'{ut} skrevet med', len(EN), 'oppslag')
