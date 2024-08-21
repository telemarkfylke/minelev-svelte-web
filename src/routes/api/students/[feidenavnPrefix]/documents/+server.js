import { env } from '$env/dynamic/private'
import { getAuthenticatedUser } from '$lib/authentication'
import { getStudentDocuments } from '$lib/minelev-api/get-student-documents'
import { json } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const studentFeidenavn = `${params.feidenavnPrefix}@${env.FEIDENAVN_SUFFIX}`
    const documents = await getStudentDocuments(user, studentFeidenavn)
    return json(documents)
  } catch (error) {
    logger('error', ['Failed when fetching documents', error.response?.data || error.stack || error.toString()])
    return json({ message: 'Failed when fetching documents', error: error.response?.data || error.stack || error.toString() }, { status: 500 })
  }
}
