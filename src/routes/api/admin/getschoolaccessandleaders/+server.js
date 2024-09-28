import { getAuthenticatedUser } from '$lib/authentication'
import { getActiveSchoolAccessAndAvailableLeaders } from '$lib/minelev-api/leder-access'
import { json } from '@sveltejs/kit'

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const activeSchoolAccessAndAvailableLeaders = await getActiveSchoolAccessAndAvailableLeaders(user)
    return json(activeSchoolAccessAndAvailableLeaders)
  } catch (error) {
    return json({ message: 'Failed when getting school access and leaders', error: error.response?.data || error.stack || error.toString() }, { status: 400 })
  }
}
