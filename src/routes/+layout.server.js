import { env } from '$env/dynamic/private'
import { getTeacher } from '$lib/api'
import { getAuthenticatedUser } from '$lib/authentication'
import { error } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

/** @type {import('./$types').LayoutServerLoad} */
export async function load ({ request }) {
  try {
    const user = await getAuthenticatedUser(request.headers)

    const result = {
      user,
      teacher: null,
      students: [],
      classes: []
    }
    // Sjekk hva vi skal hente basert på om hva de har tilgang/rolle til

    // Sjekk om vanlig lærer
    if (user.activeRole === env.DEFAULT_ROLE) {
      const { teacher, students, classes } = await getTeacher(user.principalName)
      result.teacher = teacher
      result.students = students
      result.classes = classes
    }

    // Sjekk om Leder / Rådgiver
    if (user.activeRole === env.LEDER_ROLE) {

    }

    // Sjekk om Admin
    if (user.activeRole === env.ADMIN_ROLE) {
      
    }

    return result
  } catch (err) {
    logger('error', ['Could not get authentication info...', err.response?.data || err.stack || err.toString()])
    throw error(500, `Could not get authentication info... ${err.toString()}`)
  }
}
