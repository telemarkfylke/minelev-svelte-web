import { env } from '$env/dynamic/private'
import { version } from '../../package.json'

/**
 * @typedef SystemInfo
 * @property {string} version
 * @property {boolean} YFF_ENABLED
 * @property {boolean} VARSEL_READONLY
 * @property {boolean} ELEVSAMTALE_READONLY
 * @property {boolean} NOTAT_READONLY
 * @property {boolean} YFF_READONLY
 * @property {boolean} FAGSKOLEN_ENABLED
 * @property {string} FAGSKOLEN_SKOLENUMMER
 * @property {boolean} createDocumentAvailable
 *
 */

/**
 *
 * @returns {SystemInfo}
 */
export const getSystemInfo = () => {
  const systemInfo = {
    version,
    YFF_ENABLED: env.YFF_ENABLED === 'true',
    VARSEL_READONLY: env.VARSEL_READONLY === 'true',
    ELEVSAMTALE_READONLY: env.ELEVSAMTALE_READONLY === 'true',
    NOTAT_READONLY: env.NOTAT_READONLY === 'true',
    YFF_READONLY: env.YFF_READONLY === 'true',
    FAGSKOLEN_ENABLED: env.FAGSKOLEN_ENABLED === 'true',
    FAGSKOLEN_SKOLENUMMER: env.FAGSKOLEN_SKOLENUMMER || '70036' // Default to Fagskolen Vestfold og Telemark
  }
  systemInfo.createDocumentAvailable = !systemInfo.VARSEL_READONLY || !systemInfo.ELEVSAMTALE_READONLY || (!systemInfo.YFF_READONLY && systemInfo.YFF_ENABLED)
  return systemInfo
}
