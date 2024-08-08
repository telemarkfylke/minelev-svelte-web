import { env } from "$env/dynamic/private"
import { getStudent, getStudentDocuments, newDocument } from "$lib/api"
import { getAuthenticatedUser } from "$lib/authentication"
import { json } from "@sveltejs/kit"

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const studentFeidenavn = `${params.feidenavnPrefix}@${env.FEIDENAVN_SUFFIX}`
    const documents = await getStudentDocuments(user, studentFeidenavn)
    return json(documents)
  } catch (error) {
    return json({ message: 'Failed when fetching documents', error: error.response?.data || error.stack || error.toString() }, { status: 500 }) 
  }
}