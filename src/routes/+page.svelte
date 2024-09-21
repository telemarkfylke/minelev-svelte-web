<script>
    import { goto } from "$app/navigation";
    import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
    import { prettyPrintDate } from "$lib/helpers/pretty-date";
    import axios from "axios";
    import { onMount } from "svelte";

    /** @type {import('./$types').PageData} */
    export let data;

    let documents = [];
    let loadingDocuments = true;
    let documentErrorMessage = "";

    onMount(async () => {
        try {
            const documentResult = await axios.get(`/api/latestactivity`);
            documents = documentResult.data;
        } catch (error) {
            documentErrorMessage = `Det skjedde en feil ved henting av siste aktivitet: ${error.toString()}`;
        }
        loadingDocuments = false;
    });

    const getDocumentSubtitle = (document) => {
        if (document.documentTypeId === 'varsel-fag') {
            const courses = document.content.classes.map(course => course.nb)
            if (courses.length > 1) return 'Flere fag'
            return courses[0]
        }
        return null
    }
</script>

<h2>Hei, {data.user.name}</h2>
<div class="infoBox">
    <h3 class="boxTitle">Om MinElev</h3>
    <div class="textBox">
        Her kan du opprette varsler, notater, eller dokumentere elevsamtaler.
    </div>
    <div class="textBox">
        Tilgang til elever og klasser i MinElev styres fra Visma InSchool. Ta kontakt med Visma InSchool ansvarlig på skolen din, så hjelper de deg!
    </div>
    <br />
    {#if data.systemInfo.YFF_ENABLED}
        <h3 class="boxTitle">Om YFF-modulen</h3>
        <div class=textBox>
            YFF-modulen er nå klar. Dersom du har elever som går et yrkesfaglig utdanningsprogram, kan du nå opprette bekreftelse på utplassering, lokal læreplan, og tilbakemelding på utplassering. Gå inn på en elev for å opprette YFF-dokumenter.
        </div>
    {/if}
</div>

<h2 class="boxTitle">
    <span class="material-symbols-outlined">list</span>
    Aktivitetslogg
</h2>
<div>
    {#if documentErrorMessage}
    <div class="error-box">
        <h4>En feil har oppstått 😩</h4>
        <p>{documentErrorMessage}</p>
    </div>
    {:else}
        {#if loadingDocuments}
        <LoadingSpinner width="3" />
        {:else if documents.length > 0}
            {#each documents as document}
                <div class="documentContainer">
                    <div class="documentInfo">
                        <div class="documentDate">{prettyPrintDate(document.created.timestamp, { shortMonth: true })}</div>
                        <div class="documentTitle"><a href="/elever/{document.student.feidenavnPrefix}/dokumenter/{document._id}">{document.title}</a></div>
                        {#if getDocumentSubtitle(document)}
                            <div class="documentSubtitle">{getDocumentSubtitle(document)}</div>
                        {/if}
                        <div class="createdBy">Opprettet av: {document.created.createdBy.name}</div>
                    </div>
                    <div class="documentStudent">
                        <span class="material-symbols-outlined">school</span>
                        <a href="/elever/{document.student.feidenavnPrefix}">{document.student.name}</a>
                    </div>
                </div>
            {/each}
        {:else}
            Det har ikke skjedd stort enda...
        {/if}
    {/if}
</div>

<style>
    .infoBox {
        padding: 2rem 2rem;
        background-color: var(--tertiary-color-20);
        margin-bottom: 2rem;
    }
    .boxTitle {
        margin: 0rem 0rem 1.2rem 0rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .documentContainer {
        display: flex;
        padding: 1rem 2rem;
        align-items: center;
        gap: 2rem;
        flex-wrap: wrap;
    }
    .documentContainer:nth-child(odd) {
        background-color: var(--primary-color-10);
    }
    .documentDate, .createdBy {
        font-size: var(--font-size-small);
    }
    .documentTitle {
        font-size: 1.1rem;
        font-weight: bold;
    }
    .documentTitle a, .documentStudent a {
        text-decoration: none;
    }
    .documentStudent {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        width: 16rem;
    }

    @media only screen and (max-width: 768px) {
        .documentContainer {
            gap: 0.5rem;
        }
    }


</style>
