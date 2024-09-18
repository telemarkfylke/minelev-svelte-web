<script>
  import axios from "axios"
  import PdfPreview from "../components/PDFPreview.svelte"
  import { periods, orderReasons } from "./data/document-data"
  import { documentTypes } from "./document-types"
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte"
  import { goto } from "$app/navigation"
  import { page } from "$app/stores";
  import { onMount } from "svelte";
    import { get } from "svelte/store";

  export let documentTypeId = null
  export let studentFeidenavnPrefix = null
  export let selectedSchoolNumber = null
  export let studentData = null
  export let isCompletedDocument = false
  export let documentContent = null

  // Kan man hente litt data på onmount mon tro? Lage en funksjon for å hente spesifikk laereplan sitt content, og bruke det. Må sendes til elevene hver gang man vil gjøre endring.
  // MEEEN Lager vi da en ny læreplan hver gang vi sender den? Eller skal vi lage versjoner? Og kun ta den nyeste versjonen kanskje? nyttDokument endepunktet lager vel uansett en ny. Må ha en eller annen felles-nevner da..
  // Hvis man kan ta utgangspunkt i en utplassering - og deretter hente den nyeste læreplanen for den utplasseringen! Må da gjøre litt mikkmakk med utplasseringssted da, siden det både kan være elevbedrift og skole i tillegg til bedrift.
  // Hva med loggen over dokumenter? Kan vel da kanskje vise alle sendte læreplaner - men også vise den gjeldende? JA! Kan ha EN gjeldende per utplassering? Det er også den man kan redigere.
  // Når en evt tilbakemelding på utplasseringen er sendt inn - så låses læreplanen.
  /*
  Hvordan ordner vi da flyten på nytt dokument??
  Trenger vi legge til noe data? Har ikke USER ellerno drit i content-creation. Må muligens legge en ekstra valideringssjekk i new-document...
  Lols kan faktisk bare lage eget endepunkt for yff - basert på new-document? Det var jo poenget med at hver dokumenttype håndterer seg selv. Evt bare slenge på en egen funksjon akkurat for YFF? Skal jo gjøre omtrent det samme.
  Vi prøver ideen med nyeste læreplan for en utplassering er gjeldende

  Hvis vi henter både tilgjengelige utplasseringer og alle nyeste tilgjengelige læreplaner i samma slengen, og genererer opp content for alle sammen (ny læreplan for de utplasseringene som ikke har læreplan allerede) - så kan man bare swappe on the fly? Tar en kopi JSON.stringify bare? - ei litta let content?
  Alle har en egen id - som vi kan sende med i query params i pageurl? Om den er med - så setter vi den som valgt i utgangspunktet. Eget endepunkt for å hente yfffene. En læreplan per skole-utplassering. En læreplan for en ungdomsbedrift
  */

  let formElement
  let showPreview = false
  let sendLoading = false
  let previewLoading = false
  let showKompetansemaal = true

  let showData = false
  let errorMessage = ""

  let canClickSend = false

  // Tilgjengelige læreplaner
  let laereplaner = null
  let originalLaereplaner = null
  let laereplanError = ""

  onMount(async () => {
    laereplaner = ""
    try {
      const { data } = await axios.get(`/api/students/${$page.params.feidenavnPrefix}/yff/availablelaereplaner`)
      originalLaereplaner = data
      laereplaner = JSON.parse(JSON.stringify(originalLaereplaner))
    } catch (error) {
      laereplaner = null
      originalLaereplaner = null
      laereplanError = error.stack || error.toString()
    }
  })

  const resetLaereplan = () => {
    if (content?.utplassering?.id) {
      const correspondingOriginal = originalLaereplaner.find(plan => plan.utplassering.id === content.utplassering.id)
      content.utplassering.maal = JSON.parse(JSON.stringify(correspondingOriginal.utplassering.maal)) // Setter maal tilbake til original i tilfelle noen har knota - men kun maal for å ikke knekke bind mot objektet
    }
  }

  const getStudentUtdanningsprogram = (schoolNumber) => {
    if (isCompletedDocument) return []
    const utdanningsprogrammer = studentData.yffSchools.find(school => school.skolenummer === schoolNumber).utdanningsprogrammer
    return utdanningsprogrammer
  }

  const getStudentLevels = (schoolNumber) => {
    if (isCompletedDocument) return []
    return studentData.basisgrupper.filter(gruppe => gruppe.skole.skolenummer === schoolNumber).map(gruppe => gruppe.trinn.toLowerCase())
  }

  // Programområder (skal legges til på mål - så vi legger de tigjengelige til her)
  let currentProgramomraader = []


  const getStudentProgramomraader = (schoolNumber) => {
    if (isCompletedDocument) return []
    const utdanningsprogrammer = getStudentUtdanningsprogram(schoolNumber)
    const programomraader = utdanningsprogrammer.map(program => program.programomrade).flat().map(omrade => omrade.substring(omrade.lastIndexOf('/') + 1))
    return programomraader
  }

  const levels = [
    {
      name: 'VG 1',
      value: 'vg1'
    },
    {
      name: 'VG 2',
      value: 'vg2'
    },
    {
      name: 'VG 3',
      value: 'vg3'
    }
  ]

  // GREP henting av kompetansemål
  const grepSource = {
    level: getStudentLevels(selectedSchoolNumber).length === 1 ? getStudentLevels(selectedSchoolNumber)[0] : '',
    utdanningsprogram: getStudentUtdanningsprogram(selectedSchoolNumber).length === 1 ? getStudentUtdanningsprogram(selectedSchoolNumber)[0].kode : '',
    programomraade: getStudentProgramomraader(selectedSchoolNumber).length === 1 ? getStudentProgramomraader(selectedSchoolNumber)[0] : '' 
  }
  
  const getGrepUtdanningsprogrammer = async () => {
    const { data } = await axios.get(`/api/grep/utdanningsprogrammer`)
    return data
  }

  const getGrepProgramomraader = async (utdanningsprogram, trinn) => {
    const { data } = await axios.get(`/api/grep/programomraader?utdanningsprogram=${utdanningsprogram}&trinn=${trinn}`)
    currentProgramomraader = data
    return data
  }

  const getGrepKompetansemaal = async (programomraade) => {
    const { data } = await axios.get(`/api/grep/kompetansemaal?programomraade=${programomraade}`)
    return data
  }

  const addKompetansemaal = (maal) => {
    content.utplassering.maal = [...content.utplassering.maal, maal] // To make it reactive
  }

  const removeKompetansemaal = (index) => {
    content.utplassering.maal = content.utplassering.maal.filter((_, i) => i !== index) // To make it reactive
  }

  const handleKompetansemaalCheckbox = (event, maal) => {
    event.preventDefault()
    if (event.currentTarget.checked) {
      const currentProgramomraade = currentProgramomraader.find(omraade => omraade.kode === grepSource.programomraade)
      if (!currentProgramomraade) throw new Error(`Programområde ${grepSource.programomraade} ikke funnet`)
      addKompetansemaal({ grep: maal, programomraade: currentProgramomraade, arbeidsoppgaver: '' })
    } else {
      content.utplassering.maal = content.utplassering.maal.filter((m) => m.grep.kode !== maal.kode) // To make it reactive
    }
  }

  // Laereplan content data
  let content = ''

  $: canClickSend = true // Vi prøver oss med innebygget form validation i browser i stedet :)

  let previewBase64
  const sendLaereplan = async (preview=false) => {
    const validData = formElement.reportValidity()
    if (!validData) {
      previewLoading = false
      sendLoading = false
      return
    }
    errorMessage = ""
    try {
      const payload = {
        documentTypeId,
        type: 'yff',
        variant: 'laereplan',
        schoolNumber: selectedSchoolNumber,
        documentData: content,
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
  <pre>{JSON.stringify(content, null, 2)}</pre>
{/if}

{#if isCompletedDocument}
  <h4 class="sectionTitle">Informasjon om denne læreplanen - om den kan redigeres, er gjeldende osv</h4>
  <div>Dette er en læerplan blabla</div>
{:else}
  <div>Informasjon om opprettelse redigering av læreplan</div>
{/if}

<form bind:this={formElement}>
  <!-- Utplassering læreplanen er knyttet til -->
  {#if isCompletedDocument}
    <h4 class="sectionTitle">
      Utplasseringssted for den lokale læreplanen
    </h4>
    <div>{documentContent.utplassering.name}</div>
  {:else if laereplanError}
    <section class="error">
      <h4>En feil har oppstått 😩</h4>
      <p>{laereplanError}</p>
    </section>
  {:else}
    <section>
      <h3>
        Utplasseringssted for den lokale læreplanen
      </h3>
      {#if !laereplaner}
        <LoadingSpinner width={"1.5"} />
      {:else}
        <div class="label-select">
          <label for="utplassering">Utplasseringssted</label>
          <select bind:value={content} id="utplassering" on:change={resetLaereplan}>
            <option value="">--Velg utplasseringssted--</option>
            <hr />
            {#each laereplaner as laereplan}
              <option value={laereplan}>{laereplan.utplassering.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Velging av kompetansemål for læreplanen -->
  {#if isCompletedDocument}
    <!-- Denne blokka brukes bare til oppretting og redigering av læreplanen, og vi viser den ikke for ferdige dokumenter -->
  {:else if content?.utplassering?.id}
    <section>
      <h3>
        Legg til kompetansemål
      </h3>
      <strong>Hent kompetansemål fra</strong>
      <div class="grepSourceSelection">
        <div>
          {#await getGrepUtdanningsprogrammer()}
            <LoadingSpinner width={"1.5"} />
          {:then utdanningsprogrammer}
            <div class="label-select">
              <label for="utdanningsprogram">Utdanningsprogram</label>
              <select bind:value={grepSource.utdanningsprogram} on:change={() => { grepSource.programomraade = '' }} id="utdanningsprogram">
                <option value="">--Velg utdanningsprogram--</option>
                <hr />
                {#each utdanningsprogrammer as utdanningsprogram}
                  <option value={utdanningsprogram.kode}>{utdanningsprogram.tittel.nb}</option>
                {/each}
              </select>
            </div>
          {:catch error}
            <div class="error">
              <h4>Det oppstod en feil :(</h4>
              <p>{error.toString()}</p>
            </div>
          {/await}
        </div>
        {#if grepSource.utdanningsprogram}
          <div>
            <div class="label-select">
              <label for="level">Trinn</label>
              <select bind:value={grepSource.level} on:change={() => { console.log("hallo"); grepSource.programomraade = '' }} id="level">
                <option value="">--Velg trinn--</option>
                <hr />
                {#each levels as level}
                  <option value={level.value}>{level.name}</option>
                {/each}
              </select>
            </div>
          </div>
        {/if}
        {#if grepSource.utdanningsprogram && grepSource.level}
          {#await getGrepProgramomraader(grepSource.utdanningsprogram, grepSource.level)}
            <LoadingSpinner width={"1.5"} />
          {:then programomraader}
            <div>
              <div class="label-select">
                <label for="programomraade">Programområde</label>
                <select bind:value={grepSource.programomraade} id="programomraade">
                  <option value="">--Velg programområde--</option>
                  <hr />
                  {#each programomraader as programomraade}
                    <option value={programomraade.kode}>{programomraade.tittel.nb.length > 40 ? `${programomraade.tittel.nb.substring(0, 37)}...` : programomraade.tittel.nb}</option>
                  {/each}
                </select>
              </div>
            </div>
          {:catch error}
            <div class="error">
              <h4>Det oppstod en feil :(</h4>
              <p>{error.toString()}</p>
            </div>
          {/await}
        {/if}
      </div>
      <br />
      <!-- Kompetansemål man kan velge fra -->
      {#if grepSource.programomraade}
        <div><strong>Kompetansemål</strong></div>
        <button class="link" on:click={(e) => { e.preventDefault(); showKompetansemaal = !showKompetansemaal } }>{showKompetansemaal ? "Skjul" : "Vis"} kompetansemål</button>
        {#await getGrepKompetansemaal(grepSource.programomraade)}
          <LoadingSpinner width={"1.5"} />
        {:then kompetansemaal}
          {#if showKompetansemaal}
            {#each kompetansemaal as maal}
              <div class="kompetansemaal">
                {#if content.utplassering.maal.find(m => m.grep.kode === maal.kode)}
                  <input type="checkbox" checked id="km-{maal.kode}" on:change={(event) => handleKompetansemaalCheckbox(event, maal)} name="maal" value={maal} />
                {:else}
                  <input type="checkbox" id="km-{maal.kode}" on:change={(event) => handleKompetansemaalCheckbox(event, maal)} name="maal" value={maal} />
                {/if}
                <label for="km-{maal.kode}">{maal.tittel.nb}</label><br>
              </div>
            {/each}
          {/if}
        {:catch error}
          <div class="error">
            <h4>Det oppstod en feil :(</h4>
            <p>{error.toString()}</p>
          </div>
        {/await}
      {/if}
    </section>
  {/if}
  
  <!-- Valgte kompetansemål med beskrivelse -->
  {#if isCompletedDocument}
    <h4 class="sectionTitle">Kompetansemål i den lokale læreplanen</h4>
    {#each documentContent.utplassering.maal as maal, maalIndex}
      <div class="staticMaal">
        <div><strong>Programområde: </strong>{maal.programomraade.tittel.nb}</div>
        <div><strong>Kompetansemål: </strong>{maal.grep.tittel.nb}</div>
        {#if maal.arbeidsoppgaver}
          <div><strong>Arbeidsoppgaver: </strong>{maal.arbeidsoppgaver}</div>
        {/if}
      </div>
    {/each}
  {:else if content?.utplassering?.id && Array.isArray(content?.utplassering?.maal) && content?.utplassering?.maal.length > 0}
    <section>
      <h3>
        Beskriv kompetansemål med arbeidsoppgaver
      </h3>
      {#each content.utplassering.maal as maal, maalIndex}
        <div class="lareplanKompetansemaal">
          <div class="lareplanKompetansemaalTittel">
            <div>{maal.programomraade.tittel.nb}</div>
            <button class="link" on:click={(e) => { e.preventDefault(); removeKompetansemaal(maalIndex); } }><span class="material-symbols-outlined">delete</span>Fjern</button>
          </div>
          <div><strong>{maalIndex + 1}. {maal.grep.tittel.nb}</strong></div>
          <div class="label-input">
            <label for="oppgaver-{maal.grep.kode}">Beskriv arbeidsoppgaver (valgfritt)</label>
            <input id="oppgaver-{maal.grep.kode}" type="text" bind:value={maal.arbeidsoppgaver} placeholder="Utdyp arbeidsoppgaver for kompetansemålet" />
          </div>
        </div>
      {/each}
    </section>
  {/if}

  <!-- Hvis error -->
  {#if errorMessage}
    <section class="error">
      <h4>En feil har oppstått 😩</h4>
      <p>{JSON.stringify(errorMessage)}</p>
    </section>
  {/if}

  {#if !isCompletedDocument && Array.isArray(content?.utplassering?.maal) && content?.utplassering?.maal.length > 0}
    <div class="form-buttons">
      {#if canClickSend}
        {#if previewLoading}
          <button disabled><LoadingSpinner width={"1.5"} />Forhåndsvisning</button>
        {:else}
          <button type="submit" on:click={(e) => {e.preventDefault(); previewLoading=true; sendLaereplan(true);}}><span class="material-symbols-outlined">preview</span>Forhåndsvisning</button>
        {/if}
        {#if sendLoading}
          <button disabled><LoadingSpinner width={"1.5"} />Lagre og send</button>
        {:else}
          <button type="submit" class="filled" on:click={(e) => {e.preventDefault(); sendLoading=true; sendLaereplan();}}><span class="material-symbols-outlined">send</span>Lagre og send</button>
        {/if}
      {:else}
        <button disabled><span class="material-symbols-outlined">preview</span>Forhåndsvisning</button>
        <button disabled><span class="material-symbols-outlined">send</span>Lagre og send</button>
      {/if}
    </div>
    <PdfPreview {showPreview} base64Data={previewBase64} closePreview={() => {showPreview = false}} />
  {/if}
</form>

<style>
  h3, h4 {
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
  .grepSourceSelection {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .error {
    color: var(--error-color);
    background-color: var(--error-background-color);
    padding: 0.5rem 1rem;
  }
  
  .kompetansemaal {
    display: flex;
    padding: 0.2rem 0.2rem;
    align-items: center;
    gap: 0.2rem;
  }
  .kompetansemaal:nth-child(odd), .lareplanKompetansemaal:nth-child(even) {
    background-color: var(--primary-color-20);
  }
  .lareplanKompetansemaal {
    padding: 1rem 1rem;
  }
  .lareplanKompetansemaalTittel {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .staticMaal {
    padding-bottom: 1rem;
    /* background-color: var(--primary-color-20); */
  }
</style>