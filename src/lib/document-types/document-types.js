import { error, fail } from "@sveltejs/kit"
import { periods, courseReasons } from "./data/document-data"

const getSchoolYearFromDate = (date) => {
  // Hvis vi er etter 15 juli inneværende år, så swapper vi til current/next. Ellers bruker vi previous/current
  const year = date.getFullYear()
  const previousYear = year - 1
  const nextYear = year + 1
  const midsommar = new Date(`${year}-07-15`)
  if (date > midsommar) return `${year}/${nextYear}`
  return `${previousYear}/${year}`
}

const getCurrentSchoolYear = () => {
  return getSchoolYearFromDate(new Date())
}

// accessConditions: 'hasUndervisningsgruppe', 'isContactTeacher', 'yff'

export const documentTypes = [
  {
    id: 'varsel-fag',
    title: 'Varsel fag',
    accessCondition: 'hasUndervisningsgruppe',
    /**
     * 
     * @param {DocumentData} data 
     * @returns 
     */
    generateContent: (data) => {
      console.log(data.formData)
      const faggrupper = data.studentData.faggrupper
      
      return {
        year: getCurrentSchoolYear(),
      }
    }
  },
  {
    id: 'varsel-orden',
    title: 'Varsel orden',
    accessCondition: 'isContactTeacher'
  },
  {
    id: 'varsel-atferd',
    title: 'Varsel atferd',
    accessCondition: 'isContactTeacher'
  },
  {
    id: 'elevsamtale',
    title: 'Elevsamtale',
    accessCondition: 'isContactTeacher'
  },
  {
    id: 'notat',
    title: 'Notat',
    accessCondition: 'isContactTeacher'
  }
]

export const teacherCanCreateDocument = (student, documentTypeId, schoolNumber) => {
  const documentType = student.availableDocumentTypes.find(docType => docType.id === documentTypeId)
  if (!documentType) throw error(403, `Du har ikke tilgang til å opprette dokumenttype "${documentTypeId}" for denne eleven`)
  const correctSchool = documentType.schools.some(school => school.skolenummer === schoolNumber)
  if (!correctSchool) throw error(403, `Du har ikke tilgang til å opprette dokumenttype "${documentTypeId}" for denne eleven ved skole med skolenummer ${schoolNumber}`)
  return true
}

/**
 * @typedef DocumentData
 * @property {string} documentTypeId
 * @property {string} type
 * @property {string} variant 
 * @property {Object} user 
 * @property {Object} teacherStudent Teacher -> student data
 * @property {Object} studentData Student data (uavhengig av læreren)
 * @property {Object} teacher 
 * @property {Object} school
 * @property {FormData} formData 
 */

/**
 * 
 * @param {DocumentData} data
 *  
 * @returns niceticne
 */
export const generateDocument = (data) => {
  const { documentTypeId, type, variant, user, teacherStudent, student, teacher, school, formData } = data
  if (!documentTypeId) throw new Error('Mangler dokumenttype (type)') // Lagt til i ny versjon nå
  if (!type) throw new Error('Mangler dokumenttype (type)')
  if (!variant) throw new Error('Mangler dokumentvariant (variant)')
  if (!user) throw new Error('Mangler bruker (user)')
  if (!teacherStudent) throw new Error('Mangler elev (student)')
  if (!studentData) throw new Error('Mangler elev (studentData)')
  if (!teacher) throw new Error('Mangler lærer (teacher)')
  if (!school) throw new Error('Mangler skole (school)')
  if (!formData) throw new Error('Mangler innhold (formData)')

  // Validate that teacher can create document
  teacherCanCreateDocument(student, documentTypeId, school.skolenummer)

  // Generate and validate content based on documentType
  const contentGenerator = documentTypes.find(docType => docType.id === documentTypeId)?.generateContent
  if (!contentGenerator) throw error(500, `Mangler innholdshåndtering for dokumenttype "${documentTypeId}"... Kjeft på utviklerne`)
  const content = contentGenerator(data)
  
  // Encrypt content if needed


  // Repack student to nicer format
  const repackedStudent = student // Can we maybe live with this format?

  // Return on correct format (the way it will be saved in db, and the way pdf-preview needs it)
  const now = new Date()
  return {
    created: {
      date: now.toISOString(),
      timstamp: now.getTime(),
      createdBy: teacher.upn || 'et upn ellerno'
    },
    modified: {
      date: now.toISOString(),
      timestamp: now,
      createdBy: teacher.upn || 'userid'
    },
    type,
    variant,
    student: repackedStudent,
    teacher,
    content,
    school,
    isEncrypted: false,
    status: [],
    isQueued: false
  }
}