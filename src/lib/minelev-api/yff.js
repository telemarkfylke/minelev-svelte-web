
import { logger } from '@vtfk/logger'
import { getUserData } from './get-user-data'
import { getMockDb } from '$lib/mock-db'
import { closeMongoClient, getMongoClient } from '$lib/mongo-client'
import { env } from '$env/dynamic/private'
import { getCurrentSchoolYear } from '$lib/document-types/document-types'
import { getStudentDocuments } from './get-student-documents'


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
  const laereplaner = yffDocuments.filter(doc => doc.variant === 'laereplan')
  const bekreftelser = yffDocuments.filter(doc => doc.variant === 'bekreftelse')
  const tilbakemeldinger = yffDocuments.filter(doc => doc.variant === 'tilbakemelding')
  logger('info', [loggerPrefix, `Found ${yffDocuments.length} yff-documents: ${bekreftelser.length} bekreftelser, ${laereplaner.length} laereplaner, and ${tilbakemeldinger.length} laereplaner`])
  
  const availableLaereplaner = []
  // Går gjennom læreplaner - lager opp "ferdige læreplaner" som IKKE har en tilbakemelding på seg, kan returneres og bygges videre på
  for (const laereplan of laereplan) {
    // Sjekk om den utplasseringens id allerede er håndtert
    if (availableLaereplaner.some(plan => plan.utplassering.id === laereplan.content.utplassering.id)) continue // Siden lista vi iterer er sortert etter nyeste først
    // Sjekk om den har en tilbakemelding knyttet til utplasseringen allerede (da er den låst / ferdig)
    if (tilbakemeldinger.find(melding => melding.content.utplassering._id === laereplan.content.utplassering.id)) continue
    // Hvis ikke har vi den nyeste læreplanen for denne utplasseringen, der det ikke foreligger en tilbakemelding enda, vi legger til innholdet av læreplanen som tilgjengelig
    logger('info', [loggerPrefix, `Laereplan ${laereplan._id} is the latest one, and not completed (no tilbakemelding), adding content as available for editing`])
    availableLaereplaner.push(laereplan.content)
  }

  // Så går vi gjennom bekreftelser, og finner utplasseringer som ikke har noen læreplan i det hele tatt enda
  for (const bekreftelse of bekreftelser) {

  }

  // Kan kanskje bare smelle på alle skolene i samma slengen, og ungdomsbedrift nederst? Sikkert like greit

  // Må passe på ungdomsbedrift-læreplan og skole-utplassering

  // Går gjennom utplasseringer som ikke enda har en læreplan på seg
}
