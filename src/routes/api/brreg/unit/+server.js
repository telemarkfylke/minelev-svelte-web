import { env } from '$env/dynamic/private'
import { getAuthenticatedUser } from '$lib/authentication'
import { brregUnit } from '$lib/minelev-api/brreg'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const orgnr = url.searchParams.get('orgnr')
    if (!orgnr) throw new Error('Missing required queryparam "orgnr"')
    const type = url.searchParams.get('type')
    if (!type) throw new Error('Missing required queryparam "type"')
    const unit = await brregUnit(user, orgnr, type)
    return json(unit)
  } catch (error) {
    logger('error', ['Failed when getting brreg unit', error.response?.data || error.stack || error.toString()])
    return json({ message: `Feilet ved henting av enhet fra Brreg: ${error.toString()}` }, { status: 500 })
  }
}
