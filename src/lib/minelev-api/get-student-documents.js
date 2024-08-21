import { logger } from '@vtfk/logger'
import { getUserData } from './get-user-data'
import { getMockDb } from '$lib/mock-db'
import { closeMongoClient, getMongoClient } from '$lib/mongo-client'
import { env } from '$env/dynamic/private'
import { getCurrentSchoolYear } from '$lib/document-types/document-types'

/**
 *
 * @param {import("$lib/authentication").User} user
 * @param {string} studentFeidenavn
 * @returns list of documents
 */
export const getStudentDocuments = async (user, studentFeidenavn) => {
  const loggerPrefix = `getStudentDocuments - user: ${user.principalName} - student: ${studentFeidenavn}`
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
  const allowedToView = availableStudents.some(stud => stud.feidenavn === studentFeidenavn)
  if (!allowedToView) {
    logger('warn', [loggerPrefix, 'no access to student, or student does not exist'])
    throw new Error('No access to student, or student is not registered')
  }

  // Then construct query based on available doctypes for student / teacher relation
  const teacherStudent = availableStudents.find(stud => stud.feidenavn === studentFeidenavn)
  logger('info', [loggerPrefix, 'Access to student validated'])

  if (env.MOCK_API === 'true') {
    logger('info', [loggerPrefix, 'MOCK_API is true', 'Looking for documents in mockdb'])
    const documents = []
    const mockDb = getMockDb()
    const documentIds = mockDb.keys()
    for (const id of documentIds) {
      const document = mockDb.get(id)
      if (!document.mockDocument) continue
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
          const docTypeQuery = { documentTypeId: availableDocumentType.id, 'school.id': school.skolenummer }
          documentTypeOr.push(docTypeQuery)
        }
      }
      const documentQuery = { 'student.elevnummer': teacherStudent.elevnummer, $or: documentTypeOr }
      logger('info', [loggerPrefix, 'Documentquery successfully built', documentQuery, 'Fetching from db'])
      const mongoClient = await getMongoClient()
      const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(`${env.MONGODB_DOCUMENTS_COLLECTION}-${getCurrentSchoolYear('-')}`)
      const documents = await collection.find(documentQuery).toArray()

      logger('info', [loggerPrefix, `Found ${documents.length} documents in db. Filtering out data that shouldnt be retuned.`])

      documents.forEach(doc => {
        if (doc.student?.personalIdNumber) delete doc.student.personalIdNumber
      })

      logger('info', [loggerPrefix, `Done filtering. Returning ${documents.length} documents.`])

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