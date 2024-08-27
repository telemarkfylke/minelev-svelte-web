import { redirect } from '@sveltejs/kit'

/** @type {import('./$types').LayoutServerLoad} */
export async function load ({ params, request }) {
  throw redirect(303, `/elever/${params.feidenavnPrefix}`)
}
