import { getTeacher } from '$lib/api'
import { getAuthenticatedUser } from '$lib/authentication'
import { error } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'


/** @type {import('./$types').PageServerLoad} */
export async function load(pageRequest) {
	try {
		console.log('LAYOUT RERENDRA!!')
		const user = getAuthenticatedUser(pageRequest.request.headers)
		const { teacher, students, classes } = await getTeacher(user)
		return {
			user,
			teacher,
			students,
			classes
		}
	} catch (err) {
		logger('error', ['Could not get authentication info...', err.stack || err.toString()])
		throw error(500, `Could not get authentication info... ${err.toString()}`)
	}
}