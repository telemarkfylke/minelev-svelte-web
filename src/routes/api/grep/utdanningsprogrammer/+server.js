import { getAuthenticatedUser } from '$lib/authentication'
import { getGrepUtdanningsprogrammer } from '$lib/minelev-api/grep'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const utdanningsprogrammer = await getGrepUtdanningsprogrammer(user)
    return json(utdanningsprogrammer)
  } catch (error) {
    logger('error', ['Failed when fetching utdanningsprogrammer', error.response?.data || error.stack || error.toString()])
    return json({ message: `Feilet ved henting av utdannignsprogrammer fra UDIR: ${error.toString()}` }, { status: 500 })
  }
}
