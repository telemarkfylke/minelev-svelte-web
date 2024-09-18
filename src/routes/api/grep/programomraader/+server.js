import { getAuthenticatedUser } from '$lib/authentication'
import { brregSearch } from '$lib/minelev-api/brreg'
import { getGrepProgramomraader, getGrepUtdanningsprogrammer } from '$lib/minelev-api/grep'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const utdanningsprogram = url.searchParams.get('utdanningsprogram')
    if (!utdanningsprogram) throw new Error('Missing required queryparam "utdanningsprogram"')
    const trinn = url.searchParams.get('trinn')
    if (!trinn) throw new Error('Missing required queryparam "trinn"')
    const programomraader = await getGrepProgramomraader(user, utdanningsprogram, trinn)
    return json(programomraader)
  } catch (error) {
    logger('error', ['Failed when fetching programomraader', error.response?.data || error.stack || error.toString()])
    return json({ message: `Feilet ved henting av programomraader fra UDIR: ${error.toString()}` }, { status: 500 })
  }
}
