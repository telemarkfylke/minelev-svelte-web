import { env } from '$env/dynamic/private'
import { getAuthenticatedUser } from '$lib/authentication'
import { newDocument } from '$lib/minelev-api/new-document'
import { json } from '@sveltejs/kit'

export const POST = async ({ params, request, url }) => {
  try {
    const { documentTypeId, type, variant, schoolNumber, documentData, preview } = await request.json()

    const user = await getAuthenticatedUser(request.headers)
    const studentFeidenavn = `${params.feidenavnPrefix}@${env.FEIDENAVN_SUFFIX}`
    const newDocumentResult = await newDocument(user, studentFeidenavn, documentTypeId, type, variant, schoolNumber, documentData, preview)
    return json(newDocumentResult)
  } catch (error) {
    return json({ message: 'Failed when creating new document', error: error.response?.data || error.stack || error.toString() }, { status: 500 })
  }
}
