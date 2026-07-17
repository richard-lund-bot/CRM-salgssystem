# -*- coding: utf-8 -*-
# Bygger data/feed.json — den norske basefeeden — fra den engelsk-authorede
# data/feed.en.json. Gjenbruker strukturen (rekkefølge, spilltyper, fasit-
# posisjoner) så correct_answer alltid holder seg konsistent; kun tekst byttes
# til norsk. (Feeden følger nå appens vanlige språkkonvensjon: base = norsk,
# .en.json = engelsk — lastet via hentSprakJson.)
import json

BASE = json.load(open('/home/user/CRM-salgssystem/data/feed.en.json'))

KAT = {
    'Culture': 'Kultur', 'Economics': 'Økonomi', 'Everyday': 'Hverdag',
    'Health': 'Helse', 'History': 'Historie', 'Mind': 'Sinn', 'Nature': 'Natur',
    'Science': 'Vitenskap', 'Society': 'Samfunn', 'Space': 'Verdensrom',
    'Technology': 'Teknologi', 'World': 'Verden',
}

UNDERKAT = {
    'Abolition': 'Slaveriets avskaffelse', 'Ancient Egypt': 'Det gamle Egypt',
    'Ancient Greece': 'Antikkens Hellas', 'Ancient Rome': 'Antikkens Roma',
    'Antimicrobial resistance': 'Antibiotikaresistens', 'Appliances': 'Husholdningsapparater',
    'Art history': 'Kunsthistorie', 'Artificial intelligence': 'Kunstig intelligens',
    'Atlantic revolutions': 'Atlanterhavsrevolusjonene', 'Attention': 'Oppmerksomhet',
    'Baking': 'Baking', 'Bicycles': 'Sykler', 'Biology': 'Biologi',
    'Bird navigation': 'Fuglenavigasjon', 'Black holes': 'Sorte hull',
    'Cardiovascular fitness': 'Kondisjon', 'Cephalopods': 'Blekksprutdyr',
    'Cities': 'Byer', 'Cleaning chemistry': 'Rengjøringskjemi',
    'Climate & oceans': 'Klima og hav', 'Climate patterns': 'Klimamønstre',
    'Climate physics': 'Klimafysikk', 'Cloud computing': 'Skytjenester',
    'Coasts': 'Kyster', 'Codes': 'Koder', 'Coffee': 'Kaffe',
    'Cognitive bias': 'Kognitive skjevheter', 'Cold War': 'Den kalde krigen',
    'Coral reefs': 'Korallrev', 'Cybersecurity': 'Datasikkerhet',
    'Decision-making': 'Beslutninger', 'Digestion': 'Fordøyelse',
    'Early cities': 'Tidlige byer', 'Earth orbit': 'Jordas bane',
    'Earth systems': 'Jordsystemer', 'Eclipses': 'Formørkelser',
    'Economics & institutions': 'Økonomi og institusjoner', 'Energy storage': 'Energilagring',
    'Exoplanets': 'Eksoplaneter', 'Expectations': 'Forventninger', 'Film': 'Film',
    'Forests & climate': 'Skog og klima', 'Fungi': 'Sopp', 'Genetics': 'Genetikk',
    'Geology': 'Geologi', 'Global exchange': 'Global utveksling', 'Habits': 'Vaner',
    'Hardware': 'Maskinvare', 'Hydration': 'Væskebalanse', 'Hygiene': 'Hygiene',
    'Industrial Revolution': 'Den industrielle revolusjon', 'Internet': 'Internett',
    'Languages': 'Språk', 'Learning science': 'Læringsvitenskap',
    'Manufacturing': 'Produksjon', 'Marine biology': 'Havbiologi', 'Markets': 'Markeder',
    'Media history': 'Mediehistorie', 'Medicine': 'Medisin', 'Medieval law': 'Middelalderlov',
    'Memory': 'Hukommelse', 'Microwaves': 'Mikrobølgeovner', 'Migration': 'Migrasjon',
    'Milky Way': 'Melkeveien', 'Misinformation': 'Feilinformasjon', 'Moon': 'Månen',
    'Moon & Earth': 'Månen og jorda', 'Mountains & weather': 'Fjell og vær',
    'Music history': 'Musikkhistorie', 'Natural hazards': 'Naturfarer',
    'Navigation': 'Navigasjon', 'Neuroplasticity': 'Nevroplastisitet',
    'Ocean & climate': 'Hav og klima', 'Oral heritage': 'Muntlig arv',
    'Pandemics': 'Pandemier', 'Physics': 'Fysikk', 'Platform design': 'Plattformdesign',
    'Pollination': 'Pollinering', 'Population data': 'Befolkningsdata',
    'Predators & ecosystems': 'Rovdyr og økosystemer', 'Prices': 'Priser',
    'Printing revolution': 'Trykkerirevolusjonen', 'Risk': 'Risiko', 'Rivers': 'Elver',
    'Saving': 'Sparing', 'Sea turtles': 'Havskilpadder',
    'Sleep & immunity': 'Søvn og immunforsvar', 'Sleep & learning': 'Søvn og læring',
    'Social behavior': 'Sosial atferd', 'Space Age': 'Romalderen', 'Stars': 'Stjerner',
    'Strength': 'Styrke', 'Stress': 'Stress', 'Sun safety': 'Solbeskyttelse',
    'Time & longitude': 'Tid og lengdegrad', 'Vaccines': 'Vaksiner', 'Vikings': 'Vikinger',
    'Volcanoes': 'Vulkaner',
    # Blue-zones-pilarene: Mat (kosthold) og Ro (ro)
    'Legumes': 'Belgvekster', 'Fish & omega-3': 'Fisk og omega-3', 'Vegetables': 'Grønnsaker',
    'Whole grains': 'Fullkorn', 'Mindful eating': 'Bevisst spising', 'Seasonal eating': 'Sesongmat',
    'Breathing': 'Pust', 'Nature & calm': 'Natur og ro', 'Rest': 'Hvile',
    # Mening-pilaren
    'Purpose': 'Formål', 'Contribution': 'Å bidra', 'Values': 'Verdier',
    'Reflection': 'Refleksjon', 'The long view': 'Det lange perspektivet',
}

SERIE = {
    'Ancient Lives': 'Liv i oldtiden', 'Animal Engineers': 'Dyreingeniører',
    'Animal Journeys': 'Dyrenes reiser', 'Check the Signal': 'Sjekk signalet',
    'Connected Worlds': 'Sammenkoblede verdener', 'Deep Universe': 'Det dype universet',
    'Defence Systems': 'Forsvarssystemer', 'Earth in Motion': 'Jorda i bevegelse',
    'Everyday History': 'Hverdagshistorie', 'Everyday Prevention': 'Hverdagsforebygging',
    'Food Systems': 'Matsystemer', 'Freedom Struggles': 'Frihetskamper',
    'Health Myths': 'Helsemyter', 'Hear the History': 'Hør historien',
    'How Images Work': 'Slik virker bilder', 'How the Internet Works': 'Slik virker internett',
    'Ideas That Spread': 'Ideer som sprer seg', 'Inside the Machine': 'Inni maskinen',
    'Invisible Physics': 'Usynlig fysikk', 'Invisible Technology': 'Usynlig teknologi',
    'Kitchen Laboratory': 'Kjøkkenlaboratoriet', 'Living Culture': 'Levende kultur',
    'Market Mechanics': 'Markedsmekanikk', 'Mental Shortcuts': 'Mentale snarveier',
    'Mind and Body': 'Sinn og kropp', 'Mind and Medicine': 'Sinn og medisin',
    'Money Without Mystery': 'Penger uten mystikk', 'Moon School': 'Måneskolen',
    'Motion Trade-offs': 'Bevegelsens avveininger', 'Move for Health': 'Beveg deg for helsa',
    'Northern Stories': 'Nordiske fortellinger', 'Ocean Plot Twists': 'Havets overraskelser',
    'Orbit Mechanics': 'Banemekanikk', 'Ordinary Engineering': 'Hverdagsteknikk',
    'People on the Map': 'Folk på kartet', 'Power and Rights': 'Makt og rettigheter',
    'Quiet Systems': 'Stille systemer', 'Rome in Motion': 'Roma i bevegelse',
    'Shared Systems': 'Felles systemer', 'Tiny Particles': 'Bittesmå partikler',
    'Trust the Screen?': 'Stol på skjermen?', 'Turning Points': 'Vendepunkter',
    'Weather Systems': 'Værsystemer', 'Why Places Work': 'Hvorfor steder fungerer',
    'Your Learning Brain': 'Læringshjernen din',
    # Blue-zones-pilarene
    'Nordic Plate': 'Nordisk tallerken', 'Calm Breath': 'Rolig pust', 'Everyday Calm': 'Ro i hverdagen',
    'Your Why': 'Ditt hvorfor', 'Everyday Meaning': 'Mening i hverdagen',
}

POSTER = {
    'P001': ('Fysikk, energi og overraskende naturlover', 'La oss gjøre det usynlige synlig.', 'En fiktiv Aha-guide for fysikk og store vitenskapelige idéer.'),
    'P002': ('Kjemi, materialer og molekyler', 'Bittesmå partikler. Store konsekvenser.', 'En fiktiv Aha-guide som gjør kjemi til korte visuelle fortellinger.'),
    'P003': ('Geologi, klima og jordsystemer', 'Jorda er alltid i bevegelse.', 'En fiktiv Aha-guide for kreftene som former planeten vår.'),
    'P004': ('Planeter, måner og banemekanikk', 'Se opp. Så se nærmere.', 'En fiktiv Aha-guide for planeter, måner og kosmisk bevegelse.'),
    'P005': ('Stjerner, galakser, sorte hull og eksoplaneter', 'Universet er merkeligere enn fiksjon.', 'En fiktiv Aha-guide for det dype universet.'),
    'P033': ('Blåsone-kosthold, belgvekster og den nordiske tallerkenen', 'Små tallerkener, lange år.', 'En fiktiv Aha-guide for blåsone-kosthold i et nordisk kjøkken.'),
    'P034': ('Pust, hvile og hverdagsro', 'Senk pusten, sett roen.', 'En fiktiv Aha-guide for pust, hvile og ro.'),
    'P035': ('Formål, det å bidra og det som betyr noe', 'Kjenn ditt hvorfor.', 'En fiktiv Aha-guide for formål og mening.'),
}
# Resten av posterne får en generisk, men troverdig norsk bio ut fra dekningen.


# Oversettelsestabell: id → (T, H, S, P, E, [O...])
# O speiler engelsk struktur/rekkefølge; skriptet utleder correct_answer.
T = {}
def add(pid, t, h, s, p, e, opts):
    T[pid] = dict(t=t, h=h, s=s, p=p, e=e, o=opts)

add('POST-001',
 'Havet lagrer mesteparten av jordas overskuddsvarme',
 'Den største varmemagasinet på jorda er ikke atmosfæren.',
 'Fordi vann kan lagre enorme mengder varme, tar havet opp det aller meste av overskuddsvarmen som drivhusgassene fanger. Det endrer havnivå, marine hetebølger og økosystemer.',
 'Hvor har mesteparten av overskuddsvarmen fra den globale oppvarmingen tatt veien?',
 'Havet er jordas dominerende varmereservoar og har tatt opp mesteparten av overskuddsvarmen.',
 ['Dyphavet og de øvre havlagene', 'Månen', 'Bare bygninger i byer', 'Mest ørkensand'])

add('POST-002',
 'Kontinentene flytter seg fordi jordskorpa er delt i plater',
 'Bakken under deg er i bevegelse — bare veldig sakte.',
 'Jordas ytre skall er delt i store plater som beveger seg i forhold til hverandre. Ved grensene deres dannes mange jordskjelv, vulkaner og fjellkjeder.',
 'Koble hver plategrense til det som vanligvis skjer der.',
 'Ulik bevegelse ved grensene gir ulike geologiske mønstre.',
 [{'left': 'Divergent', 'right': 'Plater beveger seg fra hverandre'},
  {'left': 'Konvergent', 'right': 'Plater beveger seg mot hverandre'},
  {'left': 'Transform', 'right': 'Plater glir forbi hverandre'}])

add('POST-003',
 'Vannets kretsløp drives av sollys og tyngdekraft',
 'Regn er bare ett bilde i et globalt gjenvinningsløp.',
 'Sollys driver fordampning, mens tyngdekraften fører vannet tilbake gjennom nedbør, elver og grunnvann. Vann er stadig i bevegelse mellom hav, atmosfære, is og land.',
 'Sett en enkel bane i vannets kretsløp i riktig rekkefølge.',
 'Fordampning, kondensasjon, nedbør og retur danner et kretsløp som gjentar seg.',
 ['Sollys gir fordampning', 'Vanndamp kondenserer til skyer', 'Nedbør faller', 'Avrenning og grunnvann fører vannet tilbake'])

add('POST-004',
 'Store vulkanutbrudd kan kjøle ned planeten en stund',
 'Vulkaner kan gi klarere solnedganger — og litt lavere temperaturer.',
 'Eksplosive utbrudd kan sende svoveldioksid høyt opp i atmosfæren. Der danner det reflekterende partikler som midlertidig demper sollyset og kjøler den nedre atmosfæren.',
 'Et stort utbrudd sprøyter svoveldioksid opp i stratosfæren. Hva er den mest sannsynlige kortsiktige klimaeffekten?',
 'Svovelpartikler i stratosfæren reflekterer noe av solas energi tilbake til verdensrommet.',
 ['Midlertidig global nedkjøling', 'Permanent tap av tyngdekraft', 'Umiddelbar global oppvarming på flere grader'])

add('POST-005',
 'Korallbleking er en stressrespons — ikke at korallen blir til stein',
 'Et rev kan miste fargen før det mister livet.',
 'Når koraller stresses av uvanlig varmt vann, kan de støte ut algene som gir dem mye av fargen og energien. Langvarig stress kan føre til at korallen dør.',
 'Bleket korall er alltid allerede død.',
 'Bleket korall er sterkt stresset og mer sårbar, men den kan komme seg hvis forholdene bedres raskt nok.',
 ['Fakta', 'Myte'])

add('POST-006',
 'DNA er et kjemisk informasjonssystem',
 'Cellene dine leser et molekylært alfabet på fire bokstaver.',
 'DNA lagrer biologiske instruksjoner i rekkefølger av fire kjemiske baser. Celler kopierer og bruker deler av instruksjonene til å bygge proteiner og styre aktivitet.',
 'DNA lagrer biologisk informasjon i rekkefølgen av kjemiske ____.',
 'Rekkefølgen av DNA-baser bærer den genetiske informasjonen.',
 ['baser', 'bein', 'bobler'])

add('POST-007',
 'Antibiotika virker ikke mot virusinfeksjoner',
 'En kraftig medisin kan likevel være feil verktøy.',
 'Antibiotika angriper bakterier eller bakterielle prosesser. Virus bruker vertscellene på en annen måte, så sykdommer som forkjølelse og influensa blir ikke bedre av antibiotika.',
 'Hvilken sykdom er antibiotika vanligvis laget for å behandle?',
 'Antibiotika virker mot bakterier, ikke virus.',
 ['En bakteriell infeksjon', 'En forkjølelse forårsaket av virus', 'Sesongallergi', 'En forstuet ankel'])

add('POST-008',
 'Verdensrommet er stille fordi lyd trenger materie for å bre seg',
 'En eksplosjon i rommet kan være sterk uten å være høylytt.',
 'Lyd er en mekanisk svingning som brer seg gjennom partikler i gass, væske eller fast stoff. I det nær-tomme verdensrommet er det for få partikler til å bære vanlige lydbølger.',
 'En eksplosjon like ved i det tomme rommet ville laget en vanlig buldrende lyd du kunne hørt gjennom hjelmen.',
 'Lys kan krysse et vakuum, men vanlige lydbølger trenger et materielt medium.',
 ['Fakta', 'Myte'])

add('POST-009',
 'Fotosyntese gjør lysenergi om til lagret kjemisk energi',
 'Planter spiser ikke sollys — de bruker det til å bygge drivstoff.',
 'Ved hjelp av lys, karbondioksid og vann lager planter og mange mikrober energirike sukkerarter og slipper ut oksygen. Prosessen bærer de fleste næringskjeder.',
 'Koble hvert innsatsstoff eller produkt i fotosyntesen.',
 'Fotosyntesen bruker lys til å omforme materie til sukker og oksygen.',
 [{'left': 'Lys', 'right': 'Energikilde'},
  {'left': 'Karbondioksid', 'right': 'Karboninnsats'},
  {'left': 'Oksygen', 'right': 'Frigjort produkt'}])

add('POST-010',
 'Drivhuseffekten er naturlig — ekstra drivhusgasser forsterker den',
 'Uten drivhuseffekten ville jorda vært langt kaldere.',
 'Enkelte gasser tar opp og sender ut igjen infrarød energi, og bidrar til å holde jorda varm. Menneskelige utslipp øker konsentrasjonen og forsterker denne varmefangende effekten.',
 'Drivhusgasser tar opp og sender ut igjen utgående ____ energi.',
 'Jorda avgir varme hovedsakelig som infrarød stråling, som drivhusgasser kan ta opp.',
 ['infrarød', 'lyd', 'magnetisk'])

add('POST-011',
 'Månefaser er skiftende utsyn til den samme solbelyste månen',
 'Månen lager ikke en ny skyggeform hver natt.',
 'Halve månen er alltid opplyst av sola. Etter hvert som månen går i bane rundt jorda, ser vi ulike deler av den opplyste halvdelen.',
 'Koble fasen til hvordan den ser ut.',
 'Fasene avhenger av geometrien mellom sol, jord og måne.',
 [{'card_a': 'Nymåne', 'card_b': 'Den opplyste siden vender for det meste bort'},
  {'card_a': 'Første kvarter', 'card_b': 'Halvt opplyst skive'},
  {'card_a': 'Fullmåne', 'card_b': 'Den nære siden er fullt opplyst'}])

add('POST-012',
 'Månen er den viktigste årsaken til tidevannet',
 'Havet svarer på tyngdekraft i planetarisk skala.',
 'Månens tyngdekraft endrer fordelingen av havvann rundt jorda. Sola bidrar også, og gir sterkere eller svakere tidevann avhengig av hvordan de står i forhold til hverandre.',
 'Hva er hovedårsaken til jordas tidevann?',
 'Månens gravitasjon er den dominerende tidevannspåvirkningen.',
 ['Månens tyngdekraft', 'Skyggen fra skyer', 'Jordas magnetfelt', 'Undersjøiske vulkaner'])

add('POST-013',
 'Årstidene skyldes mest jordas helning — ikke avstanden til sola',
 'Den nordlige vinteren skjer mens jorda er nær sitt nærmeste punkt til sola.',
 'Jordas akse heller. Gjennom hvert kretsløp endrer helningen vinkelen og lengden på sollyset som når hver halvkule, og skaper årstider.',
 'Sommeren kommer fordi jorda er mye nærmere sola.',
 'Årstidene skyldes først og fremst jordas aksehelning og den skiftende vinkelen på sollyset, ikke den lille årlige endringen i avstand.',
 ['Fakta', 'Myte'])

add('POST-014',
 'Formørkelser krever en presis oppstilling av tre himmellegemer',
 'En nymåne gir ikke en solformørkelse hver måned.',
 'Månens bane heller i forhold til jordas bane rundt sola. Formørkelser skjer bare når himmellegemene stiller seg opp nær der baneplanene krysser hverandre.',
 'Sett en solformørkelses-oppstilling i romlig rekkefølge, fra sola og utover.',
 'Under en solformørkelse passerer månen mellom sola og jorda.',
 ['Sola', 'Månen', 'Jorda'])

add('POST-015',
 'Stjerner lyser fordi atomkjerner smelter sammen i kjernen',
 'En stjerne er en fusjonsreaktor drevet av tyngdekraft.',
 'Ekstremt trykk og temperatur i stjernekjerner lar lette atomkjerner smelte sammen til tyngre, og frigjør energi som til slutt slipper ut som lys og varme.',
 'Stjerner produserer energi hovedsakelig gjennom kjerne____ i kjernen.',
 'Fusjon omdanner en liten mengde masse til en stor mengde energi.',
 ['fusjon', 'frysing', 'friksjon'])

add('POST-016',
 'Et bittelite fall i stjernelys kan avsløre en usett planet',
 'Astronomer kan oppdage verdener ved å se en stjerne blunke.',
 'Når en eksoplanet passerer foran stjernen sin sett fra oss, blokkerer den en liten del av lyset. Gjentatte fall kan avsløre planetens bane og omtrentlige størrelse.',
 'En stjerne dempes med samme lille mengde med jevne mellomrom. Hva er en sannsynlig forklaring?',
 'Regelmessige, gjentakbare fall er signaturen som brukes i transittmetoden.',
 ['En planet i bane passerer stjernen gjentatte ganger', 'Stjernen beveger seg bak jorda', 'Teleskopet har oppdaget lydbølger'])

add('POST-017',
 'Et sort hull er ingen kosmisk støvsuger',
 'På avstand oppfører tyngdekraften seg som ethvert annet objekt med samme masse.',
 'Et sort hulls hendelseshorisont markerer et område som lys ikke slipper ut fra. Objekter blir ikke trukket inn fra ubegrensede avstander; stabile baner er mulige utenfor den.',
 'Et sort hull suger automatisk inn alt i galaksen sin.',
 'Tyngdekraften avtar med avstand slik som annen tyngdekraft. Objekter kan gå trygt i bane hvis de er langt nok unna.',
 ['Fakta', 'Myte'])

add('POST-018',
 'Solsystemet vårt går i bane rundt sentrum av Melkeveien',
 'Ett galaktisk år tar grovt regnet flere hundre millioner jordår.',
 'Sola og planetene dens beveger seg rundt sentrum av Melkeveien. NASA anslår at én omdreining tar rundt 230 millioner år.',
 'Hva går hele solsystemet i bane rundt over svært lange tidsrom?',
 'Sola er én av mange stjerner som går i bane inne i Melkeveien.',
 ['Sentrum av Melkeveien', 'Månen', 'Mars', 'En nærliggende komet'])

add('POST-019',
 'Romerske akvedukter flyttet vann mest med tyngdekraft',
 'Ingeniørtrikset var en bitteliten, kontrollert helling nedover.',
 'Romerske ingeniører målte opp lange traséer så vann kunne flyte gradvis fra kilder til byer. Broene var bare de mest synlige delene av mye større systemer.',
 'Koble det romerske vannsystem-begrepet til rollen sin.',
 'Romerske systemer kombinerte nøye helninger, kanaler, tanker og fordelingspunkter.',
 [{'left': 'Akveduktkanal', 'right': 'Fører rennende vann'},
  {'left': 'Sedimenteringstank', 'right': 'Lar avleiringer synke ut'},
  {'left': 'Offentlig fontene', 'right': 'Fordeler vann i byen'}])

add('POST-020',
 'Det romerske senatet endret seg dramatisk gjennom århundrene',
 'Den samme institusjonen hadde ulik makt under republikk og keiserdømme.',
 'Under den romerske republikken var senatet sentralt i elitens politiske beslutninger. Under keiserne forble det viktig, men virket under stadig mer dominerende keisermakt.',
 'Roma går fra republikk til keiserstyre. Hva skjer mest sannsynlig med senatet?',
 'Senatet fortsatte, men keisermakten begrenset det i økende grad.',
 ['Det består, men mister politisk uavhengighet', 'Det blir et moderne folkevalgt parlament', 'Det tar direkte kontroll over alle legioner'])

add('POST-021',
 'Boktrykk med løse typer satte fart på spredningen av tekster',
 'Bøker ble lettere å mangfoldiggjøre i en skala skrivere ikke kunne matche.',
 'Europeiske trykkpresser med løse metalltyper økte hastigheten og jevnheten i bokproduksjonen dramatisk, senket kostnadene og hjalp idéer å reise.',
 'Sett en forenklet tidlig trykkeprosess i rekkefølge.',
 'Gjenbrukbare typer og en presse gjorde gjentatte kopier mye raskere enn håndkopiering.',
 ['Sett sammen gjenbrukbare metalltyper', 'Sverte de opphøyde typene', 'Press papir mot typene', 'Gjenta for mange kopier'])

add('POST-022',
 'Magna Carta skapte ikke moderne demokrati over natta',
 'Den symbolske kraften ble senere større enn den umiddelbare virkningen.',
 'Magna Carta begynte som et forlik i 1215 mellom kong Johan og opprørske baroner. Senere generasjoner tolket deler av den som symboler på lovlig styre og grenser for makt.',
 'Magna Carta ga umiddelbart like demokratiske rettigheter til alle i England.',
 'Den håndterte en middelaldersk politisk krise og beskyttet i hovedsak eliteinteresser, selv om noen klausuler senere fikk bredere konstitusjonell betydning.',
 ['Fakta', 'Myte'])

add('POST-023',
 'Handelsnettverk hjalp svartedauden å spre seg mellom regioner',
 'De samme rutene som fraktet varer, fraktet også sykdom.',
 'Pesten på 1300-tallet spredte seg gjennom sammenkoblede handels- og reisenettverk. Lopper, gnagere og menneskers bevegelse spilte alle en rolle i smitten.',
 'Koble den historiske faktoren til rollen sin i pestens spredning.',
 'Pandemier beveger seg gjennom biologiske og sosiale systemer samtidig.',
 [{'card_a': 'Handelsruter', 'card_b': 'Koblet sammen fjerne havner og byer'},
  {'card_a': 'Lopper', 'card_b': 'Bar pestbakterier mellom verter'},
  {'card_a': 'Tettbygde byer', 'card_b': 'Muliggjorde rask lokal smitte'}])

add('POST-024',
 'Silkeveien var et nettverk — ikke én vei',
 'Idéer og teknologi reiste sammen med silke og krydder.',
 'Silkeveien knyttet sammen mange land- og sjøruter på tvers av Eurasia. Varer, religioner, kunststiler, teknologi og sykdommer beveget seg gjennom kjeder av handelsmenn og byer.',
 'Hvilken beskrivelse passer best til den historiske Silkeveien?',
 'Begrepet beskriver sammenkoblede handelsruter, ikke én sammenhengende vei.',
 ['Et skiftende nettverk av ruter på tvers av Eurasia', 'Én asfaltert motorvei fra Kina til Roma', 'En rute brukt bare til silke', 'Ett imperiums private vei'])

add('POST-025',
 'Vikingene var handelsfolk og nybyggere — ikke bare røvere',
 'Raidet er bare én del av historien om vikingtiden.',
 'Nordiske sjøfarere røvet, handlet, utforsket og bosatte seg over vidstrakte områder. Skipene deres knyttet Skandinavia til Nord-Atlanteren, Europa og elveruter mot øst.',
 'Hver eneste viking var først og fremst en heltids røver.',
 'Vikingtidens samfunn besto av bønder, håndverkere, kjøpmenn, nybyggere og krigere.',
 ['Fakta', 'Myte'])

add('POST-026',
 'Noen av de tidligste byene vokste fram i Mesopotamia',
 'Vanning, jordbruk og administrasjon hjalp tette bosetninger å oppstå.',
 'Byene i sør-Mesopotamia vokste fram rundt produktivt jordbruk, vannveier, templer, handel og systemer for å organisere arbeid og ressurser.',
 'Mange tidlige mesopotamiske byer vokste nær elvene Tigris og ____.',
 'Elvesystemet Tigris–Eufrat bar jordbruk og byutvikling.',
 ['Eufrat', 'Amazonas', 'Themsen'])

add('POST-027',
 'Pyramidene ble bygd av organiserte arbeidsstyrker',
 'Funn peker mot faglærte lag og forsynte arbeidere — ikke filmversjonen av slavemasser.',
 'Arkeologien har avdekket arbeiderboliger, matrester og organiserte lag knyttet til pyramidebyggingen. Arbeidsplikt og faglig spesialisering var sentralt.',
 'Hvilke funn har hjulpet historikere å forstå pyramidebyggingen?',
 'Arkeologiske levninger nær Giza avslører organisert arbeid, forsyning og spesialiserte lag.',
 ['Arbeiderboliger og lagoversikter', 'Moderne videoopptak', 'Romerske aviser', 'Satellittsendinger'])

add('POST-028',
 'Det athenske demokratiet omfattet bare en del av befolkningen',
 'Direkte demokrati betydde ikke deltakelse for alle.',
 'Voksne mannlige borgere kunne delta direkte i Athens politiske institusjoner. Kvinner, slavebundne og fastboende utlendinger var utelukket fra borgerskap.',
 'Alle som bodde i antikkens Athen kunne stemme i demokratiet.',
 'Politisk deltakelse var begrenset til et mindretall av befolkningen: voksne mannlige borgere.',
 ['Fakta', 'Myte'])

add('POST-029',
 'Dampkraft løsnet industriens avhengighet av elver',
 'Fabrikker kunne flytte nærmere arbeidere, kull og markeder.',
 'Tidlige fabrikker var ofte avhengige av vannkraft. Forbedrede dampmaskiner lot maskiner og transport virke flere steder, og satte fart på industrialiseringen.',
 'Fabrikker tar i bruk pålitelige dampmaskiner. Hva blir mer mulig?',
 'Dampkraft ga fabrikker mer frihet i hvor de kunne drive.',
 ['Å plassere produksjon vekk fra hurtige elver', 'Å fjerne behovet for drivstoff', 'Å stoppe byvekst', 'Å lage hvert produkt for hånd'])

add('POST-030',
 'Den haitiske revolusjonen skapte den første uavhengige svarte republikken',
 'Slavebundne beseiret slaveriet og kolonistyret gjennom revolusjon.',
 'Fra 1791 i Saint-Domingue veltet en sammensatt revolusjon slaveriet og fransk kolonimakt. Haiti erklærte uavhengighet i 1804.',
 'Sett fire viktige faser av den haitiske revolusjonen i rekkefølge.',
 'Revolusjonen gikk fra opprør gjennom avskaffelse, fornyet krig og uavhengighet.',
 ['Stort slaveopprør begynner i 1791', 'Slaveriet avskaffes i kolonien', 'Franske styrker prøver å gjenvinne kontrollen', 'Haiti erklærer uavhengighet i 1804'])

add('POST-031',
 'Å avskaffe slavehandelen og å avskaffe slaveriet var ulike prosesser',
 'Et lovforbud mot å handle mennesker fridde ikke automatisk dem som allerede var slavebundne.',
 'Ulike land forbød slavehandelen og avskaffet slaveriet til ulike tider. Håndhevingen var ujevn, og ulovlig menneskehandel fortsatte etter forbudene.',
 'Koble hvert begrep til betydningen sin.',
 'Handelsforbud, frigjøring og håndheving var forbundet, men adskilte.',
 [{'left': 'Forbud mot handelen', 'right': 'Forbud mot å frakte og selge slavebundne'},
  {'left': 'Frigjøring', 'right': 'Å frigjøre slavebundne ved lov'},
  {'left': 'Håndheving', 'right': 'Tiltak for å gjøre lover virksomme'}])

add('POST-032',
 'Apollo 11 var en kjede av presist tidsstyrte trinn',
 'Månelandingen var ikke ett kjøretøy som fløy rett ned og opp igjen.',
 'Ferden brukte en Saturn V-bærerakett, en kommando- og servicemodul og en månemodul. Egne trinn stod for oppskyting, månelanding, møte i bane og retur.',
 'Sett de sentrale trinnene i Apollo 11-ferden i rekkefølge.',
 'Apollo 11 gikk gjennom oppskyting, måneoperasjoner, møte i bane og retur til jorda.',
 ['Oppskyting fra jorda', 'Går inn i månebane', 'Månemodulen lander', 'Astronautene returnerer og lander i havet'])

add('POST-033',
 'Berlinmuren åpnet etter en forvirret kunngjøring',
 'En pressekonferanse satte fart på en politisk krise som alt var i gang.',
 'Den 9. november 1989 ga en østtysk tjenestemann en uklar uttalelse om nye reiseregler. Folkemengder samlet seg ved grenseovergangene, og vaktene åpnet dem til slutt.',
 'En tjenestemann antyder feilaktig at nye reiseregler gjelder umiddelbart. Hva skjer så?',
 'Folkepresset ved overgangene bidro til å gjøre kunngjøringen til en historisk åpning.',
 ['Folkemengder samler seg ved overgangene og presser vaktene til å åpne', 'Muren blir høyere over natta', 'All reise forbys permanent'])

add('POST-034',
 'Internett flytter informasjon i pakker',
 'En nettside kommer som mange små biter, ikke ett sammenhengende objekt.',
 'Nettverk deler data i pakker som kan reise ulike veier. Enheter setter dem sammen igjen ved målet ved hjelp av adresse- og rekkefølgeinformasjon.',
 'Sett en forenklet pakkereise i rekkefølge.',
 'Pakkesvitsjing lar nettverk rute mange brukeres data effektivt.',
 ['Appen deler data i pakker', 'Rutere sender pakkene videre', 'Pakkene når målet', 'Enheten setter sammen dataene igjen'])

add('POST-035',
 'Kryptering gjør lesbar informasjon om til beskyttet chiffertekst',
 'En melding kan reise gjennom offentlige nett uten å være lesbar for alle.',
 'Kryptering bruker algoritmer og nøkler til å omforme klartekst til chiffertekst. Den tiltenkte mottakeren bruker den riktige nøkkelen til å hente ut informasjonen igjen.',
 'Koble hvert sikkerhetsbegrep til rollen sin.',
 'Kryptering skiller det lesbare innholdet fra den beskyttede formen som sendes eller lagres.',
 [{'left': 'Klartekst', 'right': 'Lesbar opprinnelig melding'},
  {'left': 'Chiffertekst', 'right': 'Kryptert, uleselig form'},
  {'left': 'Nøkkel', 'right': 'Verdi brukt til å kryptere eller dekryptere'}])

add('POST-036',
 'Halvledere kan styres til å lede eller motstå strøm',
 'Moderne elektronikk er avhengig av materialer som verken er rene ledere eller rene isolatorer.',
 'Halvlederes egenskaper kan formes og styres, slik at transistorer kan bryte og forsterke elektriske signaler. Milliarder av transistorer får plass på moderne brikker.',
 'En transistor kan virke som en elektronisk ____.',
 'Transistorer styrer strøm og er de grunnleggende bryterelementene i digitale kretser.',
 ['bryter', 'kun batteriladerkabel', 'høyttalerkjegle'])

add('POST-037',
 'GPS trenger relativitetskorreksjoner for å holde seg nøyaktig',
 'Einsteins fysikk sitter inni posisjonsprikken på telefonen din.',
 'Satellittklokker opplever bevegelse og tyngdekraft annerledes enn klokker på jorda. GPS korrigerer for relativistiske effekter så tidsfeil ikke vokser til store posisjonsfeil.',
 'GPS ville vært like nøyaktig uten korreksjoner fra relativitetsteorien.',
 'Relativistiske forskjeller i klokkegang ville hopet seg opp og skapt betydelige posisjonsfeil.',
 ['Fakta', 'Myte'])

add('POST-038',
 'QR-koder kan fortsatt leses etter litt skade',
 'Et manglende hjørne av en kode ødelegger kanskje ikke meldingen.',
 'QR-koder inneholder feilrettingsdata. Avhengig av rettingsnivå og skademønster kan programvaren rekonstruere manglende informasjon.',
 'En del av en QR-kode er ripet, men søkemønstrene er fortsatt synlige. Hva kan skje?',
 'QR-koder ble designet med flere nivåer av feilretting.',
 ['Den kan fortsatt skannes på grunn av feilretting', 'Den blir alltid en annen nettside', 'Den begynner å sende Bluetooth'])

add('POST-039',
 'Maskinlæringssystemer lærer statistiske mønstre av eksempler',
 'De lagrer ikke menneskelig forståelse slik en person gjør.',
 'Maskinlæring tilpasser modeller til data så de kan klassifisere, forutsi eller generere utdata. Ytelsen avhenger av treningsdata, evaluering og hvordan systemet brukes.',
 'Hva lærer en maskinlæringsmodell først og fremst av treningsdataene?',
 'Modeller optimaliserer matematiske sammenhenger i data; de forstår ikke automatisk sannhet eller kontekst.',
 ['Statistiske mønstre som er nyttige for prediksjon', 'En menneskelig barndom', 'Garantert sannhet', 'Et fullstendig moralsystem'])

add('POST-040',
 'Et batteri flytter ioner internt og elektroner gjennom en krets',
 'Lagret kjemisk energi blir til elektrisk arbeid.',
 'Under utlading driver kjemiske reaksjoner elektroner gjennom den ytre kretsen, mens ioner beveger seg gjennom elektrolytten. Lading reverserer prosessen med tilført energi.',
 'Koble batterikomponenten til rollen sin.',
 'Batteridrift skiller ionebevegelsen inni fra elektronstrømmen gjennom kretsen.',
 [{'card_a': 'Elektroder', 'card_b': 'Er vert for de elektrokjemiske reaksjonene'},
  {'card_a': 'Elektrolytt', 'card_b': 'Frakter ioner'},
  {'card_a': 'Ytre krets', 'card_b': 'Frakter elektroner til enheten'}])

add('POST-041',
 'Skyen er fortsatt noen andres datamaskiner',
 'Fjerntjenester føles usynlige fordi infrastrukturen er skjult.',
 'Skytjenester gir delte dataressurser over nett ved behov. Programmer og data kjører i fordelte datasentre, ikke bare på brukerens egen enhet.',
 'Skyfiler lagres i en bokstavelig sky på himmelen.',
 'De lagres og behandles på fysiske servere i datasentre koblet sammen via nettverk.',
 ['Fakta', 'Myte'])

add('POST-042',
 '3D-printing bygger objekter ett lag om gangen',
 'Kompliserte indre former blir mulige fordi objektet vokser gradvis.',
 'Additiv produksjon lager deler ved å legge på, herde eller smelte materiale i lag etter lag fra en digital modell. Ulike metoder bruker plast, metall, harpiks og andre materialer.',
 'Sett en typisk additiv produksjonsprosess i rekkefølge.',
 'Digital geometri gjøres om til maskininstruksjoner før den fysiske byggingen.',
 ['Lag en digital 3D-modell', 'Del modellen i lag', 'Print lagene', 'Etterbehandle og kontrollere delen'])

add('POST-043',
 'Søvn hjelper med å stabilisere nylig lært kunnskap',
 'Øving betyr mye — men det som skjer etter øvingen betyr også noe.',
 'Under søvn omorganiserer og festner hjernen sider av læringen. Søvnmangel kan gjøre oppmerksomhet og hukommelse vanskeligere.',
 'Hvilket utsagn oppsummerer best søvnens rolle i læring?',
 'Søvn støtter festning av minner og kognitiv yteevne dagen etter.',
 ['Søvn hjelper med å festne minner', 'Søvn lagrer permanent hver detalj', 'Drømmer erstatter øving', 'Bare hvile på dagtid betyr noe'])

add('POST-044',
 'Multitasking betyr ofte rask veksling mellom oppgaver',
 'Hjernen betaler en liten pris hver gang den bytter mål.',
 'Når folk veksler mellom krevende oppgaver, må oppmerksomheten stilles om. Disse vekslingskostnadene kan senke ytelsen og øke antallet feil.',
 'Å gjøre to krevende oppgaver samtidig gjør deg alltid raskere.',
 'For mange kognitive oppgaver deler veksling oppmerksomheten og legger til tid og feil.',
 ['Fakta', 'Myte'])

add('POST-045',
 'Spredt øving slår som regel én stor skippertak-økt',
 'Å glemme litt kan gjøre senere gjenhenting mer nyttig.',
 'Å repetere stoff over flere økter gir gjentatte muligheter til å hente det fram, og styrker langtidshukommelsen mer pålitelig enn samlet øving.',
 'To elever øver like lenge totalt. Én sprer øktene over en uke. Hvem husker sannsynligvis best senere?',
 'Spredning og gjenhentingsøving støtter som regel mer varig hukommelse.',
 ['Eleven som bruker spredte økter', 'Eleven som gjør ett langt skippertak', 'Ingen av dem kan noensinne huske'])

add('POST-046',
 'Bekreftelsesskjevhet gjør støttende bevis lettere å legge merke til',
 'Vi gransker ofte egne oppfatninger som forsvarsadvokater, ikke nøytrale dommere.',
 'Folk har en tendens til å søke, tolke og huske informasjon på måter som støtter det de allerede mener. Å bevisst lete etter motbevis kan bedre resonneringen.',
 'Bekreftelsesskjevhet får oss til å foretrekke informasjon som ____ det vi allerede tror.',
 'Skjevheten former hvilket bevis vi legger merke til og hvordan vi tolker det.',
 ['støtter', 'tilfeldig sletter', 'har den lengste overskriften'])

add('POST-047',
 'Placeboeffekter er ekte responser — men ikke bevis for at all behandling virker',
 'Forventninger kan endre symptomer uten å kurere hver underliggende sykdom.',
 'Placeboresponser kan påvirke smerte, opplevelse og andre utfall gjennom forventning og kontekst. Kontrollerte studier sammenligner behandling med placebo for å skille ut den spesifikke effekten.',
 'Koble studiebegrepet til betydningen sin.',
 'Kliniske studier bruker kontroller for å skille forventning, naturlig endring og behandlingseffekt.',
 [{'left': 'Placebo', 'right': 'Inaktivt eller sammenlignende tiltak'},
  {'left': 'Blinding', 'right': 'Deltakerne vet ikke hvilken gruppe de er i'},
  {'left': 'Behandlingseffekt', 'right': 'Forskjell som skyldes tiltaket som testes'}])

add('POST-048',
 'Stressresponsen gjør kroppen klar til handling',
 'Nyttig i korte støt, kostbar når den aldri slår seg av.',
 'Stress aktiverer koordinerte systemer i hjerne og kropp som øker årvåkenheten og mobiliserer energi. Vedvarende stress kan forstyrre søvn, humør og fysisk helse.',
 'Koble endringen i stressresponsen til det umiddelbare formålet.',
 'Den akutte stressresponsen prioriterer handling her og nå.',
 [{'card_a': 'Raskere puls', 'card_b': 'Flytter blod raskt'},
  {'card_a': 'Økt årvåkenhet', 'card_b': 'Oppdager trusler'},
  {'card_a': 'Frigjort drivstoff', 'card_b': 'Gir rask energi'}])

add('POST-049',
 'Hjernen endrer seg med læring og erfaring',
 'Voksne hjerner er ikke faste koblingsskjemaer.',
 'Nervekoblinger kan styrkes, svekkes og omorganiseres som svar på øving, skade og erfaring. Plastisitet er mulig gjennom hele livet, men varierer med system og alder.',
 'Den voksne hjernen kan ikke danne nye læringsrelaterte koblinger.',
 'Voksne hjerner er fortsatt plastiske og kan endre seg med erfaring, selv om endringen ikke er ubegrenset.',
 ['Fakta', 'Myte'])

add('POST-050',
 'Vaner blir lettere når et signal gjentatte ganger utløser samme handling',
 'Omgivelsene dine kan starte en atferd før bevisst vurdering begynner.',
 'Gjentatt atferd i en stabil sammenheng kan bygge signal–respons-koblinger. Å endre signaler, friksjon og belønninger kan gjøre vaner lettere eller vanskeligere å gjenta.',
 'Sett en enkel vaneløkke i rekkefølge.',
 'Gjentatte signal–handling–resultat-sykluser kan gjøre atferd mer automatisk.',
 ['Et signal dukker opp', 'Atferden starter', 'Et umiddelbart resultat eller en belønning følger', 'Koblingen styrkes gjennom gjentakelse'])

add('POST-051',
 'Hukommelse rekonstrueres — den spilles ikke av som en perfekt video',
 'Hver gang vi husker, kan hendelsen bygges opp på nytt.',
 'Hukommelse kombinerer lagrede detaljer med kontekst, forventninger og senere informasjon. Sikkerhet og nøyaktighet henger bare delvis sammen.',
 'Et levende, selvsikkert minne er garantert helt nøyaktig.',
 'Minner kan føles levende og ærlige samtidig som de inneholder utelatelser eller forvrengninger.',
 ['Fakta', 'Myte'])

add('POST-052',
 'Vaksiner trener immunforsvarets hukommelse før den ekte infeksjonen',
 'Immunforsvaret kan øve uten å møte hele sykdommen.',
 'Vaksiner presenterer antigener eller instruksjoner som stimulerer immunresponser. Hukommelsesceller kan så svare raskere og mer effektivt ved senere smitte.',
 'Sett en forenklet vaksinerespons i rekkefølge.',
 'Vaksinering forbereder immunforsvarets hukommelse før infeksjon.',
 ['Vaksinen presenterer et antigen eller en instruksjon', 'Immunceller reagerer', 'Hukommelsesceller blir igjen', 'Senere smitte utløser en raskere respons'])

add('POST-053',
 'Såpe hjelper med å løsne mikrober og fett fra huden',
 'Skrubbingen og skyllingen er en del av kjemien.',
 'Såpemolekyler samspiller med vann og fettholdig materiale, og hjelper med å løsne skitt og mikrober så de kan skylles vekk.',
 'Håndvask virker best når såpe, friksjon og ____ jobber sammen.',
 'Såpe løsner materiale, friksjon hjelper å rive det løs, og vann skyller det vekk.',
 ['skylling', 'parfyme', 'kald luft'])

add('POST-054',
 'Styrketrening utfordrer muskler og skjelett',
 'Styrkearbeid endrer mer enn hvor mye du kan løfte.',
 'Progressiv styrketrening stimulerer muskeltilpasning og belaster skjelettet. Den støtter også funksjon, balanse og metabolsk helse.',
 'Hvilken aktivitet er styrketrening?',
 'Styrketrening krever at musklene jobber mot en ytre belastning eller kroppsvekten.',
 ['Knebøy mot kroppsvekt eller ekstra belastning', 'Å se på et løp', 'Å bare tøye en finger', 'Å ta en høneblund'])

add('POST-055',
 'Regelmessig kondisjonstrening gjør hjertet og blodomløpet mer effektivt',
 'Hjertet tilpasser seg gjentatt belastning.',
 'Aktiviteter som øker pust og puls trener hjerte- og karsystemet. Gevinstene bygger seg opp med jevnlig aktivitet og krever ikke eliteprestasjoner.',
 'Koble aktiviteten til hovedbevegelsesmønsteret.',
 'Mange aktiviteter kan bedre kondisjonen når de gjøres jevnlig.',
 [{'card_a': 'Rask gange', 'card_b': 'Jevnt kondisjonsarbeid'},
  {'card_a': 'Sykling', 'card_b': 'Gjentatt kondisjonsarbeid for underkroppen'},
  {'card_a': 'Svømming', 'card_b': 'Kondisjonsarbeid for hele kroppen'}])

add('POST-056',
 'Kostfiber gir næring til både fordøyelse og tarmmikrober',
 'Noe mat når tykktarmen nettopp fordi du ikke kan fordøye det helt.',
 'Ulike fibre gir volum, holder på vann eller gjæres av tarmmikrober. Fiberrik mat er forbundet med bedre fordøyelses- og hjertehelse.',
 'Mange tarmmikrober gjærer visse typer kost____.',
 'Gjærbare fibre kan bli drivstoff for mikrober i tykktarmen.',
 ['fiber', 'plast', 'saltkrystaller'])

add('POST-057',
 'Væskebehovet endrer seg med varme, aktivitet, mat og individuell fysiologi',
 'Det finnes ikke ett perfekt tall for hver person i hver situasjon.',
 'Kroppen mister vann gjennom urin, svette, pust og fordøyelse. Behovet øker med varme, trening, sykdom og andre forhold.',
 'Hver voksen trenger nøyaktig like mye vann hver dag.',
 'Væskebehovet varierer med kroppsstørrelse, klima, aktivitet, kosthold, helse og graviditet eller amming.',
 ['Fakta', 'Myte'])

add('POST-058',
 'Bredspektret solkrem beskytter mot både UVA og UVB',
 'Solforbrenning er bare ett synlig tegn på UV-skade.',
 'UVA- og UVB-stråling bidrar ulikt til hudskade. Bredspektrede produkter skal beskytte mot begge områdene når de brukes riktig.',
 'Koble hver merking til betydningen sin.',
 'God solbeskyttelse avhenger av produkttype, mengde, dekning og gjentatt påsmøring.',
 [{'left': 'Bredspektret', 'right': 'Beskyttelse mot UVA og UVB'},
  {'left': 'SPF', 'right': 'Mål mest rettet mot UVB-solforbrenning'},
  {'left': 'Påsmøring på nytt', 'right': 'Gjenoppretter dekningen etter tid, vann eller gnisning'}])

add('POST-059',
 'Søvn og immunforsvar påvirker hverandre',
 'Hvile er en del av immunforsvarets driftsmiljø.',
 'Søvn støtter koordinert immunaktivitet, og immunsignaler påvirker også søvnen under sykdom. Vedvarende søvnmangel kan endre immunresponser.',
 'Noen sover gjentatte ganger for lite før og etter en immunutfordring. Hva er den mest holdbare prediksjonen?',
 'Forskning knytter tilstrekkelig søvn til sunnere regulering av immunresponser.',
 ['Immunresponsen kan være dårligere støttet', 'De blir permanent immune mot alle virus', 'Søvn har ingen biologisk kobling til immunforsvaret'])

add('POST-060',
 'Bakterier — ikke mennesker — blir motstandsdyktige mot antibiotika',
 'Resistens er evolusjon som skjer under seleksjonspress.',
 'Antibiotika kan drepe følsomme bakterier mens resistente varianter overlever og formerer seg. Resistente infeksjoner kan så spres mellom mennesker, dyr og miljø.',
 'Hva blir resistent ved antibiotikaresistens?',
 'Resistens er en egenskap hos mikrober som lar dem overleve medisiner laget for å drepe dem.',
 ['Bakterier eller andre mikrober', 'Pasientens skjelett', 'Medisinflasken', 'Menneskers hudfarge'])

add('POST-061',
 'Koraller er dyr som bygger levende kalksteinsbyer',
 'Et rev kan se ut som en fargerik steinhage, men byggerne er dyr.',
 'Hver korallkoloni består av mange små polypper i slekt med maneter og sjøanemoner. Mange revbyggende koraller lager kalkskjeletter som bygger seg opp over generasjoner.',
 'Koraller er undervannsplanter.',
 'Korallpolypper er dyr, selv om mange lever sammen med fotosyntetiske alger.',
 ['Fakta', 'Myte'])

add('POST-062',
 'Pollinatorer flytter pollen mellom blomster',
 'Mange frukter og frø begynner med et dyr som bærer mikroskopiske korn.',
 'Bier, fluer, sommerfugler, fugler, flaggermus og andre dyr kan overføre pollen mellom blomsterdeler, og muliggjør befruktning hos mange plantearter.',
 'Koble pollinatoren til et blomstersignal den kan bruke.',
 'Ulike blomster tiltrekker ulike pollinatorer gjennom form, farge, duft og tidspunkt.',
 [{'card_a': 'Bie', 'card_b': 'Farge og duft'},
  {'card_a': 'Nattsvermer', 'card_b': 'Duft om natta'},
  {'card_a': 'Kolibri', 'card_b': 'Lys, rørformet blomst'}])

add('POST-063',
 'En blekksprut har tre hjerter',
 'Blodomløpet dens virker annerledes enn vårt.',
 'To hjerter pumper blod gjennom gjellene, mens et tredje sender oksygenrikt blod rundt i kroppen. Blekksprutblod bruker kobberholdig hemocyanin og ser blått ut.',
 'To av blekksprutens hjerter pumper blod gjennom ____.',
 'Gjellehjertene flytter blod gjennom gjellene; kroppshjertet betjener kroppen.',
 ['gjellene', 'tentakkeltuppene', 'øynene'])

add('POST-064',
 'Sopp er viktige gjenvinnere i økosystemer',
 'Et falt tre blir råstoff for neste generasjon liv.',
 'Sopp skiller ut enzymer som bryter ned komplekst organisk materiale utenfor kroppen, og tar så opp næringen. Dette fører karbon og mineraler tilbake til økosystemets kretsløp.',
 'Hva er en viktig økologisk rolle for mange sopper?',
 'Soppnedbryting hjelper med å resirkulere næring fra dødt materiale.',
 ['Å bryte ned dødt organisk materiale', 'Å lage sollys', 'Å stoppe alle bakterier', 'Å lage tidevann'])

add('POST-065',
 'Rovdyr kan endre økosystemer uten å spise hvert byttedyr',
 'Frykt og bevegelse kan bety noe ved siden av selve jakten.',
 'Rovdyr kan endre hvor byttedyr beiter, beveger seg og samler seg. Disse atferdsendringene kan påvirke vegetasjon og andre arter, men ekte økosystemer er komplekse og effektene varierer.',
 'Store rovdyr vender tilbake til et økosystem. Hvilken endring er sannsynlig?',
 'Rovdyr påvirker både antall byttedyr og atferden deres, med effekter som kan spre seg gjennom næringskjeden.',
 ['Byttedyrenes atferd og beitesteder kan endre seg', 'Alle byttedyr forsvinner umiddelbart', 'Plantene slutter å trenge sollys'])

add('POST-066',
 'Mangroverøtter kan dempe bølgeenergi og fange sedimenter',
 'En skog kan fungere som levende kystinfrastruktur.',
 'Tette mangroverøtter bremser vann, fanger sedimenter og gir levested. Mangrovebelter kan dempe noe bølge- og stormpåvirkning, selv om beskyttelsen avhenger av stormstyrke og lokale forhold.',
 'Koble mangrovetrekket til nytten sin.',
 'Mangrover kombinerer økologisk levested med fysiske kystfunksjoner.',
 [{'left': 'Tette røtter', 'right': 'Bremser vann og fanger sedimenter'},
  {'left': 'Oppvekstområde', 'right': 'Gir ly til yngel'},
  {'left': 'Kystvegetasjon', 'right': 'Lagrer karbon og stabiliserer strandlinjer'}])

add('POST-067',
 'Hvalvandringer knytter sammen beite- og yngleområder',
 'Noen av de største dyrene gjør noen av de lengste sesongreisene.',
 'Mange hvalbestander vandrer mellom produktive beiteområder på høye breddegrader og varmere yngle- eller kalvingsområder. Rutene varierer med art og bestand.',
 'Koble sesongstedet til den vanlige rollen for mange trekkende hvaler.',
 'Vandring lar hvaler bruke ulike leveområder til ulike livsfaser.',
 [{'card_a': 'Farvann på høye breddegrader', 'card_b': 'Intens beiting'},
  {'card_a': 'Varmere farvann', 'card_b': 'Yngling eller kalving'},
  {'card_a': 'Trekkorridor', 'card_b': 'Reise mellom sesonghabitater'}])

add('POST-068',
 'Trekkfugler kombinerer flere navigasjonssignaler',
 'Himmelen, landskapet og jordas magnetfelt kan alle bidra.',
 'Fugler kan bruke sola, stjernene, landemerker, lukter og magnetisk informasjon. Ulike arter og livsfaser stoler på ulike kombinasjoner.',
 'Alle trekkfugler navigerer med bare ett innebygd kompass.',
 'Fuglenavigasjon kombinerer ofte flere sansesignaler og lært informasjon.',
 ['Fakta', 'Myte'])

add('POST-069',
 'Skoger flytter karbon mellom luft, ved og jord',
 'En skog er både et levende karbonlager og en aktiv karbonutveksling.',
 'Planter tar opp karbondioksid gjennom fotosyntese og lagrer karbon i biomasse. Respirasjon, nedbryting, brann og endret arealbruk fører karbon tilbake til atmosfæren.',
 'Sett én forenklet karbonbane i skogen i rekkefølge.',
 'Skogens karbon beveger seg stadig gjennom vekst, død og nedbryting.',
 ['Treet tar opp karbondioksid', 'Karbon blir plantevev', 'Blader eller ved dør', 'Nedbryting frigjør noe karbon'])

add('POST-070',
 'Redetemperaturen kan påvirke kjønnet til havskilpaddeunger',
 'For mange havskilpadder gir varmere sand som regel flere hunner.',
 'Havskilpadder har temperaturbestemt kjønn. Sammenhengen varierer mellom arter og redeforhold, og ekstrem varme kan senke overlevelsen.',
 'En hekkestrand blir jevnt varmere. Hvilken tendens kan oppstå i mange havskilpaddebestander?',
 'Rugetemperaturen påvirker kjønnsbestemmelsen hos havskilpadder.',
 ['En høyere andel hunnunger', 'Alle unger blir pattedyr', 'Egg trenger ikke lenger oksygen'])

add('POST-071',
 'Tidssoner tilnærmer jordas rotasjon',
 'Lokal middag flytter seg mens jorda snurrer, men grenser gjør kartet rotete.',
 'Jorda roterer én gang i døgnet, så soltiden endrer seg med lengdegrad. Standard tidssoner forenkler koordinering og bøyer seg ofte rundt politiske grenser.',
 'Hvorfor finnes standard tidssoner?',
 'Tidssoner standardiserer lokal tid i stedet for at hver lengdegrad bruker en egen klokke.',
 ['For å samordne klokketid på tvers av regioner mens jorda roterer', 'Fordi tyngdekraften endrer seg hver time', 'For å holde alle steder på lokal middag', 'Fordi månen krever det'])

add('POST-072',
 'En monsun er et sesongmessig vindskifte — ikke bare kraftig regn',
 'Regnet er en følge av en større endring i sirkulasjonen.',
 'Monsunsystemer innebærer sesongmessige omslag eller skift i vinder knyttet til varmeforskjeller mellom land og hav. Disse skiftene kan gi tydelige våt- og tørrsesonger.',
 'En monsun er i bunn og grunn et sesongmessig skifte i storskala ____.',
 'Sesongmessige vindskift frakter fuktighet og bidrar til å organisere nedbøren.',
 ['vinder', 'fjellhøyde', 'kun havets saltholdighet'])

add('POST-073',
 'Elvedeltaer dannes der sedimenter hoper seg opp nær elvemunningen',
 'En elv kan bygge nytt land når den bremser opp.',
 'Når en elv når en innsjø eller et hav, mister strømmen ofte energi og slipper sedimenter. Kanaler deler seg og vandrer over det voksende deltaet.',
 'Sett en forenklet deltabyggingsprosess i rekkefølge.',
 'Deltaer vokser når tilførselen av sedimenter overgår det som fjernes av bølger, tidevann og synking.',
 ['Elva frakter sedimenter', 'Strømmen bremser nær kysten', 'Sedimentene legger seg', 'Kanaler deler seg over nye avleiringer'])

add('POST-074',
 'De fleste bor nå i byområder',
 'Menneskeheten har blitt stadig mer urban på få generasjoner.',
 'Urbanisering gjenspeiler migrasjon, befolkningsvekst og omklassifisering eller utvidelse av bosetninger. Mønsteret varierer sterkt mellom land og regioner.',
 'En region urbaniseres raskt. Hvilket press øker vanligvis?',
 'Rask byvekst krever infrastruktur, planlegging og offentlige tjenester.',
 ['Etterspørsel etter bolig, transport og tjenester', 'Antallet tidssoner', 'Lengden på året'])

add('POST-075',
 'Språkfamilier gjenspeiler felles historisk opphav',
 'Engelsk, hindi og norsk er fjerne slektninger.',
 'Lingvister sammenligner systematiske mønstre i ordforråd, lyder og grammatikk for å rekonstruere slektskap mellom språk. Lånord alene fastslår ikke opphav.',
 'Koble språket til den brede familien sin.',
 'Språkfamilier bygger på historisk avstamning, ikke geografisk nærhet alene.',
 [{'card_a': 'Norsk', 'card_b': 'Indoeuropeisk'},
  {'card_a': 'Finsk', 'card_b': 'Uralsk'},
  {'card_a': 'Arabisk', 'card_b': 'Afroasiatisk'}])

add('POST-076',
 'Fjell kan skape en våt og en tørr side',
 'Luft som klatrer opp et fjell kan miste fuktighet før den synker igjen.',
 'Fuktig luft kjøles når den stiger, noe som øker kondensasjon og nedbør. Synkende luft på lesiden varmes opp og tørker, og skaper en regnskygge.',
 'Koble fjellsiden til den typiske tilstanden sin.',
 'Terreng styrer luftstrømmen og endrer temperatur og fuktighet.',
 [{'left': 'Losiden', 'right': 'Luft stiger og blir ofte fuktigere'},
  {'left': 'Lesiden', 'right': 'Luft synker og blir ofte tørrere'},
  {'left': 'Toppen', 'right': 'Lufttrykk og temperatur er lavere'}])

add('POST-077',
 'De fleste jordskjelv klumper seg nær plategrenser',
 'Verdenskartet over jordskjelv tegner opp jordas bevegelige plater.',
 'Spenninger bygger seg opp der plater støter sammen, skiller lag eller glir forbi hverandre. Når forkastninger glir, frigjøres lagret elastisk energi som seismiske bølger.',
 'Jordskjelv skjer tilfeldig og har ingen sammenheng med plategrenser.',
 'Jordskjelv klumper seg sterkt langs tektoniske plategrenser, selv om det også finnes jordskjelv inne på platene.',
 ['Fakta', 'Myte'])

add('POST-078',
 'Havstrømmer fordeler varme rundt planeten',
 'En strøm kan forme klimaet tusenvis av kilometer unna.',
 'Vind, tetthetsforskjeller, jordas rotasjon og bassengformer driver havsirkulasjonen. Strømmer frakter varmt og kaldt vann og påvirker regionalt vær og økosystemer.',
 'Koble strømegenskapen til effekten sin.',
 'Havsirkulasjonen flytter både varme og næringsstoffer.',
 [{'card_a': 'Varm strøm', 'card_b': 'Frakter varme mot kaldere områder'},
  {'card_a': 'Kald strøm', 'card_b': 'Fører kaldere vann mot lavere breddegrader'},
  {'card_a': 'Oppvelling', 'card_b': 'Løfter opp næringsrikt dypvann'}])

add('POST-079',
 'Fellesgoder er vanskelige å utestenge folk fra å bruke',
 'Gatelys virker også for noen som ikke betalte direkte ved lyktestolpen.',
 'Fellesgoder beskrives ofte som ikke-ekskluderbare og ikke-rivaliserende: folk kan ikke lett hindres fra å nyte godt av dem, og én persons bruk reduserer kanskje ikke en annens.',
 'Koble fellesgode-egenskapen til betydningen sin.',
 'Disse egenskapene gjør frivillig privat framskaffelse vanskelig i noen tilfeller.',
 [{'left': 'Ikke-ekskluderbar', 'right': 'Vanskelig å hindre tilgang'},
  {'left': 'Ikke-rivaliserende', 'right': 'Én persons bruk reduserer ikke vesentlig en annens'},
  {'left': 'Gratispassasjer-problemet', 'right': 'Å nyte godt uten å bidra'}])

add('POST-080',
 'En felles ressurs kan tømmes selv når hver enkelt handler rasjonelt',
 'Gruppen taper når alle følger det samme kortsiktige insentivet.',
 'Allmenningens tragedie beskriver situasjoner der enkeltpersoner overforbruker en felles, begrenset ressurs fordi gevinsten er privat mens kostnaden fordeles på gruppen.',
 'Fiskere kan ta ubegrenset med fisk fra én felles innsjø. Hva kan skje uten samordning?',
 'Ukoordinert uttak kan overgå ressursens evne til å komme seg.',
 ['Fiskebestanden kan bli tømt', 'Innsjøen lager automatisk uendelig med fisk', 'Alle fanger alltid mer for alltid'])

add('POST-081',
 'Gjentatte påstander kan føles sannere — selv uten nye bevis',
 'Det kjente er ikke det samme som det korrekte.',
 'Illusorisk sannhets-effekten oppstår når gjentakelse øker opplevd sannhet. Å sjekke det opprinnelige beviset og kilden er viktig selv når en påstand føles kjent.',
 'En påstand blir mer nøyaktig bare fordi du har sett den mange ganger.',
 'Gjentakelse kan øke gjenkjennelse og opplevd sannhet uten å bedre nøyaktigheten.',
 ['Fakta', 'Myte'])

add('POST-082',
 'Folk bruker andres atferd som informasjon om hva som er normalt',
 'Et velfylt tipsglass kan endre hva den neste personen gjør.',
 'Sosiale normer påvirker valg ved å signalisere hva andre vanligvis gjør eller godtar. Normbudskap kan hjelpe eller slå tilbake avhengig av hvordan de rammes inn.',
 'Hva er en sosial norm?',
 'Normer styrer atferd gjennom opplevde forventninger og vanlig praksis.',
 ['En oppfatning om hva andre gjør eller godtar', 'En tyngdelov', 'Bare et privat minne', 'En type værfront'])

add('POST-083',
 'Anbefalingssystemer optimaliserer for valgte signaler',
 'Feeden viser det systemet forutsier vil nå målet sitt.',
 'Plattformer rangerer innhold ut fra mange signaler som tidligere samhandling, ferskhet og forventet engasjement. Målet designerne velger, former hva som forsterkes.',
 'En anbefalingsalgoritme rangerer innhold etter utvalgte data og et optimaliserings____.',
 'Systemets mål — som forventet engasjement — former anbefalingene sterkt.',
 ['mål', 'værsystem', 'moralsk instinkt'])

add('POST-084',
 'En folketelling støtter representasjon og offentlig planlegging',
 'Å telle folk endrer hvordan ressurser og politiske plasser fordeles.',
 'Befolkningstall former valgrepresentasjon, tilskuddsformler, infrastrukturplanlegging og demografisk analyse. God dekning er viktig fordi grupper som utelates, forvrenger beslutninger.',
 'Koble folketellingsbruken til resultatet sitt.',
 'Folketellingsdata blir infrastruktur for mange offentlige beslutninger.',
 [{'card_a': 'Representasjon', 'card_b': 'Fordeling av politiske plasser'},
  {'card_a': 'Planlegging', 'card_b': 'Anslag for skoler, transport og tjenester'},
  {'card_a': 'Forskning', 'card_b': 'Befolknings- og demografistatistikk'}])

add('POST-085',
 'Bluesen bidro til å forme rock, jazz og populærmusikk',
 'En kort musikalsk form ble et fundament for lyder over hele verden.',
 'Bluestradisjoner vokste fram fra afroamerikansk musikkpraksis og historie. Blueshamonier, frasering, rytme og uttrykksteknikker påvirket mange senere sjangre.',
 'Koble det musikalske elementet til rollen sin.',
 'Bluesen er ikke én fast lyd, men disse elementene ble svært innflytelsesrike.',
 [{'left': 'Rop og svar', 'right': 'Vekslende musikalske fraser'},
  {'left': 'Blånoter', 'right': 'Uttrykksfullt endrede tonehøyder'},
  {'left': 'Tolvtakters form', 'right': 'Vanlig gjentakende harmonisk struktur'}])

add('POST-086',
 'Linjeperspektiv skaper illusjon av dybde på en flat overflate',
 'Parallelle linjer kan se ut til å møtes i et forsvinningspunkt.',
 'Renessansekunstnere formaliserte geometriske systemer som avbildet tredimensjonalt rom på todimensjonale flater. Perspektivet forvandlet arkitektur, maleri og visuell fortelling.',
 'I linjeperspektiv ser parallelle linjer som fjerner seg ut til å møtes i et ____-punkt.',
 'Forsvinningspunktet organiserer den visuelle illusjonen av dybde.',
 ['forsvinnings', 'kokende', 'musikalsk'])

add('POST-087',
 'Muntlige tradisjoner er levende praksis, ikke frosne opptak',
 'En fortelling kan forbli gjenkjennelig samtidig som den endrer seg fra gang til gang.',
 'Muntlige tradisjoner overfører historie, kunnskap, identitet og kunstnerisk uttrykk gjennom framføring. Variasjon er ofte en del av tradisjonen, ikke en feil.',
 'En muntlig tradisjon er ekte bare hvis hver forteller gjentar nøyaktig de samme ordene.',
 'Mange muntlige tradisjoner tilpasses i framføringen samtidig som de bevarer temaer, strukturer eller felles mening.',
 ['Fakta', 'Myte'])

add('POST-088',
 'Boktrykk endret hvem som kunne mangfoldiggjøre og spre idéer',
 'Mediet endret hastighet, skala og jevnhet.',
 'Trykte bøker, pamfletter og aviser lot tekster sirkulere bredere og jevnere. Tilgangen var fortsatt ulik, men kommunikasjonsnettverkene vokste.',
 'Et samfunn får billigere, raskere boktrykk. Hva er et sannsynlig resultat?',
 'Boktrykk økte skala og hastighet i mangfoldiggjøringen uten å garantere enighet.',
 ['Raskere spredning av tekster og argumenter', 'Talespråk forsvinner', 'Hver leser blir enig i den samme idéen'])

add('POST-089',
 'Film skaper bevegelse fra en rekke stillbilder',
 'Synssystemet ditt binder sammen raskt skiftende bilder.',
 'Film tar opp og viser bilde etter bilde raskt nok til at seeren oppfatter sammenhengende bevegelse. Bevegelsesoppfatning er mer sammensatt enn én enkel forklaring om synets treghet.',
 'Sett den grunnleggende film-bevegelsesprosessen i rekkefølge.',
 'Levende bilder bygger på raske bildesekvenser og hjernens bevegelsesbehandling.',
 ['Kameraet tar opp bilde etter bilde', 'Bildene lagres som ruter', 'Projektor eller skjerm viser rutene raskt', 'Seeren oppfatter sammenhengende bevegelse'])

add('POST-090',
 'Inflasjon reduserer hva en pengeenhet kan kjøpe',
 'Tallet på seddelen er det samme, mens kjøpekraften endrer seg.',
 'Inflasjon er en vedvarende økning i det generelle prisnivået. Enkeltpriser beveger seg ulikt, men bred inflasjon betyr at penger i snitt kjøper færre varer og tjenester.',
 'Hva gjør bred inflasjon vanligvis med kjøpekraften?',
 'Når det generelle prisnivået stiger, kjøper et fast beløp mindre.',
 ['Reduserer den', 'Garanterer at hver lønn stiger likt', 'Gjør alle priser like', 'Fjerner knapphet'])

add('POST-091',
 'Rentesrente gir avkastning på tidligere avkastning',
 'Tid kan bli en del av investeringsmotoren.',
 'Med rentesrente legges gevinsten til saldoen og kan gi mer gevinst senere. Resultatet avhenger av rente, tid, gebyrer og om avkastningen er positiv.',
 'Sett en enkel årlig rentesrente-syklus i rekkefølge.',
 'Rentesrente gjentar veksten på en saldo som stadig endrer seg.',
 ['Start med en saldo', 'Få en avkastning', 'Legg avkastningen til saldoen', 'Neste periodes avkastning bruker den nye saldoen'])

add('POST-092',
 'Priser samordner tilbud og etterspørsel',
 'En mangel sender informasjon til kjøpere og selgere.',
 'Når etterspørselen stiger i forhold til tilgjengelig tilbud, stiger prisene ofte, noe som oppmuntrer til mer tilbud eller mindre etterspørsel. Ekte markeder har også regler, forhandlingsmakt og forsinkelser.',
 'Etterspørselen etter et produkt stiger raskt mens tilbudet ikke kan øke enda. Hva skjer vanligvis først?',
 'Høyere etterspørsel mot fast kortsiktig tilbud skaper gjerne knapphet og prispress.',
 ['Prisen får press oppover', 'Produktet blir uendelig', 'Etterspørselen blir automatisk null'])

add('POST-093',
 'Alternativkostnad er det beste alternativet du gir avkall på',
 'Den reelle kostnaden ved en time er hva den timen ellers kunne ha gjort.',
 'Å velge ett alternativ bruker tid, penger eller ressurser som ikke kan brukes andre steder. Alternativkostnad fokuserer på det nest beste alternativet, ikke alle tenkelige.',
 'Alternativkostnaden ved et valg er verdien av det beste ____ alternativet.',
 'Alternativkostnad måler det mest verdifulle alternativet man ikke valgte.',
 ['forsakede', 'identiske', 'umulige'])

add('POST-094',
 'Diversifisering sprer eksponeringen på tvers av investeringer',
 'Den reduserer konsentrasjonsrisiko — men fjerner ikke all risiko.',
 'Å holde ulike aktiva kan dempe virkningen av at én investering går dårlig. Samvariasjon betyr noe, og diversifisering kan ikke garantere gevinst eller hindre tap i hele markedet.',
 'Diversifisering garanterer at en investeringsportefølje ikke kan tape penger.',
 'Diversifisering kan redusere spesifikk konsentrasjonsrisiko, men brede markedstap og annen risiko består.',
 ['Fakta', 'Myte'])

add('POST-095',
 'Brød hever fordi gjær lager karbondioksid',
 'En deig er en elastisk struktur som fanger gass.',
 'Gjær bryter ned sukker og slipper ut karbondioksid. Gluten og andre deigstrukturer fanger boblene, mens stekingen setter den utvidede formen.',
 'Sett hevingen av brød i rekkefølge.',
 'Gjæring lager gass; deigstrukturen fanger den; stekingen fester den endelige formen.',
 ['Gjæren bruker opp tilgjengelig sukker', 'Karbondioksid dannes', 'Deigen fanger de voksende boblene', 'Varme setter brødstrukturen'])

add('POST-096',
 'Såpemolekyler har en vannglad og en fettglad ende',
 'Den doble personligheten hjelper fett å blande seg i skyllevannet.',
 'Overflateaktive stoffer omslutter fettholdig materiale i strukturer som kan holde seg spredt i vann. Bevegelse og skylling fjerner så den oppslemmede skitten.',
 'Koble det overflateaktive trekket til rollen sin.',
 'Overflateaktive stoffer bygger bro mellom materialer som ellers motstår å blande seg.',
 [{'left': 'Vannglad ende', 'right': 'Samspiller med vann'},
  {'left': 'Fettglad ende', 'right': 'Samspiller med fett'},
  {'left': 'Micelle', 'right': 'Omslutter fettholdig materiale'}])

add('POST-097',
 'Et kjøleskap flytter varme ut — det lager ikke kulde',
 'De varme spiralene bak kjøleskapet er en del av kjøleprosessen.',
 'En kjølesyklus bruker et arbeidsmedium, kompresjon og ekspansjon til å ta opp varme inni skapet og slippe den ut i rommet.',
 'Hvorfor kan baksiden av et kjøleskap i drift føles varm?',
 'Kjøleskapet er en varmepumpe som flytter energi fra det kalde indre til det varmere rommet.',
 ['Det slipper ut varme fjernet fra innsiden pluss kompressorenergi', 'Kulde lekker bakover', 'Maten lager kjerneenergi', 'Lyspæren driver fryseren'])

add('POST-098',
 'Mikrobølgeovner varmer mat gjennom elektromagnetiske felt',
 'Tallerkenen varmer ikke maten ved å bli en bitteliten sol.',
 'Mikrobølgeenergi samspiller sterkt med polare molekyler og ioner i maten, og gir molekylær bevegelse og varme. Mønsteret kan bli ujevnt, derfor hjelper hviletid og omrøring.',
 'Mikrobølgeovner gjør mat radioaktiv.',
 'Mikrobølgestråling er ikke-ioniserende og gjør ikke mat radioaktiv.',
 ['Fakta', 'Myte'])

add('POST-099',
 'Sykkelgir bytter kraft mot hjulomdreining',
 'Et lettere gir lar beina snurre mer for hver hjulomdreining.',
 'Utvekslingen bestemmer hvordan pedalomdreiningen omsettes i hjulomdreining. Lave gir reduserer nødvendig pedalkraft i motbakke, men krever flere pedalomdreininger per distanse.',
 'Koble kjøresituasjonen til det nyttige girvalget.',
 'Gir lar syklisten bytte mellom tråkkfrekvens, kraft og fart.',
 [{'card_a': 'Bratt bakke', 'card_b': 'Lavere gir'},
  {'card_a': 'Rask flat vei', 'card_b': 'Høyere gir'},
  {'card_a': 'Start fra stillstand', 'card_b': 'Relativt lavt gir'}])

add('POST-100',
 'Kaffetrekk er en balanse av tid, temperatur, kvern og vann',
 'De samme bønnene kan smake surt, søtt eller bittert avhengig av prosessen.',
 'Trekking løser opp mange stoffer i ulik takt. Kvernstørrelse, vanntemperatur, kontakttid og bevegelse påvirker hvor mye og hva slags materiale som havner i koppen.',
 'Kaffen smaker skarpt surt og tynt etter et veldig raskt trekk. Hvilken justering er ofte fornuftig?',
 'Et raskt, tynt og surt trekk tyder ofte på undertrekking, selv om smak og utstyr varierer.',
 ['Øk trekket med finere kvern eller lengre kontakttid', 'Bruk mye kortere kontakttid', 'Fjern alt vannet', 'Frys koppen mens du trekker'])

# ---- Blue-zones-pilarene: Mat (kosthold) og Ro (ro) ------------------------
add('POST-101',
 'En kopp bønner om dagen er et blåsone-kjennetegn',
 'Verdens mest langlevde spiser belgvekster nesten daglig.',
 'I blåsonene gjør bønner, linser og erter mye av jobben: rikelig med protein og fiber, jevn energi og lav pris. Rundt en kopp om dagen er en enkel vane du også kan bygge på en nordisk tallerken.',
 'Du må ha kjøtt til hvert måltid for å få nok protein.',
 'Belgvekster, fullkorn, meieri og fisk dekker lett proteinbehovet — bønner er en proteinbærebjelke i blåsonene.',
 ['Fakta', 'Myte'])

add('POST-102',
 'Fet fisk to ganger i uka gir mat til hjertet og hjernen',
 'Norskekysten byr på en av de enkleste langlevd-matene.',
 'Laks, makrell, sild og ørret er rike på omega-3-fett knyttet til hjerte- og hjernehelse. Norske råd er fisk til middag to–tre ganger i uka, noe av det fet fisk.',
 'Hvilken vanlig norsk matvare er den enkleste kilden til omega-3?',
 'Fet fisk er den rikeste vanlige kostkilden til marine omega-3-fettsyrer.',
 ['Fet fisk som makrell eller laks', 'Hvit ris', 'Kokte poteter', 'Sukkertøy'])

add('POST-103',
 'Halve tallerkenen grønt er en tommelfingerregel verdt å holde',
 'Den billigste helseoppgraderingen er som regel grønnere, ikke dyrere.',
 'Norske råd — «fem om dagen» — er fem never grønnsaker, frukt og bær hver dag. Fyller du halve tallerkenen med grønnsaker, faller resten av måltidet på plass.',
 'Norske kostråd er å spise minst fem never grønnsaker, frukt og ____ hver dag.',
 '«Fem om dagen» teller grønnsaker, frukt og bær — rundt 500 g til sammen.',
 ['bær', 'godteri', 'fløte'])

add('POST-104',
 'Fullkorn holder energien jevn lenger',
 'Ikke alt brød gjør det samme med ettermiddagen din.',
 'Fullkornsbrød, havre og bygg gir fiber som bremser fordøyelsen og jevner ut blodsukkeret. «Brødskala’n» hjelper deg å finne de groveste, mest fullkornsrike brødene.',
 'Fullkornsbrød og loff påvirker blodsukkeret helt likt.',
 'Fiber i fullkorn bremser glukoseopptaket og gir jevnere energi enn raffinert korn.',
 ['Fakta', 'Myte'])

add('POST-105',
 'På Okinawa slutter de å spise ved 80 % metthet — med vilje',
 'Ett gammelt måltidsuttrykk er verdt å låne.',
 '«Hara hachi bu» er okinawansk vane med å spise til du er rundt 80 % mett, og så stoppe. Fordi metthetssignalene henger etter, betyr det å spise sakte og ta en pause ofte at du spiser mindre uten å føle deg snytt.',
 'Du spiser sakte og stopper ved «behagelig mett» framfor «stappmett». Hva følger som regel over uker?',
 'Metthetssignaler bruker rundt 20 minutter; en pause ved 80 % hjelper deg å matche inntaket til reell sult.',
 ['Lettere porsjonskontroll uten slanking', 'Umiddelbar vektøkning', 'Tap av all matlyst'])

add('POST-106',
 'Å spise med de nordiske sesongene gir variasjon og kortreist mat',
 'Kalenderen er en overraskende god handleliste.',
 'Rotgrønnsaker om vinteren, bær og grønt om sommeren — å spise i sesong holder måltidene varierte, ferske og ofte billigere. Koble noen nordiske råvarer til når de er på sitt beste.',
 'Koble hver nordiske matvare til sin typiske sesong.',
 'Sesongmat følger det som vokser og lagres godt gjennom det nordiske året.',
 [{'left': 'Rotgrønnsaker', 'right': 'Høst og vinter'},
  {'left': 'Bær', 'right': 'Sensommer'},
  {'left': 'Ferske erter', 'right': 'Førsommer'}])

add('POST-107',
 'Boks-pust er en firetakts reset for et travelt hode',
 'En firkant du kan tegne med pusten.',
 'Boks-pust — pust inn 4, hold 4, pust ut 4, hold 4 — brukes av alt fra sykepleiere til marinemannskap for å roe nervesystemet. Noen rolige runder kan senke stressfølelsen på minutter.',
 'Hvor lang er hver av de fire fasene i boks-pust?',
 'Like lange innpust, hold, utpust og hold senker pusten og roer aktiveringen.',
 ['Like lange, rundt fire sekunder hver', 'Tilfeldige lengder', 'Bare innpusten teller', 'Femten minutter hver'])

add('POST-108',
 'Dobbel innpust og lang utpust løfter humøret raskest',
 'Kroppen kan denne allerede — det er et sukk.',
 'I en Stanford-studie ga fem minutter om dagen med «syklisk sukk» — to innpust gjennom nesa, så en lang, rolig utpust — bedre humør og lavere pustefrekvens enn både mindfulness-meditasjon og annen pusteøvelse.',
 'Du gjør fem minutter syklisk sukk daglig i en måned. Ut fra studien, hva er sannsynlig effekt?',
 'Den lange utpusten øker parasympatisk «hvile»-aktivitet; studien fant bedre humør og lavere pustefrekvens.',
 ['Bedre humør og roligere pust', 'Høyere hvilepuls', 'Ingen endring i det hele tatt'])

add('POST-109',
 'Rundt seks pust i minuttet er rolighetens søte punkt',
 'Sakte nok, og hjerte og pust begynner å følge hverandre.',
 'Koherent pust betyr å senke til omtrent seks pust i minuttet — rundt fem sekunder inn, fem sekunder ut. I dette tempoet stiger hjerteratevariabiliteten, og mange kjenner seg merkbart roligere.',
 'Koherent pust senker deg til omtrent ____ pust i minuttet.',
 '~6 pust/min (5 s inn, 5 s ut) øker hjerteratevariabiliteten knyttet til ro.',
 ['seks', 'tretti', 'seksti'])

add('POST-110',
 'Tjue minutter i naturen senker stresset målbart',
 'Friluftsliv er ikke bare hyggelig — det er fysiologi.',
 'Å tilbringe rundt tjue minutter i naturlige omgivelser er nok til å senke stresshormonnivået i studier. I Norge gjør friluftslivet dette til en av de enkleste ro-vanene å holde hele året.',
 'Du trenger en lang villmarkstur for å få naturens roende effekt.',
 'Selv en kort «naturdose» på 20 minutter i en park senker kortisol — ingen ekspedisjon nødvendig.',
 ['Fakta', 'Myte'])

add('POST-111',
 'En nedtrappingsrutine forteller kroppen at det er tid for søvn',
 'Søvnen starter før hodet treffer puta.',
 'Dempet lys, avstand til skjermer og lavere tempo den siste timen hjelper melatoninet å stige og kroppen å skifte mot søvn. En fast rekkefølge av steg trener signalet over tid.',
 'Sett en enkel kveldsnedtrapping i fornuftig rekkefølge.',
 'Mindre lys og stimuli lar melatoninet stige og letter overgangen til søvn.',
 ['Demp lyset en time før leggetid', 'Legg vekk skjermene', 'Gjør noe rolig og stille', 'Sovner lettere'])

add('POST-112',
 'Korte pauser slår ett langt sammenbrudd på slutten av dagen',
 'Hvile virker bedre i små, hyppige doser.',
 'Noen ekte pauser gjennom dagen — et rolig pust, et blikk ut vinduet, en kort gåtur — hindrer stresset i å hope seg opp. Liten, jevnlig restitusjon er lettere å holde enn å spare alt til kvelden.',
 'Hvilken type hvile holder best dagsstresset fra å bygge seg opp?',
 'Hyppig mikro-restitusjon hindrer at stress hoper seg opp, mer pålitelig enn én sen reset.',
 ['Korte, hyppige pauser gjennom dagen', 'Ett langt sammenbrudd sent på kvelden', 'Aldri ta pause', 'Bare fri i helgene'])

# ---- Mening-pilaren: formål/ikigai ----------------------------------------
add('POST-113',
 'En følelse av mening henger sammen med å leve lenger',
 'Å kjenne ditt «hvorfor» gjør mer enn å løfte en tung dag.',
 'I blåsonene har eldre en klar grunn til å stå opp — ikigai på Okinawa, plan de vida i Nicoya. Studier knytter en sterk følelse av mening til lavere dødelighet og bedre helse når vi blir eldre.',
 'Mening er bare en fin følelse — den har ingen målbar sammenheng med helse.',
 'Forskning knytter en sterkere følelse av mening i livet til lavere dødelighet av alle årsaker og bedre helse.',
 ['Fakta', 'Myte'])

add('POST-114',
 'Å være til nytte for andre er en stille langlevd-forsterker',
 'Mening peker ofte utover, ikke innover.',
 'Mye av blåsone-meningen handler om å bidra — å være til nytte for familie og fellesskap. Å hjelpe andre henger sammen med bedre trivsel, og i Norge er det så nært som nærmeste dugnad eller frivillig.no.',
 'I blåsone-kulturer er mening oftest knyttet til hva?',
 'Å bidra og være til nytte for andre er en gjenganger i samfunn med mange langlevde.',
 ['Å være til nytte for familie og fellesskap', 'Å eie flere ting', 'Å pensjonere seg så tidlig som mulig', 'Å jobbe alene'])

add('POST-115',
 'Å sette ord på det som betyr noe gjør daglige valg lettere',
 'Et tydelig hvorfor gjør viljestyrke om til retning.',
 'Når du kan sette ord på det du verdsetter — helse for familien, tid i naturen, å være der for venner — slutter de små daglige valgene å være en kamp. Hvorforet drar lasset, ikke ren viljestyrke.',
 'En tydelig følelse av hva som betyr noe gjør viljestyrke om til ____.',
 'Å forankre vaner i egne verdier gjør dem selvbærende framfor tvungne.',
 ['retning', 'støy', 'press'])

add('POST-116',
 'En ukentlig pause på det som betydde noe styrker meningen',
 'Mening vokser når du legger merke til den.',
 'Å reflektere jevnlig over hva som føltes meningsfullt — selv kort — henger sammen med større trivsel. Det er det motsatte av endeløs scrolling: et kort, avgrenset tilbakeblikk som hjelper de gode øyeblikkene å telle.',
 'Du bruker ett minutt hver uke på å notere hva som føltes meningsfullt. Over tid, hva pleier å skje?',
 'Kort, jevnlig refleksjon over mening henger sammen med høyere trivsel.',
 ['En sterkere følelse av trivsel', 'Ingenting målbart', 'Mer stress'])

add('POST-117',
 'Mening kobler dagens små valg til en lengre fortelling',
 'Den beste grunnen til å bevege deg i dag kan ligge 20 år fram.',
 'Blåsone-mening tar det lange perspektivet: å ta vare på barnebarna, gi videre ferdigheter, holde seg i stand. Koble noen hverdagsvalg til framtiden de beskytter.',
 'Koble hvert daglige valg til det det beskytter over tid.',
 'Små, gjentatte valg er måten et langsiktig hvorfor bygges på, dag for dag.',
 [{'left': 'En kort gåtur i dag', 'right': 'Å kunne gå senere'},
  {'left': 'Et delt måltid', 'right': 'Bånd som varer'},
  {'left': 'En rolig kveld', 'right': 'Jevn energi i morgen'}])


# ---- Bygg nb-datasettet ----------------------------------------------------
def bygg_options(base_opts, base_ca, gt, nb_opts):
    """Returner (options, correct_answer) på norsk, med struktur fra engelsk."""
    if gt in ('Match the Terms',):
        return nb_opts, [dict(o) for o in nb_opts]
    if gt in ('Match the Pairs',):
        return nb_opts, [dict(o) for o in nb_opts]
    if gt in ('Order the Events',):
        return nb_opts, list(nb_opts)  # rekkefølgen ER fasit
    # Tap-valg: finn engelsk fasit-indeks, bruk norsk på samme plass
    idx = base_opts.index(base_ca)
    return nb_opts, nb_opts[idx]

posters_ut = []
for p in BASE['posters']:
    pid = p['id']
    if pid in POSTER:
        dekker, slagord, bio = POSTER[pid]
    else:
        dekker, slagord, bio = p['dekker'], p['slagord'], f"En fiktiv Aha-guide for {p['dekker'].lower()}."
    posters_ut.append({**p, 'dekker': dekker, 'slagord': slagord, 'bio': bio})

posts_ut = []
mangler = []
for p in BASE['posts']:
    tr = T.get(p['id'])
    if not tr:
        mangler.append(p['id'])
        continue
    g = p['spill']
    opts, ca = bygg_options(g['options'], g.get('correct_answer'), g['game_type'], tr['o'])
    ny = dict(p)
    ny['kategori'] = KAT[p['kategori']]
    ny['underkategori'] = UNDERKAT.get(p['underkategori'], p['underkategori'])
    ny['serie'] = SERIE.get(p['serie'], p['serie'])
    ny['tittel'] = tr['t']
    ny['hook'] = tr['h']
    ny['sammendrag'] = tr['s']
    ny['spill'] = {**g, 'prompt': tr['p'], 'explanation': tr['e'], 'options': opts, 'correct_answer': ca}
    posts_ut.append(ny)

if mangler:
    raise SystemExit(f'Mangler oversettelse for: {mangler}')

ut = {**BASE, 'sprak': 'nb', 'beskrivelse': 'Spillbar lærings-feed på norsk (Aha-seed): 117 innlegg med minispill, kilder og fiktive redaksjonelle guider.', 'posters': posters_ut, 'posts': posts_ut}
json.dump(ut, open('/home/user/CRM-salgssystem/data/feed.json', 'w'), ensure_ascii=False, indent=1)
print('feed.json (norsk base) skrevet:', len(posts_ut), 'innlegg')

# Sanity: fasit konsistent
for p in posts_ut:
    g = p['spill']
    if g['game_type'] in ('Correct Answer', 'Predict What Happened', 'Fact or Myth'):
        assert g['correct_answer'] in g['options'], p['id']
    elif g['game_type'] == 'Order the Events':
        assert sorted(g['options']) == sorted(g['correct_answer']), p['id']
print('sanity ok')
