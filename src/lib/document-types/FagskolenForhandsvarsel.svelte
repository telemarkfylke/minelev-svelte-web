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
  const getChosenFromRestOfFaggrupper = (schoolNumber, courseId) => {
    return otherFaggrupper.filter(gruppe => gruppe.skole.skolenummer === selectedSchoolNumber && courseId === gruppe.systemId)
  }

  let canClickSend = false

  // Content data
  const forhandsvarsel = {
    courseId: "",
    assignment: "",
    contactWithinDays: 7
  }

  const resetForhandsvarsel = (schoolNumber) => {
    forhandsvarsel.courseId = ""
    forhandsvarsel.assignment = ""
    forhandsvarsel.contactWithinDays = 7
  }

  // Reactive statements
  $: resetForhandsvarsel(selectedSchoolNumber)

  $: canClickSend = Boolean(forhandsvarsel.courseId && forhandsvarsel.assignment)

  let previewBase64
  const sendForhandsvarsel = async (preview=false) => {
    errorMessage = ""
    if (preview) showPreview = false
    try {
      //  documentTypeId, type, variant, schoolNumber, documentData, preview
      const payload = {
        documentTypeId,
        type: 'fagskolen',
        variant: 'forhandsvarsel',
        schoolNumber: selectedSchoolNumber,
        documentData: forhandsvarsel,
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
  <pre>{JSON.stringify(forhandsvarsel, null, 2)}</pre>
{/if}

{#if isCompletedDocument}
  <section>
    <h4>Emne</h4>
    <div>{documentContent.course.nb} ({documentContent.course.name})</div>
  </section>
{:else}
  <section>
    <h4>Hvilket emne gjelder forhåndsvarselet?</h4>
    {#each getProbableAndOtherChosenFaggrupper(selectedSchoolNumber) as faggruppe}
      <input type="radio" id="{faggruppe.systemId}" bind:group={forhandsvarsel.courseId} name="courses" value="{faggruppe.systemId}" />
      <label for="{faggruppe.systemId}">{faggruppe.fag.navn} ({faggruppe.navn})</label><br>
    {/each}
    {#if displayAllFaggrupper}
      {#each getTheRestOfFaggrupper(selectedSchoolNumber) as faggruppe}
        <input type="radio" id="{faggruppe.systemId}" bind:group={forhandsvarsel.courseId} name="courses" value="{faggruppe.systemId}" />
        <label for="{faggruppe.systemId}">{faggruppe.fag.navn} ({faggruppe.navn})</label><br>
      {/each}
      <p><button on:click={() => displayAllFaggrupper = !displayAllFaggrupper} class="link">Vis færre emner</button></p>
    {:else}
      {#each getChosenFromRestOfFaggrupper(selectedSchoolNumber, forhandsvarsel.courseId) as faggruppe}
        <input type="radio" id="{faggruppe.systemId}" bind:group={forhandsvarsel.courseId} name="courses" value="{faggruppe.systemId}" />
        <label for="{faggruppe.systemId}">{faggruppe.fag.navn} ({faggruppe.navn})</label><br>
      {/each}
      <p>Ser du ikke emnet du er ute etter?<button on:click={() => displayAllFaggrupper = !displayAllFaggrupper} class="link">Vis alle emner for studenten</button></p>
    {/if}
  </section>
{/if}

{#if isCompletedDocument}
  <section>
    <h4>Arbeidskravets navn / beskrivelse</h4>
    <div>{documentContent.assignment}</div>
  </section>
{:else}
  <section>
    <h4>Arbeidskravets navn / beskrivelse</h4>
      <!--<label for="arbeidskrav">Arbeidskravets navn / beskrivelse</label>-->
      <input id="arbeidskrav" type="text" maxlength="200" bind:value={forhandsvarsel.assignment} placeholder="Eks: Arbeidskrav 1: Navn / beskrivelse" />
  </section>
{/if}

{#if isCompletedDocument}
  <section>
    <h4>Frist for å ta kontakt (dager)</h4>
    <div>{documentContent.contactWithinDays === 0 ? 'Ingen frist' : documentContent.contactWithinDays}</div>
  </section>
{:else}
  <section>
    <h4>Frist for å ta kontakt (dager)</h4>
      <!--<label for="arbeidskrav">Arbeidskravets navn / beskrivelse</label>-->
      <div class="subInfo" >Hvor mange dager har studenten på å ta kontakt med deg etter at varselet er sendt (for spørsmål eller veiledning)? Velg <strong>0</strong> for ingen frist.</div>
      <input id="contactWithinDays" style="width: 60px;" type="number" bind:value={forhandsvarsel.contactWithinDays} placeholder="Eks: 5" />
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
        <button on:click={() => {sendForhandsvarsel(true); previewLoading=true}}><span class="material-symbols-outlined">preview</span>Forhåndsvisning</button>
      {/if}
      {#if sendLoading}
        <button disabled><LoadingSpinner width={"1.5"} />Send</button>
      {:else}
        <button class="filled" on:click={() => {sendForhandsvarsel(); sendLoading=true}}><span class="material-symbols-outlined">send</span>Send</button>
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

  .subInfo {
    margin-bottom: var(--spacing-small);
  }

  #arbeidskrav {
    box-sizing: border-box;
    width: 100%;
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