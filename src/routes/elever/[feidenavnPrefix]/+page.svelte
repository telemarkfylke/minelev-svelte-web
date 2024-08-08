<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
    import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
    import { conversationStatuses } from "$lib/document-types/data/document-data";
    import { prettyPrintDate } from "$lib/helpers/pretty-date";
    import axios from "axios";
    import { onMount } from "svelte";
  /** @type {import('./$types').PageData} */
  export let data

  let student = data.students.find(stud => stud.feidenavnPrefix === $page.params.feidenavnPrefix)
  const accessTo = {
    yff: student.availableDocumentTypes.some(docType => docType.id === 'yff'),
    varsel: student.availableDocumentTypes.some(docType => docType.id.startsWith('varsel')),
    varselFag: student.availableDocumentTypes.some(docType => docType.id === 'varsel-fag'),
    varselOrden: student.availableDocumentTypes.some(docType => docType.id === 'varsel-orden'),
    varselAtferd: student.availableDocumentTypes.some(docType => docType.id === 'varsel-atferd'),
    elevsamtale: student.availableDocumentTypes.some(docType => docType.id === 'samtale'),
    notat: student.availableDocumentTypes.some(docType => docType.id === 'notat')
  }
  const documents = {
    yff: [],
    varsel: [],
    elevsamtale: [],
    notat: []
  }
  let loadingDocuments = true
  let documentErrorMessage = ""

  onMount(async () => {
    try {
      const { data } = await axios.get(`/api/students/${$page.params.feidenavnPrefix}/documents`)
      documents.yff = data.filter(doc => doc.type === "yff")
      documents.varsel = data.filter(doc => doc.type === 'varsel')
      documents.elevsamtale = data.filter(doc => doc.type === 'samtale')
      documents.notat = data.filter(doc => doc.type === 'notat')
    } catch (error) {
      const errorMsg = error.response?.data || error.stack || error.toString()
      documentErrorMessage = errorMsg
    }
    loadingDocuments = false
  })

</script>

<div class="actionBar">
  <a class="button" href="{$page.url.pathname}/nyttdokument"><span class="material-symbols-outlined">add</span>Nytt dokument</a>
  <a class="button" href="{$page.url.pathname}/nyttdokument?document_type=notat"><span class="material-symbols-outlined">add</span>Nytt notat</a>
</div>

{#if accessTo.yff || true}
  <div class="documentsBox yff">
    <h3 class="boxTitle"><span class="material-symbols-outlined">list</span>Yrkesfaglig fordypning</h3>
    <div class="boxContent">
      Denne eleven har yrkesfaglig fordypning
      {#if loadingDocuments}
        <LoadingSpinner width="1" />
      {:else}
        {#if documents.yff.length > 0}
          {#each documents.yff as doc}
            <div class="documentLine">{JSON.stringify(doc)}</div>
          {/each}
        {:else}
          Ingen tilgjengelige yff-dokumenter
        {/if}
      {/if}
    </div>
    <div class="boxAction">
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>Ny læreplan</button>
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>Ny vurdering ellerno</button>
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>???</button>
    </div>
  </div>
{/if}
{#if accessTo.varsel}
  <div class="documentsBox">
    <h3 class="boxTitle"><span class="material-symbols-outlined">list</span>Varselbrev</h3>
    <div class="boxContent">
      {#if loadingDocuments}
        <LoadingSpinner width="1" />
      {:else}
        {#if documents.varsel.length > 0}
          {#each documents.varsel as document}
            <a href="/elever/{$page.params.feidenavnPrefix}/dokumenter/{document._id}">
              <div class="documentLine">
                <div class="documentCol1">{prettyPrintDate(document.created.timestamp)}</div>
                <div class="documentCol2">{document.title}</div>
                <div class="documentCol3">{document.content.period.nb}</div>
              </div>
            </a>
          {/each}
        {:else}
          Eleven har ingen tilgjengelige varsler
        {/if}
      {/if}
    </div>
    <div class="boxAction">
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=varsel-fag`)}><span class="material-symbols-outlined">add</span>Nytt varsel fag</button>
      {#if accessTo.varselOrden}
        <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=varsel-orden`)}><span class="material-symbols-outlined">add</span>Nytt varsel orden</button>
      {/if}
      {#if accessTo.varselAtferd}
        <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=varsel-atferd`)}><span class="material-symbols-outlined">add</span>Nytt varsel atferd</button>
      {/if}
    </div>
  </div>
{/if}
{#if accessTo.elevsamtale}
  <div class="documentsBox">
    <h3 class="boxTitle"><span class="material-symbols-outlined">list</span>Elevsamtaler</h3>
    <div class="boxContent">
      {#if loadingDocuments}
        <LoadingSpinner width="1" />
      {:else}
        {#if documents.elevsamtale.length > 0}
          {#each documents.elevsamtale as document}
            <a href="/elever/{$page.params.feidenavnPrefix}/dokumenter/{document._id}">
              <div class="documentLine">
                <div class="documentCol1">{prettyPrintDate(document.created.timestamp)}</div>
                <div class="documentCol2">{document.title}</div>
                <div class="documentCol3">{conversationStatuses.find(status => status.id === document.variant)?.value.nb}</div>
              </div>
            </a>
          {/each}
        {:else}
          Eleven har ingen tilgjengelige elevsamtaler
        {/if}
      {/if}
    </div>
    <div class="boxAction">
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=samtale`)}><span class="material-symbols-outlined">add</span>Ny elevsamtale</button>
    </div>
  </div>
{/if}
{#if accessTo.notat}
  <div class="documentsBox">
    <h3 class="boxTitle"><span class="material-symbols-outlined">list</span>Notater</h3>
    <div class="boxContent">
      {#if loadingDocuments}
        <LoadingSpinner width="1" />
      {:else}
        {#if documents.notat.length > 0}
          {#each documents.notat as doc}
            <p>{JSON.stringify(doc)}</p>
          {/each}
        {:else}
          Eleven har ingen tilgjengelige notater
        {/if}
      {/if}
    </div>
    <div class="boxAction">
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>Nytt notat</button>
    </div>
  </div>
{/if}

<style>
  .actionBar {
    margin: 1.5rem 0rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .documentsBox {
    padding: 2.5rem 2rem;
    background-color: var(--primary-color-20);
    margin-bottom: 2rem;
  }
  .documentsBox.yff {
    background-color: var(--secondary-color-20);
  }
  .boxTitle {
    margin: 0rem 0rem 2rem 0rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .boxAction {
    display: flex;
    gap: 0.5rem;
    margin: 2rem 0rem 0rem 0rem;
    flex-wrap: wrap;
  }
  .documentLine {
    display: flex;
    gap: 2rem;
  }
</style>
