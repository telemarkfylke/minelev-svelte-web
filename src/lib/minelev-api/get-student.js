import { fintStudent } from '$lib/fintfolk-api/student'
import { logger } from '@vtfk/logger'
import { getUserData, repackMiniSchool } from './get-user-data'

/**
 * @typedef Fag
 * @property {string} systemId
 * @property {string} navn
 * @property {string[]} grepreferanse
 *
 */

/**
 * @typedef Faggruppe
 * @property {string} navn
 * @property {string} systemId
 * @property {Fag} fag
 * @property {import("./get-user-data").MiniSchool} skole
 */

/**
 * @typedef Basisgruppe
 * @property {string} navn
 * @property {string} systemId
 * @property {string} trinn
 * @property {import("./get-user-data").MiniSchool} skole
 */

/**
 * @typedef Student
 * @property {string} upn
 * @property {string} feidenavn
 * @property {string} elevnummer
 * @property {string} name
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} birthdate
 */

/**
 * @typedef StudentData
 * @property {Student} student
 * @property {Basisgruppe[]} basisgrupper
 * @property {Faggruppe[]} faggrupper
 * @property {Faggruppe[]} probableFaggrupper
 *
 */

/**
 * @param {import("$lib/authentication").User} user
 * @param {string} studentFeidenavn
 * @param {boolean} includeSsn
 * @returns {StudentData}
 */
export const getStudent = async (user, studentFeidenavn, includeSsn = false) => {
  const loggerPrefix = `getStudent - user: ${user.principalName} - student: ${studentFeidenavn}`
  logger('info', [loggerPrefix, 'New request'])
  // First validate access to student
  const userData = await getUserData(user)

  const availableStudents = userData.students
  logger('info', [loggerPrefix, 'Validating access to student'])
  const allowedToView = availableStudents.find(stud => stud.feidenavn === studentFeidenavn)
  if (!allowedToView) {
    logger('warn', [loggerPrefix, 'no access to student, or student does not exist'])
    throw new Error('No access to student, or student is not registered')
  }
  logger('info', [loggerPrefix, 'Access validated, fetching data'])

  const classes = userData.classes

  const student = await fintStudent(studentFeidenavn)

  logger('info', [loggerPrefix, 'Got student from FINT, repacking'])

  const repackedStudent = {
    upn: student.upn,
    feidenavn: student.feidenavn,
    elevnummer: student.elevnummer,
    name: student.navn,
    firstName: student.fornavn,
    lastName: student.etternavn,
    birthdate: student.fodselsdato
  }
  if (includeSsn) repackedStudent.personalIdNumber = student.fodselsnummer

  // Alle faggrupper, fordi vi mangler relasjon mellom lærer og faggrupper
  const faggrupper = []
  const basisgrupper = []
  for (const elevforhold of student.elevforhold.filter(forhold => forhold.aktiv || (new Date() < new Date(forhold.gyldighetsperiode.start)))) { // Aktive eller aktive i fremtiden
    for (const basisgruppe of elevforhold.basisgruppemedlemskap.filter(medlemskap => medlemskap.aktiv || (new Date() < new Date(medlemskap.medlemskapgyldighetsperiode.start)))) { // Aktive eller aktive i fremtiden
      basisgrupper.push({
        navn: basisgruppe.navn,
        systemId: basisgruppe.systemId,
        trinn: basisgruppe.trinn,
        skole: repackMiniSchool(elevforhold.skole)
      })
    }
    for (const faggruppe of elevforhold.faggruppemedlemskap.filter(medlemskap => medlemskap.aktiv || (new Date() < new Date(medlemskap.medlemskapgyldighetsperiode.start)))) { // Aktive eller aktive i fremtiden
      faggrupper.push({
        navn: faggruppe.navn,
        systemId: faggruppe.systemId,
        fag: faggruppe.fag,
        skole: repackMiniSchool(elevforhold.skole)
      })
    }
  }

  logger('info', [loggerPrefix, `Finsihed repacking ${faggrupper.length} faggrupper, finding faggrupper teacher probably teaches`])
  // Henter alle faggrupper der det er en undervisningsgruppe som heter det samme som faggruppen eller har special match, resten må lærer utvide for å få se / velge. Frontend må passe på å vise alle som er valgt til en hver tid
  const probableFaggrupper = faggrupper.filter(faggruppe => {
    if (classes.some(group => group.navn === faggruppe.navn)) return true
    const faggruppeNameList = faggruppe.navn.split('/')
    if (faggruppeNameList.length !== 3) return false // Antar faggruppe navn lik "{klasse}/{fagnavn}/{fagkode}"
    const faggruppeClassName = faggruppeNameList[0]
    // const faggruppeCourseName = faggruppeNameList[1]
    const faggruppeCourseCode = faggruppeNameList[2]
    const specialMatch = classes.some(group => {
      const groupNameList = group.navn.split('/')
      if (groupNameList.length !== 3) return false // Antar undervisningsgruppenavn lik "{klasse}/{gruppenavn}/{fagkode}"
      const groupClassName = groupNameList[0]
      // const groupCourseName = groupNameList[1]
      const groupCourseCode = groupNameList[2]
      if (faggruppeClassName === groupClassName && faggruppeCourseCode === groupCourseCode) {
        console.log(`${faggruppeClassName} er lik ${groupClassName} og ${faggruppeCourseCode} er lik ${groupCourseCode} - match`)
        return true
      }
      // Norsk undervisningsgrupper har flere faggrupper under ofte, kan legge til flere special cases her og evt
      if (faggruppeClassName === groupClassName && faggruppeCourseCode.startsWith('NOR') && groupCourseCode.startsWith('NOR') && faggruppeCourseCode.startsWith(groupCourseCode.substring(0, 5))) {
        // console.log(`${faggruppeClassName} er lik ${groupClassName} og ${faggruppeCourseCode} starter med NOR, og ${groupCourseCode} starter med NOR, og ${faggruppeCourseCode} starter med ${groupCourseCode.substring(0, 5)} - match`)
        return true
      }
      return false
    })
    if (specialMatch) return true
    return false
  })

  logger('info', [loggerPrefix, `Found ${probableFaggrupper.length} probable faggrupper. Returning data`])

  return {
    student: repackedStudent,
    basisgrupper,
    faggrupper,
    probableFaggrupper
  }
}
