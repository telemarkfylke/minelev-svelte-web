import { fail } from "@sveltejs/kit"

import { documentTypes } from '$lib/document-types/document-types';
import { redirect } from '@sveltejs/kit';

const currentRoute = "/nytt"
const varsel = documentTypes.find(docType => docType.id === 'varsel')

/** @type {import('./$types').Actions} */
export const actions = {
  varsel: async (event) => {
    // Sjekk at bruker har tilgang på denne eleven
    const stuff = await event.request.formData()

    console.log(fail(400, "Mangler data"))
    console.log(stuff.get('period'))
    console.log(stuff.getAll('courses'))
    console.log(stuff.getAll('reasons'))
    console.log(varsel.variants)
    const docId = "fjdklfjdkfj"
    const createdDocumentRoute = `${event.url.pathname.substring(0, event.url.pathname.length - currentRoute.length)}/${docId}`
    console.log(createdDocumentRoute)
    redirect(303, createdDocumentRoute)
  }
}

        /*
        validation: (formData, faggrupper) => {
          if (!formData || !faggrupper) return fail(400, {  })
          
          if (formData.get('documentType') !== 'varsel') return fail(400, 'Ugyldig dokumenttype')
          if (formData.get('documentVariant') !== 'varsel') return fail(400, 'Ugyldig dokumentvariant')

          const period = formData.get('period')
          if (!period) return fail(400, 'Mangler periode for varselet')
          if (!periods.find(p => p.id === period.id)) fail(400, 'Ugyldig periode')

          let courses = formData.getAll('courses')
          if (!courses) return fail(400, 'Mangler fag for varselet')
          courses = courses.map(course => {
            return faggrupper.find(fag => fag.systemId === course)
          })
          if (courses.some(course => !course)) return fail(400, 'Ugyldig fagverdi')

          let reasons = formData.getAll('courses')
          if (!reasons) return fail(400, 'Mangler fag for varselet')
            reasons = reasons.map(reason => {
            return courseReasons.find(courseReason => courseReason.id === reason)
          })
          if (reasons.some(reason => !reason)) return fail(400, 'Ugyldig årsak')
          
          return {
            period,
            courses,
            reasons
          }
        }*/