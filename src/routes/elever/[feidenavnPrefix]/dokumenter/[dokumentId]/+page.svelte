<script>
    import { page } from "$app/stores";
    import { documentStatuses } from "$lib/document-types/data/document-data";
    import Elevsamtale from "$lib/document-types/Elevsamtale.svelte";
    import Notat from "$lib/document-types/Notat.svelte";
    import VarselAtferd from "$lib/document-types/VarselAtferd.svelte";
    import VarselFag from "$lib/document-types/VarselFag.svelte";
    import VarselOrden from "$lib/document-types/VarselOrden.svelte";
    import { prettyPrintDate } from "$lib/helpers/pretty-date";
    /** @type {import('./$types').PageData} */
    export let data

    const document = data.document
</script>

<h2>{document.title}</h2>

{JSON.stringify($page.params)}
<br/>
<br/>
<br/>

{JSON.stringify(document)}

<section>
    <h4>Skole</h4>
    <p>{document.school.name}</p>
</section>

{#if document.documentTypeId === 'varsel-fag'}
    <VarselFag isCompletedDocument={true} documentContent={document.content} />
{/if}
{#if document.documentTypeId === 'varsel-orden'}
    <VarselOrden isCompletedDocument={true} documentContent={document.content} />
{/if}
{#if document.documentTypeId === 'varsel-atferd'}
    <VarselAtferd isCompletedDocument={true} documentContent={document.content} />
{/if}
{#if document.documentTypeId === 'samtale'}
    <Elevsamtale isCompletedDocument={true} documentContent={document.content} documentVariant={document.variant} />
{/if}
{#if document.documentTypeId === 'notat'}
    <Notat isCompletedDocument={true} />
{/if}
{#if document.documentTypeId === 'yff'}
    Hallo yff
{/if}

<section>
    <h4>Opprettet av</h4>
    {#if document.created.createdBy.principalName !== document.teacher.upn}
        <p>{document.created.createdBy.name} på vegne av {document.teacher.name}</p>
    {:else}
        <p>{document.created.createdBy.name}</p>
    {/if}
</section>

<section>
    <h4>Dato</h4>
    <p>{prettyPrintDate(new Date(document.created.timestamp))}</p>
</section>

<section>
    <h4>Status</h4>
    {#each document.status as status}
        {prettyPrintDate(status.timestamp, true)} - {documentStatuses.find(s => s.id === status.status)?.short.nb || 'Ukjent status'}
    {/each}
</section>

<style>
    h4 {
        border-bottom: 1px solid var(--primary-color);
    }
    p {
        margin: 0rem;
    }
  section {
    /* background-color: var(--primary-color-20); */
    padding-bottom: 0.5rem;
  }
</style>