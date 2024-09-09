import { env } from '$env/dynamic/private'
import { logger } from '@vtfk/logger'
import axios from 'axios'

/**
 * @typedef BrregEnhet
 * @property {string} organisasjonsNummer
 * @property {string} navn
 * @property {string} addresse
 * @property {string} postnummer
 * @property {string} poststed
 *
 */

/**
 *
 * @param {Object} enhet
 * @param {"enhet" | "underenhet"} type
 * @returns {BrregEnhet}
 */
const repackEnhet = (enhet, type) => {
  if (!['enhet', 'underenhet'].includes(type)) throw new Error(`parameter "type" must be "enhet" or "underenhet", got "${type}"`)
  const fallbackAddress = enhet.forretningsadresse || enhet.beliggenhetsadresse || enhet.postadresse // I tilfelle man mangler postadresse
  const address = enhet.postadresse || fallbackAddress
  const streetAddress = address.adresse.filter(addressLine => addressLine).join(', ')
  return {
    organisasjonsNummer: enhet.organisasjonsnummer,
    navn: enhet.navn,
    adresse: streetAddress || 'Ukjent addresse',
    postnummer: address.postnummer || 'Ukjent postnummer',
    poststed: address.poststed || 'Ukjent poststed',
    type
  }
}

/**
 * @param {import("$lib/authentication").User} user
 * @param {string} query
 * @returns {BrregEnhet[]}
 */
export const brregSearch = async (user, query) => {
  if (!query) throw new Error('Missing required parameter "query"')
  if (typeof query !== 'string') throw new Error('parameter "query" must be string')
  const loggerPrefix = `brregSearch - user: ${user.principalName} - query: ${query}`
  logger('info', [loggerPrefix, 'new request'])

  const maxReturned = 15
  const disallowedQueryChars = ['<', '>'] // Hm, trenger vi dette da
  disallowedQueryChars.forEach(char => {
    query = query.replaceAll(char, '')
  })
  if (!isNaN(query) && query.length === 9) {
    // Orgnr
    logger('info', [loggerPrefix, `Query is orgnr - checking for enheter and underenheter with orgnr ${query}`])
    console.log(`${env.BRREG_API_URL}/enheter?organisasjonsnummer=${query}`)
    const enheterResponse = await axios.get(`${env.BRREG_API_URL}/enheter?organisasjonsnummer=${query}`)
    const underenheterResponse = await axios.get(`${env.BRREG_API_URL}/underenheter?organisasjonsnummer=${query}`)
    const result = {
      enheter: Array.isArray(enheterResponse.data?._embedded?.enheter) ? enheterResponse.data?._embedded?.enheter.map(enhet => repackEnhet(enhet, 'enhet')) : [],
      underenheter: Array.isArray(underenheterResponse.data?._embedded?.underenheter) ? underenheterResponse.data?._embedded?.underenheter.map(enhet => repackEnhet(enhet, 'underenhet')) : []
    }
    logger('info', [loggerPrefix, `Got response, ${result.enheter.length} enheter, and ${result.underenheter.length} underenheter`])
    return [...result.enheter.slice(0, maxReturned), ...result.underenheter.slice(0, maxReturned)]
  }
  logger('info', [loggerPrefix, `Query is namesearch, URIencoding query for safety reasons - checking for enheter and underenheter with name ${query}`])
  query = encodeURIComponent(query) // For at folk ikke kan legge inn tukkl
  const enheterResponse = await axios.get(`${env.BRREG_API_URL}/enheter?navn=${query}`)
  const underenheterResponse = await axios.get(`${env.BRREG_API_URL}/underenheter?navn=${query}`)
  const result = {
    enheter: Array.isArray(enheterResponse.data?._embedded?.enheter) ? enheterResponse.data?._embedded?.enheter.map(enhet => repackEnhet(enhet, 'enhet')) : [],
    underenheter: Array.isArray(underenheterResponse.data?._embedded?.underenheter) ? underenheterResponse.data?._embedded?.underenheter.map(enhet => repackEnhet(enhet, 'underenhet')) : []
  }
  logger('info', [loggerPrefix, `Got response, ${result.enheter.length} enheter, and ${result.underenheter.length} underenheter`])
  return [...result.enheter.slice(0, maxReturned), ...result.underenheter.slice(0, maxReturned)]
}

/**
 * @param {import("$lib/authentication").User} user
 * @param {string} orgnr
 * @param {"enhet" | "underenhet"} type
 * @returns {BrregEnhet}
 */
export const brregUnit = async (user, orgnr, type) => {
  if (!['enhet', 'underenhet'].includes(type)) throw new Error('parameter "type" must be "enhet" or "underenhet"')
  if (!orgnr) throw new Error('Missing required parameter "orgnr"')
  if (isNaN(orgnr) || orgnr.length !== 9) throw new Error(`Parameter orgnr must be numerical and of length 9, got ${orgnr}`)
  const loggerPrefix = `brregUnit - user: ${user.principalName} - orgnr: ${orgnr} - type: ${type}`
  logger('info', [loggerPrefix, 'new request'])

  const typeUrl = type === 'enhet' ? 'enheter' : 'underenheter'
  const { data } = await axios.get(`${env.BRREG_API_URL}/${typeUrl}/${orgnr}`)
  const result = repackEnhet(data, type)
  logger('info', [loggerPrefix, 'Got response'])

  return result
}
