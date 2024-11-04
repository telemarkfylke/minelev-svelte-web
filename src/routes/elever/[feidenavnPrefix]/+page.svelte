<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import { conversationStatuses, documentStatuses } from "$lib/document-types/data/document-data";
  import { prettyPrintDate } from "$lib/helpers/pretty-date";
  import axios from "axios";
  import { onMount } from "svelte";
  /** @type {import('./$types').PageData} */
  export let data

  let student = data.students.find(stud => stud.feidenavnPrefix === $page.params.feidenavnPrefix)
  const accessTo = {
    yff: data.studentData.hasYff,
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
      {
        const { data } = await axios.get(`/api/students/${$page.params.feidenavnPrefix}/documents`)
        documents.varsel = data.filter(doc => doc.type === 'varsel')
        documents.elevsamtale = data.filter(doc => doc.type === 'samtale')
        documents.notat = data.filter(doc => doc.type === 'notat')
      }
        {
          if (data.studentData.hasYff) {
          const { data } = await axios.get(`/api/students/${$page.params.feidenavnPrefix}/yff/documents`)
          documents.yff = data
        }
      }
    } catch (error) {
      documentErrorMessage = `Det skjedde en feil ved henting av elevens dokumenter: ${error.toString()}`
    }
    loadingDocuments = false
  })

</script>

<div class="actionBar">
  {#if data.user.canCreateDocuments}
    <a class="button" href="{$page.url.pathname}/nyttdokument"><span class="material-symbols-outlined">add</span>Nytt dokument</a>
  {/if}
  {#if accessTo.notat && data.user.canCreateDocuments}
    <a class="button" href="{$page.url.pathname}/nyttdokument?document_type=notat"><span class="material-symbols-outlined">add</span>Nytt notat</a>
  {/if}
</div>

{#if documentErrorMessage}
  <div class="error-box">
    <h4>En feil har oppstått 😩</h4>
    <p>{documentErrorMessage}</p>
  </div>
{/if}

{#if accessTo.yff}
  <div class="documentsBox yff">
    <h3 class="boxTitle"><span class="material-symbols-outlined">list</span>Yrkesfaglig fordypning</h3>
    <div class="boxContent">
      <div>
        Her finner du dokumenter knyttet til elevens yrkesfaglige fordypning (YFF). Dette kan være bekreftelse på utplassering, lokale læreplaner og tilbakemelding på utplassering.
        <br />
        For å opprette en tilbakemelding på utplassering, må det først opprettes bekreftelse på utplassering, og deretter en lokal læreplan for utplasseringen.
      </div>
      <br />
      {#if loadingDocuments}
        <LoadingSpinner width="1" />
      {:else}
        {#if documents.yff.length > 0}
          {#each documents.yff as document}
            <div class="documentContainer">
              <div class="documentInfo">
                  <div class="documentDate">{prettyPrintDate(document.created.timestamp, { shortMonth: true })}</div>
                  <div class="documentTitle"><a href="/elever/{document.student.feidenavnPrefix}/dokumenter/{document._id}">{document.title}</a></div>
                  <div class="documentStatus">{documentStatuses.find(s => s.id === document.status[document.status.length - 1].status)?.short.nb || 'Ukjent status'}</div>
                  <div class="mobileCreatedBy">Opprettet av: {document.created.createdBy.name}</div>
              </div>
              <div class="documentDetails">
                  {#if document.variant === 'bekreftelse'}
                    <div><strong>{document.content.bekreftelse.bedriftsNavn}</strong></div>
                    {#if !document.hasLaereplan && !document.hasTilbakemelding}
                      <a href="/elever/{document.student.feidenavnPrefix}/nyttdokument?document_type=yff-laereplan&utplasseringid={document._id.toString()}" style="font-size: var(--font-size-root);"><span class="material-symbols-outlined" style="font-size: 1.2rem;">add</span>Opprett læreplan</a>
                    {:else if !document.hasTilbakemelding && document.hasLaereplan}
                      <a href="/elever/{document.student.feidenavnPrefix}/nyttdokument?document_type=yff-tilbakemelding&utplasseringid={document._id.toString()}" style="font-size: var(--font-size-root);"><span class="material-symbols-outlined" style="font-size: 1.2rem;">add</span>Opprett tilbakemelding</a>
                    {/if}
                  {/if}
                  {#if document.variant === 'laereplan'}
                    <div><strong>{document.content.utplassering.name}</strong></div>
                    {#if !document.hasTilbakemelding}
                      <a href="/elever/{document.student.feidenavnPrefix}/nyttdokument?document_type=yff-laereplan&utplasseringid={document.content.utplassering.id}" style="font-size: var(--font-size-root);"><span class="material-symbols-outlined" style="font-size: 1.2rem;">edit_note</span>Rediger læreplan</a>
                    {/if}
                  {/if}
                  {#if document.variant === 'tilbakemelding'}
                    <div><strong>{document.content.utplassering.bedriftsNavn}</strong></div>
                  {/if}
                  <div class="createdBy">Opprettet av: {document.created.createdBy.name}</div>
              </div>
            </div>
          {/each}
        {:else}
          Ingen tilgjengelige yff-dokumenter
        {/if}
      {/if}
    </div>
    {#if data.user.canCreateDocuments}
      <div class="boxAction">
        <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=yff-bekreftelse`)}><span class="material-symbols-outlined">add</span>Ny bekreftelse på utplassering</button>
        <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=yff-laereplan`)}><span class="material-symbols-outlined">edit_note</span>Lokal læreplan</button>
        <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=yff-tilbakemelding`)}><span class="material-symbols-outlined">add</span>Ny tilbakemelding på utplassering</button>
      </div>
    {/if}
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
            <div class="documentContainer">
              <div class="documentInfo">
                  <div class="documentDate">{prettyPrintDate(document.created.timestamp, { shortMonth: true })}</div>
                  <div class="documentTitle"><a href="/elever/{document.student.feidenavnPrefix}/dokumenter/{document._id}">{document.title}</a></div>
                  <div class="documentStatus">{documentStatuses.find(s => s.id === document.status[document.status.length - 1].status)?.short.nb || 'Ukjent status'}</div>
                  <div class="mobileCreatedBy">Opprettet av: {document.created.createdBy.name}</div>
              </div>
              <div class="documentDetails">
                  {#if document.variant === 'fag'}
                    <div><strong>{document.content.classes.length > 1 ? `Flere fag` : document.content.classes[0].nb }</strong></div>
                  {/if}
                  <div>{document.content.period.nb}</div>
                  <div class="createdBy">Opprettet av: {document.created.createdBy.name}</div>
              </div>
            </div>
          {/each}
        {:else}
          Eleven har ingen tilgjengelige varsler
        {/if}
      {/if}
    </div>
    {#if data.user.canCreateDocuments}
      {#if data.systemInfo.VARSEL_READONLY}
        <div class="boxAction">
          <div class="readOnlyInfo">
            MinElev skal ikke lenger benyttes til å sende varsel. Du har fremdeles tilgang til MinElev for å se varsler som er sendt før 13. november. Varselbrev sendes nå fra Visma InSchool. Sett deg inn i denne veiledningen:
            <a href="https://inschool.zendesk.com/hc/no/articles/360030859132-4b-22-Opprette-og-sende-varsel" target="_blank">4b.22 - Opprette og sende varsel - Visma InSchool (zendesk.com)</a>
          </div>
        </div>
      {:else}
        <div class="boxAction">
          <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=varsel-fag`)}><span class="material-symbols-outlined">add</span>Nytt varsel fag</button>
          {#if accessTo.varselOrden}
            <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=varsel-orden`)}><span class="material-symbols-outlined">add</span>Nytt varsel orden</button>
          {/if}
          {#if accessTo.varselAtferd}
            <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=varsel-atferd`)}><span class="material-symbols-outlined">add</span>Nytt varsel atferd</button>
          {/if}
        </div>
      {/if}
    {/if}
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
            <div class="documentContainer">
              <div class="documentInfo">
                  <div class="documentDate">{prettyPrintDate(document.created.timestamp, { shortMonth: true })}</div>
                  <div class="documentTitle"><a href="/elever/{document.student.feidenavnPrefix}/dokumenter/{document._id}">{document.title}</a></div>
                  <div class="documentStatus">{documentStatuses.find(s => s.id === document.status[document.status.length - 1].status)?.short.nb || 'Ukjent status'}</div>
                  <div class="mobileCreatedBy">Opprettet av: {document.created.createdBy.name}</div>
              </div>
              <div class="documentDetails">
                  <div>{conversationStatuses.find(status => status.id === document.variant)?.value.nb}</div>
                  <div class="createdBy">Opprettet av: {document.created.createdBy.name}</div>
              </div>
            </div>
          {/each}
        {:else}
          Eleven har ingen tilgjengelige elevsamtaler
        {/if}
      {/if}
    </div>
    {#if data.user.canCreateDocuments}
      {#if data.systemInfo.ELEVSAMTALE_READONLY}
        <div class="boxAction">
          <div class="readOnlyInfo">
            VIS skal benyttes for elev- og fagsamtaler. Se hvordan du gjør det:
            <a href="https://inschool.zendesk.com/hc/no/articles/13156950686610-4b-21B-Halv%C3%A5rsvurderinger-uten-karakter-i-orden-og-atferd-elevsamtaler" target="_blank">4b.21B - Halvårsvurderinger uten karakter i orden og atferd (elevsamtaler) - Visma InSchool</a>
          </div>
        </div>
      {:else}
        <div class="boxAction">
          <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=samtale`)}><span class="material-symbols-outlined">add</span>Ny elevsamtale</button>
        </div>
      {/if}
    {/if}
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
          {#each documents.notat as document}
            <div class="documentContainer">
              <div class="documentInfo">
                  <div class="documentDate">{prettyPrintDate(document.created.timestamp, { shortMonth: true })}</div>
                  <div class="documentTitle"><a href="/elever/{document.student.feidenavnPrefix}/dokumenter/{document._id}">{document.title}</a></div>
                  <div class="documentStatus">{documentStatuses.find(s => s.id === document.status[document.status.length - 1].status)?.short.nb || 'Ukjent status'}</div>
                  <div class="mobileCreatedBy">Opprettet av: {document.created.createdBy.name}</div>
              </div>
              <div class="documentDetails">
                  <div class="createdBy">Opprettet av: {document.created.createdBy.name}</div>
              </div>
            </div>
          {/each}
        {:else}
          Eleven har ingen tilgjengelige notater
        {/if}
      {/if}
    </div>
    {#if data.user.canCreateDocuments}
      {#if data.systemInfo.NOTAT_READONLY}
        <div class="boxAction">
          <div class="readOnlyInfo">
            VIS skal benyttes for notater. Se hvordan du gjør det:
            <a href="/" target="_blank">Husk å legge inn riktig lenke</a>
          </div>
        </div>
      {:else}
        <div class="boxAction">
          <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument?document_type=notat`)}><span class="material-symbols-outlined">add</span>Nytt notat</button>
        </div>
      {/if}
    {/if}
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
    margin: 0rem 0rem 0.5rem 0rem;
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
  .readOnlyInfo {
    background-color: var(--warning-background-color);
    border: 2px solid var(--warning-color);
    padding: 1rem;
  }
  .documentContainer {
    display: flex;
    padding: 0.5rem;
    border-bottom: 1px solid var(--primary-color);
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
  }
  .documentDate, .createdBy {
    font-size: var(--font-size-small);
  }
  .documentTitle {
    font-size: 1rem;
    font-weight: bold;
  }
  .documentStatus {
    font-size: var(--font-size-small);
  }
  .documentDetails {
    font-size: var(--font-size-small);
    width: 16rem;
  }
  .mobileCreatedBy {
    font-size: var(--font-size-small);
    display: none;
  }

  @media only screen and (max-width: 768px) {
    .documentContainer {
        gap: 0.5rem;
    }
    .documentDetails {
      display: none;
    }
    .mobileCreatedBy {
      font-size: var(--font-size-small);
      display: block;
    }
  }
</style>