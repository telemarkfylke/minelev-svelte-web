import { logger } from '@vtfk/logger'
import { env } from '$env/dynamic/private'
import { getStudentDocuments } from './get-student-documents'
import vtfkSchoolsInfo from 'vtfk-schools-info'
import { yffEvalueringsdata } from '$lib/document-types/data/document-data'

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

/**
 *
 * @param {import("$lib/authentication").User} user
 * @param {string} studentFeidenavn
 * @returns list of documents
 */
export const getYffDocuments = async (user, studentFeidenavn) => {
  const loggerPrefix = `getYffDocuments - user: ${user.principalName} - student: ${studentFeidenavn}`
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

  /*
  Kan opprette en læreplan på en bekreftelse, dersom den ikke har
  Kan redigere en læreplan, dersom den ikke har en tilbakemelding
  Kan opprette en tilbakemelding på en bekreftelse, dersom den har en læreplan
  */
  const yffResultDocuments = []
  // Går gjennom læreplaner - sjekk om de kan redigeres, eller om de er ferdige, og sett på property
  for (const laereplan of laereplaner) {
    // Sjekk om den utplasseringens id allerede er håndtert (vi returnerer kun den nyeste for hver utplassering)
    if (yffResultDocuments.some(doc => doc.variant === 'laereplan' && doc.content.utplassering.id === laereplan.content.utplassering.id)) continue // Siden lista vi iterer er sortert etter nyeste først
    // Sjekk om den har en tilbakemelding knyttet til utplasseringen allerede (da er den låst / ferdig)
    if (tilbakemeldinger.some(melding => melding.content.utplassering._id === laereplan.content.utplassering.id)) {
      logger('info', [loggerPrefix, `Laereplan ${laereplan._id.toString()} has tilbakemelding, setting as finished`])
      yffResultDocuments.push({ ...laereplan, hasTilbakemelding: true })
      continue
    }
    // Hvis ikke har vi den nyeste læreplanen for denne utplasseringen, der det ikke foreligger en tilbakemelding enda, vi legger den til som redigerbar
    logger('info', [loggerPrefix, `Laereplan ${laereplan._id.toString()} is the latest one, and not completed (no tilbakemelding), adding editable laereplan`])
    yffResultDocuments.push({ ...laereplan, hasTilbakemelding: false })
  }

  // Så går vi gjennom bekreftelser, og finner utplasseringer som ikke har noen læreplan i det hele tatt enda
  for (const bekreftelse of bekreftelser) {
    // Sjekk om utplasseringsens id allerede har en læreplan på seg
    if (yffResultDocuments.some(doc => doc.variant === 'laereplan' && doc.content.utplassering.id === bekreftelse._id.toString())) {
      const correspondingLaereplan = yffResultDocuments.find(doc => doc.variant === 'laereplan' && doc.content.utplassering.id === bekreftelse._id.toString())
      logger('info', [loggerPrefix, `Bekreftelse ${bekreftelse._id.toString()} has læreplan, setting hasLaereplan true, and hasTilbakemelding ${correspondingLaereplan.hasTilbakemelding}`])
      yffResultDocuments.push({ ...bekreftelse, hasLaereplan: true, hasTilbakemelding: correspondingLaereplan.hasTilbakemelding })
      continue
    }
    // Sjekk om det er en tilbakemelding på utplasseringen allerede (dette krever en læreplan)
    const correspondingTilbakemelding = tilbakemeldinger.find(melding => melding.content.utplassering._id === bekreftelse._id.toString())
    if (correspondingTilbakemelding) {
      if (!yffResultDocuments.some(doc => doc.variant === 'laereplan' && doc.content.utplassering.id === bekreftelse._id.toString())) {
        logger('warn', [loggerPrefix, `Bekreftelse ${bekreftelse._id.toString()} has tilbakemelding: ${correspondingTilbakemelding._id.toString()}, but apparently no laereplan - this should NOT be possible`])
      }
      logger('info', [loggerPrefix, `Bekreftelse ${bekreftelse._id.toString()} has tilbakemelding, setting hasTilbakemelding true`])
      yffResultDocuments.push({ ...bekreftelse, hasLaereplan: false, hasTilbakemelding: true })
      continue
    }
    // Ingen læreplan og ingen tilbakmld for denne bekreftelsen
    logger('info', [loggerPrefix, `Bekreftelse ${bekreftelse._id} does not have læreplan or tilbakemelding - setting both to false`])
    yffResultDocuments.push({ ...bekreftelse, hasLaereplan: false, hasTilbakemelding: false })
  }
  for (const tilbakemelding of tilbakemeldinger) {
    yffResultDocuments.push(tilbakemelding)
  }

  // Sort it back in order again...
  yffResultDocuments.sort((a, b) => b.created.timestamp - a.created.timestamp)

  return yffResultDocuments
}

/**
 *
 * @param {import("$lib/authentication").User} user
 * @param {string} studentFeidenavn
 * @returns list of documents
 */
export const getAvailableTilbakemeldinger = async (user, studentFeidenavn) => {
  const loggerPrefix = `getAvailableTilbakemeldinger - user: ${user.principalName} - student: ${studentFeidenavn}`
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

  const availableTilbakemeldinger = []
  // Går gjennom læreplaner - lager opp "ferdige læreplaner" som IKKE har en tilbakemelding på seg, kan returneres og bygges videre på
  for (const laereplan of laereplaner) {
    // Sjekk om den utplasseringens id allerede er håndtert
    if (availableTilbakemeldinger.some(melding => melding.utplassering._id === laereplan.content.utplassering.id)) continue // Siden lista vi iterer er sortert etter nyeste først
    // Sjekk om den har en tilbakemelding knyttet til utplasseringen allerede (da er den låst / ferdig)
    if (tilbakemeldinger.some(melding => melding.content.utplassering._id === laereplan.content.utplassering.id)) continue
    // Sjekk om vi har en bekreftelse for denne utplasseringen, hvis ikke kan vi ikke lage tilbakemelding
    const correspondingBekreftelse = bekreftelser.find(bekreftelse => bekreftelse._id.toString() === laereplan.content.utplassering.id)
    if (!correspondingBekreftelse) {
      logger('warn', [loggerPrefix, `Laereplan ${laereplan._id.toString()} does not have bekreftelse, cannot create tilbakemelding`])
      continue
    }
    // Her har vi en læreplan som har bekreftelse, og ikke har tilbakemelding enda, da kan vi opprette tilbakemelding
    logger('info', [loggerPrefix, `Laereplan ${laereplan._id.toString()} is the latest one, and not completed (no tilbakemelding), adding bekreftelse and maal to tilbakemelding content as available for creation`])
    const tilbakemeldingContent = {
      utplassering: {
        _id: correspondingBekreftelse._id.toString(),
        ...correspondingBekreftelse.content.bekreftelse,
        level: correspondingBekreftelse.content.level
      },
      evalueringsdata: yffEvalueringsdata,
      ordenatferd: {
        orden: {
          title: 'Orden (punktlighet)'
        },
        atferd: {
          title: 'Atferd (holdninger, respekt)'
        }
      },
      fravar: {
        dager: '',
        timer: '',
        varslet: ''
      },
      kompetansemal: laereplan.content.utplassering.maal
    }
    availableTilbakemeldinger.push(tilbakemeldingContent)
  }

  logger('info', [loggerPrefix, `Finished creating available tilbakemeldinger - total ${availableTilbakemeldinger.length} available tilbakemeldinger for creation. Returning`])
  return availableTilbakemeldinger
}
