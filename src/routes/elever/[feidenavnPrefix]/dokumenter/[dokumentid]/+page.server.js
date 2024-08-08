import { getDocument, getStudent } from '$lib/api'
import { getTeacher } from '$lib/api'
import { getAuthenticatedUser } from '$lib/authentication'
import { error } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'
import { env } from '$env/dynamic/private'


/** @type {import('./$types').LayoutServerLoad} */
export async function load ({ params, request }) {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const studentFeidenavn = `${params.feidenavnPrefix}@${env.FEIDENAVN_SUFFIX}`
    const documentId = params.dokumentId
    const document = await getDocument(user, studentFeidenavn, documentId)
    return { document }
  } catch (err) {
    logger('error', ['Could not get document...', err.stack || err.toString()])
    throw error(500, `Kunne ikke hente dokument. Feilmelding: ${err.toString()}`)
  }
}
