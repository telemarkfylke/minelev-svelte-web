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
 * @param {Object} [docFilter]
 * @returns list of documents
 */
export const getStudentDocuments = async (user, studentFeidenavn, docFilter) => {
  const loggerPrefix = `getStudentDocuments - user: ${user.principalName} - student: ${studentFeidenavn} - docFilter - ${docFilter}`
  logger('info', [loggerPrefix, 'New request'])

  // Validate parameteres
  if (!studentFeidenavn) {
    logger('error', [loggerPrefix, 'Missing required argument "studentFeidenavn'])
    throw new Error('Missing required argument "studentFeidenavn"')
  }

  if (docFilter) {
    if (docFilter.types && !Array.isArray(docFilter.types)) {
      logger('error', [loggerPrefix, 'Parameter "docFilter.types" must be array'])
      throw new Error('Parameter "docFilter.types" must be array')
    }
    if (docFilter.variants && !Array.isArray(docFilter.variants)) {
      logger('error', [loggerPrefix, 'Parameter "docFilter.variants" must be array'])
      throw new Error('Parameter "docFilter.variants" must be array')
    }
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
      if (docFilter) {
        if (docFilter.types && !docFilter.types.includes(document.type)) continue
        if (docFilter.variants && !docFilter.variants.includes(document.variant)) continue
      }
      documents.push(document)
    }
    // Then sort by newest first
    documents.sort((a, b) => b.created.timestamp - a.created.timestamp)
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
      if (docFilter) {
        if (docFilter.types) {
          documentQuery.type = { $in: docFilter.types }
        }
        if (docFilter.variants) {
          documentQuery.variant = { $in: docFilter.variants }
        }
      }
      if (documentQuery.$or.length === 0) {
        logger('info', [loggerPrefix, 'No documentTypes available for student - documentQuery', documentQuery, 'returning empty array'])
        return []
      }
      logger('info', [loggerPrefix, 'Documentquery successfully built', documentQuery, 'Fetching from db'])
      const mongoClient = await getMongoClient()
      const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(`${env.MONGODB_DOCUMENTS_COLLECTION}-${getCurrentSchoolYear('-')}`)
      const documents = await collection.find(documentQuery).sort({ _id: -1 }).toArray() // Sort { _id: -1 } is newest first, thank you mongodb

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
