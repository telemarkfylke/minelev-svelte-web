<script>
  import axios from "axios";
  import PdfPreview from "../components/PDFPreview.svelte";
  import { periods, behaviourReasons } from "./data/document-data";
  import { documentTypes } from "./document-types";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import { goto } from "$app/navigation";

  export let documentTypeId = null
  export let studentFeidenavnPrefix = null
  export let selectedSchoolNumber = null
  export let isCompletedDocument = false
  export let documentContent = null

  let showPreview = false
  let sendLoading = false
  let previewLoading = false

  let showData = false
  let errorMessage = ""

  let canClickSend = false

  // Content data
  const varsel = {
    periodId: "",
    reasonIds: []
  }

  // Reactive statements
  $: canClickSend = Boolean(varsel.periodId && varsel.reasonIds.length > 0)

  let previewBase64
  const sendVarsel = async (preview=false) => {
    errorMessage = ""
    try {
      //  documentTypeId, type, variant, schoolNumber, documentData, preview
      const payload = {
        documentTypeId,
        type: 'varsel',
        variant: 'atferd',
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
        // Maybe just redirect from API? or maybe here? Based on returned id, probs the best in regards to API-first tankegang
        sendLoading = false
        //goto(`/elever/${studentFeidenavnPrefix}/dokumenter/${data.insertedId}`)
        goto(`/elever/${studentFeidenavnPrefix}`)
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
    <h4>Årsaken til varselet</h4>
    {#each documentContent.reasons as reason}
      <input type="checkbox" id="reason-{reason.id}" name="reasons" disabled checked />
      <label for="reason-{reason.id}">{reason.nb}</label><br>
    {/each}
  </section>
{:else}
  <section>
    <h4>Hva er årsaken til varselet</h4>
    {#each behaviourReasons as reason}
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
        <button type="submit" class="filled" on:click={() => {sendVarsel(); sendLoading=true}}><span class="material-symbols-outlined">send</span>Send</button>
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