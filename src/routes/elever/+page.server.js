import { env } from '$env/dynamic/private'
import { getAuthenticatedUser } from '$lib/authentication'
import { error } from '@sveltejs/kit'
import { logConfig, logger } from '@vtfk/logger'

/** @type {import('./$types').PageServerLoad} */
export async function load (pageRequest) {
  console.log('Kjører klasser på server')
  return {
    klasse: "1STB"
  }
}
