import { env } from '$env/dynamic/private'
import axios from 'axios'
import { getGrepCache } from './grep-cache'
import { logger } from '@vtfk/logger'

export const callGrep = async (resource) => {
  const grepCache = getGrepCache()
  const cachedResult = grepCache.get(resource)
  if (cachedResult) {
    // logger('info', ['Found cached grep-result for resource', resource])
    return cachedResult
  }
  const grepUrl = `${env.GREP_API_URL}/${resource}`
  logger('info', ['Calling grep', grepUrl])
  const { data } = await axios.get(grepUrl, { headers: { ContentType: 'application/json' } })
  // logger('info', ['Got grep response', data])
  grepCache.set(resource, data)
  return data
}
