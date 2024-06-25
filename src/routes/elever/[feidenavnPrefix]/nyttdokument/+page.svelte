<script>
  import { page } from "$app/stores";
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
  {documentTypeId}
  {#if documentTypeId === 'varsel-fag'}
    <VarselFag {documentTypeId} {teacherStudent} {studentData} faggrupper={studentData.faggrupper} probableFaggrupper={studentData.probableFaggrupper} />
  {/if}
  {#if documentTypeId === 'elevsamtale'}
    Hallo elevsamtale
  {/if}
  {#if documentTypeId === 'notat'}
    Hallo notat
  {/if}
  {#if documentTypeId === 'yff'}
    Hallo yff
  {/if}
{/if}

<!--Putte inn knappene her? Mulig submit fungeer like fett? Hva med preview? Bruke den rett her? Njaa, kan hende det er like greit, å ta alt inn i komppnenetene-->


<style>
  select {
    min-width: 15rem;
  }
</style>