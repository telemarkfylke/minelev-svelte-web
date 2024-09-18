import { env } from '$env/dynamic/private'
import { getAuthenticatedUser } from '$lib/authentication'
import { getAvailableLaereplaner, getYffDocuments } from '$lib/minelev-api/yff'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const studentFeidenavn = `${params.feidenavnPrefix}@${env.FEIDENAVN_SUFFIX}`
    const documents = await getYffDocuments(user, studentFeidenavn)
    return json(documents)
  } catch (error) {
    logger('error', ['Failed when fetching yff documents', error.response?.data || error.stack || error.toString()])
    return json({ message: 'Failed when fetching yff documents', error: error.stack || error.toString() }, { status: 500 })
  }
}
