import { getAuthenticatedUser } from '$lib/authentication'
import { getAvailableUsers } from '$lib/minelev-api/leder-access'
import { json } from '@sveltejs/kit'

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const availableUsers = await getAvailableUsers(user)
    return json(availableUsers)
  } catch (error) {
    return json({ message: 'Failed when getting available users', error: error.response?.data || error.stack || error.toString() }, { status: 400 })
  }
}
