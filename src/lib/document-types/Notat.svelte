<script>
  import axios from "axios";
  import { documentTypes } from "./document-types";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import { goto } from "$app/navigation";
  import { env } from "$env/dynamic/public";

  export let documentTypeId = null
  export let studentFeidenavnPrefix = null
  export let selectedSchoolNumber = null
  export let isCompletedDocument = false

  let sendLoading = false

  let showData = false
  let errorMessage = ""



  let canClickSend = false

  // Content data
  const notat = {
    note: ""
  }

  // Reactive statements
  $: canClickSend = Boolean(notat.note)

  const archiveNote = async () => {
    errorMessage = ""
    try {
      const payload = {
        documentTypeId,
        type: 'notat',
        variant: 'notat',
        schoolNumber: selectedSchoolNumber,
        documentData: notat,
      }
      const { data } = await axios.post(`/api/students/${studentFeidenavnPrefix}/newDocument`, payload)
      sendLoading = false
      goto(`/elever/${studentFeidenavnPrefix}/dokumenter/${data.insertedId}`)
    } catch (error) {
      sendLoading = false
      errorMessage = error.response?.data || error.stack || error.toString()
    }
  }
</script>

{#if showData}
  <pre>{JSON.stringify(notat, null, 2)}</pre>
{/if}

{#if isCompletedDocument}
  <section>
    <h4>
      Notat
    </h4>
    <p>Notatets innhold finner du igjen i <a href="{`${env.PUBLIC_ELEVDOK_URL}/elever/${studentFeidenavnPrefix}` || 'https://elevdok.vestfoldfylke.no'}" target="_blank">Elevdok</a></p>
  </section>
{:else}
  <section>
    <h4>
      Notat
    </h4>
    <textarea class="noteTextArea" bind:value={notat.note} id="story" name="story" rows="10" cols="60" placeholder="Skriv notatet her"></textarea>
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
      {#if sendLoading}
        <button disabled><LoadingSpinner width={"1.5"} />Lagre notat</button>
      {:else}
        <button type="submit" class="filled" on:click={() => {archiveNote(); sendLoading=true}}><span class="material-symbols-outlined">send</span>Lagre notat</button>
      {/if}
    {:else}
      <button disabled><span class="material-symbols-outlined">send</span>Lagre notat</button>
    {/if}
  </div>
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
  .noteTextArea {
    width: 80%;
  }
</style>