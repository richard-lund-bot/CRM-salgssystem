# Dario

**Der arbeidsdagen starter.** Dario er en klikkbar prototype av en felles arbeidsflate for Brødrene Dahl. Dario er i dag en samling verktøy, og her blir han hele suiten og en kollega med stemme. Han leser e-post, intranett og nyheter i segmentet ditt, kobler dem mot kunder og kalender, og snakker deg gjennom dagens prioriteringer. Han vises som en svevende kule av punkter som beveger seg i takt med stemmen. Hver ansatt får sin variant, og en tilgangstabell styrer hvem som har hva.

> Prototype med **fiktive data**. Det finnes ingen ekte koblinger mot Outlook, intranett, CRM eller tilbudsverktøyet ennå. Se drøftelsen for hvordan det kan bygges.

- **Prototypen:** `index.html`
- **Drøftelsen** (konsept, Darios stemme og nærvær, arkitektur, personvern, faser og åpne spørsmål): `drofting.html`, også under «Drøftelse» i appen

## Hva du kan prøve

| Modul | Hva den viser |
|---|---|
| Dagens brief | Dario leser briefen høyt med innspilt stemme og teksting, og kula reagerer på stemmen. Nøkkeltall, rangerte prioriteringer med «hvorfor», tidslinje, pipeline, intranett og segmentradar |
| E-post | Innboksen sortert etter hva som krever deg, med svarutkast som aldri sendes automatisk |
| Tilbud | Tilbudsutkast startet fra en prioritet eller e-post, der konteksten er fylt inn |
| Kunder / Kalender | Kunde-360 og kundemøter som er ferdig forberedt |
| Team-pipeline | Lederflate som bare bygger på CRM-tall, uten innsyn i ansattes e-post |
| Tilgangstabell | Rolle-maler, individuelle unntak (U) og tidsbegrensede delegeringer (D), med endringslogg |

Bytt person i «Vis som» øverst for å se hvordan suiten endrer seg med rolle og tilgang. Velg «Tor Vik · Salgssjef» for å redigere tilgangstabellen og delegere.

## Darios stemme

Briefen er spilt inn på forhånd med Piper, en lokal og åpen talesyntese, og den norske stemmen `no_NO-talesyntese-medium` fra Språkbanken (CC0). Klangen er justert litt med ffmpeg. Klippene ligger i `assets/stemme/`, og `manifest.json` slår opp setning → fil. Mangler et klipp, bruker appen nettleserens norske stemme.

Endrer du data eller manus, må stemmen lages på nytt (`npm test` feiler til det er gjort):

```sh
pip install piper-tts            # og ffmpeg
# last ned no_NO-talesyntese-medium.onnx + .onnx.json fra huggingface.co/rhasspy/piper-voices
node scripts/manus.mjs > manus.json
python3 scripts/lag-stemme.py --modell no_NO-talesyntese-medium.onnx manus.json
```

I produksjon anbefales en nevral skystemme (Azure AI Speech nb-NO), og på sikt en egen Dario-stemme. Se drøftelsen.

## Kjøre lokalt

```sh
python3 -m http.server 8000   # åpne http://localhost:8000
npm test                      # rene funksjoner: tilgang, prioritering, brief
npm install && npm run e2e    # Playwright: alle moduler for alle personer, mobil og desktop
```

## Struktur

```
index.html            app-skall
drofting.html         drøftelsen
css/dario.css         «JARVIS i BD-blått»: BD-blå + Vann som eneste støttefarge, Arial
js/app.js             ruter, skall og alle visninger
js/data.js            fiktive demodata: moduler, roller, ansatte, signaler, kunder, kalender
js/prioritering.js    regelbasert og forklarbar prioriteringsmotor (rene funksjoner)
js/tilgang.js         effektiv tilgang = rolle-mal + unntak + delegeringer (rene funksjoner)
js/brief.js           Darios manus, skrevet for øret
js/orb.js             Dario som svevende punktkule (canvas) som følger lydnivået
scripts/test.mjs      enhetstester
scripts/e2e.cjs       E2E-røyktest
scripts/manus.mjs     alle setninger Dario sier i demoen
scripts/lag-stemme.py lager stemmeklippene
assets/               BD-kuben (ikon) og stemme/ (Darios klipp)
```

## Historikk

Repoet het tidligere CRM-salgssystem og har inneholdt en ringeliste-CRM og deretter treningsappen Takt. Begge finnes i git-historikken på `main`.
