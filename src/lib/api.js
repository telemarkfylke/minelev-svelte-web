import { env } from '$env/dynamic/private'
import { error } from '@sveltejs/kit'
import { logger } from '@vtfk/logger'
import { fintTeacher } from './fintfolk-api/teacher'

export const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const repackMiniSchool = (school) => {
  const kortkortnavn = school.kortnavn.indexOf('-') ? school.kortnavn.substring(school.kortnavn.indexOf('-') + 1) : school.kortnavn
  return {
    kortkortnavn,
    kortnavn: school.kortnavn,
    navn: school.navn
  }
}

/**
 *
 * @param {Object} user
 */
export const getTeacher = async (user) => {
  // Husk på hvis det er rolle "leder" - da skal vi ha alle elevene ved skolen
  const teacher = await fintTeacher(user)
  const students = []
  const classes = []
  for (const undervisningsforhold of teacher.undervisningsforhold.filter(forhold => forhold.aktiv)) {
    for (const basisgruppe of undervisningsforhold.basisgrupper.filter(gruppe => gruppe.aktiv)) {
      classes.push({ navn: basisgruppe.navn, systemId: basisgruppe.systemId, fag: ['Basisgruppe'], skole: basisgruppe.skole.navn })
      for (const elev of basisgruppe.elever) {
        // I tilfelle eleven er med i flere basisgrupper
        const existingStudent = students.find(student => student.elevnummer === elev.elevnummer)
        if (existingStudent) {
          existingStudent.klasser.push({ navn: basisgruppe.navn, systemId: basisgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole) })
        } else {
          students.push({ ...elev, klasser: [ { navn: basisgruppe.navn, systemId: basisgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole) } ] })
        }
      }
    }
    for (const undervisningsgruppe of undervisningsforhold.undervisningsgrupper.filter(gruppe => gruppe.aktiv)) {
      classes.push({ navn: undervisningsgruppe.navn, systemId: undervisningsgruppe.systemId, fag: undervisningsgruppe.fag.map(f => f.navn), skole: undervisningsgruppe.skole.navn })
      for (const elev of undervisningsgruppe.elever) {
        // I tilfelle eleven er med i flere basisgrupper
        const existingStudent = students.find(student => student.elevnummer === elev.elevnummer)
        if (existingStudent) {
          existingStudent.klasser.push({ navn: undervisningsgruppe.navn, systemId: undervisningsgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole) })
        } else {
          students.push({ ...elev, klasser: [ { navn: undervisningsgruppe.navn, systemId: undervisningsgruppe.systemId, skole: repackMiniSchool(undervisningsforhold.skole) } ] })
        }
      }
    }
  }
  // Lag et lærerobjekt også som har passelig med data
  return {
    teacher,
    students,
    classes
  }

}
