import { logger } from '@vtfk/logger'
import { getUserData } from './get-user-data'
import { getMockDb } from '$lib/mock-db'
import { closeMongoClient, getMongoClient } from '$lib/mongo-client'
import { env } from '$env/dynamic/private'
import { getCurrentSchoolYear } from '$lib/document-types/document-types'

/**
 *
 * @param {import("$lib/authentication").User} user
 * @returns list of documents
 */
export const getLatestActivity = async (user) => {
  const loggerPrefix = `getLatestActivity - user: ${user.principalName}`
  logger('info', [loggerPrefix, 'New request'])

  // Validate parameteres
  if (!user) {
    logger('error', [loggerPrefix, 'Missing required argument "user'])
    throw new Error('Missing required argument "user"')
  }

  // If just administrator, return empty array
  if (user.activeRole === env.ADMIN_ROLE && !user.impersonating) {
    logger('info', [loggerPrefix, 'User is only administrator right now, returnign empty array'])
    return []
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

  if (availableStudents.length === 0) {
    logger('info', [loggerPrefix, 'No available students. Returning empty array'])
    return []
  }

  logger('info', [loggerPrefix, 'Creating a bunch of queries to get all latest documents user has access to'])

  if (env.MOCK_API === 'true') {
    logger('info', [loggerPrefix, 'MOCK_API is true', 'Ah, lets just return all from mockDb'])
    const documents = []
    const mockDb = getMockDb()
    const documentIds = mockDb.keys()
    for (const id of documentIds) {
      const document = mockDb.get(id)
      if (!document.mockDocument) continue
      documents.push(document)
    }
    logger('info', [loggerPrefix, 'MOCK_API is true', `Found ${documents.length} available documents in mockdb - returning`])
    return documents
  } else {
    // Hent fra mongodb! Skal ha alle dokumentene med availableDocumenttype ved en gitt skole (så kan frontend få sortere på varsel-fag (prabableFaggrupper))
    logger('info', [loggerPrefix, `Building documentQueries based on ${availableStudents.length} availableStudents - hopefully won't crash mongodb`])
    try {
      const studentOr = []
      for (const teacherStudent of availableStudents) {
        const documentTypeOr = []
        for (const availableDocumentType of teacherStudent.availableDocumentTypes) {
          for (const school of availableDocumentType.schools) {
            const docTypeQuery = { documentTypeId: availableDocumentType.id, 'school.id': school.skolenummer }
            documentTypeOr.push(docTypeQuery)
          }
        }
        const studentQuery = { 'student.elevnummer': teacherStudent.elevnummer, $or: documentTypeOr }
        studentOr.push(studentQuery)
      }
      const documentQuery = { $or: studentOr }

      logger('info', [loggerPrefix, 'Documentquery successfully built', 'Fetching from db'])
      const mongoClient = await getMongoClient()
      const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(`${env.MONGODB_DOCUMENTS_COLLECTION}-${getCurrentSchoolYear('-')}`)
      const documents = await collection.find(documentQuery).sort({ _id: -1 }).limit(50).toArray()

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
