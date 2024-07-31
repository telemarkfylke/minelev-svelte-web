import { getAuthenticatedUser } from "$lib/authentication"
import { json } from "@sveltejs/kit"

export const GET = async ({ params, request, url }) => {
  const user = await getAuthenticatedUser(request.headers)
  console.log(request.url)
  //const hasPermission = canViewStudent()
  console.log("kjører child man")
  return json(
    {
      hei: "HAllo",
      huhu: "HVordan går det?",
      feidenavnPrefix: params.feidenavnPrefix,
      user,
      limit: url.searchParams.get('limit')
    }
  )
}