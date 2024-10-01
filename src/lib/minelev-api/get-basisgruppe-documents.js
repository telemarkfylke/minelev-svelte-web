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
export const getBasisgruppeDocuments = async (user, basisgruppeSystemId) => {
  const loggerPrefix = `getBasisgruppeDocuments - user: ${user.principalName}`
  logger('info', [loggerPrefix, 'New request'])

  // Validate parameteres
  if (!user) {
    logger('error', [loggerPrefix, 'Missing required argument "user'])
    throw new Error('Missing required argument "user"')
  }

  if (!basisgruppeSystemId) {
    logger('error', [loggerPrefix, 'Missing required argument "basisgruppeSystemId'])
    throw new Error('Missing required argument "basisgruppeSystemId"')
  }

  // If just administrator, return empty array
  if (user.activeRole === env.ADMIN_ROLE && !user.impersonating) {
    logger('info', [loggerPrefix, 'User is only administrator right now, returning empty array'])
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

  // Check if user has access to basisgruppe
  const currentBasisgruppe = userData.classes.find(group => group.systemId === basisgruppeSystemId && group.type === 'basisgruppe')

  if (!currentBasisgruppe) {
    logger('warn', [loggerPrefix, 'User does not have access to basisgruppe'])
    throw new Error('No access to basisgruppe')
  }

  // Get basisgruppe name as saved in db (because i am an idiot and inheritet the old structure)
  const someStudent = availableStudents.find(student => student.skoler.some(school => school.navn === currentBasisgruppe.skole))
  if (!someStudent) {
    logger('error', [loggerPrefix, 'Could not find basisgruppe school, should not happen'])
    throw new Error('Could not find basisgruppe school')
  }
  const schoolShortName = someStudent.skoler.find(school => school.navn === currentBasisgruppe.skole).kortkortnavn
  if (!schoolShortName) {
    logger('error', [loggerPrefix, 'Could not find basisgruppe school short name, should not happen'])
    throw new Error('Could not find basisgruppe school short name')
  }
  const documentBasisgruppeName = `${schoolShortName}:${currentBasisgruppe.navn}`

  logger('info', [loggerPrefix, `User has access to basisgruppe ${documentBasisgruppeName}, fetching relevant documents from db`])

  if (env.MOCK_API === 'true') {
    logger('info', [loggerPrefix, 'MOCK_API is true', 'Ah, lets just return relevant docs from mockDb'])
    const documents = []
    const mockDb = getMockDb()
    const documentIds = mockDb.keys()
    for (const id of documentIds) {
      const document = mockDb.get(id)
      if (!document.mockDocument) continue
      if (!document.student.basisgruppe === documentBasisgruppeName) continue
      documents.push(document)
    }
    logger('info', [loggerPrefix, 'MOCK_API is true', `Found ${documents.length} available documents for basisgruppe ${documentBasisgruppeName} in mockdb - returning`])
    return documents
  } else {
    // Hent fra mongodb! Skal ha alle dokumentene med student.basisgruppe === documentBasisgruppeName (og tilgang på eleven og dokumenttypen)
    const basisgruppeStudents = availableStudents.filter(student => student.klasser.some(group => group.systemId === basisgruppeSystemId && group.type === 'basisgruppe'))
    logger('info', [loggerPrefix, `Building documentQueries based on ${basisgruppeStudents.length} basisgruppeStudents - hopefully won't crash mongodb`])
    try {
      const studentOr = []

      for (const teacherStudent of basisgruppeStudents) {
        const documentTypeOr = []
        for (const availableDocumentType of teacherStudent.availableDocumentTypes) {
          for (const school of availableDocumentType.schools) {
            const docTypeQuery = { documentTypeId: availableDocumentType.id, 'school.id': school.skolenummer }
            documentTypeOr.push(docTypeQuery)
          }
        }
        if (documentTypeOr.length > 0) { // Don't add if no documentTypes available for student (e.g if student only present in basisgruppe, but teacher is not contact teacher)
          const studentQuery = { 'student.elevnummer': teacherStudent.elevnummer, $or: documentTypeOr }
          studentOr.push(studentQuery)
        }
      }
      const documentQuery = { 'student.basisgruppe': documentBasisgruppeName, $or: studentOr }

      logger('info', [loggerPrefix, `Documentquery successfully built for ${documentBasisgruppeName}`, 'Fetching from db'])
      const mongoClient = await getMongoClient()
      const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(`${env.MONGODB_DOCUMENTS_COLLECTION}-${getCurrentSchoolYear('-')}`)
      const documents = await collection.find(documentQuery).sort({ _id: -1 }).toArray()

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
