import { getAuthenticatedUser } from '$lib/authentication'
import { getGroupsStatistics } from '$lib/minelev-api/get-statistics'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const stats = await getGroupsStatistics(user)
    return json(stats)
  } catch (error) {
    logger('error', ['Failed when fetching group statistics', error.response?.data || error.stack || error.toString()])
    return json({ message: `Feilet ved henting av statistikk for basisgrupper: ${error.toString()}` }, { status: 500 })
  }
}
