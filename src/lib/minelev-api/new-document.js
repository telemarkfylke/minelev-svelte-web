import { logger } from '@vtfk/logger'
import { getUserData } from './get-user-data'
import { documentTypes, getCurrentSchoolYear } from '$lib/document-types/document-types'
import { env } from '$env/dynamic/private'
import { getStudent } from './get-student'
import { validateContent } from '$lib/document-types/content-validation'
import { closeMongoClient, getMongoClient } from '$lib/mongo-client'
import { getMockDb } from '$lib/mock-db'
import { ObjectId } from 'mongodb'
import { encryptContent } from '@vtfk/encryption'
import axios from 'axios'

/**
 *
 * @param {import("$lib/authentication").User} user
 * @param {string} studentFeidenavn
 * @param {string} documentTypeId
 * @param {string} type
 * @param {string} variant
 * @param {string} schoolNumber
 * @param {Object} documentData
 * @param {boolean} preview
 * @returns {import("mongodb").InsertOneResult}
 */
export const newDocument = async (user, studentFeidenavn, documentTypeId, type, variant, schoolNumber, documentData, preview = false) => {
  const loggerPrefix = `newDocument - user: ${user.principalName} - student: ${studentFeidenavn} - ${documentTypeId} - preview: ${preview}`
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
  const allowedToView = availableStudents.some(stud => stud.feidenavn === studentFeidenavn)
  if (!allowedToView) {
    logger('warn', [loggerPrefix, 'no access to student, or student does not exist'])
    throw new Error('No access to student, or student is not registered')
  }

  logger('info', [loggerPrefix, `Access validated, checking access to documenttype ${documentTypeId} for school ${schoolNumber}`])

  const teacherStudent = availableStudents.find(stud => stud.feidenavn === studentFeidenavn)
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

  const studentData = await getStudent(user, studentFeidenavn, true) // Include ssn here, only server side and not returned

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
  // Add feidenavnPrefix for simpler frontend handling
  const studentFeidenavnPrefix = studentFeidenavn.substring(0, studentFeidenavn.indexOf('@'))
  student.feidenavnPrefix = studentFeidenavnPrefix

  const teacher = userData.personData
  const school = teacherStudent.skoler.find(school => school.skolenummer === schoolNumber)
  if (!school) {
    logger('error', [loggerPrefix, `Could not find school with schoolNumber ${schoolNumber}`])
    throw new Error(`Could not find school with schoolNumber ${schoolNumber}`)
  }

  // Expand student with basisgruppe at chosen school
  const schoolBasisgruppe = studentData.basisgrupper.find(gruppe => gruppe.skole.skolenummer === schoolNumber)
  if (!schoolBasisgruppe) {
    logger('info', [loggerPrefix, `Could not find student basisgruppe for school: ${schoolNumber}. Simply using school shortshortname instead`])
    student.basisgruppe = school.kortkortnavn
  } else {
    student.basisgruppe = `${school.kortkortnavn}:${schoolBasisgruppe.navn}`
  }

  // Repack school to nicer format for db
  const repackedSchool = {
    name: school.navn,
    id: school.skolenummer,
    shortname: school.kortnavn,
    shortshortName: school.kortkortnavn
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
      type: '2',
      version: 'B',
      data: { ...document, preview: true }
    }
    // TODO - ha en MOCK_API her også for å slippe nett?? Tjaaaa, greit å få testan da?
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
    document.mockDocument = true // To separate from other mockDb elements
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
