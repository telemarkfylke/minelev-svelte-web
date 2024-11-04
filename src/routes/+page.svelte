<script>
    import { goto } from "$app/navigation";
    import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
    import { prettyPrintDate } from "$lib/helpers/pretty-date";
    import { error } from "@sveltejs/kit";
    import axios from "axios";
    import { onMount } from "svelte";

    /** @type {import('./$types').PageData} */
    export let data

    let documents = []
    let loadingDocuments = true
    let documentErrorMessage = ""

    let getStats = false
    let getGroupStats = false

    onMount(async () => {
        try {
            const documentResult = await axios.get(`/api/latestactivity`);
            documents = documentResult.data;
        } catch (error) {
            documentErrorMessage = `Det skjedde en feil ved henting av siste aktivitet: ${error.toString()}`;
        }
        loadingDocuments = false;
    })

    const getSchoolStatistics = async () => {
        const statsResult = await axios.get(`/api/statistics/schools`)
        return statsResult.data
    }

    const getGroupsStatistics = async () => {
        const statsResult = await axios.get(`/api/statistics/groups`)
        return statsResult.data
    }

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
        Her kan lærere opprette varsler, notater, eller dokumentere elevsamtaler.
    </div>
    <div class="textBox">
        Tilgang til elever og klasser i MinElev styres fra Visma InSchool. Ta kontakt med Visma InSchool-ansvarlig på skolen din, så hjelper de deg!
    </div>
    <br />
    {#if data.systemInfo.YFF_ENABLED}
        <h3 class="boxTitle">Om YFF-modulen</h3>
        <div class=textBox>
            YFF-modulen er nå klar. Dersom du har elever som går et yrkesfaglig utdanningsprogram, kan du nå opprette bekreftelse på utplassering, lokal læreplan, og tilbakemelding på utplassering. Gå inn på en elev for å opprette YFF-dokumenter.
        </div>
    {/if}
    {#if data.systemInfo.ELEVSAMTALE_READONLY || data.systemInfo.NOTAT_READONLY || data.systemInfo.VARSEL_READONLY}
        <h3 class="boxTitle">⚠️ OBS!</h3>
        <div class="textBox">
            {#if data.systemInfo.VARSEL_READONLY}
                MinElev skal ikke lenger benyttes til å sende varsel. Du har fremdeles tilgang til MinElev for å se varsler som er sendt før 13. november. Varselbrev sendes nå fra Visma InSchool. Sett deg inn i denne veiledningen:
                <a href="https://inschool.zendesk.com/hc/no/articles/360030859132-4b-22-Opprette-og-sende-varsel" target="_blank">4b.22 - Opprette og sende varsel - Visma InSchool (zendesk.com)</a>
                <br>
                <br>
                {/if}
            {#if data.systemInfo.ELEVSAMTALE_READONLY}
                VIS skal benyttes for elev- og fagsamtaler. Se hvordan du gjør det:
                <a href="https://inschool.zendesk.com/hc/no/articles/13156950686610-4b-21B-Halv%C3%A5rsvurderinger-uten-karakter-i-orden-og-atferd-elevsamtaler" target="_blank">4b.21B - Halvårsvurderinger uten karakter i orden og atferd (elevsamtaler) - Visma InSchool</a>
                <br>
                <br>
            {/if}
            {#if data.systemInfo.NOTAT_READONLY}
                VIS skal benyttes for notater. Se hvordan du gjør det:
                <a href="/" target="_blank">Husk å legge inn riktig lenke</a>
                <br>
                <br>
            {/if}
            Notat i MinElev kan du fremdeles benytte.
        </div>
    {/if}
</div>

<h2 class="boxTitle">
    <span class="material-symbols-outlined">bar_chart</span>
    Statistikk per skole
</h2>
<div class="stats">
    {#if !getStats}
        <button on:click={() => { getStats = true }}>Hent statistikk for skoler</button>
    {/if}
    {#if getStats}
        {#await getSchoolStatistics()}
            <LoadingSpinner width="3" />
        {:then response}
            {#if !response}
                Du har ikke tilgang til noen elever, og derfor ikke tilgang til statistikk heller.
            {:else if response.stats.length === 0}
                Ingen dokumenter å lage statistikk for enda...
            {:else}
                {#each response.stats as school}
                    <h3>{school.skolenavn}</h3>
                    {#each school.documentTypes as docType}
                        <div class="statisticsRow">
                            <div class="statisticsType">{docType.title}</div>
                            <div class="statisticsCount">{docType.count}</div>
                            <div class="statisticsBar">
                                <div style="width: {(docType.count / docType.maxCount) * 100}%; background-color: var(--tertiary-color-50); color: var(--tertiary-color-50);">i</div>
                            </div>
                        </div>
                    {/each}
                {/each}
                <h3>Total</h3>
                {#each response.total as docType}
                    <div class="statisticsRow">
                        <div class="statisticsType">{docType.title}</div>
                        <div class="statisticsCount">{docType.count}</div>
                    </div>
                {/each}
            {/if}
        {:catch error}
            <div class="error-box">
                <h4>En feil har oppstått 😩</h4>
                <p>Det skjedde en feil ved henting av statistikk: {error.toString()}</p>
            </div>
        {/await}
    {/if}
</div>

{#if data.classes.some(group => group.type === 'basisgruppe')}
    <h2 class="boxTitle">
        <span class="material-symbols-outlined">bar_chart</span>
        Statistikk for dine basisgrupper
    </h2>
    <div class="stats">
        {#if !getGroupStats}
            <button on:click={() => { getGroupStats = true }}>Hent statistikk for basisgrupper</button>
        {/if}
        {#if getGroupStats}
            {#await getGroupsStatistics()}
                <LoadingSpinner width="3" />
            {:then response}
                {#if !response}
                    Du har ikke tilgang til noen elever, og derfor ikke tilgang til statistikk heller.
                {:else if response.stats.length === 0}
                    Ingen dokumenter å lage statistikk for enda...
                {:else}
                    {#each response.stats as docType}
                        <h3>{docType.title}</h3>
                        {#each docType.basisgrupper as basisgruppe}
                            <div class="statisticsRow">
                                <div class="statisticsType"><a href="/klasser/{basisgruppe.systemId}">{basisgruppe.basisgruppe}</a></div>
                                <div class="statisticsCount">{basisgruppe.count}</div>
                                <div class="statisticsBar">
                                    <div style="width: {(basisgruppe.count / basisgruppe.maxCount) * 100}%; background-color: var(--secondary-color-50); color: var(--secondary-color-50);">i</div>
                                </div>
                            </div>
                        {/each}
                    {/each}
                    <h3>Total for dine elever</h3>
                    {#each response.total as docType}
                            <div class="statisticsRow">
                            <div class="statisticsType">{docType.title}</div>
                            <div class="statisticsCount">{docType.count}</div>
                        </div>
                    {/each}
                {/if}
            {:catch error}
                <div class="error-box">
                    <h4>En feil har oppstått 😩</h4>
                    <p>Det skjedde en feil ved henting av statistikk: {error.toString()}</p>
                </div>
            {/await}
        {/if}
    </div>  
{/if}

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
            Viser siste {documents.length} dokumenter
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
    .stats {
        padding: 0rem 2rem;
        margin-bottom: 2rem;
    }
    .statisticsRow {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.1rem 0rem;
    }
    .statisticsType {
        flex-shrink: 0;
        width: 17rem;
    }
    .statisticsCount {
        text-align: right;
        width: 3rem;
        flex-shrink: 0;
    }
    .statisticsBar {
        width: 100%;
        flex-grow: 1;
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
        .statisticsBar {
            display: none;
        }
        .statisticsType {
            width: auto;
        }
        .statisticsCount {
            width: auto;
        }
    }


</style>
