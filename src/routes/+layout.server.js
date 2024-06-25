import { getTeacher } from '$lib/api'
import { getAuthenticatedUser } from '$lib/authentication'
import { error } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

/** @type {import('./$types').LayoutServerLoad} */
export async function load ({ request }) {
  try {
    const user = getAuthenticatedUser(request.headers)

    // Sjekk hva vi skal hente basert på om hva de har tilgang/rolle til
    
    // Ikke sikkert vi trenger teacher 

    // Vi prøver å alltid kjøre autorisering her i .server.js-filene, om det er mulig
    const { teacher, students, classes } = await getTeacher(user)
    return {
      user,
      teacher, // Bruker vi denne propertien til noe egt?
      students,
      classes
    }
  } catch (err) {
    logger('error', ['Could not get authentication info...', err.stack || err.toString()])
    throw error(500, `Could not get authentication info... ${err.toString()}`)
  }
}
