import { getTeacher } from '$lib/api'
import { getAuthenticatedUser } from '$lib/authentication'
import { error } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'


/** @type {import('./$types').PageServerLoad} */
export async function load(pageRequest) {
	try {
		const user = getAuthenticatedUser(pageRequest.request.headers)

		// const teacher = getTeacher(user)
		// Check roles - if leder or admin, do some stuff, else do teacher
		console.log('kjører hjem på server')
		// const teacher = await getTeacher(user)
		const latestActivities = [
			// Hent det som er relevant for elevene som gjelder her
		]
		return {
			teacher: "Frants"
		}
	} catch (err) {
		logger('error', ['Could not get authentication info...', err.stack || err.toString()])
		throw error(500, `Could not get authentication info... ${err.toString()}`)
	}
}