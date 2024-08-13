import { fintTeacher } from './fintfolk-api/teacher'
import { fintStudent } from './fintfolk-api/student'
import { documentTypes, getCurrentSchoolYear } from './document-types/document-types'
import { closeMongoClient, getMongoClient } from './mongo-client'
import { env } from '$env/dynamic/private'
import { ObjectId } from 'mongodb'
import { getMockDb } from './mock-db'
import { logger } from '@vtfk/logger'
import { getInternalCache } from './internal-cache'
import axios from 'axios'
import { validateContent } from './document-types/content-validation'
import { encryptContent } from '@vtfk/encryption'

export const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const repackMiniSchool = (school, kontaktlarer) => {
  const kortkortnavn = school.kortnavn.indexOf('-') ? school.kortnavn.substring(school.kortnavn.indexOf('-') + 1) : school.kortnavn
  return {
    kortkortnavn,
    skolenummer: school.skolenummer,
    kortnavn: school.kortnavn,
    navn: school.navn,
    kontaktlarer
  }
}

// Tar inn en elev en lærer har i en basisgruppe og/eller en undervisningsgruppe - returnerer en liste over dokumenttyper som læreren har tilgang på for en elev, og ved hvilke skoler
export const getAvailableDocumentTypesForTeacher = (student) => {
  const availableDocumentTypes = []
  for (const docType of documentTypes) {
    if (docType.accessCondition === 'isContactTeacher') {
      const docTypeSchools = student.skoler.filter(skole => skole.kontaktlarer) // Kun skoler der læreren er kontaktlærer for eleven
      if (docTypeSchools.length > 0) availableDocumentTypes.push({ id: docType.id, title: docType.title, isEncrypted: docType.isEncrypted || false, schools: docTypeSchools })
    }
    if (docType.accessCondition === 'hasUndervisningsgruppe') {
      const docTypeSchools = []
      for (const school of student.klasser.filter(klasse => klasse.type === 'undervisningsgruppe').map(klasse => klasse.skole)) { // Skoler der læreren har eleven i en undervisningsgruppe
        if (!docTypeSchools.some(docTypeSchool => docTypeSchool.skolenummer === school.skolenummer)) { // Trenger bare skolen en gang
          docTypeSchools.push(school)
        }
      }
      if (docTypeSchools.length > 0) availableDocumentTypes.push({ id: docType.id, title: docType.title, isEncrypted: docType.isEncrypted || false, schools: docTypeSchools }) // Kun skoler der læreren har eleven i en undervisningsgruppe
    }
    if (docType.accessCondition === 'yff') {
      const docTypeSchools = student.klasser.filter(klasse => klasse.type === 'undervisningsgruppe').map(klasse => klasse.skole) // LEGG INN YFF KRITERIE HER
      // if (docTypeSchools.length > 0) availableDocumentTypes.push({ id: docType.id, title: docType.title, isEncrypted: docType.isEncrypted || false, schools: docTypeSchools }) // Kun skoler der læreren har eleven i en undervisningsgruppe
    }
  }
  return availableDocumentTypes
}

/**
 *
 * @param {Object} user
 */
export const getUserData = async (user) => {
  const userData = {
    userData: null,
    students: [],
    classes: []
  }

  // If regular teacher or administrator impersonating teacher
  if (user.activeRole === env.DEFAULT_ROLE || (user.hasAdminRole && user.impersonating?.type === 'larer')) {
    const teacherUpn = user.hasAdminRole && user.impersonating?.type === 'larer' ? user.impersonating.target : user.principalName 
    const teacher = await fintTeacher(teacherUpn)
    if (!teacher) return userData

    userData.userData = {
      upn: teacher.upn,
      feidenavn: teacher.feidenavn,
      ansattnummer: teacher.ansattnummer,
      name: teacher.navn,
      firstName: teacher.fornavn,
      lastName: teacher.etternavn
    }
    let students = []
    const classes = []
    for (const undervisningsforhold of teacher.undervisningsforhold.filter(forhold => forhold.aktiv)) {
      for (const basisgruppe of undervisningsforhold.basisgrupper.filter(gruppe => gruppe.aktiv)) {
        classes.push({ navn: basisgruppe.navn, type: 'basisgruppe', systemId: basisgruppe.systemId, fag: ['Basisgruppe'], skole: basisgruppe.skole.navn })
        for (const elev of basisgruppe.elever) {
          // I tilfelle eleven er med i flere basisgrupper
          const existingStudent = students.find(student => student.elevnummer === elev.elevnummer)
          if (existingStudent) {
            existingStudent.klasser.push({ navn: basisgruppe.navn, type: 'basisgruppe', systemId: basisgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer) })
            if (!existingStudent.skoler.some(skole => skole.skolenummer === undervisningsforhold.skole.skolenummer)) existingStudent.skoler.push(repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer))
          } else {
            students.push({ ...elev, klasser: [{ navn: basisgruppe.navn, type: 'basisgruppe', systemId: basisgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer) }], skoler: [repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer)] })
          }
        }
      }
      for (const undervisningsgruppe of undervisningsforhold.undervisningsgrupper.filter(gruppe => gruppe.aktiv)) {
        // Note to self - læreren kan ha flere undervisningsforhold med de samme undervisningsgruppene.. Lollert, lar det være inntil videre
        classes.push({ navn: undervisningsgruppe.navn, type: 'undervisningsgruppe', systemId: undervisningsgruppe.systemId, fag: undervisningsgruppe.fag.map(f => f.navn), skole: undervisningsgruppe.skole.navn })
        for (const elev of undervisningsgruppe.elever) {
          // I tilfelle eleven er med i flere basisgrupper
          const existingStudent = students.find(student => student.elevnummer === elev.elevnummer)
          if (existingStudent) {
            existingStudent.klasser.push({ navn: undervisningsgruppe.navn, type: 'undervisningsgruppe', systemId: undervisningsgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer) })
            if (!existingStudent.skoler.find(skole => skole.skolenummer === undervisningsforhold.skole.skolenummer)) existingStudent.skoler.push(repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer))
          } else {
            students.push({ ...elev, klasser: [{ navn: undervisningsgruppe.navn, type: 'undervisningsgruppe', systemId: undervisningsgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer) }], skoler: [repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer)] })
          }
        }
      }
    }
    // Sleng på kort-feidenavn på alle elever, og gyldige dokumenttyper for eleven
    students = students.map(stud => { return { ...stud, feidenavnPrefix: stud.feidenavn.substring(0, stud.feidenavn.indexOf('@')), availableDocumentTypes: getAvailableDocumentTypesForTeacher(stud) } })

    userData.classes = classes
    userData.students = students
  }

  // TODO - finn ut av leder rådgiver
  if (user.activeRole === env.LEDER_ROLE) {
    console.log('En leder rådgiver aiaiai')
  }

  return userData
}

/**
 *
 * @param {string} studentFeidenavn
 */
export const getStudent = async (user, studentFeidenavn, includeSsn=false) => {
  let loggerPrefix = `getStudent - user: ${user.principalName} - student: ${studentFeidenavn}`
  logger('info', [loggerPrefix, 'New request'])
  // First validate access to student
  const userData = await getUserData(user)

  const availableStudents = userData.students
  logger('info', [loggerPrefix, 'Validating access to student'])
  const allowedToView = availableStudents.find(stud => stud['feidenavn'] === studentFeidenavn)
  if (!allowedToView) {
    logger('warn', [loggerPrefix, 'no access to student, or student does not exist'])
    throw new Error('No access to student, or student is not registered')
  }
  logger('info', [loggerPrefix, 'Access validated, fetching data'])

  const classes = userData.classes

  const student = await fintStudent(studentFeidenavn)
  const repackedStudent = {
    upn: student.upn,
    feidenavn: student.feidenavn,
    elevnummer: student.elevnummer,
    name: student.navn,
    firstName: student.fornavn,
    lastName: student.etternavn,
    birthdate: student.fodselsdato
  }
  if (includeSsn) repackedStudent.personalIdNumber = student.fodselsnummer

  // Alle faggrupper, fordi vi mangler relasjon mellom lærer og faggrupper
  let faggrupper = []
  for (const elevforhold of student.elevforhold.filter(forhold => forhold.aktiv || (new Date() < new Date(forhold.gyldighetsperiode.start)))) { // Aktive eller aktive i fremtiden
    for (const faggruppe of elevforhold.faggruppemedlemskap.filter(medlemskap => medlemskap.aktiv || (new Date() < new Date(medlemskap.medlemskapgyldighetsperiode.start)))) { // Aktive eller aktive i fremtiden
      faggrupper.push({
        navn: faggruppe.navn,
        systemId: faggruppe.systemId,
        fag: faggruppe.fag,
        skole: repackMiniSchool(elevforhold.skole)
      })
    }
  }

  /* NEI NYTT UNDER
  // Lager først en liste med undervisningsgruppene læreren har eleven i, så filtrerer vi faggruppene på de som starter med samme prefix som undervisningsgruppene har eleven i.
  // Typ hvis læreren har undervisningsgruppe 3STK/NOR2340, så antar vi at alle faggrupper som starter med 3STK/NOR er aktuelle som faggrupper
  // Evt sjekk om det er fullstendig match. Kan vi finne ut hvilke som typisk har 2 underliggende faggrupper a?
  const relevantUndervisningsgrupper = classes.filter(group => !group.fag.includes('Basisgruppe') && group.navn.split('/').length === 2).map(group => {
    const groupNameList = group.navn.split('/')
    return { className: groupNameList[0], undervisningsgruppeName: groupNameList[1] }
  })
  const probableFaggrupper = faggrupper.filter(gruppe => {
    const nameList = gruppe.navn.split('/')
    if (nameList.length !== 2) return false // We assume name {klassenavn}/{faggruppenavn}
    const className = nameList[0]
    const faggruppeName = nameList[1]
    const matchingUndervisningsgruppe = relevantUndervisningsgrupper.some(undervisningsgruppe => {
      if (undervisningsgruppe.className === className && undervisningsgruppe.undervisningsgruppeName.substring(0, 3) === faggruppeName.substring(0, 3)) return true
      return false
    })
    return matchingUndervisningsgruppe
  })
  */ // ENKEL OG GREIT UNDER HER 
  
  // Henter alle faggrupper der det er en undervisningsgruppe som heter det samme som faggruppen, resten må lærer utvide for å få se / velge. Frontend må passe på å vise alle som er valgt til en hver tid
  const probableFaggrupper = faggrupper.filter(faggruppe => classes.some(group => group.navn === faggruppe.navn))

  return {
    student: repackedStudent,
    faggrupper,
    probableFaggrupper,
  }
}

export const newDocument = async (user, studentFeidenavn, documentTypeId, type, variant, schoolNumber, documentData, preview=false) => {
  let loggerPrefix = `newDocument - user: ${user.principalName} - student: ${studentFeidenavn} - ${documentTypeId} - preview: ${preview}`
  logger('info', [loggerPrefix, 'New request'])

  // Validate parameteres
  if (!studentFeidenavn) {
    logger('error', [loggerPrefix, 'Missing required argument "studentFeidenavn'])
    throw new Error('Missing required argument "studentFeidenavn"')
  }
  if (!documentTypeId) {
    logger('error', [loggerPrefix, 'Missing required argument "documentTypeId'])
    throw new Error('Missing required argument "documentTypeId"')
  }
  if (!type) {
    logger('error', [loggerPrefix, 'Missing required argument "type'])
    throw new Error('Missing required argument "type"')
  }
  if (!variant) {
    logger('error', [loggerPrefix, 'Missing required argument "variant'])
    throw new Error('Missing required argument "variant"')
  }
  if (!schoolNumber) {
    logger('error', [loggerPrefix, 'Missing required argument "schoolNumber'])
    throw new Error('Missing required argument "schoolNumber"')
  }
  if (!documentData) {
    logger('error', [loggerPrefix, 'Missing required argument "documentData'])
    throw new Error('Missing required argument "documentData"')
  }
  
  // Check if regular teacher or administrator impersonating teacher
  const canCreateDocument = user.activeRole === env.DEFAULT_ROLE || (user.hasAdminRole && user.impersonating?.type === 'larer')
  if (!canCreateDocument) {
    logger('warn', [loggerPrefix, 'Not allowed to create documents with current role'])
    throw new Error('Not allowed to create documents with current role')
  }

  // Then validate access to student
  const userData = await getUserData(user)
  const availableStudents = userData.students
  logger('info', [loggerPrefix, 'Validating access to student'])
  const allowedToView = availableStudents.some(stud => stud['feidenavn'] === studentFeidenavn)
  if (!allowedToView) {
    logger('warn', [loggerPrefix, 'no access to student, or student does not exist'])
    throw new Error('No access to student, or student is not registered')
  }

  logger('info', [loggerPrefix, `Access validated, checking access to documenttype ${documentTypeId} for school ${schoolNumber}`])
  
  const teacherStudent = availableStudents.find(stud => stud['feidenavn'] === studentFeidenavn)
  const currentDocumentType = teacherStudent.availableDocumentTypes.find(docType => docType.id === documentTypeId)
  if (!currentDocumentType) {
    logger('warn', [loggerPrefix, `No access to create this documenttype "${documentTypeId}" for student "${studentFeidenavn}"`])
    throw new Error(`No access to create this documenttype "${documentTypeId}" for student "${studentFeidenavn}"`)
  }
  const hasAccessToDocumentTypeAtSchool = currentDocumentType.schools.some(school => school.skolenummer === schoolNumber)

  if (!hasAccessToDocumentTypeAtSchool) {
    logger('warn', [loggerPrefix, `No access to create this documenttype "${documentTypeId}" at selected school with schoolNumber "${schoolNumber}"`])
    throw new Error(`No access to create this documenttype "${documentTypeId}" for student "${studentFeidenavn}" selected school with schoolNumber "${schoolNumber}"`)
  }
  logger('info', [loggerPrefix, 'Access to create document for student validated, getting student data (with ssn)'])

  const studentData = await getStudent(user, studentFeidenavn, true)

  logger('info', [loggerPrefix, 'Got studentdata, generating content'])
  const documentType = documentTypes.find(docType => docType.id === documentTypeId)
  if (!documentType) {
    logger('error', [loggerPrefix, `Could not find documentType with id "${documentTypeId}"`])
    throw new Error(`Could not find documentType with id "${documentTypeId}"`)
  }

  const contentGenerator = documentType.generateContent
  if (!contentGenerator) {
    logger('error', [loggerPrefix, `Missing generateContent function for documentType with id "${documentTypeId}"`])
    throw new Error(`Missing generateContent function for documentType with id "${documentTypeId}"`)
  }
  const contentValidator = documentType.matchContent
  if (!contentValidator) {
    logger('error', [loggerPrefix, `Missing "matchContent" data for documentType with id "${documentTypeId}"`])
    throw new Error(`Missing "matchContent" data for documentType with id "${documentTypeId}"`)
  }
  let content
  try {
    content = contentGenerator(studentData, documentData)
    const { valid, result } = validateContent(content, contentValidator) // Mulig dette må sløyfes / skrives om
    if (!valid) throw new Error(`Failed when validating content"... Result: ${JSON.stringify(result)} Kjeft på utviklerne`)
  } catch (error) {
    logger('error', [loggerPrefix, `Failed when generating content documentType with id "${documentTypeId}"`, error.response?.data || error.stack || error.toString()])
    throw error
  }

  // Encrypt content if needed
  if (currentDocumentType.isEncrypted) {
    logger('info', [loggerPrefix, 'documenttype content need to be encrypted'])
    content = encryptContent(content, env.ENCRYPTION_SECRET)
    logger('info', [loggerPrefix, 'documenttype content encrypted'])
  }

  logger('info', [loggerPrefix, 'Content succesfully generating, setting up entire document'])

  const student = studentData.student
  const teacher = userData.userData
  const school = teacherStudent.skoler.find(school => school.skolenummer === schoolNumber)
  if (!school) {
    logger('error', [loggerPrefix, `Could not find school with schoolNumber ${schoolNumber}`])
    throw new Error(`Could not find school with schoolNumber ${schoolNumber}`)
  }
  // Repack school to nicer format
  const repackedSchool = {
    name: school.navn,
    id: school.skolenummer,
    shortname: school.kortnavn
  }
  const repackedUser = {
    principalName: user.principalName,
    principalId: user.principalId,
    name: user.name
  }

  // Setup the correct format (the way it will be saved in db, and the way pdf-preview needs it)
  const now = new Date()
  const document = {
    created: {
      date: now.toISOString(),
      timestamp: now.getTime(),
      createdBy: repackedUser
    },
    modified: {
      date: now.toISOString(),
      timestamp: now,
      modifiedBy: repackedUser
    },
    documentTypeId,
    title: currentDocumentType.title,
    type,
    variant,
    student,
    teacher,
    content,
    school: repackedSchool,
    isEncrypted: currentDocumentType.isEncrypted,
    status: [{ status: 'queued', timestamp: new Date().getTime() }],
    isQueued: true // Set ready for plucking by minelev-robot
  }

  // Hvis preview, så henter vi en pdf-preview, og returnerer bare base64-en
  if (preview) {
    logger('info', [loggerPrefix, 'Preview is true, fetching preview-pdf'])
    const previewData = {
      system: 'minelev',
      template: `${document.type}/${document.variant}`,
      language: 'nb',
      type: "2",
	    version: "B",
      data: { ...document, preview: true }
    }
    // TODO - ha en MOCK_API her også for å slippe nett??
    const { data } = await axios.post(env.PDF_API_URL, previewData, { headers: { 'x-functions-key': env.PDF_API_KEY } })
    logger('info', [loggerPrefix, 'Successfully got pdf-preview, returning base64'])
    const base64 = data.data.base64
    return base64
  }

  // Hvis ikke preview, så lagrer vi dokumentet til db og returner id-en

  if (env.MOCK_API === 'true') {
    logger('info', [loggerPrefix, 'MOCK_API is true, inserting document in mockDb'])
    const mockDb = getMockDb()
    const randomId = new ObjectId().toString()
    document._id = randomId
    mockDb.set(randomId, document)
    logger('info', [loggerPrefix, `MOCK_API is true, document successfully added to mockDb with id: ${randomId}`])
    return { insertedId: randomId }
  }
  try {
    logger('info', [loggerPrefix, 'inserting document in db'])
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(`${env.MONGODB_DOCUMENTS_COLLECTION}-${getCurrentSchoolYear('-')}`)
    const insertResult = await collection.insertOne(document)
    logger('info', [loggerPrefix, `document succesfully added to db with id: ${insertResult.insertedId}`])
    return insertResult
  } catch (error) {
    if (error.toString().startsWith('MongoTopologyClosedError')) {
      logger('warn', 'Oh no, topology is closed! Closing client')
      closeMongoClient()
    }
    throw error
  }
}

export const getDocument = async (user, studentFeidenavn, documentId) => {
  let loggerPrefix = `getDocument - user: ${user.principalName} - student: ${studentFeidenavn} - documentId: ${documentId}`
  logger('info', [loggerPrefix, 'New request'])

  // Validate parameteres
  if (!documentId) {
    logger('error', [loggerPrefix, 'Missing required argument "documentId'])
    throw new Error('Missing required argument "documentId"')
  }

  if (!studentFeidenavn) {
    logger('error', [loggerPrefix, 'Missing required argument "studentFeidenavn'])
    throw new Error('Missing required argument "studentFeidenavn"')
  }
  
  // Check if regular teacher or administrator impersonating teacher or leder
  const canViewDocument = user.activeRole === env.DEFAULT_ROLE || user.activeRole === env.LEDER_ROLE || (user.hasAdminRole && user.impersonating?.type === 'larer') || (user.hasAdminRole && user.impersonating?.type === 'leder')
  if (!canViewDocument) {
    logger('warn', [loggerPrefix, 'Not allowed to view documents with current role'])
    throw new Error('Not allowed to view documents with current role')
  }

  // Then validate access to student
  const userData = await getUserData(user)
  const availableStudents = userData.students
  logger('info', [loggerPrefix, 'Validating access to student'])
  const allowedToView = availableStudents.some(stud => stud['feidenavn'] === studentFeidenavn)
  if (!allowedToView) {
    logger('warn', [loggerPrefix, 'no access to student, or student does not exist'])
    throw new Error('No access to student, or student is not registered')
  }

  // Then we get the actual document
  let document
  if (env.MOCK_API === 'true') {
    logger('info', [loggerPrefix, 'MOCK_API is true', `Looking for document ${documentId} in mockdb`])
    const mockDb = getMockDb()
    document = mockDb.get(documentId)
    if (!document) throw new Error(`Could not find any document with id: ${documentId}`)
    logger('info', [loggerPrefix, 'MOCK_API is true', `Found document ${documentId} in mockdb`])
  } else {
    try {
      logger('info', [loggerPrefix, `Looking for document ${documentId} in db`])
      const mongoClient = await getMongoClient()
      const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(`${env.MONGODB_DOCUMENTS_COLLECTION}-${getCurrentSchoolYear('-')}`)
      document = await collection.findOne({ _id: new ObjectId(documentId) })
      if (!document) throw new Error(`Could not find any document with id: ${documentId}`)
      logger('info', [loggerPrefix, `Found document ${documentId} in db`])
    } catch (error) {
      if (error.toString().startsWith('MongoTopologyClosedError')) {
        logger('warn', 'Oh no, topology is closed! Closing client')
        closeMongoClient()
      }
      throw error
    }
  }
  // Remove personalIdNumber from document.student
  delete document.student.personalIdNumber

  loggerPrefix = `getDocument - user: ${user.principalName} - student: ${studentFeidenavn} - documentId: ${documentId} - type: ${document.type} - variant: ${document.variant} - school: ${document.school.shortname}`

  logger('info', [loggerPrefix, `Access to student validated, checking access to documenttype ${document.documentTypeId} for school ${document.school.shortname}`])
  
  let hasAccessToDocumentTypeAtSchool = false
  const teacherStudent = availableStudents.find(stud => stud['feidenavn'] === studentFeidenavn)
  // user.activeRole === env.DEFAULT_ROLE || user.activeRole === env.LEDER_ROLE || (user.hasAdminRole && user.impersonating?.type === 'larer') || (user.hasAdminRole && user.impersonating?.type === 'leder')
  if (user.activeRole === env.DEFAULT_ROLE || (user.hasAdminRole && user.impersonating?.type === 'larer')) {
    logger('info', [loggerPrefix, `User is teacher or admin impersonating teacher, checking that teacher has access to documenttype ${document.documentTypeId} for school ${document.school.shortname}`])
    const currentDocumentType = teacherStudent.availableDocumentTypes.find(docType => docType.id === document.documentTypeId)
    if (!currentDocumentType) {
      logger('warn', [loggerPrefix, `No access to view this documenttype "${document.documentTypeId}" for student "${studentFeidenavn}"`])
      throw new Error(`No access to view this documenttype "${document.documentTypeId}" for student "${studentFeidenavn}"`)
    }
    hasAccessToDocumentTypeAtSchool = currentDocumentType.schools.some(school => school.skolenummer === document.school.id)
  } else if (user.activeRole === env.LEDER_ROLE || (user.hasAdminRole && user.impersonating?.type === 'leder')) {
    logger('info', [loggerPrefix, `User is leder or admin impersonating leder, checking that leder has access to school ${document.school.shortname}`])
    logger('warn', [loggerPrefix, 'IS LEDER, NEED TO IMPLEMENT THIS - IF HAS ACCESS TO SCHOOL OF DOCUMENT, LEDER SHOULD HAVE ACCESS!!!'])
  }

  if (!hasAccessToDocumentTypeAtSchool) {
    logger('warn', [loggerPrefix, `No access to create this documenttype "${document.documentTypeId}" at selected school: "${document.school.shortname}"`])
    throw new Error(`No access to create this documenttype "${document.documentTypeId}" for student "${studentFeidenavn}" at selected school: "${document.school.shortname}"`)
  }
  // stringify mongodb ObjectId
  document._id = document._id.toString()
  logger('info', [loggerPrefix, 'Access to view document validated, returning document'])

  return document
}

export const getStudentDocuments = async (user, studentFeidenavn) => {
  let loggerPrefix = `getStudentDocuments - user: ${user.principalName} - student: ${studentFeidenavn}`
  logger('info', [loggerPrefix, 'New request'])

  // Validate parameteres
  if (!studentFeidenavn) {
    logger('error', [loggerPrefix, 'Missing required argument "studentFeidenavn'])
    throw new Error('Missing required argument "studentFeidenavn"')
  }
  
  // Check if regular teacher or administrator impersonating teacher or leder
  const canViewDocuments = user.activeRole === env.DEFAULT_ROLE || user.activeRole === env.LEDER_ROLE || (user.hasAdminRole && user.impersonating?.type === 'larer') || (user.hasAdminRole && user.impersonating?.type === 'leder')
  if (!canViewDocuments) {
    logger('warn', [loggerPrefix, 'Not allowed to view documents with current role'])
    throw new Error('Not allowed to view documents with current role')
  }

  // Then validate access to student
  const userData = await getUserData(user)
  const availableStudents = userData.students
  logger('info', [loggerPrefix, 'Validating access to student'])
  const allowedToView = availableStudents.some(stud => stud['feidenavn'] === studentFeidenavn)
  if (!allowedToView) {
    logger('warn', [loggerPrefix, 'no access to student, or student does not exist'])
    throw new Error('No access to student, or student is not registered')
  }

  // Then construct query based on available doctypes for student / teacher relation
  const teacherStudent = availableStudents.find(stud => stud['feidenavn'] === studentFeidenavn)
  logger('info', [loggerPrefix, 'Access to student validated'])

  if (env.MOCK_API === 'true') {
    logger('info', [loggerPrefix, 'MOCK_API is true', `Looking for documents in mockdb`])
    const documents = []
    const mockDb = getMockDb()
    const documentIds = mockDb.keys()
    for (const id of documentIds) {
      const document = mockDb.get(id)
      if (document.student.feidenavn !== studentFeidenavn) continue
      const availableDocumentType = teacherStudent.availableDocumentTypes.find(docType => docType.id === document.documentTypeId)
      if (!availableDocumentType) continue
      const availableSchool = availableDocumentType.schools.some(school => school.skolenummer === document.school.id)
      if (!availableSchool) continue
      documents.push(document)
    }
    logger('info', [loggerPrefix, 'MOCK_API is true', `Found ${documents.length} available documents in mockdb - returning`])
    return documents
  } else {
    // Hent fra mongodb! Skal ha alle dokumentene med availableDocumenttype ved en gitt skole (så kan frontend få sortere på varsel-fag (prabableFaggrupper))
    logger('info', [loggerPrefix, 'Building documentQuery based on availableDocumentTypes'])
    try {
      const documentTypeOr = []
      for (const availableDocumentType of teacherStudent.availableDocumentTypes) {
        for (const school of availableDocumentType.schools) {
          const docTypeQuery = { documentTypeId: availableDocumentType.id, "school.id": school.skolenummer }
          documentTypeOr.push(docTypeQuery)
        }
      }
      const documentQuery = { "student.elevnummer": teacherStudent.elevnummer, $or: documentTypeOr }
      logger('info', [loggerPrefix, 'Documentquery successfully built', documentQuery, 'Fetching from db'])
      const mongoClient = await getMongoClient()
      const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(`${env.MONGODB_DOCUMENTS_COLLECTION}-${getCurrentSchoolYear('-')}`)
      const documents = await collection.find(documentQuery).toArray()
      logger('info', [loggerPrefix, `Found ${documents.length} documents in db. Returning.`])
      return documents
    } catch (error) {
      if (error.toString().startsWith('MongoTopologyClosedError')) {
        logger('warn', 'Oh no, topology is closed! Closing client')
        closeMongoClient()
      }
      throw error
    }
  }
}

export const getTeacherDocuments = async (user, studentFeidenavn) => {


  if (env.MOCK_API === 'true') return 'en liste med tulledokumenter'
  try {
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(`${env.MONGODB_DOCUMENTS_COLLECTION}-${getCurrentSchoolYear('-')}`)
    // Her må vi lage en spørring som henter dokumenter som matcher alle elevene til læreren, men vi tar vel kanskje panskje med en top-parameter for å være flinke?
  } catch (error) {
    if (error.toString().startsWith('MongoTopologyClosedError')) {
      logger('warn', 'Oh no, topology is closed! Closing client')
      closeMongoClient()
    }
    throw error
  }
}


export const getActiveRole = async (principalId) => {
  if (env.MOCK_API === 'true') {
    const mockDb = getMockDb()
    const activeRole = mockDb.get('activeRole')
    return activeRole || null
  }
  try {
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(env.MONGODB_USER_SETTINGS_COLLECTION)
    const userSettings = await collection.findOne({ principalId })
    if (!userSettings) return null
    return userSettings.activeRole || null
  } catch (error) {
    if (error.toString().startsWith('MongoTopologyClosedError')) {
      logger('warn', 'Oh no, topology is closed! Closing client')
      closeMongoClient()
    }
    throw error
  }
}

export const setActiveRole = async (user, requestedRole) => {
  logger('info', [`${user.principalName} requested role change to role: ${requestedRole}`])
  if (!user.roles.some(role => role.value === requestedRole)) {
    logger('warn', [`${user.principalName} does not have access to role: ${requestedRole}`])
    throw new Error('Du har ikke tilgang på den rollen')
  }
  logger('info', [`${user.principalName} has access to role ${requestedRole}, changing role for user`])
  if (env.MOCK_API === 'true') {
    const mockDb = getMockDb()
    mockDb.set('activeRole', requestedRole)
    logger('info', ['MOCK-API is enabled', `${user.principalName} succesfully changed role to ${requestedRole} in mock db`])
    return
  }
  try {
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(env.MONGODB_USER_SETTINGS_COLLECTION)
    const setUserSetting = await collection.findOneAndUpdate({ principalId: user.principalId }, { $set: { principalId: user.principalId, principalName: user.principalName, activeRole: requestedRole, changedTimestamp: new Date().toISOString() }}, { upsert: true })
    logger('info', [`${user.principalName} succesfully changed role to ${requestedRole} in db`])
    return
  } catch (error) {
    if (error.toString().startsWith('MongoTopologyClosedError')) {
      logger('warn', 'Oh no, topology is closed! Closing client')
      closeMongoClient()
    }
    throw error
  }
}

export const getAdminImpersonation = (user) => {
  if (!user.hasAdminRole) throw new Error('You do not have permission to do this')
  const internalCache = getInternalCache()
  const impersonation = internalCache.get(`${user.principalId}-impersonation`)
  return impersonation || null
}

export const setAdminImpersonation = async (user, target, type) => {
  if (!user.hasAdminRole) throw new Error('You do not have permission to do this')
  if (typeof target !== 'string') throw new Error('target må værra string')
  if (!target.endsWith(`@${env.FEIDENAVN_SUFFIX}`)) throw new Error(`Target må ende på @${env.FEIDENAVN_SUFFIX}`)
  if (!['larer', 'leder'].includes(type)) throw new Error('type må værra "larer" eller "leder"')
  const internalCache = getInternalCache()
  internalCache.set(`${user.principalId}-impersonation`, { target, type })
  logger('warn', [`Admin user ${user.principalName} is impersonating user ${target} (type: ${type})`, `${user.principalName} probably need to do this, but logging for extra safety.`, 'Saving impersonation-logEntry to db as well'])
  if (env.MOCK_API === 'true') return
  try {
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(env.MONGODB_USER_IMPERSONATION_COLLECTION)
    const logEntry = {
      timestamp: new Date().toISOString(),
      user: {
        principalName: user.principalName,
        principalId: user.principalId
      },
      impersonationTarget: target,
      impersonationRole: type
    }
    const insertLogResult = await collection.insertOne(logEntry)
    return insertLogResult
  } catch (error) {
    if (error.toString().startsWith('MongoTopologyClosedError')) {
      logger('warn', 'Oh no, topology is closed! Closing client')
      closeMongoClient()
    }
    throw error
  }
}

export const deleteAdminImpersonation = (user) => {
  if (!user.hasAdminRole) throw new Error('You do not have permission to do this')
  const internalCache = getInternalCache()
  internalCache.del(`${user.principalId}-impersonation`)
  return
}