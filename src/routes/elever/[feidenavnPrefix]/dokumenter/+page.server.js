import { getAuthenticatedUser } from '$lib/authentication'
import { error, redirect } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'
import { env } from '$env/dynamic/private'
import { getStudent } from '$lib/minelev-api/get-student'

/** @type {import('./$types').LayoutServerLoad} */
export async function load ({ params, request }) {
  throw redirect(303, `/elever/${params.feidenavnPrefix}`)
}