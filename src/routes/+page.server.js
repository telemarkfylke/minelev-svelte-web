import { env } from '$env/dynamic/private'
import { getTeacher, setActiveRole, setAdminImpersonation } from '$lib/api'
import { getAuthenticatedUser } from '$lib/authentication'
import { error, redirect } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'

/** @type {import('./$types').PageServerLoad} */
export async function load (pageRequest) {
  try {
    const user = getAuthenticatedUser(pageRequest.request.headers)

    // const teacher = getTeacher(user)
    // Check roles - if leder or admin, do some stuff, else do teacher
    // const teacher = await getTeacher(user)
    const latestActivities = [
      // Hent det som er relevant for elevene som gjelder her
    ]
    return {
      teacher: 'Frants'
    }
  } catch (err) {
    logger('error', ['Could not get authentication info...', err.stack || err.toString()])
    throw error(500, `Could not get authentication info... ${err.toString()}`)
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  changeActiveRole: async (event) => {
    try {
      const requestedRole = (await event.request.formData()).get('active_role')
      if (!requestedRole) {
        throw error(400, 'Missing required formdata "active_role')
      }
      const user = await getAuthenticatedUser(event.request.headers)
      await setActiveRole(user, requestedRole)
    } catch (err) {
      logger('error', ['Failed when changing active role for user', err.response?.data || err.stack || err.toString()])
      throw error(500, `Failed when changing active role. Error: ${err.response?.data || err.stack || err.toString()}`)
    }
    throw redirect(303, '/')
  }
}
