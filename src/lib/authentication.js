import { env } from "$env/dynamic/private"
import { error } from "@sveltejs/kit"
import { logger } from "@vtfk/logger"
import jwt from 'jsonwebtoken'
const { sign, decode } = jwt

/**
 * 
 * @param {Headers} headers 
 */
export const getAuthenticatedUser = (headers) => {
  if (env.MOCK_AUTH === 'true' && env.NODE_ENV !== 'production') {
    logger('warn', ['env.MOCK_AUTH is true, injecting MS auth headers, enjoy your local testing - if this in prod, pray and delete everything'])
    headers.set('x-ms-client-principal-name', 'demo.spokelse@fisfylke.no')
    headers.set('x-ms-client-principal-id', '12345-4378493-fjdiofjd')

    // Create mock id-token with necessary values
    const mockJwtPayload = {
        "auth_typ": "aad",
        "claims": [
          {
            "typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
            "val": "demo.spokelse@fisfylke.no"
          },
          {
            "typ": "name",
            "val": "Demo Spøkelse"
          },
          {
            "typ": "http://schemas.microsoft.com/identity/claims/objectidentifier",
            "val": "12345-4378493-fjdiofjd"
          },
          {
            "typ": "preferred_username",
            "val": "demo.spokelse@fisfylke.no"
          },
        ],
        "name_typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        "role_typ": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    }
    if (env.MOCK_AUTH_LARER_ROLE === 'true') {
      mockJwtPayload.claims.push({
        "typ": "roles",
        "val": env.DEFAULT_ROLE
      })
    }
    if (env.MOCK_AUTH_LEDER_ROLE === 'true') {
      mockJwtPayload.claims.push({
        "typ": "roles",
        "val": env.LEDER_ROLE
      })
    }
    if (env.MOCK_AUTH_ADMIN_ROLE === 'true') {
      mockJwtPayload.claims.push({
        "typ": "roles",
        "val": env.ADMIN_ROLE
      })
    }

    const mockIdToken = sign(mockJwtPayload, 'mockesecretingentingfarligher')
    headers.set('x-ms-client-principal', mockIdToken)

  }

	// Get MS Auth headers
	const principalName = headers.get('x-ms-client-principal-name')
	const principalId = headers.get('x-ms-client-principal-id')
	const idToken = headers.get('x-ms-client-principal')

	if (!principalName || !principalId || !idToken) {
		logger('warn', ['Missing authentication headers from Microsoft, something is wrong'])
		throw error(500, 'Missing authentication headers from Microsoft, something is wrong')
	}

	const decodedToken = decode(idToken)
	if (!decodedToken) throw error(500, 'Det e itj no token her')
	const roles = decodedToken.claims.filter(claim => claim.typ === 'roles').map(claim => claim.val)
	const name = decodedToken.claims.find(claim => claim.typ === 'name').val
	return {
		principalName,
		principalId,
		name,
		roles
	}
}