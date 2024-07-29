# MinElev WEB
SvelteKit Web app

Deploy som Azure Web App, med authentication enabled

## Notater
- Hvordan løse dokumentdriten
Når elever hentes, hent også skoler, og per skole, hvilke dokumenttyper som er lovlige:
elev: {
  kontaktlærer: ja/nei
}


## Behovet for løsningen
- Sende varselbrev (fag, orden, atferd) til elever (med arkivering og utsending SvarUT)
- Dokumentere om eleven har hatt elevsamtale / ikke ønsker elevsamtale
- YFF-modul for skoler som ønsker
  - Opprett og send bekreftelse på utplassering YFF
  - Opprett og send læreplan i YFF
  - Opprett og send tilbakemelding på læreplan i YFF

## Løsningsbeskrivelse
- Starter med hovedside der en lærer / rådgiver / admin logger på
### Hjem
- Lærer
  - Vises siste aktivitet for lærers elever (dokumenter som er opprettet / sendt)
- Rådgiver / Leder
  - Vises site aktivetet for leder / rådgviers elever (alle ved skolen)
- Admin
  - Mulighet for å "logge inn som" en lærer for å feilsøke
  - Potensielt slette / sette dokumenter til utgår

### /Elever
- Lærer
  - Lister opp lærerens elever
- Rådgiver / Leder
  - Lister opp skolens elever

### /Elever/{feidenavnPrefix}
- Lærer
  - Henter elevdata (dersom lærer har tilgang på eleven)
  - Henter dokumenttyper lærer har tilgang på for eleven (faglærer har kun tilgang til varsel-fag, og potensielt YFF, kontaktlærer har tilgang på alle)
  - Henter elevens tidligere dokumenter (basert på gyldige dokumenttyper)
  - Lister opp eleven med tilhørende nyeste dokumenter
  - Knapper for å opprette nye dokumenter
- Rådgiver / Leder
  - Lister opp eleven med tilhørende nyeste dokumenter

### /Elever/{feidenavnPrefix}/???

### /Klasser
- Lærer
  - Lister opp undervisningsgrupper og basisgrupper for en lærer
- Rådgiver / Leder
  - Lister opp undervisningsgrupper og basisgrupper ved skolen

### /Klasser/{klasseId}
  - Lister opp elever i klassen


## Server-side
### Hjem (/)
Henter bruker basert på ms-headers (kommer fra authentication i Azure Web App)
Sjekker rolle, henter data (lærer / elever / klasser / skoler) for brukeren
Denne dataen er så tilgjengelig for alle underliggende ruter i frontend

### /elever/{feidenavnPrefix}
#### For lærer
Henter og returner
- Faggruppene til eleven
- Faggruppene som matcher undervisningsgruppene til læreren
- Dokumenttyper læreren har tilgang til å opprette / se
- Nyeste dokumenter av det læreren kan se

#### For rådgiver / leder
- Nyeste dokumenter av det rådgiver / leder kan se

### elever/{feidenavnPrefix}/dokumenter
- Lister opp alle dokumenter for eleven som lærer har tilgang på

### elever/{feidenavnPrefix}/dokumenter/{dokumentid}
- Lister opp alle dokumenter for eleven som lærer har tilgang på

### elever/{feidenavnPrefix}/nyttdokument
- Form for å opprette enten nytt varsel eller elevsamtale

### elever/{feidenavnPrefix}/yff - må finnes ut av

## Roller
# Lærer (default)
Vanlig

# Leder (.Leder)
Tilgang på hele skolen sin (om det trengs da, venter nok til over sommeren)

# Admin (.Admin)
Meg. Jeg trenger å logge inn som lærer for å se hvordan det ser ut for hen.
// Enten via mongodb
// Eller man må override lokalt?
// Eller via node-cache?
// Kanskje bare via node-cache, som går ut etter 30 min?
// Og logges til mongodb?


# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/main/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

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
