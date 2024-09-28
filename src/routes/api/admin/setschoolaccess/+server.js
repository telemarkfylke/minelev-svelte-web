import { getAuthenticatedUser } from '$lib/authentication'
import { setSchoolAccess } from '$lib/minelev-api/leder-access'
import { json } from '@sveltejs/kit'

export const POST = async ({ params, request, url }) => {
  try {
    const { lederPrincipalId, schoolNumber } = await request.json()
    if (!lederPrincipalId) return json({ message: 'Missing "lederPrincipalId"' }, { status: 400 })
    if (!schoolNumber) return json({ message: 'Missing "schoolNumber"' }, { status: 400 })

    const user = await getAuthenticatedUser(request.headers)
    const setResult = await setSchoolAccess(user, lederPrincipalId, schoolNumber)
    return json(setResult)
  } catch (error) {
    return json({ message: 'Failed when setting school access', error: error.response?.data || error.stack || error.toString() }, { status: 500 })
  }
}
