import { env } from '$env/dynamic/private'
import { getInternalCache } from '$lib/internal-cache'
import { getApplicationUsers } from '$lib/microsoft-graph'
import { getMockDb } from '$lib/mock-db'
import { closeMongoClient, getMongoClient } from '$lib/mongo-client'
import { logger } from '@vtfk/logger'
import { ObjectId } from 'mongodb'
import getSchools from 'vtfk-schools-info'

/**
 * @typedef {Object} AvailableUsers
 * @property {import('$lib/microsoft-graph').ApplicationUser[]} availableLeaders
 * @property {import('$lib/microsoft-graph').ApplicationUser[]} availableTeachers
 */

/**
 * @param {import('$lib/authentication').User} user
 * @returns {Promise<AvailableUsers>}
 */
export const getAvailableUsers = async (user) => {
  if (!user.hasAdminRole) throw new Error('Du har ikke tilgang til å gjøre dette')
  const leaderKey = 'available-leaders'
  const teacherKey = 'available-teachers'
  const internalCache = getInternalCache()
  const availableLeaders = internalCache.get(leaderKey)
  const availableTeachers = internalCache.get(teacherKey)
  if (availableLeaders && availableTeachers) {
    logger('info', ['Found application users in cahce - returning'])
    return {
      availableLeaders,
      availableTeachers
    }
  }
  logger('info', ['No application users in cache - fetching from Microsoft Graph'])
  const applicationUsers = await getApplicationUsers(env.FRONTENT_APP_ID)
  const leaders = applicationUsers.filter(user => user.appRoleValue === env.LEDER_ROLE)
  const teachers = applicationUsers.filter(user => user.appRoleValue === env.DEFAULT_ROLE)
  internalCache.set(leaderKey, leaders)
  internalCache.set(teacherKey, teachers)
  logger('info', ['Fetched application users from Microsoft Graph and set in cache - returning'])
  return {
    availableLeaders: leaders,
    availableTeachers: teachers
  }
}

/**
 * @param {import('$lib/authentication').User} user
 * @returns {Promise<import('$lib/microsoft-graph').ApplicationUser[]>}
 */
const getAvailableLeaders = async (user) => {
  if (!user.hasAdminRole) throw new Error('Du har ikke tilgang til å gjøre dette')
  const { availableLeaders } = await getAvailableUsers(user)
  return availableLeaders
}

/**
 *
 * @param {import('$lib/authentication').User} user
 * @param {string} lederPrincipalId
 * @param {string} schoolNumber
 */
export const setSchoolAccess = async (user, lederPrincipalId, schoolNumber) => {
  if (!user.hasAdminRole) throw new Error('Du har ikke tilgang til å gjøre dette')
  {
    // Wipe cached entry for user if it exists
    const cacheKey = `schoolAccessEntries-${lederPrincipalId}`
    const internalCache = getInternalCache()
    internalCache.del(cacheKey)
  }
  const availableLeaders = await getAvailableLeaders(user)
  const leader = availableLeaders.find(leader => leader.principalId === lederPrincipalId)
  if (!leader) throw new Error(`Fant ingen leder-bruker med denne principalId ${lederPrincipalId}`)
  const school = getSchools({ schoolNumber })
  if (!school || (Array.isArray(school) && school.length === 0)) throw new Error(`Fant ingen skole med skoleNummer ${schoolNumber}`)
  // Så må vi sjekke om denne tilgangen finnes allerede da...
  const existingAccessEntries = await getSchoolAccess(user, lederPrincipalId)
  if (existingAccessEntries.some(entry => entry.principalId === lederPrincipalId && entry.schoolNumber === schoolNumber)) throw new Error('Tilgangen finnes allerede')

  const schoolAccess = {
    enabled: true,
    principalId: leader.principalId,
    principalName: leader.principalDisplayName,
    schoolNumber,
    schoolName: school[0].fullName,
    created: {
      timestamp: new Date().toISOString(),
      by: {
        id: user.principalId,
        displayName: user.name
      }
    }
  }

  if (env.MOCK_API === 'true') {
    logger('info', [`MOCK_API is enabled, storing school access for ${lederPrincipalId} and ${schoolNumber} in mock db`])
    const mockDb = getMockDb()
    const randomId = new ObjectId().toString()
    mockDb.set(randomId, { ...schoolAccess, _id: randomId, type: 'school-access' })
    logger('info', [`MOCK_API is enabled, stored school access for ${lederPrincipalId} and ${schoolNumber} in mock db`])
    return { insertedId: randomId }
  }

  try {
    logger('info', [`${user.principalName} - inserting school access for ${lederPrincipalId} and ${schoolNumber} in db`])
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(env.MONGODB_LEDER_SCHOOL_ACCESS_COLLECTION)
    const result = await collection.insertOne(schoolAccess)
    logger('info', [`${user.principalName} succesfully inserted school access for ${lederPrincipalId} and ${schoolNumber} in db`])
    return result
  } catch (error) {
    if (error.toString().startsWith('MongoTopologyClosedError')) {
      logger('warn', 'Oh no, topology is closed! Closing client')
      closeMongoClient()
    }
    throw error
  }
}

/**
 * @typedef {Object} SchoolAccess
 * @property {string} _id
 * @property {boolean} enabled
 * @property {string} principalId
 * @property {string} principalName
 * @property {string} schoolNumber
 * @property {string} schoolName
 * @property {Object} created
 * @property {string} created.timestamp
 * @property {Object} created.by
 * @property {string} created.by.id
 * @property {string} created.by.displayName
 * @property {Object} [disabled]
 * @property {string} disabled.timestamp
 * @property {Object} disabled.by
 * @property {string} disabled.by.id
 * @property {string} disabled.by.displayName
 *
 */

/**
 *
 * @param {import('$lib/authentication').User} user
 * @param {string} lederPrincipalId
 * @returns {SchoolAccess[]}
 */
const getSchoolAccess = async (user, lederPrincipalId) => {
  if (!user.hasAdminRole) throw new Error('Du har ikke tilgang til å gjøre dette')
  if (env.MOCK_API === 'true') {
    logger('info', [`MOCK_API is enabled, getting mock db school access for ${lederPrincipalId}`])
    const mockDb = getMockDb()
    const mockDbKeys = mockDb.keys()
    const schoolAccess = []
    for (const key of mockDbKeys) {
      const entry = mockDb.get(key)
      if (!entry.type === 'school-access') continue
      if (entry.principalId === lederPrincipalId && entry.enabled) {
        schoolAccess.push(entry)
      }
    }
    logger('info', [`MOCK_API is enabled, found ${schoolAccess.length} mock school access elements for ${lederPrincipalId} in mock db`])
    return schoolAccess
  }
  try {
    logger('info', [`Getting school access for ${lederPrincipalId} from db`])
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(env.MONGODB_LEDER_SCHOOL_ACCESS_COLLECTION)
    const accessEntries = await collection.find({ principalId: lederPrincipalId, enabled: true }).toArray()
    logger('info', [`Found ${accessEntries.length} school access elements for ${lederPrincipalId} in db`])
    return accessEntries
  } catch (error) {
    if (error.toString().startsWith('MongoTopologyClosedError')) {
      logger('warn', 'Oh no, topology is closed! Closing client')
      closeMongoClient()
    }
    throw error
  }
}

/**
 *
 * @param {import('$lib/authentication').User} user
 * @param {string} lederPrincipalId
 * @param {string} schoolNumber
 * @returns {boolean}
 */
export const disableSchoolAccess = async (user, lederPrincipalId, schoolNumber) => {
  if (!user.hasAdminRole) throw new Error('Du har ikke tilgang til å gjøre dette')

  {
    // Wipe cached entry for user if it exists
    const cacheKey = `schoolAccessEntries-${lederPrincipalId}`
    const internalCache = getInternalCache()
    internalCache.del(cacheKey)
  }

  const accessEntries = await getSchoolAccess(user, lederPrincipalId)
  const accessEntriesToDisable = accessEntries.filter(entry => entry.schoolNumber === schoolNumber)
  logger('info', [`${user.principalName} - Disabling ${accessEntriesToDisable.length} school access entries for ${lederPrincipalId} and ${schoolNumber}`])
  if (env.MOCK_API === 'true') {
    logger('info', [`MOCK_API is enabled, disabling ${accessEntriesToDisable.length} school access entries for ${lederPrincipalId} and ${schoolNumber} in mock db`])
    const mockDb = getMockDb()
    for (const accessEntry of accessEntriesToDisable) {
      accessEntry.enabled = false
      mockDb.set(accessEntry._id, accessEntry)
    }
    logger('info', [`MOCK_API is enabled, disabled ${accessEntriesToDisable.length} school access entries for ${lederPrincipalId} and ${schoolNumber} in mock db`])
    return true
  }

  try {
    logger('info', [`${user.principalName} - Disabling ${accessEntriesToDisable.length} school access entries for ${lederPrincipalId} and ${schoolNumber} in db`])
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(env.MONGODB_LEDER_SCHOOL_ACCESS_COLLECTION)
    const update = { enabled: false, disabled: { timestamp: new Date().toISOString(), by: { id: user.principalId, displayName: user.name } } }
    const result = await collection.updateMany({ principalId: lederPrincipalId, schoolNumber, enabled: true }, { $set: update })
    logger('info', [`${user.principalName} - Disabled ${result.modifiedCount} school access entries for ${lederPrincipalId} and ${schoolNumber} in db`])
    return true
  } catch (error) {
    if (error.toString().startsWith('MongoTopologyClosedError')) {
      logger('warn', 'Oh no, topology is closed! Closing client')
      closeMongoClient()
    }
    throw error
  }
}

/**
 * @typedef {Object} SchoolAccessEntryProps
 * @property {boolean} hasLeaderRole
 */

/**
 * @typedef {SchoolAccess & SchoolAccessEntryProps} SchoolAccessEntry
 */

/**
 * @typedef {Object} ActiveSchoolAccessAndAvailableLeaders
 * @property {SchoolAccessEntry[]} schoolAccess
 * @property {import('$lib/microsoft-graph').ApplicationUser[]} availableLeaders
 */

/**
 *
 * @param {*} user
 * @returns {Promise<ActiveSchoolAccessAndAvailableLeaders[]>}
 */
export const getActiveSchoolAccessAndAvailableLeaders = async (user) => {
  if (!user.hasAdminRole) throw new Error('Du har ikke tilgang til å gjøre dette')
  const availableLeaders = await getAvailableLeaders(user)
  let schoolAccessEntries = []
  if (env.MOCK_API === 'true') {
    logger('info', ['MOCK_API is enabled, getting all mock school access entries'])
    const mockDb = getMockDb()
    const mockDbKeys = mockDb.keys()
    for (const key of mockDbKeys) {
      const entry = mockDb.get(key)
      if (!entry.type === 'school-access' || !entry.enabled) continue
      schoolAccessEntries.push(entry)
    }
    logger('info', [`MOCK_API is enabled, found ${schoolAccessEntries.length} mock school access entries`])
  } else {
    try {
      logger('info', ['Getting all school access entries from db'])
      const mongoClient = await getMongoClient()
      const collection = mongoClient.db(env.MONGODB_DB_NAME).collection(env.MONGODB_LEDER_SCHOOL_ACCESS_COLLECTION)
      const accessEntries = await collection.find({ enabled: true }).toArray()
      logger('info', [`Found ${accessEntries.length} school access entries in db`])
      schoolAccessEntries = accessEntries
    } catch (error) {
      if (error.toString().startsWith('MongoTopologyClosedError')) {
        logger('warn', 'Oh no, topology is closed! Closing client')
        closeMongoClient()
      }
      throw error
    }
  }
  schoolAccessEntries = schoolAccessEntries.map(entry => {
    const activeLeader = availableLeaders.find(leader => leader.principalId === entry.principalId)
    return { ...entry, hasLeaderRole: activeLeader !== undefined }
  })

  const currentCountyNumber = env.FEIDENAVN_SUFFIX.includes('telemarkfylke') ? '40' : '39'

  const schools = getSchools({ countyNumber: currentCountyNumber }).map(school => {
    return {
      schoolNumber: school.schoolNumber,
      name: school.fullName
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
  for (const school of schools) {
    school.accessEntries = schoolAccessEntries.filter(entry => entry.schoolNumber === school.schoolNumber).sort((a, b) => a.principalName.localeCompare(b.principalName))
  }

  return { schoolAccess: schools, availableLeaders }
}
