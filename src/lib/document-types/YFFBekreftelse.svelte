<script>
  import axios from "axios";
  import PdfPreview from "../components/PDFPreview.svelte";
  import { periods, orderReasons } from "./data/document-data";
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

  let showData = true
  let errorMessage = ""

  let canClickSend = false

  // Brreg
  let brregLoading = false
  let brregResult = []
  let brregError = ''
  let brregQuery = ''

  const brregSearch = async () => {
    try {
      brregError = ''
      brregLoading = true
      if (!brregQuery) throw new Error('Du må søke på noe')
      if (brregQuery.length < 3) throw new Error('Skriv minst 3 tegn for å søke')
      const { data } = await axios.get(`/api/brreg/search?query=${brregQuery}`)
      brregResult = data
    } catch (error) {
      brregResult = []
      brregError = error.toString()
    }
    brregLoading = false
  }

  // Content data
  const varsel = {
    periodId: "",
    reasonIds: []
  }

  // Actual content data
  const content = {
    bekreftelse: {
      oppmotested: 'Whatever',
      kopiPrEpost: [
        'test@vtfk.no'
      ],
      fraDato: '02.02.2021',
      tilDato: '03.02.2021',
      daysPerWeek: '17',
      startTid: '08:00',
      sluttTid: '16:00',
      kontaktpersonData: [
        {
          navn: 'Whatever',
          telefon: '0118 999 881 999 119 7253',
          epost: 'nei@nei.no',
          avdeling: 'Whatever'
        }
      ],
      parorendeData: [
        {
          navn: 'Allah',
          telefon: 'Sakesak'
        }
      ],
      bedriftsData: null
    },
    utdanningsprogram: {
      kode: 'HS',
      type: 'yrkesfaglig',
      tittel: {
        en: 'Helse- og oppvekstfag',
        nb: 'Helse- og oppvekstfag',
        nn: 'Helse- og oppvekstfag'
      },
      kortform: {
        en: 'Helse- og oppvekstfag',
        nb: 'Helse- og oppvekstfag',
        nn: 'Helse- og oppvekstfag'
      }
    },
    level: 'VG1',
    year: '2020/2021'
  }

  // Reactive statements
  $: canClickSend = Boolean(varsel.periodId && varsel.reasonIds.length > 0)

  let previewBase64
  const sendVarsel = async (preview=false) => {
    errorMessage = ""
    try {
      const payload = {
        documentTypeId,
        type: 'varsel',
        variant: 'orden',
        schoolNumber: selectedSchoolNumber,
        documentData: varsel,
        preview
      }
      const { data } = await axios.get(`/api/students/${studentFeidenavnPrefix}/newDocument`, payload)
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
  <pre>{JSON.stringify(content, null, 2)}</pre>
{/if}

{#if isCompletedDocument}
  <section>
    <h3>
      Bedriftsinformasjon
    </h3>
    <input type="radio" id="period" name="periodId" disabled checked />
    <label for="period">{documentContent.period.nb}</label><br>
  </section>
{:else}
  <section>
    <h3>
      Bedriftsinformasjon
    </h3>
    {#if !content.bekreftelse.bedriftsData}
      <form>
        <div class="button-input">
          <input id="brregsearch" type="text" bind:value={brregQuery}  placeholder="Søk etter navn eller orgnr" />
          <button class="squared" on:click={(e) => { e.preventDefault(); brregSearch(brregQuery) }}>
            <span class="material-symbols-outlined">search</span>
          </button>
        </div>
      </form>
      <br />
      {#if brregLoading}
        <LoadingSpinner width="4" />
      {:else if brregError}
        {brregError}
      {:else}
        {#each brregResult as unit}
          <button class="brregUnit" title="Velg enhet" on:click={() => {content.bekreftelse.bedriftsData = unit}}>
              <div>{unit.organisasjonsNummer}</div>
              <div style="text-align: left;">
                {#if unit.type === 'underenhet'}
                  <div style="font-size: var(--font-size-small);">Underenhet</div>
                {/if}
                <div>{unit.navn}</div>
              </div>
          </button>
        {/each}
      {/if}
    {:else} <!-- Da har vi bedrift -->
        <div class="selectedBrregUnit">
          <div class="unitTitle">{content.bekreftelse.bedriftsData.navn}</div>
          <div>{content.bekreftelse.bedriftsData.organisasjonsNummer}</div>
          <div>{content.bekreftelse.bedriftsData.adresse}</div>
          <div>{content.bekreftelse.bedriftsData.postnummer} {content.bekreftelse.bedriftsData.poststed}</div>
        </div>
        {content.bekreftelse.bedriftsData.avdeling}
        <div class="label-input" style="display: flex;">
          <label for="avdeling">Avdeling (valgfritt)</label>
          <input style="width: 25rem" id="avdeling" type="text" bind:value={content.bekreftelse.bedriftsData.avdeling} placeholder="Avdeling ved bedriften" />
        </div>
        <div class="label-input">
          <label for="motested">Oppmøtested</label>
          <input id="motested" type="text" bind:value={content.bekreftelse.oppmotested} placeholder="Hvor skal eleven møte opp" />
        </div>

    {/if}

    <!--If not chosen bedrift, and search-result is set, show search-result-->
    <!-- Else show chosen bedrift -->
    <!-- If chose bedrift - show valgfri "avdeling" -->
  </section>
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
    {#each orderReasons as reason}
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
  h3 {
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
  .brregUnit:hover, .brregUnit:nth-child(odd):hover {
    background-color: var(--primary-color-30);
  }
  .brregUnit {
    padding: 0.5rem 1rem;
    gap: 1rem;
    width: 100%;
    border: 0px;
    border-radius: 0rem;
  }
  .brregUnit:nth-child(odd) {
    background-color: var(--primary-color-20);
  }
  .selectedBrregUnit {
    padding: 0.5rem 1rem;
    background-color: var(--primary-color-20);
  }
  .unitTitle {
    font-weight: bold;
  }
</style>