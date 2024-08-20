import { logger } from '@vtfk/logger'
import { getUserData } from './get-user-data'
import { getMockDb } from '$lib/mock-db'
import { getMongoClient, closeMongoClient } from '$lib/mongo-client'
import { ObjectId } from 'mongodb'
import { env } from '$env/dynamic/private'
import { getCurrentSchoolYear } from '$lib/document-types/document-types'

/**
 *
 * @param {import("$lib/authentication").User} user
 * @param {string} studentFeidenavn
 * @param {string} documentId
 * @returns document
 */
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
  const allowedToView = availableStudents.some(stud => stud.feidenavn === studentFeidenavn)
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
  const teacherStudent = availableStudents.find(stud => stud.feidenavn === studentFeidenavn)
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
