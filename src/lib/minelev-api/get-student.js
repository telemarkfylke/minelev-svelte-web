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
 * @property {string} upn
 * @property {Fag} fag
 * @property {Fag} fag
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
  for (const elevforhold of student.elevforhold.filter(forhold => forhold.aktiv || (new Date() < new Date(forhold.gyldighetsperiode.start)))) { // Aktive eller aktive i fremtiden
    for (const faggruppe of elevforhold.faggruppemedlemskap.filter(medlemskap => medlemskap.aktiv || (new Date() < new Date(medlemskap.medlemskapgyldighetsperiode.start)))) { // Aktive eller aktive i fremtiden
      faggrupper.push({
        navn: faggruppe.navn,
        systemId: faggruppe.systemId,
        fag: faggruppe.fag,
        skole: repackMiniSchool(elevforhold.skole)
      })
    }
  }

  /* NEI NYTT UNDER
  // Lager først en liste med undervisningsgruppene læreren har eleven i, så filtrerer vi faggruppene på de som starter med samme prefix som undervisningsgruppene har eleven i.
  // Typ hvis læreren har undervisningsgruppe 3STK/NOR2340, så antar vi at alle faggrupper som starter med 3STK/NOR er aktuelle som faggrupper
  // Evt sjekk om det er fullstendig match. Kan vi finne ut hvilke som typisk har 2 underliggende faggrupper a?
  const relevantUndervisningsgrupper = classes.filter(group => !group.fag.includes('Basisgruppe') && group.navn.split('/').length === 2).map(group => {
    const groupNameList = group.navn.split('/')
    return { className: groupNameList[0], undervisningsgruppeName: groupNameList[1] }
  })
  const probableFaggrupper = faggrupper.filter(gruppe => {
    const nameList = gruppe.navn.split('/')
    if (nameList.length !== 2) return false // We assume name {klassenavn}/{faggruppenavn}
    const className = nameList[0]
    const faggruppeName = nameList[1]
    const matchingUndervisningsgruppe = relevantUndervisningsgrupper.some(undervisningsgruppe => {
      if (undervisningsgruppe.className === className && undervisningsgruppe.undervisningsgruppeName.substring(0, 3) === faggruppeName.substring(0, 3)) return true
      return false
    })
    return matchingUndervisningsgruppe
  })

  */ // ENKEL OG GREIT UNDER HER
  logger('info', [loggerPrefix, `Finsihed repacking ${faggrupper.length} faggrupper, finding faggrupper teacher probably teaches`])
  // Henter alle faggrupper der det er en undervisningsgruppe som heter det samme som faggruppen, resten må lærer utvide for å få se / velge. Frontend må passe på å vise alle som er valgt til en hver tid
  const probableFaggrupper = faggrupper.filter(faggruppe => classes.some(group => group.navn === faggruppe.navn))

  logger('info', [loggerPrefix, `Found ${probableFaggrupper.length} probable faggrupper. Returning data`])

  return {
    student: repackedStudent,
    faggrupper,
    probableFaggrupper
  }
}
