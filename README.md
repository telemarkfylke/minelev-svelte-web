# MinElev WEB
SvelteKit Web app

## Avhengigheter
- MongoDb database
- Azure app registration som representerer backend
- FINT-FOLK api

## Deployment
Deploy som Azure Web App, med authentication enabled via microsoft authentication. Authentication modulen injecter 
Startup command: `node /home/site/wwwroot/build/` (evt `ORIGIN=https://{minelevurl}.no node /home/site/wwwroot/build/` dersom du deployer bak app gateway / load balancer ellerno)

## Løsningsbeskrivelse
### Hjem
- Backend henter brukerdata + elever, klasser, og gyldige dokumenttyper som bruker har tilgang på
- Henter siste aktivitet (siste dokumenter) for elever og dokumenttyper man har tilgang på

### Elever
- Viser oversikt over elevene man har tilgang på. Kan klikke seg videre til eleven

### Elever/{feidenavnPrefix}
- Viser elevdokumenter man har tilgang på, og man kan opprette nye dokumenter

### Elever/{feidenavnPrefix}/nyttdokument
- Her kan man opprette et nytt dokument for eleven

### Elever/{feidenavnPrefix}/dokumenter/{dokumentid}
- Viser informasjon om et spesifikt dokument

### Klasser
- Viser oversikt over klasser man har tilgang på

### Klasser/{klasseid}
- Viser elevene i en gitt klasse

### Admin
- Viser admin-greier

## Tilgangsstyring
### Lærer
- Henter elever fra lærerens basisgrupper og undervisningsgrupper
- Per elev - sjekker hvilke dokumenttyper læreren kan opprette, og på hvilke skoler
- Sjekk dokumenttyper og tilgangskrav i [document-types.js](./src/lib/document-types/document-types.js)

### Leder
TODO
- Leder / Rådgiver har ikke tilgang på å produsere dokumenter, men skal kunne se dokumenter tilhørende skolen(e) de har tilgang på. Og se statistikk for skolen de har tilgang på.
- Tilgang styres først ved at de har tilgang på leder / rådgiver rollen fra app registration / enterprise appen for frontend, og deretter mot mongodb for å sjekke hvilke skole(r) de har tilgang på

## YFF beskrivelse
Tilleggsmodul for Yrkesfaglig fordypning, for å dokumentere utplassering, opprette / redigere lokal læreplan, og sende tilbakemelding på en utplassering

### Angående oppretting av YFF-dokumenter
Tilgang til å opprette yff-dokumenter valideres først på elev-nivået (ikke på FINT-kallet for lærer, slik som de andre dokumenttypene, e.g varsel), for å slippe å sjekke utdanningsprogrammet til alle elevene til læreren når elevene hentes. Vi henter først utdanningsprogram når elevens data hentes, deretter sjekker vi om grep-referanse til utdanningsprogrammet er yrkesfaglig. Gyldige dokumenttyper valideres deretter på nytt for eleven (om yff kan opprettes).

Alle lærere får i utgangspunktet se YFF-dokumenter i aktivitetsloggen for sine elever.

### Tilgang på YFF-modulen
- Dersom YFF er enabled, har alle lærere tilgang automatisk til å se alle YFF-dokumentene for en elev (både faglærer og kontaktlærer)
- Dersom YFF er enabled, har alle lærere tilgang på å opprette YFF-dokumenter på en elev, så lenge de har tilgang på eleven - OG dersom elevens utdanningsprogram ved skolen lærer har tilgang på er yrkesfaglig!
- Om et utdanningsp

### Hvem har YFF
- Skolen må ha YFF enabled (vtfk-schools-info)
- Enten
  - Eleven er medlem av klasse med fagkode som inneholder "yff" (kanskje ta en titt på fagkodene)
  - Eleven har utdanningsprogram.type === 'yrkesfaglig' eller 'ukjent'
  - Eleven mangler utdanningsprogram
- Sjekk rett på eleven når den slås opp fra FINT-FOLK (drit i på forhånd ved lærerdata)
- Alle lærere kan se utplasseringen til eleven, hvis de har tilgang på eleven ved YFF-skole, og de kan også redigere YFF-greiene. Så lenge eleven er yrkesfaglig liksom.
- Kan da slå opp grep-referansen på programområde til eleven, og sjekke direkte om den er yrkesfaglig

- Sjekk heller om læreren har en klasse ved yff-skole der faget er "yff"? Kan også slå opp på eleven da - for å sjekke utdanningsprogam
- Må spørre Greppern, kanskje like greit å spørre om et og et utdanningsprogram per undervisningsforhold. Hvor mange utdanningsprogram har vi egt? Kan vi cache det i minne eller fil?

### YFF-bekreftelse
Bekreftelse på en utplassering har denne dataen
- Organisasjon / bedrift
  - Hvilken organisasjon (søkes opp i brreg, henter data om bedriften)
  - Avdeling (valgfritt)
  - Oppmøtested
  - Kontaktperson(er) for bedriften (minst en)
    - Navn
    - Telefon (valgfritt)
    - Epost (valgfritt)
    - Avdeling (valgfritt)
  - Kopi på epost (valgfritt)
    - Liste over kopimottakere som får bekreftelsen på epost
    - Hjelpetekst: Noen ganger er det enklere sagt enn gjort at korrekt mottaker hos utplasseringsbedriften mottar brevene som sendes, i de tilfellene kan man legge kontaktpersonen(e) som kopimottager, og de vil få tilsendt kopi av dokumentene på e-post i tillegg.
- Tidsrom for utplassering
  - Fra og med (dato)
  - Til og med (dato)
  - Antall dager i uken
  - Fra klokken
  - Til klokken
- Kontaktinformasjon til elevens pårørende (minst en)
  - Navn
  - Telefon

### YFF-laereplan
OBS OBS - en læreplan kan lagres og redigeres, i tillegg til å sendes / arkiveres
Lokal læreplan med kompetansemål for utplasseringen har denne dataen
- Valgt utplasseringssted. Enten bedrift som det er opprettet utplassering på allerede, eller "Skole" eller "Ungdomsbedrift (entreprenørskap)"
  - Hvis skole - må velge Skole fra skoleoversikt (vtfk-schools-info)
- Hent kompetansemål fra (VG1, VG2, VG3) (kan vi ikke hente det fra eleven mon tro?)
- Velg utdanningsprogram (hentes fra grep ellerno?) (kan vi ikke hente det fra eleven mon tro?)
- Velg programområde (hentes fra grep ellerno) (kan vi ikke hente det fra eleven mon tro?)
- Velg kompetansemål (hentes fra grep ellerno) (kanskje vi kan hente også basert på eleven?)
- For hvert kompetansemål man velger kan man også skrive inn spesifikke arbeidsoppgaver (eller la det stå blankt)

### Tilbakemelding på utplassering
En tilbamelding på utplassering kan først opprettes når en lokal læreplan og utplassering er på plass
- Bedriften som utplasseringen har vært på
  - Navn på bedrift
  - Tidsrom + dager i uken
  - Bedriftens kontaktperson m evt tlf / epost
- Kompetansemål og arbeidsoppgaver
  - Målene fra læreplanen og valg:
    - Lav måloppnåelse
    - Middels måloppnåelse
    - Høy måloppnåelse
- Virksomhetens inntrykk av eleven
  - Ser ut som hardkoda liste over punkter med valg:
    - Under forventet
    - Som forventet
    - Over forventet
    - Ikke aktuelt
- Orden og atferd
  - Orden (punktlighet)
    - Under forventet
    - Som forventet
    - Over forventet
  - Atferd (holdninger, respekt)
    - Under forventet
    - Som forventet
    - Over forventet
- Fravær under utplasseringen
  - Antall hele dager fravær
  - Antall timer timer fravær
  - Varslet eleven selv om fraværet
    - Ja
    - Nei
    - Av og til
    - Ikke aktuelt

### Flyt i ny løsning
Du kan alltd opprette bekreftelse på utplassering (så mange du vil)
Du kan alltid opprette lokal læreplan, og den KAN knyttes til en utplassering, en skole, eller ungdomsbedrift
En lokal læreplan kan også redigeres - men bare frem til det er opprettet en tilbakemelding på utplassering?? Eller frem til den er sendt og arkivert?
Kun lokal læreplan knyttet til utplassering kan brukes til tikbakemelding på utplassering?? Ingen er sikre, så vi får ta høyde for litt mer her?
Du kan opprette tilbakemelding på utplassering dersom det både foreligger en bekreftet utplassering og en lokal læreplan for denne utplasseringen (som er sendt / arkivert)

- Lagre en yff-utplassering i mongodb (bruk _id som nøkkelen) når det opprettes en bekreftelse
- Lagre en yff-laereplan i mongodb når det opprettes en laereplan. Denne kan redigeres. OBS vtfk-løsning lagrer et og et mål i mongodb - hvorfor det mon tro?


Spørsmålet er - skal jeg legge alt på nyttdokument-siden?? Eller lage en eget elever/feidenavnPrefix/yff ellerno
Hvis jeg legger det på nyttdokument:
- Har valgt dokumentttype og skole
- Hvordan redigere en læreplan da! - Klikk rediger - bli sendt til nyttdokument?document_type=yff-laereplan&id={laereplan_id}
- Kan da ha et felt for "laereplan", med valg NY f.eks? Og hvis den er valgt, så redigerer man en eksisterende??


## Developing
Once you've installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
