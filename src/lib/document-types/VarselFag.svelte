<script>
  import axios from "axios";
  import PdfPreview from "../components/PDFPreview.svelte";
  import { periods, courseReasons } from "./data/document-data";
  import { documentTypes } from "./document-types";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import { goto } from "$app/navigation";

  export let documentTypeId = null
  export let studentFeidenavnPrefix = null
  export let selectedSchoolNumber = null
  export let faggrupper = []
  export let probableFaggrupper = []
  export let isCompletedDocument = false
  export let documentContent = null

  let displayAllFaggrupper = false
  let showPreview = false
  let sendLoading = false
  let previewLoading = false

  let showData = false
  let errorMessage = ""

  const otherFaggrupper = faggrupper.filter(gruppe => !probableFaggrupper.some(group => group.systemId === gruppe.systemId))
  
  const getProbableAndOtherChosenFaggrupper = (schoolNumber) => {
    const probable = probableFaggrupper.filter(gruppe => gruppe.skole.skolenummer === selectedSchoolNumber)
    return probable
  }
  const getTheRestOfFaggrupper = (schoolNumber) => {
    return otherFaggrupper.filter(gruppe => gruppe.skole.skolenummer === selectedSchoolNumber)
  }
  const getChosenFromRestOfFaggrupper = (schoolNumber, courseIds) => {
    return otherFaggrupper.filter(gruppe => gruppe.skole.skolenummer === selectedSchoolNumber && courseIds.includes(gruppe.systemId))
  }

  let canClickSend = false

  // Content data
  const varsel = {
    periodId: "",
    courseIds: [],
    reasonIds: []
  }

  const resetVarsel = (schoolNumber) => {
    varsel.courses = []
  }

  // Reactive statements
  $: resetVarsel(selectedSchoolNumber)

  $: canClickSend = Boolean(varsel.periodId && varsel.courseIds.length > 0 && varsel.reasonIds.length > 0)

  let previewBase64
  const sendVarsel = async (preview=false) => {
    errorMessage = ""
    try {
      //  documentTypeId, type, variant, schoolNumber, documentData, preview
      const payload = {
        documentTypeId,
        type: 'varsel',
        variant: 'fag',
        schoolNumber: selectedSchoolNumber,
        documentData: varsel,
        preview
      }
      const { data } = await axios.post(`/api/students/${studentFeidenavnPrefix}/newDocument`, payload)
      // If ok then do something
      if (preview) {
        previewBase64 = data
        previewLoading = false
        showPreview = true
      } else {
        sendLoading = false
        goto(`/elever/${studentFeidenavnPrefix}/dokumenter/${data.insertedId}`)
      }
    } catch (error) {
      previewLoading = false
      sendLoading = false
      errorMessage = error.response?.data || error.stack || error.toString()
    }
  }
</script>

{#if showData}
  <pre>{JSON.stringify(varsel, null, 2)}</pre>
{/if}

{#if isCompletedDocument}
  <section>
    <h4>
      Periode
    </h4>
    <input type="radio" id="period" name="periodId" disabled checked />
    <label for="period">{documentContent.period.nb}</label><br>
  </section>
{:else}
  <section>
    <h4>
      Velg periode
    </h4>
    {#each periods as period}
      <input type="radio" id="period-{period.id}" bind:group={varsel.periodId} name="periodId" value="{period.id}" required />
      <label for="period-{period.id}">{period.value.nb}</label><br>
    {/each}
  </section>
{/if}

{#if isCompletedDocument}
  <section>
    <h4>Fag</h4>
    {#each documentContent.classes as faggruppe}
      <input type="checkbox" id="{faggruppe.id}" name="courses" disabled checked />
      <label for="{faggruppe.id}">{faggruppe.nb} ({faggruppe.name})</label><br>
    {/each}
  </section>
{:else}
  <section>
    <h4>Hvilke fag gjelder varselet?</h4>
    {#each getProbableAndOtherChosenFaggrupper(selectedSchoolNumber) as faggruppe}
      <input type="checkbox" id="{faggruppe.systemId}" bind:group={varsel.courseIds} name="courses" value="{faggruppe.systemId}" />
      <label for="{faggruppe.systemId}">{faggruppe.fag.navn} ({faggruppe.navn})</label><br>
    {/each}
    {#if displayAllFaggrupper}
      {#each getTheRestOfFaggrupper(selectedSchoolNumber) as faggruppe}
        <input type="checkbox" id="{faggruppe.systemId}" bind:group={varsel.courseIds} name="courses" value="{faggruppe.systemId}" />
        <label for="{faggruppe.systemId}">{faggruppe.fag.navn} ({faggruppe.navn})</label><br>
      {/each}
      <p><button on:click={() => displayAllFaggrupper = !displayAllFaggrupper} class="link">Vis færre fag</button></p>
    {:else}
      {#each getChosenFromRestOfFaggrupper(selectedSchoolNumber, varsel.courseIds) as faggruppe}
        <input type="checkbox" id="{faggruppe.systemId}" bind:group={varsel.courseIds} name="courses" value="{faggruppe.systemId}" />
        <label for="{faggruppe.systemId}">{faggruppe.fag.navn} ({faggruppe.navn})</label><br>
      {/each}
      <p>Ser du ikke faget du er ute etter?<button on:click={() => displayAllFaggrupper = !displayAllFaggrupper} class="link">Vis alle fag for eleven</button></p>
    {/if}
  </section>
{/if}

{#if isCompletedDocument}
  <section>
    <h4>Årsaken til varselet</h4>
    {#each documentContent.reasons as reason}
      <input type="checkbox" id="reason-{reason.id}" name="reasons" disabled checked />
      <label for="reason-{reason.id}">{reason.nb}</label><br>
    {/each}
  </section>
{:else}
  <section>
    <h4>Hva er årsaken til varselet</h4>
    {#each courseReasons as reason}
      <input type="checkbox" id="reason-{reason.id}" bind:group={varsel.reasonIds} name="reasons" value="{reason.id}" />
      <label for="reason-{reason.id}">{reason.description.nb}</label><br>
    {/each}
  </section>
{/if}

{#if errorMessage}
  <section class="error">
    <h4>En feil har oppstått 😩</h4>
    <p>{JSON.stringify(errorMessage)}</p>
  </section>
{/if}

{#if !isCompletedDocument}
  <div class="form-buttons">
    {#if canClickSend}
      {#if previewLoading}
        <button disabled><LoadingSpinner width={"1.5"} />Forhåndsvisning</button>
      {:else}
        <button on:click={() => {sendVarsel(true); previewLoading=true}}><span class="material-symbols-outlined">preview</span>Forhåndsvisning</button>
      {/if}
      {#if sendLoading}
        <button disabled><LoadingSpinner width={"1.5"} />Send</button>
      {:else}
        <button class="filled" on:click={() => {sendVarsel(); sendLoading=true}}><span class="material-symbols-outlined">send</span>Send</button>
      {/if}
    {:else}
      <button disabled><span class="material-symbols-outlined">preview</span>Forhåndsvisning</button>
      <button disabled><span class="material-symbols-outlined">send</span>Send</button>
    {/if}
  </div>
  <PdfPreview {showPreview} base64Data={previewBase64} closePreview={() => {showPreview = false}} />
{/if}

<style>
  h4 {
    border-bottom: 1px solid var(--primary-color);
  }
  .form-buttons {
    display: flex;
    gap: var(--spacing-small);
  }
  section {
    /* background-color: var(--primary-color-20); */
    padding-bottom: 0.5rem;
  }
  .error {
    color: var(--error-color);
    background-color: var(--error-background-color);
    padding: 0.5rem 1rem;
  }
</style>