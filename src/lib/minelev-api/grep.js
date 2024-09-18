import { env } from '$env/dynamic/private'
import axios from 'axios'
import { getGrepCache } from '../grep-cache'
import { logger } from '@vtfk/logger'
import { kompetansemaalQuery, utdanningsprogramQuery, programomraaderQuery, programFagKompetansemaalQuery } from '../grep-queries'

const callGrepSparql = async (query) => {
  const url = `${env.GREP_SPARQL_URL}?query=${encodeURIComponent(query)}`
  const { data } = await axios.get(url, { headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' } })
  return data
}

const hentSpraak = (grepItems, languageProperty) => {
  const languageValues = grepItems.map(item => item[languageProperty])
  const defaultLanguage = languageValues.find(item => item['xml:lang'] === 'default')?.value
  if (!defaultLanguage) throw new Error(`No default language value on titleProperty "${languageProperty}"`)
  const nb = languageValues.find(item => item['xml:lang'] === 'nob')?.value || defaultLanguage
  const nn = languageValues.find(item => item['xml:lang'] === 'nno')?.value || defaultLanguage
  const en = languageValues.find(item => item['xml:lang'] === 'eng')?.value || defaultLanguage
  const sm = languageValues.find(item => item['xml:lang'] === 'sme')?.value || defaultLanguage

  return {
    default: defaultLanguage,
    nb,
    nn,
    en,
    sm
  }
}

const repackGrepUtdanningsprogrammer = (grepElements) => {
  const result = []
  for (const grepElement of grepElements) {
    if (result.find(item => item.kode === grepElement.up_kode.value)) continue // Skip if already handled
    const currentUtdanningsprogramElements = grepElements.filter(item => item.up_kode.value === grepElement.up_kode.value)
    const tittel = hentSpraak(currentUtdanningsprogramElements, 'up_tittel')
    const type = {
      'url-data': currentUtdanningsprogramElements[0].up_type_url_data.value,
      beskrivelse: hentSpraak(currentUtdanningsprogramElements, 'up_type_beskrivelse')
    }
    const utdanningsprogram = {
      kode: grepElement.up_kode.value,
      uri: grepElement.up_uri.value,
      'url-data': grepElement.up_url_data.value,
      tittel,
      type
    }
    result.push(utdanningsprogram)
  }
  return result
}

const repackGrepProgramomraader = (grepElements) => {
  const result = []
  for (const grepElement of grepElements) {
    if (result.find(item => item.kode === grepElement.po_kode.value)) continue // Skip if already handled
    const currentProgramomraadeElements = grepElements.filter(item => item.po_kode.value === grepElement.po_kode.value)
    const tittel = hentSpraak(currentProgramomraadeElements, 'po_tittel')
    const programomraade = {
      kode: grepElement.po_kode.value,
      uri: grepElement.po_uri.value,
      'url-data': grepElement.po_url_data.value,
      tittel,
      trinn: grepElement.trinn_kode.value,
      opplaeringssted: grepElement.po_o_sted.value
    }
    result.push(programomraade)
  }
  return result
}

const repackGrepKompetansemaal = (grepElements) => {
  const result = []
  for (const grepElement of grepElements) {
    if (result.find(item => item.kode === grepElement.km_kode.value)) continue // Skip if already handled
    const currentKompetansemaalElements = grepElements.filter(item => item.km_kode.value === grepElement.km_kode.value)
    const tittel = hentSpraak(currentKompetansemaalElements, 'km_tittel')
    const kompetansemaal = {
      kode: grepElement.km_kode.value,
      uri: grepElement.km_uri.value,
      'url-data': grepElement.km_url_data.value,
      tittel
    }
    result.push(kompetansemaal)
  }
  return result
}

/**
 * @typedef {Object} GrepTittel
 * @property {string} default - Default tittel
 * @property {string} nb - Tittel in bokmål
 * @property {string} nn - Tittel in nynorsk
 * @property {string} en - Tittel in english
 * @property {string} sm - Tittel in sami
 *
 */

/**
 * @typedef {Object} GrepUtdanningsprogramType
 * @property {string} url-data - URL-data for utdanningsprogrammet-typen
 * @property {GrepTittel} beskrivelse - Beskrivelse for utdanningsprogrammet-typen
 */

/**
 * @typedef {Object} Utdanningsprogram
 * @property {string} kode - Kode for utdanningsprogrammet
 * @property {string} uri - URI for utdanningsprogrammet
 * @property {string} url-data - URL-data for utdanningsprogrammet
 * @property {GrepTittel} tittel - Tittel for utdanningsprogrammet
 * @property {GrepUtdanningsprogramType} type - Type for utdanningsprogrammet
 */

/**
 * @param {import('$lib/authentication').User} user
 * @returns {Promise<Utdanningsprogram[]>}
 */
export const getGrepUtdanningsprogrammer = async (user) => {
  const loggerPrefix = `getGrepUtdanningsprogrammer - user: ${user.principalName}`
  const grepCache = getGrepCache()
  const cacheKey = 'utdanningsprogrammer'
  const cachedData = grepCache.get(cacheKey)
  if (cachedData) {
    logger('info', [loggerPrefix, 'Got data from cache'])
    return cachedData
  }
  logger('info', [loggerPrefix, 'Grep-utdanningsprogrammer does not exist in cache - refreshing from grep (udir)'])
  const query = utdanningsprogramQuery()
  const data = await callGrepSparql(query)
  const grepElements = data.results?.bindings
  if (!grepElements) throw new Error('No utdanningsprogrammer from grep in "data.result.bindings"')
  logger('info', [loggerPrefix, `Got ${grepElements.length} grep-elememts from grep (udir), repacking`])
  const repackedUtdanningsprogrammer = repackGrepUtdanningsprogrammer(grepElements)
  logger('info', [loggerPrefix, `Repacked data from grep (udir) to ${repackedUtdanningsprogrammer.length} programmer, setting in cache and returning`])
  grepCache.set(cacheKey, repackedUtdanningsprogrammer)
  return repackedUtdanningsprogrammer
}

/**
 * @param {import('$lib/authentication').User} user
 * @param {string} kodeOrUri
 * @returns {Promise<Utdanningsprogram>}
 */
export const getGrepUtdanningsprogram = async (user, kodeOrUri) => {
  const loggerPrefix = `getGrepUtdanningsprogram - user: ${user.principalName}`
  if (!kodeOrUri) throw new Error('Missing required parameter: kodeOrUri')
  let uri
  let httpsUri
  let kode
  // uri startswith http:// in udir, and https:// in fint, for some reason... No worries here, just checking for cached values, and not using http://
  if (kodeOrUri.startsWith('https://') || kodeOrUri.startsWith('http://')) {
    uri = kodeOrUri.startsWith('https://') ? kodeOrUri.replace('https://', 'http://') : kodeOrUri
    httpsUri = kodeOrUri.startsWith('http://') ? kodeOrUri.replace('http://', 'https://') : kodeOrUri
  } else {
    kode = kodeOrUri
  }
  const utdanningsprogrammer = await getGrepUtdanningsprogrammer(user)
  const utdanningsprogram = utdanningsprogrammer.find(item => item.kode === kode || item.uri === uri || item.uri === httpsUri)
  if (!utdanningsprogram) throw new Error(`No utdanningsprogram found with kode or uri: ${kodeOrUri}`)
  return utdanningsprogram
}

/**
 * @typedef {Object} Programomraade
 * @property {string} kode - Kode for programomraade
 * @property {string} uri - URI for programomraade
 * @property {string} url-data - URL-data for programomraade
 * @property {GrepTittel} tittel - Tittel for programomraade
 * @property {string} trinn - Trinn for programomraade
 * @property {string} opplaeringssted - Opplæringssted for programomraade
 */

/**
 * @param {import('$lib/authentication').User} user
 * @param {string} utdanningsprogramKode
 * @param {"vg1" | "vg2" | "vg3"} [aarstrinn]
 * @returns {Promise<Programomraade[]>}
 */
export const getGrepProgramomraader = async (user, utdanningsprogramKode, aarstrinn) => {
  const loggerPrefix = `getGrepProgramomraader - user: ${user.principalName} - ${utdanningsprogramKode} - ${aarstrinn}`
  const grepCache = getGrepCache()
  const cacheKey = `programomraader-${utdanningsprogramKode}-${aarstrinn}`
  const cachedData = grepCache.get(cacheKey)
  if (cachedData) {
    logger('info', [loggerPrefix, 'Got data from cache'])
    return cachedData
  }
  logger('info', [loggerPrefix, 'Grep-programomraader does not exist in cache - refreshing from grep (udir)'])
  const query = programomraaderQuery(utdanningsprogramKode, aarstrinn)
  const data = await callGrepSparql(query)
  const grepElements = data.results?.bindings
  if (!grepElements) throw new Error('No programomraader from grep in "data.result.bindings"')
  logger('info', [loggerPrefix, `Got ${grepElements.length} grep-elements from grep (udir), repacking`])
  const repackedProgramomraader = repackGrepProgramomraader(grepElements)
  logger('info', [loggerPrefix, `Repacked data from grep (udir) to ${repackedProgramomraader.length} omraader, setting in cache and returning`])
  grepCache.set(cacheKey, repackedProgramomraader)
  return repackedProgramomraader
}

/**
 * @typedef {Object} Kompetansemaal
 * @property {string} kode - Kode for kompetansemaal
 * @property {string} uri - URI for kompetansemaal
 * @property {string} url-data - URL-data for kompetansemaal
 * @property {GrepTittel} tittel - Tittel for kompetansemaal
 *
 */

/**
 * @param {import('$lib/authentication').User} user
 * @param {string} programomraadeKode
 * @returns {Promise<Kompetansemaal[]>}
 */
export const getGrepKompetaansemaal = async (user, programomraadeKode, onlyProgramfag = true) => {
  const loggerPrefix = `getGrepKompetaansemaal - user: ${user.principalName} - ${programomraadeKode} - onlyProgramfag: ${onlyProgramfag}`
  const grepCache = getGrepCache()
  const cacheKey = `kompetansemaal-${programomraadeKode}`
  const cachedData = grepCache.get(cacheKey)
  if (cachedData) {
    logger('info', [loggerPrefix, 'Got data from cache'])
    return cachedData
  }
  logger('info', [loggerPrefix, 'Grep-kompetansemaal does not exist in cache - refreshing from grep (udir)'])
  const query = onlyProgramfag ? programFagKompetansemaalQuery(programomraadeKode) : kompetansemaalQuery(programomraadeKode)
  const data = await callGrepSparql(query)
  const grepElements = data.results?.bindings
  if (!grepElements) throw new Error('No kompetansemaal from grep in "data.result.bindings"')
  logger('info', [loggerPrefix, `Got ${grepElements.length} grep-elements from grep (udir), repacking`])
  const repackedKompetansemaal = repackGrepKompetansemaal(grepElements)
  logger('info', [loggerPrefix, `Repacked data from grep (udir) to ${repackedKompetansemaal.length} kompetansemaal, setting in cache and returning`])
  grepCache.set(cacheKey, repackedKompetansemaal)
  return repackedKompetansemaal
}
