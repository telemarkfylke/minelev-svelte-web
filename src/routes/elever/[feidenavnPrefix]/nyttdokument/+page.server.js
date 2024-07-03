import { error, fail } from "@sveltejs/kit"
import { documentTypes, generateDocument } from '$lib/document-types/document-types';
import { redirect } from '@sveltejs/kit';
import { env } from "$env/dynamic/private";
import axios from "axios";
import { getTeacher, getStudent, addDocument } from "$lib/api";
import { getAuthenticatedUser } from "$lib/authentication";
import { logger } from "@vtfk/logger";
import { documentTypeId } from "$lib/document-types/Elevsamtale.svelte";

const currentRoute = "/nytt"

const getServerData = async (event) => {
  const user = getAuthenticatedUser(event.request.headers)
  const { teacher, students, classes } = await getTeacher(user)
  const studentFeidenavn = `${event.params.feidenavnPrefix}${env.STUDENT_FEIDENAVN_SUFFIX}`
  const { student, documents, faggrupper, probableFaggrupper } = await getStudent(studentFeidenavn, classes)
  const studentData = { student, documents, faggrupper, probableFaggrupper }
  return {
    user,
    teacher,
    teacherStudent: students.find(stud => stud.feidenavnPrefix === event.params.feidenavnPrefix),
    studentData
  }
}



// Må itj brukes, men kan :)
const generateDocumentAction = async (event, documentTypeId) => {
  const { user, teacherStudent, teacher, studentData } = await getServerData(event)
  const loggerPrefix = `${documentTypeId} - User: ${user.principalName}`
  const formData = await event.request.formData()
  const schoolNumber = formData.get('schoolNumber')
  const school = teacherStudent.skoler.find(school => school.skolenummer === schoolNumber)
  if (!school) throw error(500, `Fant ingen skole med skolenummer ${schoolNumber}`)
  // Hent rektig type og variant
  let type
  let variant
  if (documentTypeId === 'varsel-fag') { 
    type = 'varsel'
    variant = 'fag'
  }
  if (documentTypeId === 'varsel-orden') { 
    type = 'varsel'
    variant = 'orden'
  }
  if (documentTypeId === 'varsel-atferd') { 
    type = 'varsel'
    variant = 'atferd'
  }
  if (documentTypeId === 'elevsamtale') { 
    type = 'elevsamtale'
    variant = formData.get('conversationStatus')
  }
  if (documentTypeId === 'notat') { 
    type = 'notat'
    variant = 'notat'
  }

  logger('info', [loggerPrefix, 'Generating document with provided formData'])
  const document = generateDocument({
    documentTypeId,
    type,
    variant,
    school,
    user,
    teacherStudent,
    studentData,
    teacher,
    formData
  })
  logger('info', [loggerPrefix, 'Saving document to db'])
  const documentId = await addDocument(document)
  logger('info', [loggerPrefix, `Saved document to db. Id: ${documentId}. Redirecting user back to student page`])
  
  redirect(303, `/elever/${teacherStudent.feidenavnPrefix}`)
}

/** @type {import('./$types').Actions} */
export const actions = {
  "varsel-fag": async (event) => {
    await generateDocumentAction(event, 'varsel-fag')
  },
  "preview": async (event) => {
    logger('preview request, generating pdf-preview')
    const documentData = await event.request.json()
    const requestData = {
      system: 'minelev',
      template: `${documentData.type}/${documentData.variant}`,
      language: 'nb',
      type: "2",
	    version: "B",
      data: documentData
    }
    requestData.data.preview = true
    try {
      const { data } = await axios.post(env.PDF_API_URL, requestData, { headers: { 'x-functions-key': env.PDF_API_KEY } })
      const base64 = data.data.base64
      return base64
    } catch (err) {
      logger('error', ['Failed when generating pdf-preview', err.response?.data || err.stack || err.toString()])
      throw error(500, err)
    }
  }
}