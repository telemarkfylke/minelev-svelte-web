# MinElev WEB
SvelteKit Web app

## Generell beskrivelse
Web app der lærere kan logge på, velge en elev de har tilgang på, for så å se eller opprette dokumenter som legges i køen til [MinElev Roboten](https://github.com/vtfk/minelev-robot).

Kontaktlærere kan opprette og se:
- Varsel atferd
- Varsel orden
- Elevsamtale gjennomført / ikke gjennomført
- Notat

Faglærere kan opprette og se:
- Varsel fag
- Notat

Ledere kan se:
- Alle elever og dokumenter for skolen sin

Dersom YFF-modulen er skrudd på, kan lærere som har elever som går et yrkesfaglig utdanningsprogram også opprette og se:
- Bekreftelse på utplassering
- Lokal læreplan
- Tilbakemelding på utplassering

## Avhengigheter
- MongoDb database
- Azure app registration som representerer backend - for server-side kall
- [Azure web app med Entra ID built-in authenticaton](https://learn.microsoft.com/en-us/azure/app-service/overview-authentication-authorization)
- [FINT-FOLK-API](https://github.com/vtfk/azf-fint-folk-api)

## Arkitektur
Et SvelteKit prosjekt som kjøres på en Azure app service / Azure web app på nodejs runtime

### Built-in authentication (Entra ID)
- Alle kall mot web-appen går gjennom Azure built in authentication. Bruker-info injectes i header før requestene til slutt når web-appen.
- Videre api-kall mot FINT osv skjer server-side.

### Authorization
#### Lærer
- Kun tilgang på elever de har tilgang på i VIS. Tilgang på dokumenttyper basert på om de er faglærer eller kontaktlærer for en elev.

#### Leder
- Ikke tilgang til å produsere dokumenter, kun se.
- Tilgang på alle elever og tilhørende dokumenter ved en skole de har tilgang på.
- Tilgang styres basert på Entra ID tilgangsgrupper. En per skole.
- Legg til en bruker i skolens tilgangsgruppe for å gi brukeren tilgang på alle dokumenter for skolen
- Gruppenavn: A-TILGANG-MINELEV-LEDER-{SKOLEKORTNAVN}
- Gruppebeskrivelse: Gruppe for å gi leder / rådgiver tilgang til {Skolenavn} i MinElev
- Gruppen må også legges til på enterprise appen, med rollen "Leder"

#### Admin
- Tilgang til å se hvilke brukere som har leder-tilgang

## Deployment
Deploy som Azure Web App, med authentication enabled via entra-id authentication. 
Startup command: `node /home/site/wwwroot/build/` (evt `ORIGIN=https://{minelevurl}.no node /home/site/wwwroot/build/` dersom du deployer bak app gateway / load balancer ellerno)

## Løsningsbeskrivelse
På rot (+layout.sever.js) hentes data for brukeren
- Hvilken bruker det er
- Hvilke elever brukeren har tilgang på, og per elev:
  - Hvilke dokumenter brukeren har tilgang til å opprette / se på denne eleven, og på hvilke skoler
- Hvilke klasser brukeren har tilgang på, og hvilke elever som er i disse klassene

Brukeren kan se en oversikt over disse elevene i /elever, og klikke seg videre inn på /elever/[feidenavnPrefix]

På /elever/[feidenavnPrefix] hentes også faggruppene til eleven (fordi det ikke finnes noen relasjon mellom lærer og faggrupper i FINT... og vi trenger faggrupper for varsler i fag). På denne siden kan en bruker opprette dokumenter om hen har tilgang til å gjøre det.

På /elever/[feidenavnPrefix]/nyttdokument kan brukeren velge en dokumenttype hen har tilgang til å opprette på denne eleven, fylle inn nødvendig data, og se forhåndsvisning eller lagre dokumentet til MinElev-køen.

På /elever/[feidenavnPrefix]/dokumenter/[dokumentId] hentes data for dette dokumnetet dersom brukeren har tilgang til det

På rot kan man også se overordnet statistikk for alle skoler, og statistikk for sine basisgrupper, dersom man har basisgrupper.

På /klasser kan man se en oversikt over sine klasser, og klikke seg videre inn på en klasse

På /klasser[klasseid] kan man se hvilke elever man har i den klassen og klikke seg videre inn på en elev. Dersom det er en basisgruppe, kan man også alle dokumentene for denne basisgruppen

## Bare litt info om man skal gjøre no utvikling her
### Dokumenttyper
Om du trenger å legge til en dokumenttype - legg inn her [./src/lib/document-types/document-types.js](./src/lib/document-types/document-types.js)
- Velg en accessCondition for dokumenttypen eller opprett en ny dersom det trengs (implementer den nye evt i [./src/lib/minelev-api/get-user-data.js](./src/lib/minelev-api/get-user-data.js))
- Se på en av de andre dokumenttypene for å se hvordan den skal se ut
  - Metadata for dokumenttypen (navn osv)
  - matchContent property (hva slags data kreves for at dokumentet har alt den trenger / er "ferdig")
  - generateContent funksjon, tar inn student, og content. Content er input fra brukeren, student er data på valgt elev. Det som returneres av generateContent må matche det i matchContent property for dokumenttypen
  - smell på isEncrypted: true dersom du trenger at content blir kryptert med custom nøkkel i databasen

### Data-henting
- Gjør all data-henting server-side. Pass på hva du returnere til frontend / sluttbruker

## YFF beskrivelse
Tilleggsmodul for Yrkesfaglig fordypning, for å dokumentere utplassering, opprette / redigere lokal læreplan, og sende tilbakemelding på en utplassering

### Angående oppretting av YFF-dokumenter
Tilgang til å opprette yff-dokumenter valideres først på elev-nivået (ikke på FINT-kallet for lærer, slik som de andre dokumenttypene, e.g varsel), for å slippe å sjekke utdanningsprogrammet til alle elevene til læreren når elevene hentes. Vi henter først utdanningsprogram når elevens data hentes, deretter sjekker vi om grep-referanse til utdanningsprogrammet er yrkesfaglig. Gyldige dokumenttyper valideres deretter på nytt for eleven (om yff kan opprettes).

Alle lærere får i utgangspunktet se YFF-dokumenter i aktivitetsloggen for sine elever.

### Tilgang på YFF-modulen
- Dersom YFF er enabled, har alle lærere tilgang automatisk til å se alle YFF-dokumentene for en elev (både faglærer og kontaktlærer)
- Dersom YFF er enabled, har alle lærere tilgang på å opprette YFF-dokumenter på en elev, så lenge de har tilgang på eleven - OG dersom elevens utdanningsprogram ved skolen lærer har tilgang på er yrkesfaglig eller ukjent.
- Data om utdanningsprogram hentes via SparQl-spørringer mot GREP (udir) - sjekk [greo.js](./src/lib/minelev-api/grep.js) om du er nysgjerrig, og har altfor mye tid...

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
  - Hardkodet liste med valg, se [yffEvalueringsdata](./src/lib/document-types/data/document-data.js)
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
- Man kan alltid opprette bekreftelse på utplassering (så mange man vil)
- Man kan alltid opprette en lokal læreplan (så mange man vil). En lokal læreplan KAN knyttes til en bekreftelse på utplassering - eller en skole, eller en ungdomsbedrift
  - En lokal læreplan kan også redigeres underveis i utplasseringen - men den låses for redigering når det har kommet en tilbakemelding på utplasseringen den er knyttet til.
  - Alle nye versjoner av en læreplan legges i MinElev-køen.
- Man kan KUN opprette en tilbakemelding på en utplasssering, der det foreligger en bekreftelse på utplasseringen OG det er opprettet en lokal læreplan knyttet til den samme utplasseringen.

### BRREG
- Bruker brreg til å søke opp bedrifter, enten på navn eller orgnr, for å knytte en bekreftelse på utplassering til en bedrift. Se [./src/lib/minelev-api/brreg.js](./src/lib/minelev-api/brreg.js) og [brreg api-dokumentasjon](https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html)

### GREP
- Brukes til å hente utdanningsprogrammer, programområder, og kompetansemål fra udir via noen sparQl-spørringer... Se [./src/lib/minelev-api/grep.js](./src/lib/minelev-api/grep.js) og [grep api-dokumentasjon](https://github.com/Utdanningsdirektoratet/Grep_SPARQL/wiki)


## Developing
Opprett en .env fil med følgende verdier (bytt ut med reelle verdier da)
```bash
PUBLIC_ELEVDOK_URL="https://elevdok.fylke.no"
PDF_API_KEY="nøkkel til pdf-api"
PDF_API_URL="https://pdf.api.fylke.no/api/generate"
MOCK_AUTH="true | false" # Om lokal utvikling, sett til true
MOCK_API="true | false" # Om du bare knoter med frontend, så kan den settes til true
MOCK_AUTH_LARER_ROLE="true | false" # Om mock-auth er true, har du default-rollen?
MOCK_AUTH_LEDER_ROLE="true | false" # Om mock-auth er true, har du leder-rollen?
MOCK_AUTH_ADMIN_ROLE="true | false" # Om mock-auth er true, har du admin-rollen?
DEFAULT_ROLE="MinElev.Larer" # Sett til samme som i enterprise appen din
LEDER_ROLE="MinElev.Leder" # Sett til samme som i enterprise appen din
ADMIN_ROLE="MinElev.Admin" # Sett til samme som i enterprise appen din
APPREG_CLIENT_ID="dev backend appreg client id"
APPREG_CLIENT_SECRET="dev backend appreg client secret"
APPREG_TENANT_ID="dev backend appreg tenant id"
FEIDENAVN_SUFFIX="fylke.no"
MONGODB_CONNECTION_STRING="mongodb+srv://{user}:{pwd}@{cluster}.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB_NAME="minelev-test"
MONGODB_DOCUMENTS_COLLECTION="documents"
MONGODB_USER_SETTINGS_COLLECTION="user-settings"
MONGODB_USER_IMPERSONATION_COLLECTION="user-impersonation-log"
MONGODB_LEDER_SCHOOL_ACCESS_COLLECTION="leder-school-access"
FINTFOLK_API_URL="https://fintfolk.api.fylke.no/api"
FINTFOLK_API_SCOPE="https://fintfolk-{env}.api.fylke.no/.default"
MAINTENANCE_MODE="false | true"
ENCRYPTION_SECRET="en hemmelig custom enctryption secret"
YFF_ENABLED="false | true" # Om YFF-modulen er skrudd av eller på
BRREG_API_URL="https://{brreg-url}/enhetsregisteret/api" # Kreves av YFF-modulen
GREP_SPARQL_URL="https://{sparql-url}/repositories/{version}" # Kreves av YFF-modulen
FRONTEND_APP_ID="dev frontend appreg client id" # brukes for å hente ledertilganger
```


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
