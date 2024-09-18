import { getAuthenticatedUser } from '$lib/authentication'
import { brregSearch } from '$lib/minelev-api/brreg'
import { getGrepKompetaansemaal } from '$lib/minelev-api/grep'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const programomraade = url.searchParams.get('programomraade')
    if (!programomraade) throw new Error('Missing required queryparam "programomraade"')

    const kompetansemaal = await getGrepKompetaansemaal(user, programomraade)
    return json(kompetansemaal)
  } catch (error) {
    logger('error', ['Failed when fetching kompetansemaal', error.response?.data || error.stack || error.toString()])
    return json({ message: `Feilet ved henting av kompetansemaal fra UDIR: ${error.toString()}` }, { status: 500 })
  }
}
