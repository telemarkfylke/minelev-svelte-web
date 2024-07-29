<script>
  import { page } from "$app/stores";
  import Varsel from "$lib/document-types/VarselFag.svelte";
  import { documentTypes } from "$lib/document-types/document-types";
  /** @type {import('./$types').PageData} */
  export let data

  let student = data.students.find(stud => stud.feidenavnPrefix === $page.params.feidenavnPrefix)
  let chosenSchool = student.skoler.find(skole => skole.kontaktlarer)?.skolenummer || student.skoler[0].skolenummer // Veldig smal case, om man har den samme eleven på flere skoler... defaulter til første skolen vi finner der lærer er kontaklærer. Hvis ikke, første i lista

  let documentType = $page.url.searchParams.get('type') || undefined
  let documentVariant = $page.url.searchParams.get('variant') || undefined

  let availableDocumentTypes = student.skoler.find(skole => skole.skolenummer === chosenSchool).availableDocumentTypes

  $: availableDocumentTypes = student.skoler.find(skole => skole.skolenummer === chosenSchool).availableDocumentTypes

  const getAvailableDocumentTypes = (school) => {
    school = student.skoler.find(skole => skole.skolenummer === school)
    const availableDocumentTypes = documentTypes.filter(docType => {
      if (docType.requireContactTeacher && school.kontaktlarer) return true // Er kontaktlærer for denne eleven på valgt skole
      if (!docType.requireContactTeacher) return true
      if (docType.yff) return true // Legg INN YFF KRITERIE
    })
    if (availableDocumentTypes.length === 1) documentType = availableDocumentTypes[0].id // Svelte doesnt understand me - trigger update on value
    return availableDocumentTypes
  }

  // Make it reactive
  const getCurrentDocumentType = (docType) => {
    return documentTypes.find(dt => dt.id === docType)
  }

  const getAvailableVariants = (docType, school) => {
    docType = getCurrentDocumentType(docType)
    school = student.skoler.find(skole => skole.skolenummer === school)
    const availableVariants = docType.variants.filter(variant => {
      if (variant.requireContactTeacher && school.kontaktlarer) return true // Er kontaktlærer for denne eleven på valgt skole
      if (!variant.requireContactTeacher) return true
    })
    if (availableVariants.length === 1) documentVariant = availableVariants[0].id // Svelte doesnt understand me - trigger update on value
    return availableVariants
  }

</script>

<h2>Opprett nytt dokument</h2>
{#if student.skoler.length > 1}
<h4>Jøss, du er lærer for denne eleven på flere skoler, velg skole:</h4>
  {#each student.skoler as skole}
    <input type="radio" id="{skole.skolenummer}" on:change={() => {documentType = ""}} bind:group={chosenSchool} name="school" value="{skole.skolenummer}" />
    <label for="{skole.skolenummer}">{skole.navn}</label><br>
  {/each}
{/if}
<div class="label-select">
  <label for="documentType">Dokumenttype</label>
  <select bind:value={documentType} id="documentType">
    {#if getAvailableDocumentTypes(chosenSchool).length === 1} <!-- Hvis det bare er en gyldig dokumenttype, så bruker vi bare den -->
      <option value="{getAvailableDocumentTypes(chosenSchool)[0].id}">{getAvailableDocumentTypes(chosenSchool)[0].title}</option>
    {:else}
      <option value="">--Velg dokumenttype--</option>
      <hr />
      {#each getAvailableDocumentTypes(chosenSchool) as docType}
        <option value="{docType.id}">{docType.title}</option>
      {/each}
    {/if}
    </select>
</div>
{#if documentType}
  <div class="label-select">
    <label for="documentVariant">{getCurrentDocumentType(documentType, chosenSchool).variantDescription}</label>
    <select bind:value={documentVariant} id="documentType"> <!--Burde det disables når det bare er et valg mon tro?-->
      {#if getAvailableVariants(documentType, chosenSchool).length === 1}
        <option value="{getAvailableVariants(documentType, chosenSchool)[0].id}">{getAvailableVariants(documentType, chosenSchool)[0].title}</option>
      {:else}
        <option value="">--{getCurrentDocumentType(documentType).variantDescription}--</option>
        <hr />
        {#each getAvailableVariants(documentType, chosenSchool) as variant}
          <option value="{variant.id}">{variant.title}</option>
        {/each}
      {/if}
    </select>
  </div>
{/if}

{#if documentType && documentVariant}
  {#if documentType === 'varsel'}
    <Varsel chosenVariant={documentVariant} {student} faggrupper={data.faggrupper} probableFaggrupper={data.probableFaggrupper} schoolNumber={chosenSchool} />
  {/if}
  {#if documentType === 'elevsamtale'}
    Hallo elevsamtale
  {/if}
  {#if documentType === 'notat'}
    Hallo notat
  {/if}
  {#if documentType === 'yff'}
    Hallo yff
  {/if}
{/if}

<!--Putte inn knappene her? Mulig submit fungeer like fett? Hva med preview? Bruke den rett her? Njaa, kan hende det er like greit, å ta alt inn i komppnenetene-->


<style>
  select {
    min-width: 15rem;
  }
</style>