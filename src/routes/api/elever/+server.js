import { getAuthenticatedUser } from "$lib/authentication"
import { json } from "@sveltejs/kit"

export const GET = async ({ params, request }) => {
  const user = await getAuthenticatedUser(request.headers)
  //onst hasPermission = canViewStudent()
  console.log("JEg kjører nå jeg")
  return json(
    {
      hei: "Jeg er et novå pop",
      huhu: "HVordan går det?",
      feidenavnPrefix: params.feidenavnPrefix,
      user
    }
  )
}