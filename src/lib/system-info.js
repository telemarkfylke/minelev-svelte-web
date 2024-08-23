import { env } from '$env/dynamic/private'
import { ACTIVITY_LOG_LIMIT } from '$env/static/private'
import { version } from '../../package.json'

/**
 * @typedef SystemInfo
 * @property {string} version
 * @property {boolean} YFF_ENABLED
 *
 */

/**
 *
 * @returns {SystemInfo}
 */
export const getSystemInfo = () => {
  return {
    version,
    YFF_ENABLED: env.YFF_ENABLED === 'true'
  }
}
