import { error, fail } from "@sveltejs/kit"
import { periods, courseReasons } from "./data/document-data"
import { validateContent } from "./content-validation"

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
    matchContent: { // What should be the result of generateContent()
      year: '2023/2024',
      period: {
        id: '02',
        nb: 'Halvårsvurdering 2. termin',
        nn: 'Halvårsvurdeiring 2. termin',
        en: 'Halvårsvurdering 2. termin'
      },
      classes: [
        {
          id: '9384395',
          name: 'STB3/KODD2789',
          schoolId: '234545',
          nb: 'Fagets navn',
          nn: 'Fagets namn',
          en: 'Course name'
        }
      ],
      reasons: [
        {
          id: '01',
          nb: 'en grunn',
          nn: 'ein grunn',
          en: 'a reason'
        }
      ]
    },
    /**
     * 
     * @param {DocumentData} data 
     * @returns content
     */
    generateContent: (data) => {
      let period = data.formData.get('periodId')
      if (!period) throw error(400, 'Mangler periode ("periodId") for varselet')
      period = periods.find(p => p.id === period)
      if (!period) throw error(400, `Valgt periode "${period}" er ugyldig`)
      period = { id: period.id, ...period.value }
      
      let courses = data.formData.getAll('courses')
      if (!courses || (Array.isArray(courses) && courses.length === 0)) throw error(400, 'Mangler fag ("courses") for varselet')
      courses = courses.map(courseId => {
        const course = data.studentData.faggrupper.find(gruppe => gruppe.systemId === courseId)
        if (!course) throw error(400, `Fant ingen fag for eleven med systemId: "${courseId}"`)
        const { systemId, navn, fag } = course
        if (!(systemId && navn && fag.navn)) throw error(500, `Mangler enten systemId, navn, eller fag.navn for fag med id: "${courseId}"`)
        return {
          id: systemId,
          name: navn,
          schoolId: data.school.skolenummer,
          nb: fag.navn,
          nn: fag.navn,
          en: fag.navn
        }
      })
      let reasons = data.formData.getAll('reasons')
      if (!reasons || (Array.isArray(reasons) && reasons.length === 0)) throw error(400, 'Mangler årsak ("reasons") for varselet')
      reasons = reasons.map(reasonId => {
        const reason = courseReasons.find(r => r.id === reasonId)
        if (!reason) throw error(400, `Fant ingen fagårsak ("courseReason") med id: "${reasonId}"`)
        return { id: reason.id, ...reason.value }
      })

      // MÅ SKRIVE om til å passe pdf-apiet... Sjekk pdf-apiet f eks courses er classes...

      return {
        year: getCurrentSchoolYear(),
        period,
        classes: courses,
        reasons
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
    accessCondition: 'isContactTeacher',
    /**
     * 
     * @param {DocumentData} data 
     * @returns 
     */
    generateContent: (data) => {
      return {
        year: getCurrentSchoolYear()
      }
    }
  },
  {
    id: 'notat',
    title: 'Notat',
    accessCondition: 'isContactTeacher'
  }
]

export const teacherCanCreateDocument = (teacherStudent, documentTypeId, schoolNumber) => {
  const documentType = teacherStudent.availableDocumentTypes.find(docType => docType.id === documentTypeId)
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
 * @returns nicenice
 */
export const generateDocument = (data) => {
  const { documentTypeId, type, variant, user, teacherStudent, studentData, teacher, school, formData } = data
  if (!documentTypeId) throw new Error('Mangler dokumenttype (type)') // Lagt til i ny versjon nå
  if (!type) throw new Error('Mangler dokumenttype (type)')
  if (!variant) throw new Error('Mangler dokumentvariant (variant)')
  if (!user) throw new Error('Mangler bruker (user)')
  if (!teacherStudent) throw new Error('Mangler elev (student)')
  if (!studentData) throw new Error('Mangler elev (studentData)')
  if (!teacher) throw new Error('Mangler lærer (teacher)')
  if (!school) throw new Error('Mangler skole (school)')
  if (!formData) throw new Error('Mangler innhold (formData)')

  // Validate objects
  if (!(user.principalId && user.principalName && user.name)) throw new Error('User må ha "user.principalId && user.principalName && user.name"')
  if (!(studentData.student.feidenavn && studentData.student.name && studentData.student.firstName && studentData.student.lastName)) throw new Error('User må ha "studentData.feidenavn && studentData.name && studentData.firstName && studentData.lastName"')
  if (!(teacher.feidenavn && teacher.name && teacher.firstName && teacher.lastName))
  // Validate that teacher can create document
  teacherCanCreateDocument(teacherStudent, documentTypeId, school.skolenummer)

  // Generate and validate content based on documentType
  const contentGenerator = documentTypes.find(docType => docType.id === documentTypeId)?.generateContent
  const contentValidator = documentTypes.find(docType => docType.id === documentTypeId)?.matchContent
  if (!contentGenerator) throw error(500, `Mangler innholdshåndtering for dokumenttype "${documentTypeId}"... Kjeft på utviklerne`)
  if (!contentValidator) throw error(500, `Mangler innholdsvalidering (matchContent) for dokumenttype "${documentTypeId}"... Kjeft på utviklerne`)
  const content = contentGenerator(data)
  const { valid, result } = validateContent(content, contentValidator)
  if (!valid) throw error(500, `Feilet ved innholdsvalidering for dokumenttype "${documentTypeId}"... Resultat: ${JSON.stringify(result)} Kjeft på utviklerne`)
  
  // Encrypt content if needed
  // TODO

  // Repack student to nicer format
  const repackedStudent = studentData.student // Can we maybe live with this format?

  // Repack school to nicer format
  const repackedSchool = {
    name: school.navn,
    id: school.skolenummer,
    shortname: school.kortnavn
  }

  const repackedUser = {
    principalName: user.principalName,
    principalId: user.principalId,
    name: user.name
  }

  // Return on correct format (the way it will be saved in db, and the way pdf-preview needs it)
  const now = new Date()
  return {
    created: {
      date: now.toISOString(),
      timstamp: now.getTime(),
      createdBy: repackedUser
    },
    modified: {
      date: now.toISOString(),
      timestamp: now,
      createdBy: repackedUser
    },
    type,
    variant,
    student: repackedStudent,
    teacher,
    content,
    school: repackedSchool,
    isEncrypted: false,
    status: [],
    isQueued: true // Set ready for plucking by minelev-robot
  }
}