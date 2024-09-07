import { env } from '$env/dynamic/private'
import { documentTypes } from '$lib/document-types/document-types'
import { fintTeacher } from '$lib/fintfolk-api/teacher'
import { getSystemInfo } from '$lib/system-info'
import { logger } from '@vtfk/logger'
import vtfkSchoolsInfo from 'vtfk-schools-info'

const allowedUndervisningsforholdDescription = ['Adjunkt', 'Adjunkt m/till utd', 'Adjunkt 1', 'Lærer', 'Lærer-', 'Lektor', 'Lektor m/till utd', 'Lektor 1', 'Spesialkonsulent']

/**
 * @typedef MiniSchool
 * @property {string} kortkortnavn shortName without UT- or OPT-
 * @property {string} skolenummer
 * @property {string} kortnavn
 * @property {string} navn
 * @property {true} kontaktlarer is current user contactTeacher for student at this school
 *
 */

/**
 *
 * @param {Object} school
 * @param {boolean} kontaktlarer
 * @returns {MiniSchool} repackedSchool
 */
export const repackMiniSchool = (school, kontaktlarer) => {
  const kortkortnavn = school.kortnavn.indexOf('-') ? school.kortnavn.substring(school.kortnavn.indexOf('-') + 1) : school.kortnavn
  return {
    kortkortnavn,
    skolenummer: school.skolenummer,
    kortnavn: school.kortnavn,
    navn: school.navn,
    kontaktlarer: kontaktlarer || false
  }
}

// Tar inn en elev en lærer har i en basisgruppe og/eller en undervisningsgruppe - returnerer en liste over dokumenttyper som læreren har tilgang på for en elev, og ved hvilke skoler
/**
 *
 * @param {TeacherStudent} student
 * @returns {AvailableDocumentType[]}
 */
export const getAvailableDocumentTypesForTeacher = (student) => {
  const availableDocumentTypes = []
  for (const docType of documentTypes) {
    if (docType.accessCondition === 'isContactTeacher') {
      const docTypeSchools = student.skoler.filter(skole => skole.kontaktlarer) // Kun skoler der læreren er kontaktlærer for eleven
      if (docTypeSchools.length > 0) availableDocumentTypes.push({ id: docType.id, title: docType.title, isEncrypted: docType.isEncrypted || false, schools: docTypeSchools })
    }
    if (docType.accessCondition === 'hasUndervisningsgruppe') {
      const docTypeSchools = []
      for (const school of student.klasser.filter(klasse => klasse.type === 'undervisningsgruppe').map(klasse => klasse.skole)) { // Skoler der læreren har eleven i en undervisningsgruppe
        if (!docTypeSchools.some(docTypeSchool => docTypeSchool.skolenummer === school.skolenummer)) { // Trenger bare skolen en gang
          docTypeSchools.push(school)
        }
      }
      if (docTypeSchools.length > 0) availableDocumentTypes.push({ id: docType.id, title: docType.title, isEncrypted: docType.isEncrypted || false, schools: docTypeSchools }) // Kun skoler der læreren har eleven i en undervisningsgruppe
    }
    if ((env.YFF_ENABLED && env.YFF_ENABLED === 'true') && docType.accessCondition === 'yffEnabled') {
      // Yff blir også validert på elev-nivå ved henting av elev, samt ved innsending og henting av yff-data, her blir det kun sjekket at skolen har YFF, og at env YFF er enabled
      // Sjekker hvilke skoler som har yff
      const docTypeSchools = student.skoler.filter(skole => {
        if (env.MOCK_API === 'true') return true
        const schoolsInfo = vtfkSchoolsInfo({ schoolNumber: skole.skolenummer })
        if (!schoolsInfo) return false
        if (!Array.isArray(schoolsInfo)) return false
        if (schoolsInfo.length === 0) {
          logger('warn', [`Could not find any school with schoolNumber "${skole.skolenummer}" in vtfk-schools-info!!`])
          return false
        }
        const schoolInfo = schoolsInfo[0]
        if (schoolInfo.yff) return true
        return false
      })
      if (docTypeSchools.length > 0) availableDocumentTypes.push({ id: docType.id, title: docType.title, isEncrypted: docType.isEncrypted || false, schools: docTypeSchools }) // Kun hvis YFF er enabled, og hvis skolen har skrudd på yff i vtfk-schools-info
    }
  }
  return availableDocumentTypes
}

/**
 * @typedef ElevKlasse
 * @property {string} navn
 * @property {string} type
 * @property {string} systemId
 * @property {MiniSchool} skole
 *
 */

/**
 * @typedef AvailableDocumentType
 * @property {string} id
 * @property {string} title
 * @property {boolean} isEncrypted
 * @property {MiniSchool[]} schools for the given student, which schools can current user create this documenttype
 *
 */

/**
 * @typedef TeacherStudent
 * @property {string} navn
 * @property {string} fornavn
 * @property {string} etternavn
 * @property {string} feidenavn
 * @property {string} elevnummer
 * @property {boolean} kontaktlarer is current user contactTeacher
 * @property {ElevKlasse[]} klasser
 * @property {MiniSchool[]} skoler
 * @property {string} feidenavnPrefix feidenavn without "@fylke.no"
 * @property {AvailableDocumentType[]} availableDocumentTypes
 *
 */

/**
 * @typedef PersonData
 * @property {string} upn
 * @property {string} feidenavn
 * @property {string} ansattnummer
 * @property {string} name
 * @property {string} firstName
 * @property {string} lastName
 *
 */

/**
 * @typedef LarerKlasse
 * @property {string} navn
 * @property {string} type
 * @property {string} systemId
 * @property {string[]} fag
 * @property {string} skole school full name
 *
 */

/**
 * @typedef InvalidUndervisningsforhold
 * @property {string} beskrivelse
 * @property {string} systemId
 *
 */

/**
 * @typedef UserData
 * @property {import('$lib/system-info').SystemInfo} systemInfo
 * @property {PersonData} personData
 * @property {TeacherStudent[]} students
 * @property {LarerKlasse[]} classes
 * @property {InvalidUndervisningsforhold[]} invalidUndervisningsforhold
 *
 */

/**
 *
 * @param {import("$lib/authentication").User} user
 * @returns {UserData} userdata
 */
export const getUserData = async (user) => {
  let loggerPrefix = `getUserData - user: ${user.principalName}`
  logger('info', [loggerPrefix, 'New request'])
  const userData = {
    systemInfo: getSystemInfo(),
    personData: null,
    students: [],
    classes: [],
    invalidUndervisningsforhold: []
  }

  // If regular teacher or administrator impersonating teacher
  if (user.activeRole === env.DEFAULT_ROLE || (user.hasAdminRole && user.impersonating?.type === 'larer')) {
    loggerPrefix += ' - role: Teacher'
    logger('info', [loggerPrefix, 'Fetching teacher data from FINT'])
    const teacherUpn = user.hasAdminRole && user.impersonating?.type === 'larer' ? user.impersonating.target : user.principalName
    const teacher = await fintTeacher(teacherUpn)
    if (!teacher) return userData

    userData.personData = {
      upn: teacher.upn,
      feidenavn: teacher.feidenavn,
      ansattnummer: teacher.ansattnummer,
      name: teacher.navn,
      firstName: teacher.fornavn,
      lastName: teacher.etternavn
    }

    logger('info', [loggerPrefix, 'Got data from FINT - validating undervsiningsforhold description'])
    const validUndervisningsforhold = teacher.undervisningsforhold.filter(forhold => forhold.aktiv && allowedUndervisningsforholdDescription.includes(forhold.beskrivelse))
    const invalidUndervisningsforhold = teacher.undervisningsforhold.filter(forhold => forhold.aktiv && !allowedUndervisningsforholdDescription.includes(forhold.beskrivelse))
    if (invalidUndervisningsforhold.length > 0) {
      for (const invalid of invalidUndervisningsforhold) {
        let hasElever = false
        if (invalid.basisgrupper.some(gruppe => Array.isArray(gruppe.elever) && gruppe.elever.length > 0)) hasElever = true
        if (invalid.kontaktlarergrupper.some(gruppe => Array.isArray(gruppe.elever) && gruppe.elever.length > 0)) hasElever = true
        if (invalid.undervisningsgrupper.some(gruppe => Array.isArray(gruppe.elever) && gruppe.elever.length > 0)) hasElever = true
        if (hasElever) {
          logger('warn', [loggerPrefix, `Teacher has invalid undervisningforhold description: ${invalid.beskrivelse} (${invalid.systemId}) with elevforhold in undervisningsforhold - no access to students in this undervisningsforhold`])
          userData.invalidUndervisningsforhold.push({ beskrivelse: invalid.beskrivelse, systemId: invalid.systemId })
        }
      }
    }
    logger('info', [loggerPrefix, `Validated undervsiningsforhold description - ${validUndervisningsforhold.length} valid undervisningsforhold`])

    let students = []
    const classes = []
    for (const undervisningsforhold of validUndervisningsforhold) {
      for (const basisgruppe of undervisningsforhold.basisgrupper.filter(gruppe => gruppe.aktiv)) {
        classes.push({ navn: basisgruppe.navn, type: 'basisgruppe', systemId: basisgruppe.systemId, fag: ['Basisgruppe'], skole: basisgruppe.skole.navn })
        for (const elev of basisgruppe.elever) {
          // I tilfelle eleven er med i flere basisgrupper
          const existingStudent = students.find(student => student.elevnummer === elev.elevnummer)
          if (existingStudent) {
            existingStudent.klasser.push({ navn: basisgruppe.navn, type: 'basisgruppe', systemId: basisgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer) })
            if (!existingStudent.skoler.some(skole => skole.skolenummer === undervisningsforhold.skole.skolenummer)) existingStudent.skoler.push(repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer))
          } else {
            students.push({ ...elev, klasser: [{ navn: basisgruppe.navn, type: 'basisgruppe', systemId: basisgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer) }], skoler: [repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer)] })
          }
        }
      }
      for (const undervisningsgruppe of undervisningsforhold.undervisningsgrupper.filter(gruppe => gruppe.aktiv)) {
        // Note to self - læreren kan ha flere undervisningsforhold med de samme undervisningsgruppene.. Lollert, lar det være inntil videre
        classes.push({ navn: undervisningsgruppe.navn, type: 'undervisningsgruppe', systemId: undervisningsgruppe.systemId, fag: undervisningsgruppe.fag.map(f => f.navn), skole: undervisningsgruppe.skole.navn })
        for (const elev of undervisningsgruppe.elever) {
          // I tilfelle eleven er med i flere basisgrupper
          const existingStudent = students.find(student => student.elevnummer === elev.elevnummer)
          if (existingStudent) {
            existingStudent.klasser.push({ navn: undervisningsgruppe.navn, type: 'undervisningsgruppe', systemId: undervisningsgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer) })
            if (!existingStudent.skoler.find(skole => skole.skolenummer === undervisningsforhold.skole.skolenummer)) existingStudent.skoler.push(repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer))
          } else {
            students.push({ ...elev, klasser: [{ navn: undervisningsgruppe.navn, type: 'undervisningsgruppe', systemId: undervisningsgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer) }], skoler: [repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer)] })
          }
        }
      }
    }

    // Filtrer vekk elever uten feidenavn - fåkke brukt de (enda hvertfall)
    const studentsWithoutFeidenavn = students.filter(stud => !stud.feidenavn)
    if (studentsWithoutFeidenavn.length > 0) {
      logger('warn', [loggerPrefix, `Found ${studentsWithoutFeidenavn.length} students without feidenavn, filtering them away... Elevnummers: ${studentsWithoutFeidenavn.map(stud => stud.elevnummer).join(', ')}`])
      students = students.filter(stud => stud.feidenavn)
    }

    logger('info', [loggerPrefix, `Done repacking fint data - found ${students.length} students available for user. Adding feidenavnPrefix for all students. And sorting students alphabetically`])
    // Sleng på kort-feidenavn på alle elever, og gyldige dokumenttyper for eleven
    students = students.map(stud => { return { ...stud, feidenavnPrefix: stud.feidenavn.substring(0, stud.feidenavn.indexOf('@')), availableDocumentTypes: getAvailableDocumentTypesForTeacher(stud) } })
    students.sort((a, b) => (a.navn > b.navn) ? 1 : (b.navn > a.navn) ? -1 : 0)
    logger('info', [loggerPrefix, 'Finished. Returning userData'])

    userData.classes = classes
    userData.students = students

    return userData
  }

  // TODO - finn ut av leder rådgiver
  if (user.activeRole === env.LEDER_ROLE) {
    console.log('En leder rådgiver aiaiai')
  }

  return userData
}
