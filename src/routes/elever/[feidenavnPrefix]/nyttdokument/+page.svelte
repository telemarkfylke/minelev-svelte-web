<script>
  import { page } from "$app/stores";
  import Elevsamtale from "$lib/document-types/Elevsamtale.svelte";
  import Notat from "$lib/document-types/Notat.svelte";
  import VarselAtferd from "$lib/document-types/VarselAtferd.svelte";
  import VarselFag from "$lib/document-types/VarselFag.svelte";
  import VarselOrden from "$lib/document-types/VarselOrden.svelte";
  import YffBekreftelse from "$lib/document-types/YFFBekreftelse.svelte";
  import YffLaereplan from "$lib/document-types/YFFLaereplan.svelte";
  import YffTilbakemelding from "$lib/document-types/YFFTilbakemelding.svelte";
  import { documentTypes } from "$lib/document-types/document-types";
  /** @type {import('./$types').PageData} */
  export let data

  const studentFeidenavnPrefix = $page.params.feidenavnPrefix
  const teacherStudent = JSON.parse(JSON.stringify(data.students.find(stud => stud.feidenavnPrefix === studentFeidenavnPrefix))) // Håper ikke det knekker no...
  const studentData = data.studentData

  let documentTypeId = $page.url.searchParams.get('document_type') || undefined

  // OBS OBS Vi får inn yff-schools først fra studentData, gjør en egen validering her med hvilke skoler de egt kan opprette yff-er på
  if (data.systemInfo.YFF_ENABLED) {
    teacherStudent.availableDocumentTypes.forEach(docType => {
      if (docType.id.startsWith('yff')) {
        // Filtrerer vekk skoler der læreren ikke har tilgang til yff for eleven
        docType.schools = docType.schools.filter(school => studentData.yffSchools.some(yffSchool => school.skolenummer === yffSchool.skolenummer))
      }
    })
    teacherStudent.availableDocumentTypes = teacherStudent.availableDocumentTypes.filter(docType => docType.schools.length > 0)
  }

  // Filtrer vekk readonly dokumettyper
  teacherStudent.availableDocumentTypes = teacherStudent.availableDocumentTypes.filter(docType => {
    if (data.systemInfo.VARSEL_READONLY && ['varsel-fag', 'varsel-orden', 'varsel-atferd'].includes(docType.id)) return false
    if (data.systemInfo.ELEVSAMTALE_READONLY && ['samtale'].includes(docType.id)) return false
    if (data.systemInfo.NOTAT_READONLY && ['notat'].includes(docType.id)) return false
    return true
  })

  const getAvailableSchools = (documentTypeId) => {
    const availableSchools = documentTypeId ? teacherStudent.availableDocumentTypes.find(docType => docType.id === documentTypeId).schools : []
    return availableSchools
  }

  let selectedSchoolNumber = documentTypeId ? getAvailableSchools(documentTypeId).length > 1 ? "" : getAvailableSchools(documentTypeId)[0].skolenummer : ""
  $: selectedSchoolNumber = documentTypeId ? getAvailableSchools(documentTypeId).length > 1 ? "" : getAvailableSchools(documentTypeId)[0].skolenummer : ""

</script>

<h2>Opprett nytt dokument</h2>

<div class="label-select">
  <label for="documentType">Dokumenttype</label>
  <select bind:value={documentTypeId} id="documentType">
    {#if teacherStudent.availableDocumentTypes.length === 1} <!-- Hvis det bare er en gyldig dokumenttype, så bruker vi bare den -->
      <option value="{teacherStudent.availableDocumentTypes[0].id}">{teacherStudent.availableDocumentTypes[0].title}</option>
    {:else}
      <option value="">--Velg dokumenttype--</option>
      <hr />
      {#each teacherStudent.availableDocumentTypes as docType}
        <option value="{docType.id}">{docType.title}</option>
      {/each}
    {/if}
    </select>
</div>
{#if documentTypeId}
  {#if getAvailableSchools(documentTypeId).length > 1}
    <section>
      <h4>Velg skole</h4>
      {#each getAvailableSchools(documentTypeId) as school}
        <input type="radio" id="school-{school.skolenummer}" name="schoolNumber" bind:group={selectedSchoolNumber} value="{school.skolenummer}" required />
        <label for="school-{school.skolenummer}">{school.navn}</label><br>
      {/each}
    </section>
  {:else}
    <section style="display: none;">
      <h4>Velg skole</h4>
      <input type="radio" id="school-{getAvailableSchools(documentTypeId)[0].skolenummer}" name="school" bind:group={selectedSchoolNumber} value="{getAvailableSchools(documentTypeId)[0].skolenummer}" />
      <label for="school-{getAvailableSchools(documentTypeId)[0].skolenummer}">{getAvailableSchools(documentTypeId)[0].navn}</label><br>
    </section>
  {/if}
{/if}

<!-- Kan vi flytte skolevelgingen ut hit mon tro?? Kan kanskje flytte all "vanlig" dokumentdata ut hit, og fore det inn i content-componnentene, type og variant får vi sette i content-valideringa -->

{#if documentTypeId && selectedSchoolNumber}
  {#if documentTypeId === 'varsel-fag'}
    <VarselFag {documentTypeId} {studentFeidenavnPrefix} {selectedSchoolNumber} faggrupper={studentData.faggrupper} probableFaggrupper={studentData.probableFaggrupper} />
  {/if}
  {#if documentTypeId === 'varsel-orden'}
    <VarselOrden {documentTypeId} {studentFeidenavnPrefix} {selectedSchoolNumber} />
  {/if}
  {#if documentTypeId === 'varsel-atferd'}
    <VarselAtferd {documentTypeId} {studentFeidenavnPrefix} {selectedSchoolNumber} />
  {/if}
  {#if documentTypeId === 'samtale'}
    <Elevsamtale {documentTypeId} {studentFeidenavnPrefix} {selectedSchoolNumber} />
  {/if}
  {#if documentTypeId === 'notat'}
    <Notat {documentTypeId} {studentFeidenavnPrefix} {selectedSchoolNumber} />
  {/if}
  {#if documentTypeId === 'yff-bekreftelse'}
    <YffBekreftelse {documentTypeId} {studentFeidenavnPrefix} {selectedSchoolNumber} {studentData} />
  {/if}
  {#if documentTypeId === 'yff-laereplan'}
    <YffLaereplan {documentTypeId} {studentFeidenavnPrefix} {selectedSchoolNumber} {studentData} />
  {/if}
  {#if documentTypeId === 'yff-tilbakemelding'}
    <YffTilbakemelding {documentTypeId} {studentFeidenavnPrefix} {selectedSchoolNumber} {studentData} />
  {/if}
{/if}

<style>
  select {
    min-width: 15rem;
  }
  h4 {
    border-bottom: 1px solid var(--primary-color);
  }
  section {
    /* background-color: var(--primary-color-20); */
    padding-bottom: 0.5rem;
  }
</style>