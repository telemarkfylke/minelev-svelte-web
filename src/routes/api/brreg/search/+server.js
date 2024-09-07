import { env } from '$env/dynamic/private'
import { getAuthenticatedUser } from '$lib/authentication'
import { brregSearch } from '$lib/minelev-api/brreg'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const query = url.searchParams.get('query')
    if (!query) throw new Error('Missing required queryparam "query"')
    const units = await brregSearch(user, query)
    return json(units)
  } catch (error) {
    logger('error', ['Failed when searching for brreg units', error.response?.data || error.stack || error.toString()])
    return json({ message: `Feilet ved søking på enheter fra Brreg: ${error.toString()}` }, { status: 500 })
  }
}
