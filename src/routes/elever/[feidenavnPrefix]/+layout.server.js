import { getAuthenticatedUser } from '$lib/authentication'
import { error } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'
import { env } from '$env/dynamic/private'
import { getStudent } from '$lib/minelev-api/get-student'

/** @type {import('./$types').LayoutServerLoad} */
export async function load ({ params, request }) {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const studentFeidenavn = `${params.feidenavnPrefix}@${env.FEIDENAVN_SUFFIX}`
    const { student, documents, faggrupper, probableFaggrupper } = await getStudent(user, studentFeidenavn)
    return {
      studentData: {
        student,
        documents,
        faggrupper,
        probableFaggrupper
      }
    }
  } catch (err) {
    logger('error', ['Could not get student...', err.stack || err.toString()])
    throw error(500, `Kunne ikke hente elev. Feilmelding: ${err.toString()}`)
  }
}
