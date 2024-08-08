# MinElev API

## GET api/students/[feidenavnPrefix]
- Sjekker om caller har rettighet til å hente elev

## GET api/students
- Henter elever brukeren har tilgang på

## GET api/students/[feidenavnPrefix]/documents?limit=10
- Henter dokumenter for eleven

## GET api/me
- Sjekker hvem brukeren er, og hvilke roller<>
- Skal enten hente elever for en lærer eller elever på en skole

## GET api/documents?limit=10&offset=100 (kanskje, muligens bare hente røkla hvis ingen limit)
- Henter de 100 første eller no som brukeren har tilgang på, kan vi bruke query params

## POST 

## POST api/elever/[feidenavnPrefix]newdocument
- Sjekker om brukeren har tilgang til å opprette dokumenttypen
- Oppretter dokumentet