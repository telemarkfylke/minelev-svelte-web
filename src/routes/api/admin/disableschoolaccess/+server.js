import { getAuthenticatedUser } from '$lib/authentication'
import { disableSchoolAccess } from '$lib/minelev-api/leder-access'
import { json } from '@sveltejs/kit'

export const POST = async ({ params, request, url }) => {
  try {
    const { lederPrincipalId, schoolNumber } = await request.json()
    if (!lederPrincipalId) return json({ message: 'Missing "lederPrincipalId"' }, { status: 400 })
    if (!schoolNumber) return json({ message: 'Missing "schoolNumber"' }, { status: 400 })

    const user = await getAuthenticatedUser(request.headers)
    const disableResult = await disableSchoolAccess(user, lederPrincipalId, schoolNumber)
    return json(disableResult)
  } catch (error) {
    return json({ message: 'Failed when disabling school access', error: error.response?.data || error.stack || error.toString() }, { status: 500 })
  }
}
