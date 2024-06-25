import { fintTeacher } from './fintfolk-api/teacher'
import { fintStudent } from './fintfolk-api/student'
import { documentTypes } from './document-types/document-types'

export const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const repackMiniSchool = (school, kontaktlarer) => {
  const kortkortnavn = school.kortnavn.indexOf('-') ? school.kortnavn.substring(school.kortnavn.indexOf('-') + 1) : school.kortnavn
  return {
    kortkortnavn,
    skolenummer: school.skolenummer,
    kortnavn: school.kortnavn,
    navn: school.navn,
    kontaktlarer
  }
}

// Tar inn en elev en lærer har i en basisgruppe og/eller en undervisningsgruppe - returnerer en liste over dokumenttyper som læreren har tilgang på for en elev, og ved hvilke skoler
export const getAvailableDocumentTypesForTeacher = (student) => {
  const availableDocumentTypes = []
  for (const docType of documentTypes) {
    if (docType.accessCondition === 'isContactTeacher') {
      const docTypeShools = student.skoler.filter(skole => skole.kontaktlarer) // Kun skoler der læreren er kontaktlærer for eleven
      if (docTypeShools.length > 0) availableDocumentTypes.push({ id: docType.id, title: docType.title, schools: docTypeShools })
    }
    if (docType.accessCondition === 'hasUndervisningsgruppe') {
      const docTypeShools = student.klasser.filter(klasse => klasse.type === 'undervisningsgruppe').map(klasse => klasse.skole)
      if (docTypeShools.length > 0) availableDocumentTypes.push({ id: docType.id, title: docType.title, schools: docTypeShools }) // Kun skoler der læreren har eleven i en undervisningsgruppe
    }
    if (docType.accessCondition === 'yff') {
      const docTypeShools = student.klasser.filter(klasse => klasse.type === 'undervisningsgruppe').map(klasse => klasse.skole) // LEGG INN YFF KRITERIE HER
      // if (docTypeShools.length > 0) availableDocumentTypes.push({ id: docType.id, title: docType.title, schools: docTypeShools })
    }
  }
  return availableDocumentTypes
}

/**
 *
 * @param {Object} user
 */
export const getTeacher = async (user) => {
  const teacher = await fintTeacher(user)
  const repackedTeacher = {
    upn: teacher.upn,
    feidenavn: teacher.feidenavn,
    ansattnummer: teacher.ansattnummer
  }

  let students = []
  const classes = []
  for (const undervisningsforhold of teacher.undervisningsforhold.filter(forhold => forhold.aktiv)) {
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
  // Sleng på kort-feidenavn på alle elever, og gyldige dokumenttyper for eleven
  students = students.map(stud => { return { ...stud, feidenavnPrefix: stud.feidenavn.substring(0, stud.feidenavn.indexOf('@')), availableDocumentTypes: getAvailableDocumentTypesForTeacher(stud) } })
  // Lag et lærerobjekt også som har passelig med data
  // Lag et objekt med siste aktivitet for lærerens elever
  return {
    teacher: repackedTeacher,
    students,
    classes
  }
}

/**
 *
 * @param {string} studentFeidenavn
 */
export const getStudent = async (studentFeidenavn, classes) => {
  const student = await fintStudent(studentFeidenavn)
  
  // Alle faggrupper, fordi vi mangler relasjon mellom lærer og faggrupper
  let faggrupper = []
  for (const elevforhold of student.elevforhold.filter(forhold => forhold.aktiv)) {
    for (const faggruppe of elevforhold.faggruppemedlemskap.filter(medlemskap => medlemskap.aktiv)) {
      faggrupper.push({
        navn: faggruppe.navn,
        systemId: faggruppe.systemId,
        fag: faggruppe.fag,
        skole: repackMiniSchool(elevforhold.skole)
      })
    }
  }

  // Lager først en liste med undervisningsgruppene læreren har eleven i, så filtrerer vi faggruppene på de som starter med samme prefix som undervisningsgruppene har eleven i.
  // Typ hvis læreren har undervisningsgruppe 3STK/NOR2340, så antar vi at alle faggrupper som starter med 3STK/NOR er aktuelle som faggrupper
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

  // Hent så alle dokumenter lærerern har tilgang på
  const documents = [] // getDocuments(user, feidenavn) - Documents that the current user has read access to
  return {
    faggrupper,
    probableFaggrupper,
    documents
  }
}
