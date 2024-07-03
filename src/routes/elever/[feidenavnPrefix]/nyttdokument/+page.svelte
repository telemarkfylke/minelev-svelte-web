<script>
  import { page } from "$app/stores";
  import Elevsamtale from "$lib/document-types/Elevsamtale.svelte";
  import VarselFag from "$lib/document-types/VarselFag.svelte";
  import { documentTypes } from "$lib/document-types/document-types";
  /** @type {import('./$types').PageData} */
  export let data

  const teacherStudent = data.students.find(stud => stud.feidenavnPrefix === $page.params.feidenavnPrefix)
  const studentData = data.studentData

  let documentTypeId = $page.url.searchParams.get('document_type') || undefined


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
  {#if documentTypeId === 'varsel-fag'}
    <VarselFag {documentTypeId} {teacherStudent} {studentData} user={data.user} teacher={data.teacher} faggrupper={studentData.faggrupper} probableFaggrupper={studentData.probableFaggrupper} />
  {/if}
  {#if documentTypeId === 'elevsamtale'}
    <Elevsamtale {documentTypeId} {teacherStudent} {studentData} />
  {/if}
  {#if documentTypeId === 'notat'}
    Hallo notat
  {/if}
  {#if documentTypeId === 'yff'}
    Hallo yff
  {/if}
{/if}

<style>
  select {
    min-width: 15rem;
  }
</style>