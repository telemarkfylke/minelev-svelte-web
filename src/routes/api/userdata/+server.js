import { getAuthenticatedUser } from '$lib/authentication'
import { getUserData } from '$lib/minelev-api/get-user-data'
import { json } from '@sveltejs/kit'

export const GET = async ({ params, request }) => {
  const user = await getAuthenticatedUser(request.headers)
  const userData = await getUserData(user)
  return json({ user, ...userData })
}
