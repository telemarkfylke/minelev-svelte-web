import { error } from '@sveltejs/kit'
import { periods, courseReasons, orderReasons, behaviourReasons } from './data/document-data'

const getSchoolYearFromDate = (date, delimiter = '/') => {
  // Hvis vi er etter 15 juli inneværende år, så swapper vi til current/next. Ellers bruker vi previous/current
  const year = date.getFullYear()
  const previousYear = year - 1
  const nextYear = year + 1
  const midsommar = new Date(`${year}-07-15`)
  if (date > midsommar) return `${year}${delimiter}${nextYear}`
  return `${previousYear}${delimiter}${year}`
}

export const getCurrentSchoolYear = (delimiter = '/') => {
  return getSchoolYearFromDate(new Date(), delimiter)
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
    generateContent: (student, content) => {
      if (!student) throw new Error('Missing required argumnet "student"')
      const { periodId, courseIds, reasonIds } = content
      if (!(periodId && courseIds && reasonIds)) throw new Error('Missing required argument(s) "periodId", "courseIds" and/or "reasonIds"')
      if (typeof periodId !== 'string') throw new Error('parameter "period" must be string')
      if (!Array.isArray(courseIds) || courseIds.some(course => typeof course !== 'string')) throw new Error('parameter "courses" must be Array of strings')
      if (!Array.isArray(reasonIds) || reasonIds.some(reason => typeof reason !== 'string')) throw new Error('parameter "reasons" must be Array of strings')

      let period = periods.find(p => p.id === periodId)
      if (!period) throw error(400, `Chosen period "${period}" is not a valid period`)
      period = { id: period.id, ...period.value }

      const courses = courseIds.map(courseId => {
        const course = student.faggrupper.find(gruppe => gruppe.systemId === courseId)
        if (!course) throw error(400, `Could not find course for student with systemId: "${courseId}"`)
        const { systemId, navn, fag } = course
        if (!(systemId && navn && fag.navn)) throw error(500, `Missing either systemId, name, or course.name for course with id: "${courseId}"`)
        return {
          id: systemId,
          name: navn,
          schoolId: course.skole.skolenummer,
          nb: fag.navn,
          nn: fag.navn,
          en: fag.navn
        }
      })

      const reasons = reasonIds.map(reasonId => {
        const reason = courseReasons.find(r => r.id === reasonId)
        if (!reason) throw error(400, `Could not find courseReason with id: "${reasonId}"`)
        return { id: reason.id, ...reason.value }
      })

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
    accessCondition: 'isContactTeacher',
    matchContent: {
      year: '2023/2024',
      period: {
        id: '02',
        nb: 'Halvårsvurdering 2. termin',
        nn: 'Halvårsvurdeiring 2. termin',
        en: 'Halvårsvurdering 2. termin'
      },
      reasons: [
        {
          id: '01',
          nb: 'en grunn',
          nn: 'ein grunn',
          en: 'a reason'
        }
      ]
    },
    generateContent: (student, content) => {
      if (!student) throw new Error('Missing required argumnet "student"')
      const { periodId, reasonIds } = content
      if (!(periodId && reasonIds)) throw new Error('Missing required argument(s) "periodId" and/or "reasonIds"')
      if (typeof periodId !== 'string') throw new Error('parameter "period" must be string')
      if (!Array.isArray(reasonIds) || reasonIds.some(reason => typeof reason !== 'string')) throw new Error('parameter "reasons" must be Array of strings')

      let period = periods.find(p => p.id === periodId)
      if (!period) throw error(400, `Chosen period "${period}" is not a valid period`)
      period = { id: period.id, ...period.value }

      const reasons = reasonIds.map(reasonId => {
        const reason = orderReasons.find(r => r.id === reasonId)
        if (!reason) throw error(400, `Could not find orderReason with id: "${reasonId}"`)
        return { id: reason.id, ...reason.value }
      })

      return {
        year: getCurrentSchoolYear(),
        period,
        reasons
      }
    }
  },
  {
    id: 'varsel-atferd',
    title: 'Varsel atferd',
    accessCondition: 'isContactTeacher',
    matchContent: {
      year: '2023/2024',
      period: {
        id: '02',
        nb: 'Halvårsvurdering 2. termin',
        nn: 'Halvårsvurdeiring 2. termin',
        en: 'Halvårsvurdering 2. termin'
      },
      reasons: [
        {
          id: '01',
          nb: 'en grunn',
          nn: 'ein grunn',
          en: 'a reason'
        }
      ]
    },
    generateContent: (student, content) => {
      if (!student) throw new Error('Missing required argumnet "student"')
      const { periodId, reasonIds } = content
      if (!(periodId && reasonIds)) throw new Error('Missing required argument(s) "periodId" and/or "reasonIds"')
      if (typeof periodId !== 'string') throw new Error('parameter "period" must be string')
      if (!Array.isArray(reasonIds) || reasonIds.some(reason => typeof reason !== 'string')) throw new Error('parameter "reasons" must be Array of strings')

      let period = periods.find(p => p.id === periodId)
      if (!period) throw error(400, `Chosen period "${period}" is not a valid period`)
      period = { id: period.id, ...period.value }

      const reasons = reasonIds.map(reasonId => {
        const reason = behaviourReasons.find(r => r.id === reasonId)
        if (!reason) throw error(400, `Could not find behaviourReason with id: "${reasonId}"`)
        return { id: reason.id, ...reason.value }
      })

      return {
        year: getCurrentSchoolYear(),
        period,
        reasons
      }
    }
  },
  {
    id: 'samtale',
    title: 'Elevsamtale',
    accessCondition: 'isContactTeacher',
    matchContent: {
      year: '2023/2024'
    },
    generateContent: (student, content) => {
      if (!student) throw new Error('Missing required argumnet "student"')
      return {
        year: getCurrentSchoolYear()
      }
    }
  },
  {
    id: 'notat',
    title: 'Notat',
    accessCondition: 'hasUndervisningsgruppe',
    isEncrypted: true,
    matchContent: {
      note: 'fjidsofjkldsfkldsjflks'
    },
    generateContent: (student, content) => {
      if (!student) throw new Error('Missing required argumnet "student"')
      const { note } = content
      if (!note) throw new Error('Missing required argument "content.note"')
      return {
        note
      }
    }
  },
  {
    id: 'yff-bekreftelse',
    title: 'YFF - Bekreftelse på utplassering',
    accessCondition: 'yffEnabled',
    isEncrypted: false,
    matchContent: {
      note: 'fjidsofjkldsfkldsjflks'
    },
    generateContent: (student, content) => {
      if (!student) throw new Error('Missing required argumnet "student"')
      const { note } = content
      if (!note) throw new Error('Missing required argument "content.note"')
      return {
        note
      }
    }
  },
  {
    id: 'yff-laereplan',
    title: 'YFF - Lokal læreplan',
    accessCondition: 'yffEnabled',
    isEncrypted: false,
    matchContent: {
      note: 'fjidsofjkldsfkldsjflks'
    },
    generateContent: (student, content) => {
      if (!student) throw new Error('Missing required argumnet "student"')
      const { note } = content
      if (!note) throw new Error('Missing required argument "content.note"')
      return {
        note
      }
    }
  },
  {
    id: 'yff-tilbakemelding',
    title: 'YFF - Tilbakemelding på utplassering',
    accessCondition: 'yffEnabled',
    isEncrypted: false,
    matchContent: {
      note: 'fjidsofjkldsfkldsjflks'
    },
    generateContent: (student, content) => {
      if (!student) throw new Error('Missing required argumnet "student"')
      const { note } = content
      if (!note) throw new Error('Missing required argument "content.note"')
      return {
        note
      }
    }
  }
]
