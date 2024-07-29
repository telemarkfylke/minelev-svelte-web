import { env } from '$env/dynamic/private'
import { getTeacher, setActiveRole, setAdminImpersonation } from '$lib/api'
import { getAuthenticatedUser } from '$lib/authentication'
import { error } from '@sveltejs/kit'
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
      logger('info', ['Changing active role'])
      const requestedRole = (await event.request.formData()).get('active_role')
      if (!requestedRole) throw new Error('Missing required form data "active_role"')
      const user = await getAuthenticatedUser(event.request.headers)
      if (!user.roles.find(role => role.value === requestedRole)) throw error(401, 'Du har ikke tilgang på den rollen')
      await setActiveRole(user, requestedRole)
    } catch (err) {
      logger('error', ['Failed when chaning active role for user', err.response?.data || err.stack || err.toString()])
      throw error(500, `Failed when changing active role. Error: ${err.response?.data || err.stack || err.toString()}`)
    }
  },
  adminImpersonate: async (event) => {
    try {
      logger('info', ['Changing active role'])
      const target = (await event.request.formData()).get('impersonation_target')
      if (!target) throw new Error('Missing required form data "impersonation_target"')
      const user = await getAuthenticatedUser(event.request.headers)
      if (!user.activeRole === env.ADMIN_ROLE || !user.roles.find(role => role.value === env.ADMIN_ROLE)) {
        throw error(403, 'Du har ikke tilgang på denne funksjonen')
      }
      await setAdminImpersonation(user, target)
    } catch (err) {
      logger('error', ['Failed when setting user impersonation for admin', err.response?.data || err.stack || err.toString()])
      throw error(500, `Failed when setting user impersonation for admin. Error: ${err.response?.data || err.stack || err.toString()}`)
    }
  }
}
