import { logger } from '@vtfk/logger'
import NodeCache from 'node-cache'

let grepCache = null

/**
 *
 * @returns { import('node-cache') }
 */
export const getGrepCache = () => {
  if (!grepCache) {
    logger('info', ['grep-cache', 'Cache does not exist - creating'])
    grepCache = new NodeCache({ stdTTL: 86400 }) // 24 hours
    logger('info', ['grep-cache', 'Cache created - returning'])
  }
  return grepCache
}
