<script>
  import axios from "axios";
  import PdfPreview from "../components/PDFPreview.svelte";
  import { conversationStatuses } from "./data/document-data";
  import { documentTypes } from "./document-types";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import { goto } from "$app/navigation";

  export let documentTypeId = null
  export let studentFeidenavnPrefix = null
  export let selectedSchoolNumber = null
  export let isCompletedDocument = false
  export let documentContent = null
  export let documentVariant = null

  let showPreview = false
  let sendLoading = false
  let previewLoading = false

  let showData = false
  let errorMessage = ""

  let canClickSend = false

  // Content data
  const elevsamtale = {
    conversationStatus: ""
  }

  // Reactive statements
  $: canClickSend = Boolean(elevsamtale.conversationStatus)

  let previewBase64
  const sendElevsamtale = async (preview=false) => {
    errorMessage = ""
    try {
      const payload = {
        documentTypeId,
        type: 'samtale',
        variant: elevsamtale.conversationStatus,
        schoolNumber: selectedSchoolNumber,
        documentData: {},
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
        goto(`/elever/${studentFeidenavnPrefix}/dokumenter/${data.insertedId}`) // Hm muligens bedre det ja
      }
    } catch (error) {
      previewLoading = false
      sendLoading = false
      errorMessage = error.response?.data || error.stack || error.toString()
    }
  }
</script>

{#if showData}
  <pre>{JSON.stringify(elevsamtale, null, 2)}</pre>
{/if}

{#if isCompletedDocument}
  <section>
    <h4>
      Er det gjennomført en elevsamtale?
    </h4>
    <input type="radio" id="conversationStatus" name="conversationStatus" disabled checked />
    <label for="conversationStatus">{conversationStatuses.find(status => status.id === documentVariant)?.value.nb}</label><br>
  </section>
{:else}
  <section>
    <h4>
      Er det gjennomført en elevsamtale?
    </h4>
    {#each conversationStatuses as conversationStatus}
      <input type="radio" id="conversationStatus-{conversationStatus.id}" bind:group={elevsamtale.conversationStatus} name="periodId" value="{conversationStatus.id}" required />
      <label for="conversationStatus-{conversationStatus.id}">{conversationStatus.value.nb}</label><br>
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
        <button on:click={() => {sendElevsamtale(true); previewLoading=true}}><span class="material-symbols-outlined">preview</span>Forhåndsvisning</button>
      {/if}
      {#if sendLoading}
        <button disabled><LoadingSpinner width={"1.5"} />Send</button>
      {:else}
        <button type="submit" class="filled" on:click={() => {sendElevsamtale(); sendLoading=true}}><span class="material-symbols-outlined">send</span>Send</button>
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