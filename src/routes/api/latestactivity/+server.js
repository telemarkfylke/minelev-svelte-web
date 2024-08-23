import { getAuthenticatedUser } from '$lib/authentication'
import { getLatestActivity } from '$lib/minelev-api/get-latest-activity'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const latestActivity = await getLatestActivity(user)
    return json(latestActivity)
  } catch (error) {
    logger('error', ['Failed when fetching latest activities', error.response?.data || error.stack || error.toString()])
    return json({ message: `Feilet ved henting av siste aktivitet: ${error.toString()}` }, { status: 500 })
  }
}
