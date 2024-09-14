import { logger } from '@vtfk/logger'
import { env } from '$env/dynamic/private'
import { getStudentDocuments } from './get-student-documents'
import vtfkSchoolsInfo from 'vtfk-schools-info'

// Skal også kunne klikke rediger på en læreplan, og vite om vi kan opprette en tilbakemelding. Kan vi få et endepunkt som returnerer dette og det andre? Nei trolig ikke, men de kan bruke de samme sjekkene. Så kan vi bare kjøre eget kall på elevsiden for å hente yff-ene med litt ekstra properties.

/**
 *
 * @param {import("$lib/authentication").User} user
 * @param {string} studentFeidenavn
 * @returns list of documents
 */
export const getAvailableLaereplaner = async (user, studentFeidenavn) => {
  const loggerPrefix = `getAvailableLaereplanUtplasseringer - user: ${user.principalName} - student: ${studentFeidenavn}`
  logger('info', [loggerPrefix, 'New request'])

  // Validate parameteres
  if (!user) {
    logger('error', [loggerPrefix, 'Missing required argument "user'])
    throw new Error('Missing required argument "user"')
  }
  if (!studentFeidenavn) {
    logger('error', [loggerPrefix, 'Missing required argument "studentFeidenavn'])
    throw new Error('Missing required argument "studentFeidenavn"')
  }
  logger('info', [loggerPrefix, 'Fetching available yff-documents for student'])
  const yffDocuments = await getStudentDocuments(user, studentFeidenavn, { types: ['yff'] }) // Lucky for us - documents here are returned newest first, so we don't have to check dates
  const laereplaner = yffDocuments.filter(doc => doc.variant === 'laereplan') // js filter preserves order of elements, so we don't mess with newest first
  const bekreftelser = yffDocuments.filter(doc => doc.variant === 'bekreftelse')
  const tilbakemeldinger = yffDocuments.filter(doc => doc.variant === 'tilbakemelding')
  logger('info', [loggerPrefix, `Found ${yffDocuments.length} yff-documents: ${bekreftelser.length} bekreftelser, ${laereplaner.length} laereplaner, and ${tilbakemeldinger.length} laereplaner`])

  const availableLaereplaner = []
  // Går gjennom læreplaner - lager opp "ferdige læreplaner" som IKKE har en tilbakemelding på seg, kan returneres og bygges videre på
  for (const laereplan of laereplaner) {
    // Sjekk om den utplasseringens id allerede er håndtert
    if (availableLaereplaner.some(plan => plan.utplassering.id === laereplan.content.utplassering.id)) continue // Siden lista vi iterer er sortert etter nyeste først
    // Sjekk om den har en tilbakemelding knyttet til utplasseringen allerede (da er den låst / ferdig)
    if (tilbakemeldinger.some(melding => melding.content.utplassering._id === laereplan.content.utplassering.id)) continue
    // Hvis ikke har vi den nyeste læreplanen for denne utplasseringen, der det ikke foreligger en tilbakemelding enda, vi legger til innholdet av læreplanen som tilgjengelig
    logger('info', [loggerPrefix, `Laereplan ${laereplan._id.toString()} is the latest one, and not completed (no tilbakemelding), adding content as available for editing`])
    availableLaereplaner.push(laereplan.content)
  }

  // Så går vi gjennom bekreftelser, og finner utplasseringer som ikke har noen læreplan i det hele tatt enda
  for (const bekreftelse of bekreftelser) {
    // Sjekk om utplasseringsens id allerede er håndtert (da har bekreftelsen allerede en læreplan knyttet til seg)
    if (availableLaereplaner.some(plan => plan.utplassering.id === bekreftelse._id.toString())) continue // Bekreftelser er "unike", samma om det er lagt inn på samme bedrift. Så her trenger vi ikke tenke på "nyeste først"
    // Sjekk om det er en tilbakemelding på utplasseringen allerede (dette krever en læreplan)
    const correspondingTilbakemelding = tilbakemeldinger.find(melding => melding.content.utplassering._id === bekreftelse._id.toString())
    if (correspondingTilbakemelding) {
      if (!laereplaner.some(plan => plan.content.utplassering.id === bekreftelse._id.toString())) {
        logger('warn', [loggerPrefix, `Bekreftelse ${bekreftelse._id.toString()} has tilbakemelding: ${correspondingTilbakemelding._id.toString()}, but apparently no laereplan - this should NOT be possible`])
      }
      continue
    }
    // Her har ikke utplasseringen en tilknyttet læreplan, og heller ikke en tilknyttet tilbakemelding. Da legger vi en "tom"/ny tilgjengelig læreplan for denne utplasseringen
    logger('info', [loggerPrefix, `Bekreftelse ${bekreftelse._id} does not have læreplan or tilbakemelding - adding utplassering with empty "maal" as available for creation/editing`])
    availableLaereplaner.push(
      {
        utplassering: {
          id: bekreftelse._id.toString(),
          name: bekreftelse.content.bekreftelse.bedriftsData.navn,
          maal: []
        }
      }
    )
  }

  // Så sjekker vi gjennom alle skoler for fylket på samme måte (hver skole behandles som en bekreftelse ish...)
  const countyNumber = env.FEIDENAVN_SUFFIX.toLowerCase().includes('telemarkfylke') ? '40' : '39' // Får lage mer generisk om det noensinne trengs
  const countySchools = vtfkSchoolsInfo({ countyNumber }).filter(school => school.yff)

  for (const school of countySchools) {
    const schoolUtplasseringsId = school.schoolNumber
    // Sjekk om utplasserings-skolen allerede har en læreplan (da er den gjeldende)
    if (availableLaereplaner.some(plan => plan.utplassering.id === schoolUtplasseringsId)) continue // En læreplan per skole som utplasseringssted
    // Dersom det enten finnes en tilbakemelding for skole-utplasseringen, eller dersom det ikke er noen læreplan der allerede, kan man lage ny læreplan på denne skolen.
    logger('info', [loggerPrefix, `Skole ${school.name} does not have active læreplan - adding skole-utplassering with empty "maal" as available for creation/editing`])
    availableLaereplaner.push(
      {
        utplassering: {
          id: schoolUtplasseringsId,
          name: school.fullName,
          maal: []
        }
      }
    )
  }

  // Så legger vi til ungdomsbedrift (entreprenørskap) om den ikke finnes allerede som læreplan
  const ungdomsbedriftUtplasseringsId = 'ungdomsbedrift'
  // Sjekk om vi har læreplan for undgdomsbedrift enda - hvis ikke legger vi til
  if (!availableLaereplaner.some(plan => plan.utplassering.id === ungdomsbedriftUtplasseringsId)) {
    // Dersom det enten finnes en tilbakemelding for ungdomsbedrift-utplasseringen, eller dersom det ikke er noen læreplan der allerede, kan man lage ny læreplan på denne skolen.
    logger('info', [loggerPrefix, 'Ungdomsbedrift does not have active læreplan - adding ungdomsbedrift-utplassering with empty "maal" as available for creation/editing'])
    availableLaereplaner.push(
      {
        utplassering: {
          id: ungdomsbedriftUtplasseringsId,
          name: 'Ungdomsbedrift (entreprenørskap)',
          maal: []
        }
      }
    )

    logger('info', [loggerPrefix, `Finished creating available laereplaner - total ${availableLaereplaner.length} available laereplaner for creation/editing. Returning`])
  }
  return availableLaereplaner
}
