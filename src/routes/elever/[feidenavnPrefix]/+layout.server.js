import { getStudent } from '$lib/api'
import { getTeacher } from '$lib/api'
import { getAuthenticatedUser } from '$lib/authentication'
import { error } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'
import { env } from '$env/dynamic/private'

const canViewStudent = (user, availableStudents, feidenavn) => {
  // If roles and stuff - return something
  // Else regular student - teacherStudents comes from server-side, so cannot be messed with. Just check that student is included in teacherStudents
  // Finnes eleven i lista over studenter tilknyttet til brukeren
  const allowedToView = availableStudents.find(stud => stud['feidenavn'] === feidenavn)
  if (!allowedToView) return false
  return true
}


/** @type {import('./$types').LayoutServerLoad} */
export async function load ({ params, parent }) {
  // Is dependent on request.params and parent, will run again if request.params (or parent) changes
  let loggerPrefix = '/elever/[feidenavnPrefix]'
  try {
    logger('info', [loggerPrefix, 'New request for student', `feidenavnPrefix: ${params.feidenavnPrefix}`])
    const { user, students, classes } = await parent()
    // const user = getAuthenticatedUser(pageRequest.request.headers)
    // const { students } = await getTeacher(user)

    loggerPrefix += ` - User: ${user.principalName}`
    
    const studentFeidenavn = `${params.feidenavnPrefix}${env.STUDENT_FEIDENAVN_SUFFIX}`
    logger('info', [loggerPrefix, `Validating access to student ${studentFeidenavn}`])
    // Sjekk at brukeren har lov til å hente eleven
    if (!canViewStudent(user, students, studentFeidenavn)) {
      logger('warn', [loggerPrefix, `User does not have access to student ${studentFeidenavn}! Someone is doing something they shouldnt...`])
      throw error(403, 'Du har ikke tilgang på denne eleven')
    }

    logger('info', [loggerPrefix, `Access to student ${studentFeidenavn} validated. Fetching student from FINT and repacking`])
    const { documents, faggrupper, probableFaggrupper } = await getStudent(studentFeidenavn, classes)

    logger('info', [loggerPrefix, `Got student data for ${studentFeidenavn}, returning frontend with data`])
    
    return {
      studentData: {
        documents,
        faggrupper,
        probableFaggrupper
      }
    }
  } catch (err) {
    logger('error', [loggerPrefix, 'Could not get student...', err.stack || err.toString()])
    throw error(500, `Kunne ikke hente elev. Feilmelding: ${err.toString()}`)
  }
}
