import { logger } from '@vtfk/logger'
import { getUserData } from './get-user-data'
import { getMockDb } from '$lib/mock-db'
import { closeMongoClient, getMongoClient } from '$lib/mongo-client'
import { env } from '$env/dynamic/private'
import { documentTypes, getCurrentSchoolYear } from '$lib/document-types/document-types'

/**
 *
 * @param {import("$lib/authentication").User} user
 * @returns list of documents
 */
export const getSchoolStatistics = async (user) => {
  const loggerPrefix = `getSchoolStatistics - user: ${user.principalName}`
  logger('info', [loggerPrefix, 'New request'])

  // Validate parameteres
  if (!user) {
    logger('error', [loggerPrefix, 'Missing required argument "user'])
    throw new Error('Missing required argument "user"')
  }

  // Check if regular teacher or administrator impersonating teacher or leder
  const canViewDocuments = user.activeRole === env.DEFAULT_ROLE || user.activeRole === env.LEDER_ROLE || user.activeRole === env.ADMIN_ROLE
  if (!canViewDocuments) {
    logger('warn', [loggerPrefix, 'Not allowed to view documents with current role'])
    throw new Error('Not allowed to view documents with current role')
  }

  // Then validate access to student
  const userData = await getUserData(user)
  const availableStudents = userData.students

  if (availableStudents.length === 0) {
    logger('info', [loggerPrefix, 'No available students. No access to stats'])
    return null
  }

  logger('info', [loggerPrefix, 'Creating queries to get stats for all schools'])

  if (env.MOCK_API === 'true') {
    logger('info', [loggerPrefix, 'MOCK_API is true', 'Ah, lets just use documents from mockDb'])
    const documents = []
    const mockDb = getMockDb()
    const documentIds = mockDb.keys()
    for (const id of documentIds) {
      const document = mockDb.get(id)
      if (!document.mockDocument) continue
      documents.push(document)
    }
    logger('info', [loggerPrefix, 'MOCK_API is true', `Found ${documents.length} available documents in mockdb - making some stats`])
    const stats = []
    let maxCount = 0
    for (const document of documents) {
      // Add school if not already in stats
      let statSchool = stats.find(school => school.skolenummer === document.school.id)
      if (!statSchool) {
        stats.push({
          skolenummer: document.school.id,
          skolenavn: document.school.name,
          documentTypes: []
        })
        statSchool = stats.find(school => school.skolenummer === document.school.id)
      }
      let statDocumentType = statSchool.documentTypes.find(docType => docType.documentTypeId === document.documentTypeId)
      if (!statDocumentType) {
        statSchool.documentTypes.push({
          title: document.title,
          documentTypeId: document.documentTypeId,
          count: 0
        })
        statDocumentType = statSchool.documentTypes.find(docType => docType.documentTypeId === document.documentTypeId)
      }
      statDocumentType.count++
      if (statDocumentType.count > maxCount) maxCount = statDocumentType.count
    }

    const total = []

    for (const school of stats) {
      school.documentTypes = school.documentTypes.map(docType => { return { ...docType, maxCount } })
      school.documentTypes.sort((a, b) => a.title.localeCompare(b.title))
      for (const docType of school.documentTypes) {
        let documentTypeTotal = total.find(type => type.documentTypeId === docType.documentTypeId)
        if (!documentTypeTotal) {
          total.push({
            documentTypeId: docType.documentTypeId,
            title: docType.title,
            count: 0
          })
          documentTypeTotal = total.find(type => type.documentTypeId === docType.documentTypeId)
        }
        documentTypeTotal.count += docType.count
      }
    }

    logger('info', [loggerPrefix, 'MOCK_API is true', `Found ${stats.length} schools with stats. Returning`])

    return {
      total: total.sort((a, b) => a.title.localeCompare(b.title)),
      stats: stats.sort((a, b) => a.skolenavn.localeCompare(b.skolenavn))
    }
  } else {
    // Hent fra mongodb
    logger('info', [loggerPrefix, 'Building stats from mongodb'])
    try {
      const mongoClient = await getMongoClient()
      const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(`${env.MONGODB_DOCUMENTS_COLLECTION}-${getCurrentSchoolYear('-')}`)

      // Henter ut alle unike kombinasjoner av skole og dokumenttype, med count
      const distinctSchoolDocumentTypes = await collection.aggregate([{ $group: { _id: { schoolNumber: '$school.id', schoolName: '$school.name', documentTypeId: '$documentTypeId' }, count: { $sum: 1 } } }]).toArray()

      logger('info', [loggerPrefix, `Found ${distinctSchoolDocumentTypes.length} distinct school/documentType combinations`])

      const documentTypeTitles = documentTypes.map(docType => { return { id: docType.id, title: docType.title } })

      const stats = []
      let maxCount = 0
      // Bare samler de litt lettere for frontend
      for (const schoolDocumentType of distinctSchoolDocumentTypes) {
        // Add school if not already in stats
        let statSchool = stats.find(school => school.skolenummer === schoolDocumentType._id.schoolNumber)
        if (!statSchool) {
          stats.push({
            skolenummer: schoolDocumentType._id.schoolNumber,
            skolenavn: schoolDocumentType._id.schoolName,
            documentTypes: []
          })
          statSchool = stats.find(school => school.skolenummer === schoolDocumentType._id.schoolNumber)
        }
        const count = schoolDocumentType.count
        if (count > maxCount) maxCount = count
        statSchool.documentTypes.push({
          title: documentTypeTitles.find(docType => docType.id === schoolDocumentType._id.documentTypeId).title,
          documentTypeId: schoolDocumentType._id.documentTypeId,
          count
        })
      }

      logger('info', [loggerPrefix, `Finished stacking stats, found ${stats.length} schools with stats. Generating total, sorting, and returning`])

      const total = []

      for (const school of stats) {
        school.documentTypes = school.documentTypes.map(docType => { return { ...docType, maxCount } })
        school.documentTypes.sort((a, b) => a.title.localeCompare(b.title))
        for (const docType of school.documentTypes) {
          let documentTypeTotal = total.find(type => type.documentTypeId === docType.documentTypeId)
          if (!documentTypeTotal) {
            total.push({
              documentTypeId: docType.documentTypeId,
              title: docType.title,
              count: 0
            })
            documentTypeTotal = total.find(type => type.documentTypeId === docType.documentTypeId)
          }
          documentTypeTotal.count += docType.count
        }
      }

      return {
        total: total.sort((a, b) => a.title.localeCompare(b.title)),
        stats: stats.sort((a, b) => a.skolenavn.localeCompare(b.skolenavn))
      }
    } catch (error) {
      if (error.toString().startsWith('MongoTopologyClosedError')) {
        logger('warn', 'Oh no, topology is closed! Closing client')
        closeMongoClient()
      }
      throw error
    }
  }
}

/**
 *
 * @param {import("$lib/authentication").User} user
 * @returns list of documents
 */
export const getGroupsStatistics = async (user) => {
  const loggerPrefix = `getGroupStatistics - user: ${user.principalName}`
  logger('info', [loggerPrefix, 'New request'])

  // Validate parameteres
  if (!user) {
    logger('error', [loggerPrefix, 'Missing required argument "user'])
    throw new Error('Missing required argument "user"')
  }

  // Check if regular teacher or administrator impersonating teacher or leder
  const canViewDocuments = user.activeRole === env.DEFAULT_ROLE || user.activeRole === env.LEDER_ROLE || user.activeRole === env.ADMIN_ROLE
  if (!canViewDocuments) {
    logger('warn', [loggerPrefix, 'Not allowed to view documents with current role'])
    throw new Error('Not allowed to view documents with current role')
  }

  // Then validate access to student
  const userData = await getUserData(user)
  const availableStudents = userData.students

  if (availableStudents.length === 0) {
    logger('info', [loggerPrefix, 'No available students. No access to stats'])
    return null
  }

  const basisgrupperForStats = userData.classes.filter(group => group.type === 'basisgruppe').map(group => {
    const someStudent = userData.students.find(student => student.skoler.some(school => school.navn === group.skole))
    const schoolShortName = someStudent.skoler.find(school => school.navn === group.skole).kortkortnavn
    return {
      systemId: group.systemId,
      basisgruppeNavn: `${schoolShortName}:${group.navn}`
    }
  })

  logger('info', [loggerPrefix, 'Creating queries to get stats for all available basisgrupper'])

  if (env.MOCK_API === 'true') {
    logger('info', [loggerPrefix, 'MOCK_API is true', 'Ah, lets just use documents from mockDb'])
    const documents = []
    const mockDb = getMockDb()
    const documentIds = mockDb.keys()
    for (const id of documentIds) {
      const document = mockDb.get(id)
      if (!document.mockDocument) continue
      documents.push(document)
    }

    // Henter ut alle unike kombinasjoner av basisgruppe og dokumenttype
    const basisgruppeNames = basisgrupperForStats.map(basisgruppe => basisgruppe.basisgruppeNavn)

    // Henter ut dokumenttype titler
    const documentTypeTitles = documentTypes.map(docType => { return { id: docType.id, title: docType.title } })

    logger('info', [loggerPrefix, 'MOCK_API is true', `Found ${documents.length} available documents in mockdb - making some stats`])

    const stats = []
    let maxCount = 0
    for (const document of documents) {
      if (!basisgruppeNames.includes(document.student.basisgruppe)) continue
      // Add school if not already in stats
      let statDocumentType = stats.find(docType => docType.documentTypeId === document.documentTypeId)
      if (!statDocumentType) {
        stats.push({
          documentTypeId: document.documentTypeId,
          title: documentTypeTitles.find(docType => docType.id === document.documentTypeId).title,
          basisgrupper: []
        })
        statDocumentType = stats.find(docType => docType.documentTypeId === document.documentTypeId)
      }
      let statBasisgruppe = statDocumentType.basisgrupper.find(gruppe => gruppe.basisgruppe === document.student.basisgruppe)
      if (!statBasisgruppe) {
        console.log('document.student.basisgruppe', document.student.basisgruppe)
        statDocumentType.basisgrupper.push({
          systemId: basisgrupperForStats.find(basisgruppe => basisgruppe.basisgruppeNavn === document.student.basisgruppe).systemId,
          basisgruppe: document.student.basisgruppe,
          count: 0
        })
        statBasisgruppe = statDocumentType.basisgrupper.find(gruppe => gruppe.basisgruppe === document.student.basisgruppe)
      }
      statBasisgruppe.count++
      if (statBasisgruppe.count > maxCount) maxCount = statBasisgruppe.count
    }

    const total = []

    for (const docType of stats) {
      docType.basisgrupper = docType.basisgrupper.map(gruppe => { return { ...gruppe, maxCount } })
      docType.basisgrupper.sort((a, b) => b.count - a.count)
      for (const basisgruppe of docType.basisgrupper) {
        let documentTypeTotal = total.find(type => type.documentTypeId === docType.documentTypeId)
        if (!documentTypeTotal) {
          total.push({
            documentTypeId: docType.documentTypeId,
            title: docType.title,
            count: 0
          })
          documentTypeTotal = total.find(type => type.documentTypeId === docType.documentTypeId)
        }
        documentTypeTotal.count += basisgruppe.count
      }
    }

    logger('info', [loggerPrefix, 'MOCK_API is true', `Found ${stats.length} schools with stats. Returning`])

    return {
      stats,
      total: total.sort((a, b) => a.title.localeCompare(b.title))
    }
  } else {
    // Hent fra mongodb
    logger('info', [loggerPrefix, 'Building stats from mongodb'])
    try {
      const mongoClient = await getMongoClient()
      const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(`${env.MONGODB_DOCUMENTS_COLLECTION}-${getCurrentSchoolYear('-')}`)

      // Henter ut alle unike kombinasjoner av basisgruppe og dokumenttype
      const basisgruppeNames = basisgrupperForStats.map(basisgruppe => basisgruppe.basisgruppeNavn)
      const distinctBasisgruppeDocumentTypes = await collection.aggregate([{ $match: { 'student.basisgruppe': { $in: basisgruppeNames } } }, { $group: { _id: { basisgruppe: '$student.basisgruppe', documentTypeId: '$documentTypeId' }, count: { $sum: 1 } } }]).toArray()

      logger('info', [loggerPrefix, `Found ${distinctBasisgruppeDocumentTypes.length} distinct basisgruppe/documentType combinations to generate stats for`])

      const documentTypeTitles = documentTypes.map(docType => { return { id: docType.id, title: docType.title } })

      const stats = []
      let maxCount = 0
      for (const basisgruppeDocumentType of distinctBasisgruppeDocumentTypes) {
        // Add school if not already in stats
        let statDocType = stats.find(docType => docType.documentTypeId === basisgruppeDocumentType._id.documentTypeId)
        if (!statDocType) {
          stats.push({
            documentTypeId: basisgruppeDocumentType._id.documentTypeId,
            title: documentTypeTitles.find(docType => docType.id === basisgruppeDocumentType._id.documentTypeId).title,
            basisgrupper: []
          })
          statDocType = stats.find(docType => docType.documentTypeId === basisgruppeDocumentType._id.documentTypeId)
        }
        const count = basisgruppeDocumentType.count
        if (count > maxCount) maxCount = count
        statDocType.basisgrupper.push({
          systemId: basisgrupperForStats.find(basisgruppe => basisgruppe.basisgruppeNavn === basisgruppeDocumentType._id.basisgruppe).systemId,
          basisgruppe: basisgruppeDocumentType._id.basisgruppe,
          count
        })
      }

      logger('info', [loggerPrefix, `Finished querying stats, found ${stats.length} basisgrupper with stats. Generating total, sorting, and returning`])

      const total = []

      for (const docType of stats) {
        docType.basisgrupper = docType.basisgrupper.map(gruppe => { return { ...gruppe, maxCount } })
        docType.basisgrupper.sort((a, b) => b.count - a.count)
        for (const basisgruppe of docType.basisgrupper) {
          let documentTypeTotal = total.find(type => type.documentTypeId === docType.documentTypeId)
          if (!documentTypeTotal) {
            total.push({
              documentTypeId: docType.documentTypeId,
              title: docType.title,
              count: 0
            })
            documentTypeTotal = total.find(type => type.documentTypeId === docType.documentTypeId)
          }
          documentTypeTotal.count += basisgruppe.count
        }
      }

      return {
        stats,
        total: total.sort((a, b) => a.title.localeCompare(b.title))
      }
    } catch (error) {
      if (error.toString().startsWith('MongoTopologyClosedError')) {
        logger('warn', 'Oh no, topology is closed! Closing client')
        closeMongoClient()
      }
      throw error
    }
  }
}
