import { getAuthenticatedUser } from '$lib/authentication'
import { getBasisgruppeDocuments } from '$lib/minelev-api/get-basisgruppe-documents'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request, url }) => {
  try {
    const systemId = url.searchParams.get('system_id')
    if (!systemId) throw new Error('Missing required queryparam "system_id"')
    const user = await getAuthenticatedUser(request.headers)
    const documents = await getBasisgruppeDocuments(user, systemId)
    return json(documents)
  } catch (error) {
    logger('error', ['Failed when fetching documents for basisgruppe', error.response?.data || error.stack || error.toString()])
    return json({ message: `Feilet ved henting av dokumenter for basisgruppe: ${error.toString()}` }, { status: 500 })
  }
}
