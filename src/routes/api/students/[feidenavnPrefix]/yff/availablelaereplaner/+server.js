import { env } from '$env/dynamic/private'
import { getAuthenticatedUser } from '$lib/authentication'
import { getAvailableLaereplaner } from '$lib/minelev-api/yff'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const studentFeidenavn = `${params.feidenavnPrefix}@${env.FEIDENAVN_SUFFIX}`
    const availableLaereplaner = await getAvailableLaereplaner(user, studentFeidenavn)
    return json(availableLaereplaner)
  } catch (error) {
    logger('error', ['Failed when fetching available laereplaner', error.response?.data || error.stack || error.toString()])
    return json({ message: 'Failed when fetching available laereplaner', error: error.stack || error.toString() }, { status: 500 })
  }
}
